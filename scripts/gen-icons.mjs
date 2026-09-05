// Renders the Vero raven into PWA icons. Run: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const raven = (pad, bg, fg, eye) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="${bg}"/>
  <g transform="translate(${pad} ${pad}) scale(${(32 - pad * 2) / 32})">
    <path d="M5.5 15C5.5 6.5 11 3.5 15.5 3.5C18.5 3.5 20.5 5 22 6.5L31 11.5L21.5 13.2C21.6 19.5 19 24 14.5 26L13.8 29.5H11.6L11.4 26.6C7.5 25 5.5 21 5.5 15Z" fill="${fg}"/>
    <circle cx="13.2" cy="10.6" r="1.9" fill="${eye}"/>
  </g>
</svg>`;

mkdirSync("public/icons", { recursive: true });
const jobs = [
  ["public/icons/icon-192.png", 192, raven(3, "#f3f1ec", "#131312", "#f3f1ec")],
  ["public/icons/icon-512.png", 512, raven(3, "#f3f1ec", "#131312", "#f3f1ec")],
  ["public/icons/icon-512-maskable.png", 512, raven(6, "#131312", "#f3f1ec", "#131312")],
  ["public/icons/apple-touch-icon.png", 180, raven(4, "#f3f1ec", "#131312", "#f3f1ec")],
  ["public/icons/og.png", 1200, raven(8, "#f3f1ec", "#131312", "#f3f1ec")],
];
for (const [out, size, svg] of jobs) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log("wrote", out);
}
