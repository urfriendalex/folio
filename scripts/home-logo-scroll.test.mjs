import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("returning to the hero targets document zero with Lenis and native scrolling", () => {
  const source = fs.readFileSync(new URL("../lib/smoothScroll.ts", import.meta.url), "utf8");
  const script = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  for (const mode of ["lenis", "native", "reduced-motion"]) {
    const calls = [];
    const window = {
      scrollY: 1800,
      matchMedia: () => ({ matches: mode === "reduced-motion" }),
      scrollTo: (options) => calls.push({ kind: "native", ...options }),
      __lenis: mode === "native" ? undefined : {
        resize() {},
        scrollTo: (target, options) => calls.push({ kind: "lenis", target, ...options }),
      },
    };
    const exports = {};
    vm.runInNewContext(script, {
      exports,
      window,
      document: {
        // The hero has a nonzero document offset; logo navigation must ignore it.
        getElementById: () => ({ id: "hero", getBoundingClientRect: () => ({ top: -1728 }) }),
      },
    });
    exports.scrollToHeroSection();
    assert.equal(calls.length, 1, mode);
    if (mode === "lenis") {
      assert.equal(calls[0].target, 0);
      assert.equal(calls[0].offset, 0);
    } else {
      assert.equal(calls[0].top, 0);
      assert.equal(calls[0].behavior, mode === "native" ? "smooth" : "auto");
    }
  }
});
