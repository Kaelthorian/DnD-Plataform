const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "src", "app", "renderer", "dm-screen", "dist");
const distCss = path.join(distDir, "dm-screen.css");
const distJs = path.join(distDir, "dm-screen.js");
const cssSourceFiles = [
  path.join(projectRoot, "src", "app", "renderer", "dm-screen", "styles.css"),
  path.join(projectRoot, "src", "app", "renderer", "dm-screen", "tailwind.config.cjs")
];
const jsSourceFiles = [
  path.join(projectRoot, "src", "app", "renderer", "dm-screen", "vite.config.mjs"),
  path.join(projectRoot, "src", "app", "renderer", "dm-screen", "src", "main.jsx")
];
const portableNodePath = path.join(projectRoot, ".tools", "node-v20.19.0-win-x64", "node.exe");
const forceBuild = process.argv.includes("--force");

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (_error) {
    return false;
  }
}

function getMtimeMs(filePath) {
  return fs.statSync(filePath).mtimeMs;
}

function outputNeedsBuild(outputPath, sources) {
  if (!fileExists(outputPath)) return true;
  const outputMtime = getMtimeMs(outputPath);
  return sources.some((filePath) => fileExists(filePath) && getMtimeMs(filePath) > outputMtime);
}

function needsBuild() {
  if (forceBuild) return true;
  return outputNeedsBuild(distCss, cssSourceFiles) || outputNeedsBuild(distJs, jsSourceFiles);
}

function getNodeMajor(versionText) {
  const match = String(versionText || "").match(/^v?(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function resolveBuildNode() {
  if (getNodeMajor(process.version) >= 20) {
    return { executable: process.execPath, label: `current Node ${process.version}` };
  }
  if (fileExists(portableNodePath)) {
    return { executable: portableNodePath, label: `portable Node ${portableNodePath}` };
  }
  return null;
}

function runNodeCommand(nodeExecutable, args) {
  const result = spawnSync(nodeExecutable, args, {
    cwd: projectRoot,
    stdio: "inherit"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

if (!needsBuild()) {
  console.log("DM Screen build is up to date.");
  process.exit(0);
}

const buildNode = resolveBuildNode();
if (!buildNode) {
  console.warn("DM Screen build is missing or outdated.");
  console.warn("Install Node 20+ or place a portable Node 20 build in .tools/node-v20.19.0-win-x64.");
  process.exit(fileExists(distCss) && fileExists(distJs) ? 0 : 1);
}

fs.mkdirSync(distDir, { recursive: true });
console.log(`Building DM Screen with ${buildNode.label}...`);

runNodeCommand(buildNode.executable, [
  path.join(projectRoot, "node_modules", "tailwindcss", "lib", "cli.js"),
  "-c",
  path.join(projectRoot, "src", "app", "renderer", "dm-screen", "tailwind.config.cjs"),
  "-i",
  path.join(projectRoot, "src", "app", "renderer", "dm-screen", "styles.css"),
  "-o",
  distCss,
  "--minify"
]);

runNodeCommand(buildNode.executable, [
  path.join(projectRoot, "node_modules", "vite", "bin", "vite.js"),
  "build",
  "--config",
  path.join(projectRoot, "src", "app", "renderer", "dm-screen", "vite.config.mjs")
]);

