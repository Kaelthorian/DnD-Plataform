"use strict";

(() => {
  const THREE_MODULE_PATH = "../../../node_modules/three/build/three.module.js";
  const ROLL_SOUND_PATH = "./assets/sfx/dice-roll.mp3";
  const LAND_SOUND_PATH = "./assets/sfx/dice-land.mp3";
  const DICE_ROLL_LIMIT = 40;

  const DEFAULT_DICE_COLORS = {
    4: "#c94c4c",
    6: "#2f7ed8",
    8: "#2f8f5b",
    10: "#d29b2e",
    12: "#8b5fd7",
    20: "#1f9aa5",
    natural20: "#f4c14a",
    natural1: "#ba2438"
  };

  let threePromise = null;
  let activeScene = null;
  let runId = 0;

  function diceRollerConfig() {
    return {
      colors: {
        ...DEFAULT_DICE_COLORS,
        ...(window.diceRollerConfig?.colors || {})
      },
      sounds: {
        roll: window.diceRollerConfig?.sounds?.roll || ROLL_SOUND_PATH,
        land: window.diceRollerConfig?.sounds?.land || LAND_SOUND_PATH
      }
    };
  }

  function loadThree() {
    if (!threePromise) threePromise = import(THREE_MODULE_PATH);
    return threePromise;
  }

  function playOptionalSound(path, volume = 0.45) {
    if (!path) return;
    try {
      const audio = new Audio(path);
      audio.volume = volume;
      audio.preload = "auto";
      const promise = audio.play();
      if (promise?.catch) promise.catch(() => {});
    } catch (_error) {
      // Missing optional sound assets should never affect dice rolls.
    }
  }

  function normalizeEntries(entries = []) {
    return (Array.isArray(entries) ? entries : [])
      .map((entry) => ({
        sides: Number.parseInt(entry?.sides, 10),
        value: Number.parseInt(entry?.value, 10)
      }))
      .filter((entry) => Number.isFinite(entry.sides) && entry.sides >= 2 && Number.isFinite(entry.value))
      .slice(0, DICE_ROLL_LIMIT);
  }

  function outcomeForEntry(entry) {
    if (entry.sides === 20 && entry.value === 20) return "natural20";
    if (entry.sides === 20 && entry.value === 1) return "natural1";
    return "";
  }

  function colorForEntry(entry, index, config) {
    const outcome = outcomeForEntry(entry);
    if (outcome) return config.colors[outcome];
    const fallback = ["#2f7ed8", "#c94c4c", "#d29b2e", "#2f8f5b", "#8b5fd7"];
    return config.colors[entry.sides] || fallback[index % fallback.length];
  }

  function createDiceGeometry(THREE, sides) {
    if (sides === 4) return new THREE.TetrahedronGeometry(0.86, 0);
    if (sides === 6) return new THREE.BoxGeometry(1.14, 1.14, 1.14, 2, 2, 2);
    if (sides === 8) return new THREE.OctahedronGeometry(0.92, 0);
    if (sides === 10) return new THREE.CylinderGeometry(0.52, 0.82, 1.22, 10, 1);
    if (sides === 12) return new THREE.DodecahedronGeometry(0.94, 0);
    return new THREE.IcosahedronGeometry(0.96, 0);
  }

  function createNumberTexture(THREE, entry, baseColor) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    const outcome = outcomeForEntry(entry);
    const gradient = context.createRadialGradient(92, 72, 16, 128, 128, 132);
    gradient.addColorStop(0, "rgba(255,255,255,0.94)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.72)");
    gradient.addColorStop(1, "rgba(255,255,255,0.16)");

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = gradient;
    context.beginPath();
    context.roundRect(28, 28, 200, 200, 32);
    context.fill();
    context.lineWidth = outcome ? 12 : 7;
    context.strokeStyle = outcome === "natural20" ? "#fff2a4" : outcome === "natural1" ? "#ffd1d7" : "rgba(255,255,255,0.82)";
    context.stroke();

    context.shadowColor = "rgba(0,0,0,0.45)";
    context.shadowBlur = 10;
    context.shadowOffsetY = 6;
    context.fillStyle = outcome ? "#14100a" : "#101010";
    context.font = "900 116px Segoe UI, Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(entry.value), 128, 124);

    context.shadowColor = "transparent";
    context.font = "800 34px Segoe UI, Arial, sans-serif";
    context.fillStyle = baseColor;
    context.fillText(`d${entry.sides}`, 128, 194);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  function createNumberPlate(THREE, entry, baseColor) {
    const texture = createNumberTexture(THREE, entry, baseColor);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), material);
    plate.position.z = 0.72;
    plate.userData.texture = texture;
    return plate;
  }

  function createOutcomeAura(THREE, entry) {
    const outcome = outcomeForEntry(entry);
    if (!outcome) return null;
    const color = outcome === "natural20" ? 0xffd65a : 0xff2f4e;
    const aura = new THREE.Group();
    const ringMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.82,
      depthWrite: false
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.035, 12, 64), ringMaterial);
    ring.position.z = 0.75;
    aura.add(ring);
    const glow = new THREE.PointLight(color, outcome === "natural20" ? 1.35 : 1, 4.2);
    glow.position.set(0, 0, 1.2);
    aura.add(glow);
    aura.userData.outcome = outcome;
    return aura;
  }

  function createDieMesh(THREE, entry, index, dieScale, config) {
    const color = colorForEntry(entry, index, config);
    const outcome = outcomeForEntry(entry);
    const material = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.24,
      metalness: 0.28,
      clearcoat: 0.75,
      clearcoatRoughness: 0.18,
      emissive: outcome === "natural20" ? 0x3a2600 : outcome === "natural1" ? 0x350009 : 0x000000,
      emissiveIntensity: outcome ? 0.28 : 0
    });
    const mesh = new THREE.Mesh(createDiceGeometry(THREE, entry.sides), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.scale.setScalar(dieScale);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry, 16),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.22
      })
    );
    mesh.add(edges);

    mesh.add(createNumberPlate(THREE, entry, color));
    const aura = createOutcomeAura(THREE, entry);
    if (aura) mesh.add(aura);
    return mesh;
  }

  function disposeObject(object) {
    object.traverse((child) => {
      child.geometry?.dispose?.();
      if (Array.isArray(child.material)) child.material.forEach((material) => material?.dispose?.());
      else child.material?.dispose?.();
      child.userData?.texture?.dispose?.();
      child.material?.map?.dispose?.();
    });
  }

  function disposeScene() {
    if (!activeScene) return;
    const { animationFrame, resizeHandler, scene, renderer, overlay, canvasRoot } = activeScene;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (resizeHandler) window.removeEventListener("resize", resizeHandler);
    if (scene) disposeObject(scene);
    renderer?.dispose?.();
    renderer?.forceContextLoss?.();
    if (canvasRoot) canvasRoot.textContent = "";
    overlay?.classList.remove("visible", "fading", "critical", "failure");
    activeScene = null;
  }

  function updateSize(state) {
    const width = Math.max(1, state.overlay.clientWidth || window.innerWidth);
    const height = Math.max(1, state.overlay.clientHeight || window.innerHeight);
    state.renderer.setSize(width, height, false);
    state.camera.aspect = width / height;
    state.camera.updateProjectionMatrix();
  }

  function createScene(THREE, entries, currentRunId, config) {
    if (currentRunId !== runId) return;
    const overlay = document.getElementById("diceRollOverlay");
    const canvasRoot = document.getElementById("diceRollCanvas");
    if (!overlay || !canvasRoot) return;

    disposeScene();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 4.75, 9.8);
    camera.lookAt(0, -0.2, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    canvasRoot.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x223048, 0.62);
    scene.add(hemiLight);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
    keyLight.position.set(-4.6, 7.8, 7.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x89b7ff, 0.85);
    fillLight.position.set(5.2, 3.4, 4.8);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xfff1c2, 1.25);
    rimLight.position.set(2.8, 3.2, -6.4);
    scene.add(rimLight);

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 6),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.28 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.96;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    const columns = entries.length <= 8 ? entries.length : Math.min(10, Math.ceil(Math.sqrt(entries.length * 1.7)));
    const rows = Math.ceil(entries.length / Math.max(columns, 1));
    const dieScale = entries.length > 24 ? 0.58 : entries.length > 14 ? 0.68 : entries.length > 8 ? 0.78 : 1;
    const gapX = 1.04 * dieScale;
    const gapY = 1.16 * dieScale;
    const dice = entries.map((entry, index) => {
      const mesh = createDieMesh(THREE, entry, index, dieScale, config);
      const column = index % columns;
      const row = Math.floor(index / columns);
      const targetX = (column - (columns - 1) / 2) * gapX;
      const targetY = ((rows - 1) / 2 - row) * gapY - 0.1;
      const targetZ = ((index % 3) - 1) * 0.3;
      const entersFromTop = index % 4 === 0;
      const startSide = index % 2 === 0 ? -1 : 1;
      const startX = entersFromTop ? targetX + (Math.random() - 0.5) * 2 : targetX + startSide * (5.6 + Math.random() * 2.8);
      const startY = entersFromTop ? 5.6 + Math.random() * 1.8 : targetY + 1.5 + Math.random() * 2.2;
      const startZ = targetZ - 2.2 + Math.random() * 4.4;
      const finalRotation = new THREE.Euler(0.12 + Math.random() * 0.16, -0.22 + Math.random() * 0.14, -0.05 + Math.random() * 0.1);
      const spin = new THREE.Vector3(
        16 + Math.random() * 11,
        18 + Math.random() * 13,
        14 + Math.random() * 10
      );
      mesh.position.set(startX, startY, startZ);
      scene.add(mesh);
      return {
        mesh,
        startX,
        startY,
        startZ,
        targetX,
        targetY,
        targetZ,
        finalRotation,
        spin
      };
    });

    const state = {
      THREE,
      runId: currentRunId,
      scene,
      camera,
      renderer,
      overlay,
      canvasRoot,
      dice,
      animationFrame: null,
      resizeHandler: null,
      landed: false
    };

    state.resizeHandler = () => updateSize(state);
    window.addEventListener("resize", state.resizeHandler);
    activeScene = state;
    updateSize(state);

    const hasNatural20 = entries.some((entry) => outcomeForEntry(entry) === "natural20");
    const hasNatural1 = entries.some((entry) => outcomeForEntry(entry) === "natural1");
    overlay.classList.toggle("critical", hasNatural20);
    overlay.classList.toggle("failure", !hasNatural20 && hasNatural1);
    overlay.classList.remove("fading");
    overlay.classList.add("visible");

    playOptionalSound(config.sounds.roll, 0.34);

    const startedAt = performance.now();
    const rollDuration = 1880;
    const holdDuration = 1380;
    const fadeDuration = 420;
    const easeOut = (value) => 1 - Math.pow(1 - value, 3);
    const dampedBounce = (value) => Math.abs(Math.sin(value * Math.PI * 3.2)) * Math.pow(1 - value, 1.35);

    const renderFrame = (now) => {
      if (activeScene !== state || state.runId !== runId) return;
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / rollDuration);
      const eased = easeOut(progress);
      const bounce = dampedBounce(progress);

      state.dice.forEach((die, index) => {
        const stagger = Math.min(0.12, index * 0.012);
        const localProgress = Math.min(1, Math.max(0, (progress - stagger) / (1 - stagger)));
        const localEased = easeOut(localProgress);
        const localBounce = dampedBounce(localProgress);
        die.mesh.position.set(
          die.startX + (die.targetX - die.startX) * localEased,
          die.startY + (die.targetY - die.startY) * localEased + localBounce * (1.5 + index % 3 * 0.18),
          die.startZ + (die.targetZ - die.startZ) * localEased
        );
        const spinLeft = Math.pow(1 - localEased, 1.42);
        die.mesh.rotation.set(
          die.finalRotation.x + die.spin.x * spinLeft,
          die.finalRotation.y + die.spin.y * spinLeft,
          die.finalRotation.z + die.spin.z * spinLeft
        );
        const aura = die.mesh.children.find((child) => child.userData?.outcome);
        if (aura) aura.rotation.z += (0.018 + bounce * 0.03);
      });

      state.renderer.render(state.scene, state.camera);
      if (!state.landed && progress >= 1) {
        state.landed = true;
        playOptionalSound(config.sounds.land, 0.42);
      }
      if (elapsed > rollDuration + holdDuration) state.overlay.classList.add("fading");
      if (elapsed > rollDuration + holdDuration + fadeDuration) {
        disposeScene();
        return;
      }
      state.animationFrame = requestAnimationFrame(renderFrame);
    };

    state.animationFrame = requestAnimationFrame(renderFrame);
  }

  function animateDiceRoll3d(entries = []) {
    const diceEntries = normalizeEntries(entries);
    if (!diceEntries.length) return;
    const currentRunId = ++runId;
    const config = diceRollerConfig();
    loadThree()
      .then((THREE) => createScene(THREE, diceEntries, currentRunId, config))
      .catch(() => {});
  }

  window.animateDiceRoll3d = animateDiceRoll3d;
  window.stopDiceRoll3d = disposeScene;
})();
