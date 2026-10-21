import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("focus modality follows navigation input before hydration without moving focus", () => {
  const source = fs.readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const start = source.indexOf("  // Track input before hydration");
  const end = source.indexOf("  let theme", start);
  assert.ok(start >= 0 && end > start);
  const listeners = new Map();
  const attributes = new Map();
  const html = { setAttribute: (name, value) => attributes.set(name, value) };
  const body = {};
  const control = {};
  const document = {
    body,
    activeElement: body,
    addEventListener: (type, listener, options) => {
      listeners.set(type, { listener, options });
    },
  };
  vm.runInNewContext(source.slice(start, end), { document, html });
  const modality = () => attributes.get("data-input-modality");
  const pointer = listeners.get("pointerdown");
  const keyboard = listeners.get("keydown");
  // Starts quiet: programmatic focus (dialog autofocus, focus restore) never shows a ring.
  assert.equal(modality(), "pointer");
  assert.equal(pointer.options.capture, true);
  assert.equal(pointer.options.passive, true);
  assert.equal(keyboard.options, true);

  for (const pointerType of ["touch", "mouse", "pen"]) {
    pointer.listener({ pointerType });
    assert.equal(modality(), "pointer");

    // Non-navigation keys and shortcuts keep pointer mode.
    for (const key of ["Shift", "Control", "Alt", "Meta", "Escape", "Enter", " "]) {
      keyboard.listener({ key });
      assert.equal(modality(), "pointer");
    }
    keyboard.listener({ key: "c", metaKey: true });
    assert.equal(modality(), "pointer");

    // Arrows only navigate when a control has focus; on the page they scroll.
    document.activeElement = body;
    keyboard.listener({ key: "ArrowDown" });
    assert.equal(modality(), "pointer");
    document.activeElement = control;
    keyboard.listener({ key: "ArrowDown" });
    assert.equal(modality(), "keyboard");

    pointer.listener({ pointerType });
    document.activeElement = body;
    keyboard.listener({ key: "Tab", shiftKey: true });
    assert.equal(modality(), "keyboard");
  }
});
