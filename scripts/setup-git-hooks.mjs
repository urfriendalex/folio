import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

if (!existsSync(path.join(root, ".git"))) {
  process.exit(0);
}

try {
  execSync("git config core.hooksPath .githooks", { cwd: root, stdio: "ignore" });
} catch {
  process.exit(0);
}
