const fs = require("fs");
const https = require("https");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const portableNodePath = path.join(projectRoot, ".tools", "node-v20.19.0-win-x64", "node.exe");
const electronBuilderCli = path.join(projectRoot, "node_modules", "electron-builder", "cli.js");
const packageJsonPath = path.join(projectRoot, "package.json");
const ensureDmScreenBuildArg = "--ensure-dm-screen";
const shouldEnsureDmScreenBuild = process.argv.includes(ensureDmScreenBuildArg);
const args = process.argv.slice(2).filter((arg) => arg !== ensureDmScreenBuildArg);

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (_error) {
    return false;
  }
}

function getNodeMajor(versionText) {
  const match = String(versionText || "").match(/^v?(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function resolveNode() {
  if (getNodeMajor(process.version) >= 20) {
    return { executable: process.execPath, label: `current Node ${process.version}` };
  }
  if (fileExists(portableNodePath)) {
    return { executable: portableNodePath, label: `portable Node ${portableNodePath}` };
  }
  return null;
}

function getPublishMode() {
  const publishArgIndex = args.findIndex((arg) => arg === "--publish" || arg.startsWith("--publish="));
  if (publishArgIndex === -1) return null;
  const publishArg = args[publishArgIndex];
  if (publishArg.includes("=")) return publishArg.split("=")[1] || null;
  return args[publishArgIndex + 1] || null;
}

function getGitHubCliToken() {
  const result = spawnSync("gh", ["auth", "token"], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true
  });

  if (result.status !== 0) return null;

  const token = String(result.stdout || "").trim();
  return token || null;
}

function readPackageJson() {
  return JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
}

function getGitHubPublishConfig() {
  const packageJson = readPackageJson();
  const publishConfigs = Array.isArray(packageJson.build?.publish)
    ? packageJson.build.publish
    : packageJson.build?.publish ? [packageJson.build.publish] : [];
  const githubConfig = publishConfigs.find((config) => config?.provider === "github");

  if (!githubConfig?.owner || !githubConfig?.repo) return null;

  return {
    owner: githubConfig.owner,
    repo: githubConfig.repo,
    tag: githubConfig.vPrefixedTagName === false ? packageJson.version : `v${packageJson.version}`,
    releaseType: githubConfig.releaseType || "draft"
  };
}

function configurePublishEnv(env) {
  const publishMode = getPublishMode();
  if (!publishMode || publishMode === "never") return true;

  if (!env.GH_TOKEN && env.GITHUB_TOKEN) {
    env.GH_TOKEN = env.GITHUB_TOKEN;
  }

  if (!env.GH_TOKEN) {
    const ghToken = getGitHubCliToken();
    if (ghToken) env.GH_TOKEN = ghToken;
  }

  if (env.GH_TOKEN) return true;

  console.error("Publishing to GitHub requires GH_TOKEN.");
  console.error("In PowerShell, run:");
  console.error('$env:GH_TOKEN = "YOUR_GITHUB_TOKEN"');
  console.error("npm run publish:win");
  console.error("");
  console.error("The token needs permission to create or update releases for Kaelthorian/DnD-Plataform.");
  return false;
}

function githubRequest({ method, path: requestPath, token, body }) {
  const payload = body ? JSON.stringify(body) : null;

  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: "api.github.com",
      method,
      path: requestPath,
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "dnd-character-sheet-publisher",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {})
      }
    }, (response) => {
      let responseBody = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        responseBody += chunk;
      });
      response.on("end", () => {
        let data = null;
        if (responseBody) {
          try {
            data = JSON.parse(responseBody);
          } catch (_error) {
            data = responseBody;
          }
        }

        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(data);
          return;
        }

        const message = data?.message || responseBody || `GitHub request failed with status ${response.statusCode}`;
        reject(new Error(message));
      });
    });

    request.on("error", reject);
    if (payload) request.write(payload);
    request.end();
  });
}

async function ensureGitHubReleaseIsPublic(env) {
  const publishMode = getPublishMode();
  if (!publishMode || publishMode === "never") return;

  const githubConfig = getGitHubPublishConfig();
  if (!githubConfig || githubConfig.releaseType !== "release") return;

  const release = await githubRequest({
    method: "GET",
    path: `/repos/${githubConfig.owner}/${githubConfig.repo}/releases/tags/${encodeURIComponent(githubConfig.tag)}`,
    token: env.GH_TOKEN
  });

  if (!release?.draft && !release?.prerelease) {
    console.log(`GitHub release ${githubConfig.tag} is public.`);
    return;
  }

  await githubRequest({
    method: "PATCH",
    path: `/repos/${githubConfig.owner}/${githubConfig.repo}/releases/${release.id}`,
    token: env.GH_TOKEN,
    body: {
      draft: false,
      prerelease: false
    }
  });

  console.log(`Published GitHub release ${githubConfig.tag}.`);
}

if (!fileExists(electronBuilderCli)) {
  console.error("Cannot find electron-builder. Run npm install first.");
  process.exit(1);
}

const nodeRuntime = resolveNode();
if (!nodeRuntime) {
  console.error("electron-builder requires Node 20+ for this repository.");
  console.error("Install Node 20+ or place a portable Node 20 build in .tools/node-v20.19.0-win-x64.");
  process.exit(1);
}

const env = Object.assign({}, process.env);
delete env.ELECTRON_RUN_AS_NODE;

if (!configurePublishEnv(env)) {
  process.exit(1);
}

if (shouldEnsureDmScreenBuild) {
  console.log("Ensuring DM Screen build...");
  const buildResult = spawnSync(nodeRuntime.executable, [path.join(projectRoot, "scripts", "ensure-dm-screen-build.js")], {
    cwd: projectRoot,
    env,
    stdio: "inherit"
  });

  if (buildResult.error) throw buildResult.error;
  if (buildResult.status !== 0) process.exit(buildResult.status || 1);
}

console.log(`Running electron-builder with ${nodeRuntime.label}...`);

const result = spawnSync(nodeRuntime.executable, [electronBuilderCli].concat(args), {
  cwd: projectRoot,
  env,
  stdio: "inherit"
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);

ensureGitHubReleaseIsPublic(env).then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(`Published artifacts, but could not make the GitHub release public: ${error.message}`);
  process.exit(1);
});
