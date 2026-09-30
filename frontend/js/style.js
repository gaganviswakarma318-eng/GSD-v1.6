//  PREMIUM PARALLAX GALAXY BACKGROUND
function random(min, max) {
  return Math.random() * (max - min) + min;
}
function createStar(container, config) {
  const star = document.createElement("span");
  star.className = `star ${config.className}`;

  const width = window.innerWidth;
  const height = window.innerHeight;

  // base position
  const x = random(0, width);
  const y = random(0, height);

  // drift direction:
  // mostly upward + slight sideways for premium floating depth
  const driftX = random(config.driftX[0], config.driftX[1]);
  const driftY = random(config.driftY[0], config.driftY[1]);

  // size / opacity / timing
  const size = random(config.size[0], config.size[1]);
  const opacity = random(config.opacity[0], config.opacity[1]);
  const floatDuration = random(
    config.floatDuration[0],
    config.floatDuration[1],
  );
  const twinkleDuration = random(
    config.twinkleDuration[0],
    config.twinkleDuration[1],
  );

  // depth scaling
  const scaleStart = random(config.scaleStart[0], config.scaleStart[1]);
  const scaleEnd = random(config.scaleEnd[0], config.scaleEnd[1]);

  // stagger animations so the screen doesn't start "empty"
  const negativeDelayFloat = -random(0, floatDuration);
  const negativeDelayTwinkle = -random(0, twinkleDuration);

  star.style.width = `${size}px`;
  star.style.height = `${size}px`;

  star.style.setProperty("--x", `${x}px`);
  star.style.setProperty("--y", `${y}px`);
  star.style.setProperty("--drift-x", `${driftX}px`);
  star.style.setProperty("--drift-y", `${driftY}px`);

  star.style.setProperty("--scale-start", scaleStart.toFixed(3));
  star.style.setProperty("--scale-end", scaleEnd.toFixed(3));
  star.style.setProperty("--opacity", opacity.toFixed(3));

  star.style.setProperty("--float-duration", `${floatDuration}s`);
  star.style.setProperty("--twinkle-duration", `${twinkleDuration}s`);
  star.style.setProperty("--sparkle-duration", `${twinkleDuration}s`);

  star.style.animationDelay = `${negativeDelayFloat}s, ${negativeDelayTwinkle}s`;

  // slight random blur on far stars for depth softness
  if (config.blur) {
    star.style.filter = `blur(${random(config.blur[0], config.blur[1]).toFixed(2)}px)`;
  }

  // occasional extra glow for near/sparkle stars
  if (config.extraGlowChance && Math.random() < config.extraGlowChance) {
    star.style.boxShadow += `,
      0 0 ${random(24, 42).toFixed(0)}px rgba(255,255,255,0.10)`;
  }

  container.appendChild(star);
}

function initStarBackground(container) {
  container.innerHTML = "";

  const layers = [
    // FAR STARS
    {
      className: "star--far",
      count: 140,
      size: [0.8, 1.6],
      opacity: [0.18, 0.42],
      floatDuration: [30, 35],
      twinkleDuration: [7, 12],
      driftX: [-40, 40],
      driftY: [-120, 40],
      scaleStart: [0.9, 1.05],
      scaleEnd: [0.75, 0.95],
      blur: [0, 0.4],
      extraGlowChance: 0,
    },
    // MID STARS
    {
      className: "star--mid",
      count: 85,
      size: [1.4, 2.4],
      opacity: [0.35, 0.7],
      floatDuration: [24, 29],
      twinkleDuration: [6, 10],
      driftX: [-80, 80],
      driftY: [-180, 70],
      scaleStart: [0.95, 1.1],
      scaleEnd: [0.78, 1.02],
      blur: [0, 0.2],
      extraGlowChance: 0.06,
    },
    // NEAR STARS
    {
      className: "star--near",
      count: 42,
      size: [2.2, 4.2],
      opacity: [0.55, 0.95],
      floatDuration: [18, 23],
      twinkleDuration: [4.5, 7],
      driftX: [-140, 140],
      driftY: [-260, 110],
      scaleStart: [1, 1.15],
      scaleEnd: [0.72, 1.06],
      blur: [0, 0.08],
      extraGlowChance: 0.18,
    },
    // SPARKLE STARS
    {
      className: "star--sparkle",
      count: 18,
      size: [1.4, 2.8],
      opacity: [0.45, 0.95],
      floatDuration: [12, 17],
      twinkleDuration: [3.5, 6],
      driftX: [-110, 110],
      driftY: [-220, 90],
      scaleStart: [1, 1.1],
      scaleEnd: [0.82, 1.04],
      blur: [0, 0.06],
      extraGlowChance: 0.35,
      isSparkle: true,
    },
  ];

  layers.forEach((layer) => {
    for (let i = 0; i < layer.count; i += 1) {
      createStar(container, layer);
    }
  });
}

