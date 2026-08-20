import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = join(process.cwd(), "src");

const DATA_KEYS = [
  "luxa_" + "inventory",
  "luxa_" + "sales",
  "luxa_" + "investors",
  "luxa_" + "withdrawals",
];

function sourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...sourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

describe("cleanup guard", () => {
  it("leaves no localStorage writes for the four data keys", () => {
    const offenders = sourceFiles(SRC_DIR).filter((file) => {
      const content = readFileSync(file, "utf8");
      return DATA_KEYS.some((key) =>
        content.includes(`localStorage.setItem("${key}"`),
      );
    });

    expect(offenders).toEqual([]);
  });

  it("leaves no imports of the deleted DataContext module", () => {
    const offenders = sourceFiles(SRC_DIR).filter((file) => {
      const content = readFileSync(file, "utf8");
      return /["'](?:[^"']*\/)?DataContext["']/.test(content);
    });

    expect(offenders).toEqual([]);
  });
});