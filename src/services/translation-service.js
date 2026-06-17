const https = require("https");

function splitTextForTranslation(text, maxLength = 450) {
  const sentences = String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const chunks = [];
  let current = "";
  sentences.forEach((sentence) => {
    if (sentence.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let index = 0; index < sentence.length; index += maxLength) {
        chunks.push(sentence.slice(index, index + maxLength));
      }
      return;
    }
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > maxLength) {
      chunks.push(current);
      current = sentence;
    } else {
      current = next;
    }
  });
  if (current) chunks.push(current);
  return chunks;
}

async function translateChunk(text, from, to) {
  const params = new URLSearchParams({
    q: text,
    langpair: `${from}|${to}`
  });
  const data = await getJson(`https://api.mymemory.translated.net/get?${params.toString()}`);
  const translated = data?.responseData?.translatedText;
  if (!translated) throw new Error("Translation response was empty");
  return translated;
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Translation request failed (${response.statusCode})`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    }).on("error", reject);
  });
}

async function translateText(text, from = "en", to = "es") {
  const chunks = splitTextForTranslation(text);
  const translated = [];
  for (const chunk of chunks) {
    translated.push(await translateChunk(chunk, from, to));
  }
  return translated.join("\n\n");
}

module.exports = {
  splitTextForTranslation,
  translateText
};
