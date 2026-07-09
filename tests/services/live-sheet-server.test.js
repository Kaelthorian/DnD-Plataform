const assert = require("assert");
const net = require("net");
const { WebSocket } = require("ws");
const {
  LiveSheetServer,
  listLocalAddresses,
  sanitizeSheetPatch,
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

function sendAs(socket, playerId, playerName, payload) {
  socket.send(JSON.stringify({ version: 1, playerId, playerName, ...payload }));
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
    const [welcome, handState] = await nextMessages(socket, 2);
    assert.strictEqual(welcome.type, "server:welcome");
    assert.strictEqual(welcome.recommendedMode === "tailscale" || welcome.recommendedMode === "lan", true);
    assert.strictEqual(handState.type, "dm:hand:state");
    assert.strictEqual(handState.raised, false);

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
    assert.deepStrictEqual(sanitizeSheetPatch({ Equipment: "1 Rope\n1 Torch" }), { Equipment: "1 Rope\n1 Torch" });

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

function nextMessages(socket, count) {
  return new Promise((resolve, reject) => {
    const messages = [];
    const onMessage = (raw) => {
      messages.push(JSON.parse(raw.toString("utf8")));
      if (messages.length >= count) {
        cleanup();
        resolve(messages);
      }
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off("message", onMessage);
      socket.off("error", onError);
    };
    socket.on("message", onMessage);
    socket.once("error", onError);
  });
}

async function testVvtStateBroadcastAndWelcomeReplay() {
  await withServer({ tokenEnabled: false }, async (server, port) => {
    const socket = await openSocket(port);
    send(socket, { type: "player:hello" });
    const [welcome, handState] = await nextMessages(socket, 2);
    assert.strictEqual(welcome.type, "server:welcome");
    assert.strictEqual(handState.type, "dm:hand:state");
    assert.strictEqual(handState.raised, false);

    const broadcastPromise = nextMessage(socket);
    const tinyPng = "data:image/png;base64,iVBORw0KGgo=";
    const result = server.setVvtState({
      active: true,
      title: "Dungeon",
      image: { name: "map.png", type: "image/png", dataUrl: tinyPng },
      fogOfWar: {
        enabled: true,
        revealed: [{ x: 0.5, y: 0.5, rx: 0.1, ry: 0.1 }]
      },
      tokens: [{
        id: "goblin-1",
        name: "Goblin",
        monster: { name: "Goblin", source: "MM" },
        image: { name: "Goblin.png", type: "image/png", dataUrl: tinyPng },
        x: 120,
        y: 80,
        size: 56,
        hpCurrent: 7,
        hpMax: 7
      }, {
        id: "hidden-imp",
        name: "Hidden Imp",
        hidden: true,
        x: 10,
        y: 10
      }],
      markers: [{
        id: "door-1",
        label: "Secret Door",
        x: 240,
        y: 160,
        color: "amber"
      }, {
        id: "trap-1",
        label: "Hidden Trap",
        hidden: true,
        x: 20,
        y: 20
      }],
      sourceViewport: { width: 760, height: 432 }
    });
    assert.strictEqual(result.ok, true);
    const broadcast = await broadcastPromise;
    assert.strictEqual(broadcast.type, "dm:vvt:state");
    assert.strictEqual(broadcast.state.active, true);
    assert.strictEqual(broadcast.state.fogOfWar.revealed.length, 1);
    assert.strictEqual(broadcast.state.tokens.length, 1);
    assert.strictEqual(broadcast.state.tokens[0].name, "Goblin");
    assert.strictEqual(broadcast.state.tokens[0].image.dataUrl, tinyPng);
    assert.deepStrictEqual(broadcast.state.tokens[0].imageRequest, { sources: ["MM"], names: ["Goblin"] });
    assert.strictEqual(broadcast.state.markers.length, 1);
    assert.strictEqual(broadcast.state.markers[0].label, "Secret Door");
    assert.deepStrictEqual(broadcast.state.sourceViewport, { width: 760, height: 432 });

    const secondSocket = await openSocket(port);
    const replayMessagesPromise = nextMessages(secondSocket, 3);
    send(secondSocket, { type: "player:hello" });
    const [secondWelcome, replay, secondHandState] = await replayMessagesPromise;
    assert.strictEqual(secondWelcome.type, "server:welcome");
    assert.strictEqual(replay.type, "dm:vvt:state");
    assert.strictEqual(replay.state.title, "Dungeon");
    assert.strictEqual(secondHandState.type, "dm:hand:state");
    assert.strictEqual(secondHandState.raised, false);
    socket.close();
    secondSocket.close();
  });
}

async function testRollBroadcastToOtherPlayers() {
  await withServer({ tokenEnabled: false }, async (server, port) => {
    const alice = await openSocket(port);
    const bob = await openSocket(port);
    sendAs(alice, "alice", "Alice", { type: "player:hello" });
    sendAs(bob, "bob", "Bob", { type: "player:hello" });
    const [aliceWelcome, aliceHandState] = await nextMessages(alice, 2);
    const [bobWelcome, bobHandState] = await nextMessages(bob, 2);
    assert.strictEqual(aliceWelcome.type, "server:welcome");
    assert.strictEqual(aliceHandState.type, "dm:hand:state");
    assert.strictEqual(bobWelcome.type, "server:welcome");
    assert.strictEqual(bobHandState.type, "dm:hand:state");

    const dmRollPromise = new Promise((resolve) => server.once("player-roll", resolve));
    const bobRollPromise = nextMessage(bob);
    sendAs(alice, "alice", "Alice", {
      type: "roll:event",
      roll: {
        title: "Attack",
        result: "18",
        detail: "1d20[15] + 3",
        timestamp: "2026-06-30T00:00:00.000Z"
      }
    });

    const [dmRoll, bobRoll] = await Promise.all([dmRollPromise, bobRollPromise]);
    assert.strictEqual(dmRoll.playerName, "Alice");
    assert.strictEqual(bobRoll.type, "player:roll");
    assert.strictEqual(bobRoll.roll.playerName, "Alice");
    assert.strictEqual(bobRoll.roll.title, "Attack");
    assert.strictEqual(bobRoll.roll.result, "18");
    assert.strictEqual(bobRoll.roll.detail, "1d20[15] + 3");
    alice.close();
    bob.close();
  });
}

async function testRaisedHandQueue() {
  await withServer({ tokenEnabled: false }, async (server, port) => {
    const alice = await openSocket(port);
    const bob = await openSocket(port);
    sendAs(alice, "alice", "Alice", { type: "player:hello" });
    sendAs(bob, "bob", "Bob", { type: "player:hello" });
    const [aliceWelcome, aliceHandState] = await nextMessages(alice, 2);
    const [bobWelcome, bobHandState] = await nextMessages(bob, 2);
    assert.strictEqual(aliceWelcome.type, "server:welcome");
    assert.strictEqual(aliceHandState.type, "dm:hand:state");
    assert.strictEqual(aliceHandState.raised, false);
    assert.strictEqual(bobWelcome.type, "server:welcome");
    assert.strictEqual(bobHandState.type, "dm:hand:state");
    assert.strictEqual(bobHandState.raised, false);

    const aliceQueuePromise = new Promise((resolve) => server.once("player-hand-queue", resolve));
    sendAs(alice, "alice", "Alice", { type: "player:hand", raised: true });
    const aliceAck = await nextMessage(alice);
    const aliceQueue = await aliceQueuePromise;
    assert.strictEqual(aliceAck.type, "dm:hand:state");
    assert.strictEqual(aliceAck.raised, true);
    assert.deepStrictEqual(aliceQueue.map((hand) => hand.playerName), ["Alice"]);

    const bobQueuePromise = new Promise((resolve) => server.once("player-hand-queue", resolve));
    sendAs(bob, "bob", "Bob", { type: "player:hand", raised: true });
    const bobAck = await nextMessage(bob);
    const bobQueue = await bobQueuePromise;
    assert.strictEqual(bobAck.type, "dm:hand:state");
    assert.strictEqual(bobAck.raised, true);
    assert.deepStrictEqual(bobQueue.map((hand) => hand.playerName), ["Alice", "Bob"]);
    assert.deepStrictEqual(server.getRaisedHands().map((hand) => hand.position), [1, 2]);

    const lowerQueuePromise = new Promise((resolve) => server.once("player-hand-queue", resolve));
    const aliceLoweredPromise = nextMessage(alice);
    const result = server.lowerPlayerHand("alice");
    const [lowerQueue, aliceLowered] = await Promise.all([lowerQueuePromise, aliceLoweredPromise]);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(aliceLowered.type, "dm:hand:state");
    assert.strictEqual(aliceLowered.raised, false);
    assert.deepStrictEqual(lowerQueue.map((hand) => hand.playerName), ["Bob"]);

    alice.close();
    bob.close();
  });
}

(async () => {
  await testAddressDetection();
  await testStartStopAndSelfTest();
  await testTokenRejection();
  await testTokenAcceptanceAndProtocol();
  await testVvtStateBroadcastAndWelcomeReplay();
  await testRollBroadcastToOtherPlayers();
  await testRaisedHandQueue();
  console.log("live-sheet-server tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
