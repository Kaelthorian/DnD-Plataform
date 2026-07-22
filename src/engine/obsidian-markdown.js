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

  function findMarkdownRichShortcut(text, caretOffset = String(text || "").length) {
    const source = String(text || "");
    const offset = Math.max(0, Math.min(source.length, Number(caretOffset) || 0));
    const beforeCaret = source.slice(0, offset);
    const patterns = [
      { type: "link", pattern: /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)$/i },
      { type: "bold", pattern: /\*\*([^*\n]+)\*\*$/ },
      { type: "strike", pattern: /~~([^~\n]+)~~$/ },
      { type: "highlight", pattern: /==([^=\n]+)==$/ },
      { type: "underline", pattern: /__([^_\n]+)__$/ },
      { type: "code", pattern: /`([^`\n]+)`$/ },
      { type: "italic", pattern: /(?<!\*)\*([^*\n]+)\*$/ }
    ];
    for (const entry of patterns) {
      const match = beforeCaret.match(entry.pattern);
      if (!match) continue;
      return {
        type: entry.type,
        start: offset - match[0].length,
        end: offset,
        text: match[1],
        href: entry.type === "link" ? match[2] : ""
      };
    }
    return null;
  }

  function markdownToolbarLineRange(value, start, end) {
    const lineStart = start <= 0 ? 0 : value.lastIndexOf("\n", start - 1) + 1;
    const endProbe = end > start && value[end - 1] === "\n" ? end - 1 : end;
    const newlineIndex = value.indexOf("\n", endProbe);
    return { start: lineStart, end: newlineIndex === -1 ? value.length : newlineIndex };
  }

  function markdownToolbarLinePrefixPattern(command) {
    if (command === "heading") return /^(\s*)#{1,6}\s+/;
    if (command === "bullet") return /^(\s*)[-*+]\s+(?!\[[ xX]\]\s+)/;
    if (command === "numbered") return /^(\s*)\d+[.)]\s+/;
    if (command === "task") return /^(\s*)[-*+]\s+\[[ xX]\]\s+/;
    if (command === "quote") return /^(\s*)>\s?/;
    return null;
  }

  function stripMarkdownToolbarLinePrefix(line) {
    const indent = line.match(/^\s*/)?.[0] || "";
    const content = line.slice(indent.length)
      .replace(/^(?:#{1,6}\s+|[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+|>\s?)/, "");
    return { indent, content };
  }

  function createMarkdownToolbarLineEdit(command, value, start, end) {
    const range = markdownToolbarLineRange(value, start, end);
    const original = value.slice(range.start, range.end);
    const lines = original.split("\n");
    const pattern = markdownToolbarLinePrefixPattern(command);
    const meaningfulLines = lines.filter((line) => line.trim());
    const removePrefix = Boolean(meaningfulLines.length && pattern && meaningfulLines.every((line) => pattern.test(line)));
    let ordinal = 0;
    const replacement = lines.map((line) => {
      if (!line.trim() && lines.length > 1) return line;
      if (removePrefix) return line.replace(pattern, "$1");
      const { indent, content } = stripMarkdownToolbarLinePrefix(line);
      ordinal += 1;
      const prefix = command === "heading"
        ? "## "
        : command === "bullet"
          ? "- "
          : command === "numbered"
            ? `${ordinal}. `
            : command === "task"
              ? "- [ ] "
              : "> ";
      return `${indent}${prefix}${content}`;
    }).join("\n");
    if (start === end) {
      const relativeCaret = start - range.start;
      const lengthDelta = replacement.length - original.length;
      const nextCaret = Math.max(0, Math.min(replacement.length, relativeCaret + lengthDelta));
      return { start: range.start, end: range.end, replacement, selectionStart: nextCaret, selectionEnd: nextCaret };
    }
    return { start: range.start, end: range.end, replacement, selectionStart: 0, selectionEnd: replacement.length };
  }

  function createMarkdownToolbarWrappedEdit(command, value, start, end) {
    const wrappers = {
      bold: ["**", "**"],
      italic: ["*", "*"],
      underline: ["__", "__"],
      strike: ["~~", "~~"],
      highlight: ["==", "=="],
      code: ["`", "`"]
    };
    const [prefix, suffix] = wrappers[command];
    const selected = value.slice(start, end);
    if (command === "code" && selected.includes("\n")) {
      if (selected.startsWith("```\n") && selected.endsWith("\n```")) {
        const replacement = selected.slice(4, -4);
        return { start, end, replacement, selectionStart: 0, selectionEnd: replacement.length };
      }
      if (value.slice(Math.max(0, start - 4), start) === "```\n" && value.slice(end, end + 4) === "\n```") {
        return { start: start - 4, end: end + 4, replacement: selected, selectionStart: 0, selectionEnd: selected.length };
      }
      const leading = start > 0 && value[start - 1] !== "\n" ? "\n" : "";
      const trailing = end < value.length && value[end] !== "\n" ? "\n" : "";
      const replacement = `${leading}\`\`\`\n${selected}\n\`\`\`${trailing}`;
      return {
        start,
        end,
        replacement,
        selectionStart: leading.length + 4,
        selectionEnd: replacement.length - trailing.length - 4
      };
    }
    if (selected.includes("\n")) {
      const lines = selected.split("\n");
      const meaningfulLines = lines.filter(Boolean);
      const wrapped = meaningfulLines.length && meaningfulLines.every((line) => line.startsWith(prefix) && line.endsWith(suffix));
      const replacement = lines.map((line) => {
        if (!line) return line;
        return wrapped ? line.slice(prefix.length, -suffix.length) : `${prefix}${line}${suffix}`;
      }).join("\n");
      return { start, end, replacement, selectionStart: 0, selectionEnd: replacement.length };
    }
    if (selected && selected.startsWith(prefix) && selected.endsWith(suffix)) {
      const replacement = selected.slice(prefix.length, -suffix.length);
      return { start, end, replacement, selectionStart: 0, selectionEnd: replacement.length };
    }
    if (selected && value.slice(Math.max(0, start - prefix.length), start) === prefix && value.slice(end, end + suffix.length) === suffix) {
      return {
        start: start - prefix.length,
        end: end + suffix.length,
        replacement: selected,
        selectionStart: 0,
        selectionEnd: selected.length
      };
    }
    const replacement = `${prefix}${selected}${suffix}`;
    return {
      start,
      end,
      replacement,
      selectionStart: prefix.length,
      selectionEnd: prefix.length + selected.length
    };
  }

  function createMarkdownToolbarEdit(command, markdown, selectionStart, selectionEnd, options = {}) {
    const value = String(markdown || "");
    const start = Math.max(0, Math.min(value.length, Number(selectionStart) || 0));
    const end = Math.max(start, Math.min(value.length, Number(selectionEnd) || start));
    if (["heading", "bullet", "numbered", "task", "quote"].includes(command)) {
      return createMarkdownToolbarLineEdit(command, value, start, end);
    }
    if (["bold", "italic", "underline", "strike", "highlight", "code"].includes(command)) {
      return createMarkdownToolbarWrappedEdit(command, value, start, end);
    }
    if (command === "link") {
      const label = value.slice(start, end) || String(options.linkLabel || "link");
      const replacement = `[${label}](https://)`;
      const caret = replacement.indexOf("https://") + "https://".length;
      return { start, end, replacement, selectionStart: caret, selectionEnd: caret };
    }
    if (command === "table") {
      const columnOne = String(options.tableColumnOne || "Column 1");
      const columnTwo = String(options.tableColumnTwo || "Column 2");
      const leading = start > 0 && value[start - 1] !== "\n" ? "\n" : "";
      const trailing = end < value.length && value[end] !== "\n" ? "\n" : "";
      const replacement = `${leading}| ${columnOne} | ${columnTwo} |\n| --- | --- |\n|  |  |${trailing}`;
      const firstHeaderStart = replacement.indexOf(columnOne);
      return {
        start,
        end,
        replacement,
        selectionStart: firstHeaderStart,
        selectionEnd: firstHeaderStart + columnOne.length
      };
    }
    return null;
  }

  const api = Object.freeze({
    cleanObsidianTarget,
    obsidianDisplayAlias,
    isSafeObsidianImage,
    parseObsidianMarkdown,
    tokenizeObsidianInline,
    findMarkdownRichShortcut,
    createMarkdownToolbarEdit
  });
  root.dndObsidianMarkdownEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
