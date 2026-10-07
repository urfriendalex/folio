import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("focus modality follows input before hydration without moving focus", () => {
  const source = fs.readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const start = source.indexOf("  // Track input before hydration");
  const end = source.indexOf("  let theme", start);
  assert.ok(start >= 0 && end > start);
  const listeners = new Map();
  const attributes = new Map();
  vm.runInNewContext(source.slice(start, end), {
    document: { addEventListener: (type, listener, options) => {
      listeners.set(type, { listener, options });
    } },
    html: { setAttribute: (name, value) => attributes.set(name, value) },
  });
  const modality = () => attributes.get("data-input-modality");
  const pointer = listeners.get("pointerdown");
  const keyboard = listeners.get("keydown");
  assert.equal(modality(), undefined); // Native/no-JS focus remains the fallback.
  assert.equal(pointer.options.capture, true);
  assert.equal(pointer.options.passive, true);
  assert.equal(keyboard.options, true);
  for (const pointerType of ["touch", "mouse", "pen"]) {
    pointer.listener({ pointerType });
    assert.equal(modality(), "pointer");
    for (const key of ["Shift", "Control", "Alt", "Meta"]) {
      keyboard.listener({ key });
      assert.equal(modality(), "pointer");
    }
    keyboard.listener({ key: "c", metaKey: true });
    assert.equal(modality(), "pointer");
    for (const key of ["Tab", "Escape", "Enter", "ArrowDown"]) {
      keyboard.listener({ key, shiftKey: true });
      assert.equal(modality(), "keyboard");
    }
  }
});
