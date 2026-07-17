const fs = require("fs/promises");
const path = require("path");

const FILE_NAME = "dm-sound-links.json";
const MAX_LINKS = 200;
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function soundLinksPath(userDataPath) {
  return path.join(userDataPath, FILE_NAME);
}

function sanitizeText(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeSoundLink(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = sanitizeText(value.id, 120);
  const videoId = sanitizeText(value.videoId, 32);
  const url = sanitizeText(value.url, 2000);
  if (!id || !YOUTUBE_VIDEO_ID_PATTERN.test(videoId) || !/^https:\/\//i.test(url)) return null;
  return {
    id,
    kind: "youtube",
    name: sanitizeText(value.name, 80) || `YouTube: ${videoId}`,
    fileName: "YouTube",
    url,
    videoId,
    type: "video/youtube",
    size: 0,
    updatedAt: sanitizeText(value.updatedAt, 80) || new Date().toISOString()
  };
}

function normalizeSoundLinks(value) {
  const seen = new Set();
  return (Array.isArray(value) ? value : [])
    .map(normalizeSoundLink)
    .filter((link) => {
      if (!link || seen.has(link.id)) return false;
      seen.add(link.id);
      return true;
    })
    .slice(-MAX_LINKS)
    .sort((left, right) => String(left.name).localeCompare(String(right.name), undefined, { sensitivity: "base" }));
}

async function loadSoundLinks(userDataPath) {
  try {
    const raw = await fs.readFile(soundLinksPath(userDataPath), "utf8");
    return normalizeSoundLinks(JSON.parse(raw));
  } catch (error) {
    if (error?.code === "ENOENT" || error instanceof SyntaxError) return [];
    throw error;
  }
}

async function saveSoundLinks(userDataPath, links) {
  const normalized = normalizeSoundLinks(links);
  const filePath = soundLinksPath(userDataPath);
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.mkdir(userDataPath, { recursive: true });
  try {
    await fs.writeFile(temporaryPath, JSON.stringify(normalized, null, 2), { encoding: "utf8", flag: "wx" });
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.unlink(temporaryPath).catch(() => {});
    throw error;
  }
  return normalized;
}

module.exports = {
  loadSoundLinks,
  normalizeSoundLink,
  normalizeSoundLinks,
  saveSoundLinks,
  soundLinksPath
};
