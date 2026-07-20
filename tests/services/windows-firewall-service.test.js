const assert = require("assert");
const {
  LIVE_SHEET_RULE_PREFIX,
  buildLiveSheetFirewallRule,
  buildFirewallRuleScript
} = require("../../src/services/windows-firewall-service");

const rule = buildLiveSheetFirewallRule({
  port: "8787",
  profiles: ["Private", "Public", "Private", "Invalid"],
  programPath: "C:\\Program Files\\DnD Character Sheet\\DnD Character Sheet.exe"
});

assert.deepStrictEqual(rule, {
  name: `${LIVE_SHEET_RULE_PREFIX} 8787`,
  port: 8787,
  profiles: ["Private", "Public"],
  programPath: "C:\\Program Files\\DnD Character Sheet\\DnD Character Sheet.exe"
});
assert.strictEqual(buildLiveSheetFirewallRule({ port: 0 }), null);
assert.strictEqual(buildLiveSheetFirewallRule({ port: 70000 }), null);

const script = buildFirewallRuleScript(rule);
assert.match(script, /Get-NetFirewallRule -DisplayName \$ruleName/);
assert.match(script, /New-NetFirewallRule @ruleParameters/);
assert.match(script, /LocalPort = 8787/);
assert.match(script, /Profile = @\('Private', 'Public'\)/);
assert.match(script, /Program = 'C:\\Program Files\\DnD Character Sheet\\DnD Character Sheet\.exe'/);

console.log("windows-firewall-service tests passed");
