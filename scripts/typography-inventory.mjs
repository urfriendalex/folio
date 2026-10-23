import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const properties = ["font-family", "font-size", "font-weight", "line-height", "letter-spacing"];
const inventory = Object.fromEntries(properties.map((property) => [property, []]));
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filename);
    else if (filename.endsWith(".scss")) {
      const source = fs.readFileSync(filename, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      for (const property of properties) {
        for (const match of source.matchAll(new RegExp(`(?<![\\w-])${property}\\s*:\\s*([^;{}]+)`, "g"))) {
          inventory[property].push({ file: path.relative(root, filename), value: match[1].trim() });
        }
      }
    }
  }
}
for (const directory of ["app", "components", "styles"]) walk(path.join(root, directory));
const result = Object.fromEntries(properties.map((property) => [property, {
  declarations: inventory[property].length,
  distinctValues: [...new Set(inventory[property].map(({ value }) => value))].sort(),
  files: new Set(inventory[property].map(({ file }) => file)).size,
  entries: inventory[property],
}]));
if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
else for (const [property, data] of Object.entries(result)) {
  console.log(`${property}: ${data.declarations} declarations, ${data.distinctValues.length} source values, ${data.files} files`);
}
