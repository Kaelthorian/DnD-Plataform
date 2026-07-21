(function exposeObsidianMarkdownEngine(root) {
  function cleanObsidianTarget(value) {
    return String(value || "")
      .replace(/^!?\[\[/, "")
      .replace(/\]\]$/, "")
      .split("|")[0]
      .split("#")[0]
      .trim();
  }

  function obsidianDisplayAlias(value) {
    const content = String(value || "").replace(/^!?\[\[/, "").replace(/\]\]$/, "");
    const [target, alias] = content.split("|");
    return (alias || target || "").split("#")[0].trim();
  }

  function isSafeObsidianImage(value) {
    return [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(`.${String(value || "").split(".").pop()}`.toLowerCase());
  }

  function isObsidianHorizontalRule(line) {
    return /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(String(line || ""));
  }

  function isObsidianBlockStart(line) {
    return /^```/.test(line)
      || isObsidianHorizontalRule(line)
      || /^(#{1,6})\s+/.test(line)
      || /^\s*>\s?/.test(line)
      || /^\s*[-*+]\s+/.test(line)
      || /^\s*\d+\.\s+/.test(line);
  }

  function parseObsidianListItem(text) {
    const task = String(text || "").match(/^\[([ xX])\]\s+(.+)$/);
    if (!task) return { text: String(text || ""), task: false, checked: false };
    return {
      text: task[2].trim(),
      task: true,
      checked: task[1].toLowerCase() === "x"
    };
  }

  function splitObsidianTableRow(line) {
    return String(line || "").trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  }

  function isObsidianTableDivider(line) {
    const cells = splitObsidianTableRow(line);
    return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
  }

  function parseObsidianMarkdown(markdown) {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    const blocks = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) {
        index += 1;
        continue;
      }

      const fence = line.match(/^```(.*)$/);
      if (fence) {
        const code = [];
        index += 1;
        while (index < lines.length && !/^```/.test(lines[index])) {
          code.push(lines[index]);
          index += 1;
        }
        if (index < lines.length) index += 1;
        blocks.push({ type: "code", language: fence[1]?.trim() || "", text: code.join("\n") });
        continue;
      }

      if (isObsidianHorizontalRule(line)) {
        blocks.push({ type: "hr" });
        index += 1;
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
        index += 1;
        continue;
      }

      if (line.includes("|") && index + 1 < lines.length && isObsidianTableDivider(lines[index + 1])) {
        const headers = splitObsidianTableRow(line);
        const rows = [];
        index += 2;
        while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
          rows.push(splitObsidianTableRow(lines[index]).slice(0, headers.length));
          index += 1;
        }
        blocks.push({ type: "table", headers, rows });
        continue;
      }

      const quote = line.match(/^\s*>\s?(.*)$/);
      if (quote) {
        const quoteLines = [];
        while (index < lines.length) {
          const match = lines[index].match(/^\s*>\s?(.*)$/);
          if (!match) break;
          quoteLines.push(match[1]);
          index += 1;
        }
        const callout = quoteLines[0]?.match(/^\[!([a-z0-9_-]+)\][+-]?\s*(.*)$/i);
        if (callout) {
          blocks.push({
            type: "callout",
            kind: callout[1].toLowerCase(),
            title: callout[2]?.trim() || callout[1],
            lines: quoteLines.slice(1).filter((entry) => entry.trim())
          });
        } else {
          blocks.push({ type: "quote", lines: quoteLines.filter((entry) => entry.trim()) });
        }
        continue;
      }

      const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
      if (bullet) {
        const items = [];
        while (index < lines.length) {
          const match = lines[index].match(/^\s*[-*+]\s+(.*)$/);
          if (!match) break;
          items.push(parseObsidianListItem(match[1].trim()));
          index += 1;
        }
        blocks.push({ type: "list", ordered: false, items });
        continue;
      }

      const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
      if (ordered) {
        const items = [];
        while (index < lines.length) {
          const match = lines[index].match(/^\s*\d+\.\s+(.*)$/);
          if (!match) break;
          items.push(parseObsidianListItem(match[1].trim()));
          index += 1;
        }
        blocks.push({ type: "list", ordered: true, items });
        continue;
      }

      const paragraph = [];
      while (index < lines.length) {
        const nextLine = lines[index];
        if (!nextLine.trim()) break;
        if (isObsidianBlockStart(nextLine)) break;
        if (nextLine.includes("|") && index + 1 < lines.length && isObsidianTableDivider(lines[index + 1])) break;
        paragraph.push(nextLine.trim());
        index += 1;
      }
      if (paragraph.length) {
        blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      } else {
        blocks.push({ type: "paragraph", text: line.trim() });
        index += 1;
      }
    }

    return blocks;
  }

  function tokenizeObsidianInline(text) {
    const parts = [];
    const source = String(text || "");
    const pattern = /(!\[\[[^\]]+\]\]|\[\[[^\]]+\]\]|\[[^\]]+\]\([^)]+\)|~~[^~]+~~|==[^=]+==|__[^_]+__|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match;
    while ((match = pattern.exec(source))) {
      if (match.index > lastIndex) parts.push({ type: "text", text: source.slice(lastIndex, match.index) });
      const token = match[0];
      if (token.startsWith("![[")) parts.push({ type: "image", target: token });
      else if (token.startsWith("[[")) parts.push({ type: "wiki", target: token });
      else if (token.startsWith("[") && token.includes("](")) {
        const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        parts.push({ type: "link", label: linkMatch?.[1] || token, href: linkMatch?.[2] || "" });
      } else if (token.startsWith("~~")) parts.push({ type: "strike", text: token.slice(2, -2) });
      else if (token.startsWith("==")) parts.push({ type: "highlight", text: token.slice(2, -2) });
      else if (token.startsWith("__")) parts.push({ type: "underline", text: token.slice(2, -2) });
      else if (token.startsWith("`")) parts.push({ type: "code", text: token.slice(1, -1) });
      else if (token.startsWith("**")) parts.push({ type: "bold", text: token.slice(2, -2) });
      else if (token.startsWith("*")) parts.push({ type: "italic", text: token.slice(1, -1) });
      lastIndex = pattern.lastIndex;
    }
    if (lastIndex < source.length) parts.push({ type: "text", text: source.slice(lastIndex) });
    return parts;
  }

  const api = Object.freeze({
    cleanObsidianTarget,
    obsidianDisplayAlias,
    isSafeObsidianImage,
    parseObsidianMarkdown,
    tokenizeObsidianInline
  });
  root.dndObsidianMarkdownEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
