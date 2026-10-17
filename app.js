"use strict";

const $ = (s) => document.querySelector(s);

const FONT = '"gg sans","Noto Sans","Helvetica Neue",Helvetica,Arial,sans-serif';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(""); continue; }
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const test = line + " " + words[i];
      if (ctx.measureText(test).width <= maxW) line = test;
      else { out.push(line); line = words[i]; }
    }
    out.push(line);
  }
  return out;
}

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

function theme(bg) {
  const dark = relLuminance(bg) < 0.45;
  return dark
    ? { panel: mixHex(bg, "#ffffff", 0.13), body: "#dbdee1" }
    : { panel: mixHex(bg, "#000000", 0.12), body: "#313338" };
}

const PRESENCE = {
  online: { color: "#23a55a" },
  idle: { color: "#f0b232" },
  dnd: { color: "#f23f43" },
  offline: { color: "#80848e" },
};

const state = {
  pfpSrc: null,
  bannerSrc: null,
  pfp: { zoom: 1, ox: 0, oy: 0 },
  banner: { zoom: 1, ox: 0, oy: 0 },
  displayName: "Kxzy",
  status: "vibing",
  presence: "online",
  cardBg: "#111214",
};

function coverDraw(ctx, src, W, H, zoom, ox, oy) {
  const iw = src.width || src.naturalWidth;
  const ih = src.height || src.naturalHeight;
  const s = Math.max(W / iw, H / ih) * zoom;
  const dw = iw * s, dh = ih * s;
  const x = clamp((W - dw) / 2 + ox, Math.min(0, W - dw), Math.max(0, W - dw));
  const y = clamp((H - dh) / 2 + oy, Math.min(0, H - dh), Math.max(0, H - dh));
  ctx.drawImage(src, x, y, dw, dh);
  return { ox: x - (W - dw) / 2, oy: y - (H - dh) / 2 };
}

const cvPfp = $("#cvPfp");
const cvBanner = $("#cvBanner");
const cvProfile = $("#cvProfile");
const cvSlide = $("#cvSlide");

function renderPfp() {
  const ctx = cvPfp.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, 1080, 1080);
  if (!state.pfpSrc) return;
  const o = coverDraw(ctx, state.pfpSrc, 1080, 1080, state.pfp.zoom, state.pfp.ox, state.pfp.oy);
  state.pfp.ox = o.ox; state.pfp.oy = o.oy;
}

function renderBanner() {
  const ctx = cvBanner.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, 680, 240);
  if (!state.bannerSrc) return;
  const o = coverDraw(ctx, state.bannerSrc, 680, 240, state.banner.zoom, state.banner.ox, state.banner.oy);
  state.banner.ox = o.ox; state.banner.oy = o.oy;
}