// spawns a single comet-tail streak that crosses the sky once, then removes itself
function spawnShootingStar(container) {
  if (!document.body.classList.contains("pulse")) return;

  const width = window.innerWidth;
  const height = window.innerHeight;

  const star = document.createElement("span");
  star.className = "shooting-star";

  const startX = random(width * 0.05, width * 0.85);
  const startY = random(-40, height * 0.35);
  const angle = random(20, 45); // degrees, travels down-right
  const distance = random(320, 620);
  const duration = random(1, 1.8);

  const rad = (angle * Math.PI) / 180;
  const tx = Math.cos(rad) * distance;
  const ty = Math.sin(rad) * distance;

  star.style.setProperty("--sx", `${startX}px`);
  star.style.setProperty("--sy", `${startY}px`);
  star.style.setProperty("--tx", `${tx}px`);
  star.style.setProperty("--ty", `${ty}px`);
  star.style.setProperty("--angle", `${angle}deg`);
  star.style.setProperty("--duration", `${duration}s`);

  container.appendChild(star);
  star.addEventListener("animationend", () => star.remove());
}

// keeps scheduling the next shooting star at a random interval
function scheduleShootingStars(container) {
  const delay = random(2500, 7000);
  setTimeout(() => {
    spawnShootingStar(container);
    scheduleShootingStars(container);
  }, delay);
}

// INIT
function setupStarBackground() {
  const container = document.querySelector(".bg-animation");
  if (!container) return;

  initStarBackground(container);
  scheduleShootingStars(container);

  window.addEventListener("resize", () => {
    clearTimeout(window.__starResizeTimer);
    window.__starResizeTimer = setTimeout(() => {
      initStarBackground(container);
    }, 220);
  });
}

document.addEventListener("DOMContentLoaded", setupStarBackground);

// Theme System =============================================================================

const themeToggle = document.getElementById("themeToggle");
const themeMenu = document.getElementById("themeMenu");
const themeButtons = document.querySelectorAll(".theme-btn");

function updateColorScheme() {
  const metaTag = document.getElementById("colorScheme");
  if (!metaTag) return;

  if (
    document.body.classList.contains("dark") ||
    document.body.classList.contains("pulse")
  ) {
    metaTag.setAttribute("content", "dark");
  } else {
    metaTag.setAttribute("content", "light");
  }
}

function toggleThemeMenu() {
  if (!themeMenu) return;

  if (themeMenu.classList.contains("open")) {
    themeMenu.classList.remove("open");
    themeMenu.classList.add("closing");

    window.clearTimeout(themeMenu._closingTimer);
    themeMenu._closingTimer = window.setTimeout(() => {
      themeMenu.classList.remove("closing");
    }, 300);
  } else {
    themeMenu.classList.remove("closing");
    themeMenu.classList.add("open");
  }
}

function applyTheme(theme) {
  // remove old theme classes
  document.body.classList.remove("light", "dark", "pulse");

  // add new theme class
  document.body.classList.add(theme);

  // save selected theme
  localStorage.setItem("theme", theme);

  // update meta color-scheme
  updateColorScheme();
}

function loadSavedTheme() {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme) {
    document.body.classList.add(savedTheme);
  } else {
    document.body.classList.add("dark");
  }

  // update meta after theme is loaded
  updateColorScheme();
}

function closeThemeMenuOnOutsideClick(event) {
  if (
    !themeToggle?.contains(event.target) &&
    !themeMenu?.contains(event.target)
  ) {
    if (!themeMenu || !themeMenu.classList.contains("open")) return;

    themeMenu.classList.remove("open");
    themeMenu.classList.add("closing");

    window.clearTimeout(themeMenu._closingTimer);
    themeMenu._closingTimer = window.setTimeout(() => {
      themeMenu.classList.remove("closing");
    }, 300);
  }
}

function setupThemeButtons() {
  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedTheme = button.dataset.theme;
      applyTheme(selectedTheme);
    });
  });
}

function initThemeSystem() {
  themeToggle?.addEventListener("click", toggleThemeMenu);
  setupThemeButtons();
  loadSavedTheme();
  document.addEventListener("click", closeThemeMenuOnOutsideClick);
}

initThemeSystem();

// add paste button functionality ===========================================================
const pasteBtn = document.getElementById("pasteBtn");
const url = document.getElementById("url");

pasteBtn?.addEventListener("click", async () => {
  if (!navigator.clipboard) {
    alert("Clipboard API not supported");
    return;
  }

  try {
    const text = await navigator.clipboard.readText();

    if (!text) {
      alert("Clipboard is empty");
      return;
    }

    url.value = text;
    url.focus();

    // Optional: trigger input event
    url.dispatchEvent(new Event("input", { bubbles: true }));
  } catch (error) {
    console.error("Clipboard access failed:", error);
    alert("Unable to access clipboard");
  }
});

// Initialize on DOM ready  =================================================================
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeButtonPressAnimation);
} else {
  initializeButtonPressAnimation();
}

// Sets up a simple pressed-state animation for non-ripple buttons.
function initializeButtonPressAnimation() {
  const allButtons = document.querySelectorAll("button");
  allButtons.forEach((button) => {
    button.addEventListener("pointerdown", () => {
      button.classList.add("pressed");
    });

    button.addEventListener("pointerup", () => {
      button.classList.remove("pressed");
    });

    button.addEventListener("pointerleave", () => {
      button.classList.remove("pressed");
    });

    button.addEventListener("pointercancel", () => {
      button.classList.remove("pressed");
    });
  });
}
