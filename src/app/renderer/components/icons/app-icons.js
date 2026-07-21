(function exposeAppIcons(root) {
  "use strict";

  /**
   * @typedef {Object} AppIconProps
   * @property {string} name
   * @property {number=} size
   * @property {string=} className
   * @property {string=} color
   * @property {string=} title
   */

  const definitions = Object.freeze({
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    file: '<path d="M6 3.5h9.5L19 7v13.5H6zM15 3.5V7h4M9 11h7M9 14h7M9 17h4"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    unlock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2M12 14v3"/>',
    longRest: '<path d="M7.5 3.5h9A2.5 2.5 0 0 1 19 6v12a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18V6a2.5 2.5 0 0 1 2.5-2.5ZM5 8h14M8 5.8h3"/>',
    campfire: '<path d="M12 3.5c2.2 2.5 4 4.7 4 7.4a4 4 0 1 1-8 0c0-2.3 1.5-4.6 4-7.4Z"/><path d="m5 18.5 14 2M19 18.5 5 20.5"/>',
    map: '<path d="M4 6.5 9.5 4l5 2 5.5-2.5v14l-5.5 2.5-5-2-5.5 2.5v-14ZM9.5 4v14M14.5 6v14"/>',
    volume: '<path d="M4 9.5h4l5-4v13l-5-4H4v-5ZM16 9c1.1 1.5 1.1 4.5 0 6M18.7 6.5c2.4 3.2 2.4 7.8 0 11"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    pin: '<path d="M12 17v5M7 3h10l-2 6 3 3v2H6v-2l3-3-2-6Z"/>',
    archive: '<path d="M4 7h16v14H4zM3 3h18v4H3zM9 11h6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    export: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v7h14v-7"/>',
    trash: '<path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
    folder: '<path d="M3 6h7l2 2h9v11H3z"/>',
    chevronRight: '<path d="m9 5 7 7-7 7"/>',
    chevronDown: '<path d="m5 9 7 7 7-7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    arrowLeft: '<path d="m11 5-7 7 7 7M4 12h16"/>',
    undo: '<path d="m9 7-5 5 5 5M4 12h9a6 6 0 0 1 6 6"/>',
    redo: '<path d="m15 7 5 5-5 5M20 12h-9a6 6 0 0 0-6 6"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".7"/><circle cx="4.5" cy="12" r=".7"/><circle cx="4.5" cy="18" r=".7"/>',
    listOrdered: '<path d="M10 6h10M10 12h10M10 18h10M4 5h2v3M4 11h2l-2 3h2M4 17h2l-2 3h2"/>',
    checklist: '<path d="m3.5 6 1.5 1.5L8 4.5M11 6h9M3.5 12 5 13.5l3-3M11 12h9M3.5 18 5 19.5l3-3M11 18h9"/>',
    quote: '<path d="M5 7h5v5H6c0 3 1 4 3 5M14 7h5v5h-4c0 3 1 4 3 5"/>',
    code: '<path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14"/>',
    highlighter: '<path d="m14 4 6 6-9 9H5v-6l9-9ZM12 6l6 6M4 21h16"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 2-2 5 5"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M9 4v16M15 4v16"/>',
    star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.3 2.2c-1 .5-1.1 1-1.1 2.1M12 17h.01"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    sync: '<path d="M20 7h-5V2M4 17h5v5M19 12a7 7 0 0 0-12-5L4 10M5 12a7 7 0 0 0 12 5l3-3"/>',
    tag: '<path d="M20 13 13 20 4 11V4h7l9 9Z"/><circle cx="8.5" cy="8.5" r="1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  });

  function definitionFor(name) {
    return definitions[name] || root.dndIcons?.definitions?.[name] || "";
  }

  /** @param {AppIconProps} props */
  function AppIcon({ name, size = 18, className = "", color = "currentColor", title = "" } = {}) {
    const drawing = definitionFor(String(name || ""));
    if (!drawing) return null;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", color);
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.classList.add("app-icon");
    if (className) svg.classList.add(...String(className).split(/\s+/).filter(Boolean));
    if (title) {
      svg.setAttribute("role", "img");
      const titleNode = document.createElementNS("http://www.w3.org/2000/svg", "title");
      titleNode.textContent = title;
      svg.appendChild(titleNode);
    } else {
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
    }
    svg.insertAdjacentHTML("beforeend", drawing);
    return svg;
  }

  function mountAppIcons(scope = document) {
    scope.querySelectorAll?.("[data-app-icon]").forEach((host) => {
      const icon = AppIcon({
        name: host.dataset.appIcon,
        size: Number(host.dataset.iconSize) || 18,
        className: host.dataset.iconClass || "",
        color: host.dataset.iconColor || "currentColor",
        title: host.dataset.iconTitle || ""
      });
      if (icon) host.replaceChildren(icon);
    });
  }

  root.AppIcon = AppIcon;
  root.dndAppIcons = Object.freeze({ AppIcon, mount: mountAppIcons });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => mountAppIcons(), { once: true });
  else mountAppIcons();
})(typeof globalThis !== "undefined" ? globalThis : window);
