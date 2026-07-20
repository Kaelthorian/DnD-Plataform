const { spawnSync } = require("child_process");

const LIVE_SHEET_RULE_PREFIX = "DnD Character Sheet Live Sheet TCP";
const ALLOWED_PROFILES = new Set(["Private", "Public"]);

function normalizePort(value) {
  const port = Number.parseInt(value, 10);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null;
}

function normalizeProfiles(value) {
  const profiles = Array.isArray(value) ? value : [value];
  const normalized = [...new Set(profiles.map((profile) => String(profile || "").trim()))]
    .filter((profile) => ALLOWED_PROFILES.has(profile));
  return normalized.length ? normalized : ["Private"];
}

function powershellString(value) {
  return `'${String(value || "").replace(/'/g, "''")}'`;
}

function buildLiveSheetFirewallRule({ port, profiles = ["Private"], programPath = "" } = {}) {
  const normalizedPort = normalizePort(port);
  if (!normalizedPort) return null;
  return {
    name: `${LIVE_SHEET_RULE_PREFIX} ${normalizedPort}`,
    port: normalizedPort,
    profiles: normalizeProfiles(profiles),
    programPath: String(programPath || "").trim()
  };
}

function buildFirewallRuleScript(rule) {
  if (!rule?.name || !normalizePort(rule.port)) return "";
  const profileValues = rule.profiles.map(powershellString).join(", ");
  const programLine = rule.programPath ? `\n  Program = ${powershellString(rule.programPath)}` : "";
  return [
    "$ErrorActionPreference = 'Stop'",
    `$ruleName = ${powershellString(rule.name)}`,
    "Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule",
    "$ruleParameters = @{",
    "  DisplayName = $ruleName",
    "  Description = 'Allows incoming Live Sheet WebSocket connections for DnD Character Sheet.'",
    "  Direction = 'Inbound'",
    "  Action = 'Allow'",
    "  Protocol = 'TCP'",
    `  LocalPort = ${rule.port}`,
    `  Profile = @(${profileValues})${programLine}`,
    "}",
    "New-NetFirewallRule @ruleParameters | Out-Null"
  ].join("\n");
}

function runElevatedPowerShell(script, spawn = spawnSync) {
  if (process.platform !== "win32") {
    return { ok: false, code: "UNSUPPORTED_PLATFORM", error: "Windows Firewall rules are only available on Windows." };
  }
  if (!script) return { ok: false, code: "INVALID_RULE", error: "Invalid Windows Firewall rule." };

  const encodedScript = Buffer.from(script, "utf16le").toString("base64");
  const elevationScript = [
    "$ErrorActionPreference = 'Stop'",
    `$encodedCommand = '${encodedScript}'`,
    "$process = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $encodedCommand) -Verb RunAs -Wait -PassThru -WindowStyle Hidden",
    "exit $process.ExitCode"
  ].join("; ");
  const result = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", elevationScript], {
    encoding: "utf8",
    timeout: 60000,
    windowsHide: true
  });
  if (result.error) {
    return { ok: false, code: result.error.code || "FIREWALL_FAILED", error: result.error.message || "Could not update Windows Firewall." };
  }
  if (result.status !== 0) {
    return {
      ok: false,
      code: "FIREWALL_FAILED",
      error: String(result.stderr || result.stdout || "Windows did not approve the Firewall change.").trim()
    };
  }
  return { ok: true };
}

function allowLiveSheetFirewallRule(options = {}) {
  const rule = buildLiveSheetFirewallRule(options);
  if (!rule) return { ok: false, code: "INVALID_RULE", error: "Invalid Live Sheet port." };
  const result = runElevatedPowerShell(buildFirewallRuleScript(rule));
  return { ...result, rule: { name: rule.name, port: rule.port, profiles: rule.profiles } };
}

module.exports = {
  LIVE_SHEET_RULE_PREFIX,
  buildLiveSheetFirewallRule,
  buildFirewallRuleScript,
  runElevatedPowerShell,
  allowLiveSheetFirewallRule
};
