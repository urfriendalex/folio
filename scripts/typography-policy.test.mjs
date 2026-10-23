import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("typography guard accepts real styles and blocks new sources of drift", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "folio-type-policy-"));
  const copyStyles = (relative) => {
    for (const item of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const file = path.join(relative, item.name);
      if (item.isDirectory()) copyStyles(file);
      else if (file.endsWith(".scss")) {
        fs.mkdirSync(path.dirname(path.join(fixture, file)), { recursive: true });
        fs.copyFileSync(path.join(root, file), path.join(fixture, file));
      }
    }
  };
  try {
    for (const directory of ["app", "components", "styles"]) copyStyles(directory);
    fs.mkdirSync(path.join(fixture, "scripts"));
    const checker = path.join(fixture, "scripts/check-typography.mjs");
    fs.copyFileSync(path.join(root, "scripts/check-typography.mjs"), checker);
    const run = () => spawnSync(process.execPath, [checker], { encoding: "utf8" });
    assert.equal(run().status, 0);
    const target = path.join(fixture, "components/sections/Hero/HomeHero.module.scss");
    const original = fs.readFileSync(target, "utf8");
    for (const rule of [
      "font-size: 0.77rem",
      "font-size: var(--type-undefined-size)",
      "font: 12px sans-serif",
      "font-family: UnplannedFont, sans-serif",
      "line-height: 18px",
    ]) {
      fs.writeFileSync(target, `${original}\n.regression { ${rule}; }\n`);
      const result = run();
      assert.notEqual(result.status, 0, rule);
      assert.match(result.stderr, /HomeHero\.module\.scss/, rule);
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
