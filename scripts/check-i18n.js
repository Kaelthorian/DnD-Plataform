const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const i18n = require(path.join(repoRoot, "src", "app", "renderer", "i18n.js"));

const sourceDictionaries = i18n.sourceDictionaries || i18n.dictionaries || {};
const english = sourceDictionaries.en || {};
const spanish = sourceDictionaries.es || {};

function keySort(left, right) {
  return String(left).localeCompare(String(right), "en");
}

function placeholderNames(value) {
  return [...String(value || "").matchAll(/\{([a-zA-Z0-9_]+)\}/g)]
    .map((match) => match[1])
    .sort(keySort);
}

function sameList(left, right) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function validateDictionaries() {
  const enKeys = Object.keys(english).sort(keySort);
  const esKeys = Object.keys(spanish).sort(keySort);
  const esKeySet = new Set(esKeys);
  const enKeySet = new Set(enKeys);

  const missingSpanish = enKeys.filter((key) => !esKeySet.has(key));
  const extraSpanish = esKeys.filter((key) => !enKeySet.has(key));
  const placeholderMismatches = enKeys
    .filter((key) => esKeySet.has(key))
    .map((key) => ({
      key,
      english: placeholderNames(english[key]),
      spanish: placeholderNames(spanish[key])
    }))
    .filter((entry) => !sameList(entry.english, entry.spanish));

  if (missingSpanish.length) {
    console.error("i18n validation failed: missing Spanish translation keys:");
    missingSpanish.forEach((key) => console.error(`  - ${key}`));
  }

  if (placeholderMismatches.length) {
    console.error("i18n validation failed: placeholder mismatch between English and Spanish:");
    placeholderMismatches.forEach((entry) => {
      console.error(`  - ${entry.key}: en={${entry.english.join(", ")}} es={${entry.spanish.join(", ")}}`);
    });
  }

  if (extraSpanish.length) {
    console.log("i18n warning: Spanish has keys not present in English:");
    extraSpanish.slice(0, 40).forEach((key) => console.log(`  - ${key}`));
    if (extraSpanish.length > 40) console.log(`  ...and ${extraSpanish.length - 40} more`);
  }

  return missingSpanish.length + placeholderMismatches.length;
}

const SCAN_TARGETS = [
  "src/app/renderer/index.html",
  "src/app/renderer/renderer.js"
];

