const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "src", "app", "renderer", "dm-screen", "dist");
const distCss = path.join(distDir, "dm-screen.css");
const distJs = path.join(distDir, "dm-screen.js");
const jsOutputFiles = [
  distJs,
  path.join(distDir, "spells.js"),
  path.join(distDir, "bestiary-sublist-data.js"),
  path.join(distDir, "items.js"),
  path.join(distDir, "items-base.js")
];
const cssSourceFiles = [
  path.join(projectRoot, "src", "app", "renderer", "dm-screen", "styles.css"),
  path.join(projectRoot, "src", "app", "renderer", "dm-screen", "tailwind.config.cjs")
];
const jsSourceFiles = [
  path.join(projectRoot, "src", "app", "renderer", "dm-screen", "vite.config.mjs"),
  path.join(projectRoot, "src", "app", "renderer", "dm-screen", "src", "main.jsx"),
  path.join(projectRoot, "src", "engine", "spells", "spell-data.js"),
  path.join(projectRoot, "src", "engine", "items", "item-catalog.js"),
  path.join(projectRoot, "src", "data", "spells", "spells.json"),
  path.join(projectRoot, "src", "data", "bestiary", "bestiary-sublist-data.json"),
  path.join(projectRoot, "src", "data", "items", "items.json"),
  path.join(projectRoot, "src", "data", "items", "items-base.json")
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
  return outputsNeedBuild([outputPath], sources);
}

function outputsNeedBuild(outputPaths, sources) {
  if (!Array.isArray(outputPaths) || !outputPaths.length || outputPaths.some((filePath) => !fileExists(filePath))) return true;
  if (!Array.isArray(sources) || sources.some((filePath) => !fileExists(filePath))) return true;
  const oldestOutputMtime = Math.min(...outputPaths.map(getMtimeMs));
  return sources.some((filePath) => getMtimeMs(filePath) > oldestOutputMtime);
}

function needsBuild() {
  if (forceBuild) return true;
  return outputNeedsBuild(distCss, cssSourceFiles) || outputsNeedBuild(jsOutputFiles, jsSourceFiles);
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

function main() {
  if (!needsBuild()) {
    console.log("DM Screen build is up to date.");
    return 0;
  }

  const buildNode = resolveBuildNode();
  if (!buildNode) {
    console.warn("DM Screen build is missing or outdated.");
    console.warn("Install Node 20+ or place a portable Node 20 build in .tools/node-v20.19.0-win-x64.");
    return jsOutputFiles.every(fileExists) && fileExists(distCss) ? 0 : 1;
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
  return 0;
}

if (require.main === module) process.exitCode = main();

module.exports = {
  jsOutputFiles,
  jsSourceFiles,
  needsBuild,
  outputNeedsBuild,
  outputsNeedBuild
};

