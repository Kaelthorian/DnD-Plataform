const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const sheetHtml = fs.readFileSync(path.join(root, "src/app/renderer/index.html"), "utf8");
const sheetStyles = fs.readFileSync(path.join(root, "src/app/renderer/styles.css"), "utf8");
const dmSource = fs.readFileSync(path.join(root, "src/app/renderer/dm-screen/src/main.jsx"), "utf8");
const dmStyles = fs.readFileSync(path.join(root, "src/app/renderer/dm-screen/styles.css"), "utf8");

assert.ok(sheetStyles.includes(".app-resize-corner"), "sheet resize-corner standard is missing");
assert.ok(dmStyles.includes(".app-resize-corner"), "DM Screen resize-corner standard is missing");
assert.ok(sheetHtml.includes("turn-actions-resize-corner app-resize-corner"), "combat window does not use the shared corner");
assert.ok(sheetHtml.includes("familiar-note-resize-corner app-resize-corner"), "companion notes do not use the shared corner");
assert.ok(sheetHtml.includes("floating-sheet-window-resize-corner app-resize-corner"), "shared sheet windows do not use the standard corner");
assert.ok(sheetHtml.includes('resizeCorner.className = "floating-sheet-window-resize floating-sheet-window-resize-corner app-resize-corner"'), "dynamic status window does not use the standard corner");

const dmCornerHandles = dmSource.match(/className="app-resize-corner bottom-0 right-0"/g) || [];
assert.strictEqual(dmCornerHandles.length, 6, "every resizable DM Screen window should use the shared lower-right corner");
assert.match(dmSource, /edge === "corner"\s*\? ""\s*:\s*"bg-amber-500\/0/);
assert.doesNotMatch(dmSource, /onResizeCorner/);
assert.doesNotMatch(dmSource, /bottom-1 right-1 h-5 w-5 cursor-nwse-resize/);

console.log("Resizable window corner standard verified across both renderers.");