const STRING_LITERAL_PATTERN = /(?<![\w$])(?:textContent|innerText|placeholder|title|ariaLabel)\s*=\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1|(?<![\w$])(?:showStatus|setLiveSheetClientStatus)\(\s*(["'`])((?:\\.|(?!\3)[\s\S])*?)\3/g;
const HTML_TEXT_PATTERN = />\s*([^<>{}][^<>]*[A-Za-z][^<>]*)\s*</g;
const ATTR_PATTERN = /\s(placeholder|title|aria-label|value)=["']([^"']*[A-Za-z][^"']*)["']/g;

const IGNORED_TEXT = new Set([
  "",
  "-",
  "+",
  "X",
  "M",
  "AC",
  "HP",
  "CR",
  "XP",
  "Lvl",
  "d20",
  "d100"
]);

function looksLikeI18nKey(value) {
  return /^[a-z][a-z0-9]*(?:\.[a-zA-Z0-9_-]+)+$/.test(value);
}

function looksPlayerFacing(value) {
  const text = String(value || "").replace(/\\[nrt]/g, " ").trim();
  if (!text || IGNORED_TEXT.has(text) || looksLikeI18nKey(text)) return false;
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(text)) return false;
  if (/^[.#]?[a-z0-9_-]+$/i.test(text)) return false;
  if (/^(?:[a-z]+:|https?:|data:|file:|ws:)/i.test(text)) return false;
  if (/^[A-Z0-9_:-]+$/.test(text)) return false;
  if (text.includes("<") || text.includes(">")) return false;
  return true;
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function scanHtmlMarkup(filePath, text, findings) {
  const markup = text.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  let match;
  while ((match = HTML_TEXT_PATTERN.exec(markup))) {
    const value = match[1].replace(/\s+/g, " ").trim();
    const lineStart = markup.lastIndexOf("\n", match.index) + 1;
    const lineEnd = markup.indexOf("\n", match.index);
    const line = markup.slice(lineStart, lineEnd === -1 ? markup.length : lineEnd);
    if (!looksPlayerFacing(value) || /data-i18n(?:-[a-z-]+)?=/.test(line)) continue;
    findings.push({
      filePath,
      line: lineNumberForIndex(markup, match.index),
      kind: "html-text",
      value
    });
  }

  while ((match = ATTR_PATTERN.exec(markup))) {
    const [, attribute, value] = match;
    const lineStart = markup.lastIndexOf("\n", match.index) + 1;
    const lineEnd = markup.indexOf("\n", match.index);
    const line = markup.slice(lineStart, lineEnd === -1 ? markup.length : lineEnd);
    if (!looksPlayerFacing(value) || new RegExp(`data-i18n-${attribute.replace("aria-label", "aria-label")}`).test(line)) continue;
    findings.push({
      filePath,
      line: lineNumberForIndex(markup, match.index),
      kind: `html-${attribute}`,
      value
    });
  }
}

function scanJavaScript(filePath, text, findings, lineOffset = 0) {
  let match;
  while ((match = STRING_LITERAL_PATTERN.exec(text))) {
    const value = match[2] ?? match[4] ?? "";
    if (!looksPlayerFacing(value)) continue;
    const prefix = text.slice(Math.max(0, match.index - 80), match.index);
    if (/\b(?:t|translateDynamicText)\s*\(\s*$/.test(prefix)) continue;
    findings.push({
      filePath,
      line: lineOffset + lineNumberForIndex(text, match.index),
      kind: "js-visible-string",
      value: value.replace(/\s+/g, " ").trim()
    });
  }
}

function scanHtmlScripts(filePath, text, findings) {
  const scriptPattern = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptPattern.exec(text))) {
    const script = match[1] || "";
    if (!script.trim()) continue;
    const scriptStart = match.index + match[0].indexOf(script);
    scanJavaScript(filePath, script, findings, lineNumberForIndex(text, scriptStart) - 1);
  }
}

function scanHardcodedStrings() {
  const findings = [];
  SCAN_TARGETS.forEach((relativePath) => {
    const filePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(filePath)) return;
    const text = fs.readFileSync(filePath, "utf8");
    if (relativePath.endsWith(".html")) {
      scanHtmlMarkup(relativePath, text, findings);
      scanHtmlScripts(relativePath, text, findings);
      return;
    }
    scanJavaScript(relativePath, text, findings);
  });
  return findings;
}

const errorCount = validateDictionaries();
const hardcodedFindings = scanHardcodedStrings();

if (hardcodedFindings.length) {
  const message = `i18n warning: found ${hardcodedFindings.length} possible hardcoded player-facing string(s). New UI text should use i18n keys.`;
  if (process.env.I18N_STRICT_HARDCODE === "1") {
    console.error(message);
  } else {
    console.log(message);
  }
  hardcodedFindings.slice(0, 40).forEach((finding) => {
    const line = `${finding.filePath}:${finding.line}`;
    const detail = `${finding.kind}: ${JSON.stringify(finding.value)}`;
    if (process.env.I18N_STRICT_HARDCODE === "1") console.error(`  - ${line} ${detail}`);
    else console.log(`  - ${line} ${detail}`);
  });
  if (hardcodedFindings.length > 40) {
    const more = `  ...and ${hardcodedFindings.length - 40} more. Run I18N_STRICT_HARDCODE=1 npm run test:i18n to treat these as errors.`;
    if (process.env.I18N_STRICT_HARDCODE === "1") console.error(more);
    else console.log(more);
  }
}

if (errorCount || (process.env.I18N_STRICT_HARDCODE === "1" && hardcodedFindings.length)) {
  process.exit(1);
}

console.log("i18n validation passed");
