import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("home hash arrivals are covered before hydration, preserving history restores", () => {
  const source = fs.readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const start = source.indexOf("  // Reveal policy");
  const end = source.indexOf("  // Track input before hydration", start);
  assert.ok(start >= 0 && end > start);
  for (const [pathname, hash, type, covered] of [
    ["/", "#contact", "reload", true],
    ["/", "#contact-form", "navigate", true],
    ["/", "#work", "navigate", true],
    ["/", "#contact", "back_forward", false],
    ["/", "", "reload", false],
    ["/projects", "#contact", "navigate", false],
  ]) {
    const classes = new Set();
    vm.runInNewContext(source.slice(start, end), {
      html: { classList: { add: (name) => classes.add(name) } },
      location: { pathname, hash },
      performance: { getEntriesByType: () => [{ type }] },
    });
    assert.equal(classes.has("home-section-initial-pending"), covered, `${pathname}${hash} ${type}`);
  }
});

test("initial hash scroll waits for the preloader, snaps, then releases the cover", () => {
  const source = fs.readFileSync(new URL("../components/Scroll/SmoothScrollProvider.tsx", import.meta.url), "utf8");
  const start = source.indexOf("function scrollToHomeSectionById(");
  const end = source.indexOf("type SmoothScrollProviderProps", start);
  assert.ok(start >= 0 && end > start);
  const script = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const queued = [];
  const calls = [];
  let loading = true;
  let released = false;
  const context = vm.createContext({
    document: {
      getElementById: () => ({ id: "contact" }),
      documentElement: { classList: { contains: () => loading } },
    },
    requestAnimationFrame: (callback) => queued.push(callback),
    shouldPauseSmoothScroll: () => loading,
    scrollElementIntoView: (_element, options) => calls.push(options),
    window: { dispatchEvent() {} },
    CustomEvent: class {},
  });
  vm.runInContext(script, context);
  context.scrollToHomeSectionById("contact", {
    immediate: true,
    onComplete: () => { released = true; },
  });
  for (let frame = 0; frame < 120; frame++) queued.shift()?.();
  assert.equal(calls.length, 0);
  assert.equal(released, false);
  loading = false;
  queued.shift()();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].immediate, true);
  assert.equal(released, true);
});
