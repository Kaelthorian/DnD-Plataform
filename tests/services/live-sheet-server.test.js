const assert = require("assert");
const net = require("net");
const { WebSocket } = require("ws");
const {
  LiveSheetServer,
  listLocalAddresses,
  websocketSelfTest
} = require("../../src/services/live-sheet-server");

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function openSocket(port) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

function nextMessage(socket) {
  return new Promise((resolve, reject) => {
    const onMessage = (raw) => {
      cleanup();
      resolve(JSON.parse(raw.toString("utf8")));
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off("message", onMessage);
      socket.off("error", onError);
    };
    socket.once("message", onMessage);
    socket.once("error", onError);
  });
}

function nextClose(socket) {
  return new Promise((resolve) => {
    socket.once("close", (code, reason) => resolve({ code, reason: reason.toString("utf8") }));
  });
}

function send(socket, payload) {
  socket.send(JSON.stringify({ version: 1, playerId: "player-1", playerName: "Tester", ...payload }));
}

async function withServer(options, test) {
  const server = new LiveSheetServer();
  const port = await getFreePort();
  await server.start({ port, ...options });
  try {
    await test(server, port);
  } finally {
    await server.stop();
  }
}

async function testAddressDetection() {
  const addresses = listLocalAddresses({
    Ethernet: [
      { family: "IPv4", internal: false, address: "192.168.1.25" }
    ],
    Tailscale: [
      { family: "IPv4", internal: false, address: "100.85.12.9" }
    ],
    "utun5": [
      { family: "IPv4", internal: false, address: "10.10.10.10" }
    ],
    Loopback: [
      { family: "IPv4", internal: true, address: "127.0.0.1" }
    ]
  });

  assert.deepStrictEqual(addresses.tailscaleAddresses, ["100.85.12.9", "10.10.10.10"]);
  assert.deepStrictEqual(addresses.lanAddresses, ["192.168.1.25"]);
  assert.deepStrictEqual(addresses.allAddresses, ["100.85.12.9", "10.10.10.10", "192.168.1.25"]);
}

async function testStartStopAndSelfTest() {
  const server = new LiveSheetServer();
  const port = await getFreePort();
  const started = await server.start({ port, tokenEnabled: false });
  assert.strictEqual(started.running, true);
  assert.strictEqual(started.port, port);

  const selfTest = await websocketSelfTest("127.0.0.1", port);
  assert.strictEqual(selfTest.ok, true);

  const socket = await openSocket(port);
  socket.close();

  const stopped = await server.stop();
  assert.strictEqual(stopped.running, false);
}

async function testTokenRejection() {
  await withServer({ tokenEnabled: true, sessionToken: "GOOD" }, async (_server, port) => {
    const socket = await openSocket(port);
    const closed = nextClose(socket);
    send(socket, { type: "player:hello", sessionToken: "BAD" });
    const result = await closed;
    assert.strictEqual(result.code, 1008);
    assert.match(result.reason, /Token/);
  });
}

async function testTokenAcceptanceAndProtocol() {
  await withServer({ tokenEnabled: true, sessionToken: "GOOD" }, async (server, port) => {
    const socket = await openSocket(port);
    send(socket, { type: "player:hello", sessionToken: "GOOD" });
    const welcome = await nextMessage(socket);
    assert.strictEqual(welcome.type, "server:welcome");
    assert.strictEqual(welcome.recommendedMode === "tailscale" || welcome.recommendedMode === "lan", true);

    send(socket, {
      type: "sheet:update",
      sessionToken: "GOOD",
      data: { characterName: "Arannis", class: "Wizard" }
    });
    const ack = await nextMessage(socket);
    assert.strictEqual(ack.type, "server:ack");
    assert.strictEqual(ack.receivedType, "sheet:update");

    const patchPromise = nextMessage(socket);
    const patchResult = server.updatePlayerSheet("player-1", { HPCurrent: "7", AC: "16" });
    assert.strictEqual(patchResult.ok, true);
    const patch = await patchPromise;
    assert.strictEqual(patch.type, "dm:sheet:patch");
    assert.deepStrictEqual(patch.patch, { HPCurrent: "7", AC: "16" });
    assert.strictEqual(server.getPlayers()[0].data.HPCurrent, "7");

    const rollPromise = new Promise((resolve) => server.once("player-roll", resolve));
    send(socket, {
      type: "roll:event",
      sessionToken: "GOOD",
      roll: {
        title: "Attack",
        result: "18",
        detail: "1d20[15] + 3",
        timestamp: "2026-06-30T00:00:00.000Z"
      }
    });
    const roll = await rollPromise;
    assert.strictEqual(roll.playerName, "Tester");
    assert.strictEqual(roll.title, "Attack");
    assert.strictEqual(roll.result, "18");

    const players = server.getPlayers();
    assert.strictEqual(players.length, 1);
    assert.strictEqual(players[0].data.characterName, "Arannis");
    socket.close();
  });
}

(async () => {
  await testAddressDetection();
  await testStartStopAndSelfTest();
  await testTokenRejection();
  await testTokenAcceptanceAndProtocol();
  console.log("live-sheet-server tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
