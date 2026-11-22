// Builds public/index.html from src/app.html + src/*.js
import fs from "node:fs";
const rd = f => fs.readFileSync("src/" + f, "utf8");
let out = rd("app.html");
const parts = { "/*DATA*/": "data.js", "/*AI*/": "ai.js", "/*ONBOARD*/": "onboard.js", "/*RU*/": "ru.js", "/*RUDICT*/": "ru-dict.js", "/*I18N*/": "i18n.js" };
for (const [mark, file] of Object.entries(parts)) { if (!out.includes(mark)) throw new Error("marker missing: " + mark); const body = rd(file); out = out.replace(mark, () => body); }
fs.writeFileSync("public/index.html", out);
console.log("public/index.html", out.length, "bytes");
