import { createCanvas } from "canvas";
import { writeFileSync } from "fs";

const canvas = createCanvas(800, 600);
const ctx = canvas.getContext("2d");

// Dark background
ctx.fillStyle = "#111111";
ctx.fillRect(0, 0, 800, 600);

// Building icon outline (simple)
ctx.strokeStyle = "#333333";
ctx.lineWidth = 2;

// Main building shape
ctx.strokeRect(280, 200, 240, 280);

// Windows
for (let row = 0; row < 4; row++) {
  for (let col = 0; col < 3; col++) {
    ctx.strokeRect(300 + col * 70, 220 + row * 60, 40, 35);
  }
}

// Door
ctx.strokeRect(370, 420, 60, 60);

// Text
ctx.fillStyle = "#444444";
ctx.font = "16px Arial";
ctx.textAlign = "center";
ctx.fillText("No image available", 400, 540);

const buffer = canvas.toBuffer("image/png");
writeFileSync("./public/placeholder-property.png", buffer);
console.log("Placeholder created");