function renderProfile() {
  const S = 3;
  const W = 340;
  const BANNER_H = 120;
  const t = theme(state.cardBg);

  const avOuter = 92, avX = 16, avTop = BANNER_H - 56;
  const avCx = avX + avOuter / 2, avCy = avTop + avOuter / 2;
  const avBottom = avTop + avOuter;

  const statusText = state.status.trim();

  let bubble = null;
  if (statusText) {
    const meas = makeCanvas(4, 4).getContext("2d");
    meas.font = `400 14px ${FONT}`;
    const bx = avX + avOuter + 8;
    const maxTextW = W - bx - 12 - 24;
    const lines = wrapLines(meas, statusText, maxTextW);
    const textW = Math.max(...lines.map((l) => meas.measureText(l).width));
    const bw = Math.min(textW + 24, W - bx - 12);
    const bh = lines.length * 19 + 14;
    bubble = { x: bx, y: avCy + 6, w: bw, h: bh, lines };
    bubble.dot1 = { x: avX + avOuter + 8, y: avCy - 6, r: 5 };
    bubble.dot2 = { x: bx + 15, y: avCy + 7, r: 7 };
  }

  const panelBottom = avBottom + 12;
  const H = panelBottom + 8;

  cvProfile.width = W * S;
  cvProfile.height = H * S;
  const ctx = cvProfile.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.scale(S, S);

  roundRect(ctx, 0, 0, W, H, 8);
  ctx.fillStyle = state.cardBg;
  ctx.fill();

  if (state.bannerSrc) {
    ctx.save();
    roundRect(ctx, 0, 0, W, H, 8);
    ctx.clip();
    ctx.drawImage(cvBanner, 0, 0, 680, 240, 0, 0, W, BANNER_H);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(avCx, avCy, avOuter / 2, 0, Math.PI * 2);
  ctx.fillStyle = state.cardBg;
  ctx.fill();
  if (state.pfpSrc) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(avCx, avCy, 40, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(cvPfp, avCx - 40, avCy - 40, 80, 80);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(avCx, avCy, 40, 0, Math.PI * 2);
    ctx.fillStyle = t.panel;
    ctx.fill();
  }
  drawPresence(ctx, avCx + 29, avCy + 29, 14, t.panel);

  if (bubble) {
    ctx.fillStyle = t.panel;
    ctx.beginPath();
    ctx.arc(bubble.dot1.x, bubble.dot1.y, bubble.dot1.r, 0, Math.PI * 2);
    ctx.fill();
    roundRect(ctx, bubble.x, bubble.y, bubble.w, bubble.h, 12);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bubble.dot2.x, bubble.dot2.y, bubble.dot2.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = t.body;
    ctx.font = `400 14px ${FONT}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    bubble.lines.forEach((ln, i) => {
      ctx.fillText(ln, bubble.x + 12, bubble.y + 7 + 9.5 + i * 19);
    });
    ctx.textBaseline = "alphabetic";
  }
}

function drawPresence(ctx, cx, cy, r, ringColor) {
  const p = PRESENCE[state.presence] || PRESENCE.online;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = ringColor;
  ctx.fill();

  const ir = r - 4;
  const K = 4;
  const tmp = makeCanvas(2 * ir * K, 2 * ir * K);
  const tc = tmp.getContext("2d");
  tc.scale(K, K);
  tc.translate(ir - cx, ir - cy);

  tc.beginPath();
  tc.arc(cx, cy, ir, 0, Math.PI * 2);
  tc.fillStyle = p.color;
  tc.fill();

  tc.globalCompositeOperation = "destination-out";
  tc.fillStyle = "#000";
  if (state.presence === "idle") {
    tc.beginPath();
    tc.arc(cx - ir * 0.45, cy - ir * 0.45, ir * 0.8, 0, Math.PI * 2);
    tc.fill();
  } else if (state.presence === "dnd") {
    roundRect(tc, cx - ir * 0.6, cy - ir * 0.22, ir * 1.2, ir * 0.44, ir * 0.22);
    tc.fill();
  } else if (state.presence === "offline") {
    tc.beginPath();
    tc.arc(cx, cy, ir * 0.5, 0, Math.PI * 2);
    tc.fill();
  }

  ctx.drawImage(tmp, cx - ir, cy - ir, ir * 2, ir * 2);
}

function renderSlide() {
  const W = 1080, H = 1080;
  const ctx = cvSlide.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const pad = 80, rowGap = 40, colGap = 56;
  const availW = W - pad * 2;

  const rowH = (availW - rowGap) / (1 + 680 / 240);
  const profW = availW;
  const profH = (profW * cvProfile.height) / cvProfile.width;

  const total = rowH + colGap + profH;
  const fit = Math.min(1, (H - pad * 2) / total);

  const pfpS = rowH * fit;
  const banW = rowH * (680 / 240) * fit;
  const gap = rowGap * fit;
  const pw = profW * fit, ph = profH * fit;

  const rowW = pfpS + gap + banW;
  let y = (H - (pfpS + colGap * fit + ph)) / 2;
  const rowX = (W - rowW) / 2;

  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 14;

  ctx.drawImage(cvPfp, rowX, y, pfpS, pfpS);
  ctx.drawImage(cvBanner, rowX + pfpS + gap, y, banW, pfpS);

  y += pfpS + colGap * fit;
  ctx.drawImage(cvProfile, (W - pw) / 2, y, pw, ph);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function renderAll() {
  renderPfp();
  renderBanner();
  renderProfile();
  renderSlide();
}

function makeDraggable(canvas, crop, onUpdate) {
  let dragging = false, sx = 0, sy = 0, ox0 = 0, oy0 = 0;
  const scale = () => canvas.width / canvas.getBoundingClientRect().width;

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    sx = e.clientX; sy = e.clientY;
    ox0 = crop.ox; oy0 = crop.oy;
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const k = scale();
    crop.ox = ox0 + (e.clientX - sx) * k;
    crop.oy = oy0 + (e.clientY - sy) * k;
    onUpdate();
  });
  ["pointerup", "pointercancel"].forEach((ev) =>
    canvas.addEventListener(ev, () => (dragging = false))
  );
}

makeDraggable(cvPfp, state.pfp, renderAll);
makeDraggable(cvBanner, state.banner, renderAll);

function wireUpload(dropEl, fileEl, assign) {
  const open = () => fileEl.click();
  dropEl.addEventListener("click", open);
  dropEl.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") open(); });
  dropEl.addEventListener("dragover", (e) => { e.preventDefault(); dropEl.classList.add("dragover"); });
  dropEl.addEventListener("dragleave", () => dropEl.classList.remove("dragover"));
  dropEl.addEventListener("drop", (e) => {
    e.preventDefault();
    dropEl.classList.remove("dragover");
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  });
  fileEl.addEventListener("change", () => fileEl.files[0] && loadFile(fileEl.files[0]));

  function loadFile(file) {
    if (!file.type.startsWith("image/")) return;
    const img = new Image();
    img.onload = () => {
      assign(img);
      dropEl.classList.add("loaded");
      dropEl.querySelector("span").textContent = file.name;
      renderAll();
      URL.revokeObjectURL(img.src);
      fileEl.value = "";
    };
    img.src = URL.createObjectURL(file);
  }
}

wireUpload($("#dropPfp"), $("#filePfp"), (img) => {
  state.pfpSrc = img;
  state.pfp.zoom = 1; state.pfp.ox = 0; state.pfp.oy = 0;
  $("#zoomPfp").value = 1;
});
wireUpload($("#dropBanner"), $("#fileBanner"), (img) => {
  state.bannerSrc = img;
  state.banner.zoom = 1; state.banner.ox = 0; state.banner.oy = 0;
  $("#zoomBanner").value = 1;
});

const bind = (id, key) => {
  $(id).addEventListener("input", (e) => {
    state[key] = e.target.value;
    renderAll();
  });
};
bind("#inStatus", "status");
bind("#inPresence", "presence");

const inColor = $("#inColor");
inColor.addEventListener("input", (e) => {
  const v = e.target.value.trim();
  const valid = /^#?[0-9a-fA-F]{6}$/.test(v) || /^#?[0-9a-fA-F]{3}$/.test(v);
  inColor.style.borderColor = valid || v === "" ? "" : "#f23f43";
  if (!valid) return;
  let hex = v.startsWith("#") ? v : "#" + v;
  if (hex.length === 4) hex = "#" + [...hex.slice(1)].map((c) => c + c).join("");
  state.cardBg = hex;
  renderAll();
});

$("#zoomPfp").addEventListener("input", (e) => { state.pfp.zoom = +e.target.value; renderAll(); });
$("#zoomBanner").addEventListener("input", (e) => { state.banner.zoom = +e.target.value; renderAll(); });

function slug() {
  return (state.displayName || "discord").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "discord";
}

function canvasBlob(canvas) {
  return new Promise((res) => canvas.toBlob(res, "image/png"));
}

async function downloadCanvas(canvas, name) {
  const blob = await canvasBlob(canvas);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

document.querySelectorAll("button.dl").forEach((btn) => {
  btn.addEventListener("click", () => {
    const what = btn.dataset.what;
    const s = slug();
    if (what === "pfp") downloadCanvas(cvPfp, `${s}-pfp-1080.png`);
    if (what === "banner") downloadCanvas(cvBanner, `${s}-banner-680.png`);
    if (what === "profile") downloadCanvas(cvProfile, `${s}-profile-preview.png`);
    if (what === "slide") downloadCanvas(cvSlide, `${s}-tiktok-slide.png`);
  });
});

$("#zipBtn").addEventListener("click", async () => {
  if (typeof JSZip === "undefined") {
    alert("JSZip failed to load from the CDN. Check your connection, or download the images individually.");
    return;
  }
  const s = slug();
  const zip = new JSZip();
  const [pfp, ban, prof, slide] = await Promise.all(
    [cvPfp, cvBanner, cvProfile, cvSlide].map(canvasBlob)
  );
  zip.file(`${s}-pfp-1080.png`, pfp);
  zip.file(`${s}-banner-680.png`, ban);
  zip.file(`${s}-profile-preview.png`, prof);
  zip.file(`${s}-tiktok-slide.png`, slide);
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${s}-discord-kit.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});

renderAll();
if (document.fonts && document.fonts.load) {
  Promise.all(
    [400, 500, 600, 700].map((w) => document.fonts.load(`${w} 14px "gg sans"`))
  ).then(renderAll).catch(() => {});
}
