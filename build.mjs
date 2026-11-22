// Builds public/index.html from src/app.html + src/data.js + src/ai.js
import fs from "node:fs";
const app = fs.readFileSync("src/app.html", "utf8"), data = fs.readFileSync("src/data.js", "utf8"), ai = fs.readFileSync("src/ai.js", "utf8");
if (!app.includes("/*DATA*/") || !app.includes("/*AI*/")) throw new Error("markers missing");
const out = app.replace("/*DATA*/", () => data).replace("/*AI*/", () => ai);
fs.writeFileSync("public/index.html", out);
console.log("public/index.html", out.length, "bytes");
