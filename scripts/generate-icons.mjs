// Génère les icônes PWA (calendrier stylisé) avec @napi-rs/canvas, sans
// dépendance externe.
import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync, mkdirSync } from "node:fs";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dessinerIcone(size, { maskable = false } = {}) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const rayonFond = maskable ? 0 : size * 0.22;
  const degrade = ctx.createLinearGradient(0, 0, size, size);
  degrade.addColorStop(0, "#3a8a79");
  degrade.addColorStop(1, "#1d4b41");
  ctx.fillStyle = degrade;
  if (maskable) {
    ctx.fillRect(0, 0, size, size);
  } else {
    roundRect(ctx, 0, 0, size, size, rayonFond);
    ctx.fill();
  }

  const echelle = maskable ? 0.72 : 1;
  const decalage = (size * (1 - echelle)) / 2;
  ctx.translate(decalage, decalage);
  const s = size * echelle;

  // Corps du calendrier.
  const cx0 = s * 0.18;
  const cy0 = s * 0.24;
  const cw = s * 0.64;
  const ch = s * 0.58;
  roundRect(ctx, cx0, cy0, cw, ch, s * 0.06);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Bandeau du haut.
  const bandeauH = ch * 0.22;
  ctx.save();
  roundRect(ctx, cx0, cy0, cw, bandeauH, s * 0.06);
  ctx.clip();
  ctx.fillStyle = "#f2b84b";
  ctx.fillRect(cx0, cy0, cw, bandeauH);
  ctx.restore();

  // Anneaux de reliure.
  const anneauR = s * 0.025;
  [cx0 + cw * 0.28, cx0 + cw * 0.72].forEach((ax) => {
    ctx.beginPath();
    ctx.arc(ax, cy0, anneauR, 0, Math.PI * 2);
    ctx.fillStyle = "#1d4b41";
    ctx.fill();
  });

  // Grille de jours (3x3), un jour mis en avant = valeur ajoutée de l'appli.
  const grilleTop = cy0 + bandeauH + ch * 0.1;
  const grilleH = ch * 0.62;
  const cols = 3;
  const rows = 3;
  const gap = cw * 0.07;
  const cellW = (cw - cw * 0.18 - gap * (cols - 1)) / cols;
  const cellH = (grilleH - gap * (rows - 1)) / rows;
  const startX = cx0 + cw * 0.09;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * (cellW + gap);
      const y = grilleTop + r * (cellH + gap);
      const isAccent = r === 1 && c === 1;
      roundRect(ctx, x, y, cellW, cellH, cellW * 0.22);
      ctx.fillStyle = isAccent ? "#3a8a79" : "#dbe9e5";
      ctx.fill();
    }
  }

  return canvas.toBuffer("image/png");
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", dessinerIcone(192));
writeFileSync("public/icons/icon-512.png", dessinerIcone(512));
writeFileSync("public/icons/icon-maskable-192.png", dessinerIcone(192, { maskable: true }));
writeFileSync("public/icons/icon-maskable-512.png", dessinerIcone(512, { maskable: true }));
writeFileSync("public/icons/apple-touch-icon.png", dessinerIcone(180, { maskable: true }));
console.log("Icônes générées dans public/icons/");
