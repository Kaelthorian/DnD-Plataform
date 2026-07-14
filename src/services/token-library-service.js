const fs = require("fs");
const path = require("path");

const IMAGE_MIME_EXTENSIONS = Object.freeze({
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif"
});
const MAX_TOKEN_IMAGE_BYTES = 12 * 1024 * 1024;

function sanitizeTokenImageName(value, fallbackName = "Token") {
  const raw = String(value || "").trim().replace(/\.[a-z0-9]+$/i, "");
  const clean = raw
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/^\.+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return clean || fallbackName;
}

function decodeTokenImageDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(String(dataUrl || ""));
  if (!match) throw new Error("La imagen de token no tiene un formato válido.");
  const mimeType = match[1].toLowerCase();
  const extension = IMAGE_MIME_EXTENSIONS[mimeType];
  if (!extension) throw new Error("El formato de imagen de token no está permitido.");

  const encoded = match[2].replace(/\s/g, "");
  const buffer = Buffer.from(encoded, "base64");
  const normalizedInput = encoded.replace(/=+$/, "");
  const normalizedOutput = buffer.toString("base64").replace(/=+$/, "");
  if (!buffer.length || normalizedInput !== normalizedOutput) {
    throw new Error("La imagen de token está dañada.");
  }
  if (buffer.length > MAX_TOKEN_IMAGE_BYTES) {
    throw new Error("La imagen de token supera el límite de 12 MB.");
  }
  return { buffer, mimeType, extension };
}

function saveTokenLibraryImage({ directoryPath, name, dataUrl }) {
  if (!directoryPath) throw new Error("No se encontró una carpeta para los tokens.");
  const { buffer, mimeType, extension } = decodeTokenImageDataUrl(dataUrl);
  const baseName = sanitizeTokenImageName(name);
  fs.mkdirSync(directoryPath, { recursive: true });

  for (let number = 1; number <= 1000; number += 1) {
    const suffix = number === 1 ? "" : ` (${number})`;
    const fileName = `${baseName}${suffix}${extension}`;
    const filePath = path.join(directoryPath, fileName);
    try {
      fs.writeFileSync(filePath, buffer, { flag: "wx" });
      return { fileName, filePath, mimeType };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
  }
  throw new Error("No se pudo elegir un nombre libre para la imagen de token.");
}

module.exports = {
  MAX_TOKEN_IMAGE_BYTES,
  decodeTokenImageDataUrl,
  sanitizeTokenImageName,
  saveTokenLibraryImage
};
