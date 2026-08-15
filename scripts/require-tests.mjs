#!/usr/bin/env node
/**
 * require-tests.mjs
 *
 * Enforces 1:1 test coverage parity: every source unit in a "logic" layer
 * (services, controllers, repositories, guards, strategies, pipes) MUST have
 * a colocated `*.spec.ts` file.
 *
 * Exit code: 0 when parity holds, 1 when units are missing tests.
 */
import { readdirSync, existsSync } from 'node:fs';
import { join, extname, relative, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const srcDir = join(root, 'src');

const UNIT_PATTERN = /\.(service|controller|repository|guard|strategy|pipe|listener)\.ts$/;

/** Recursively collect all `.ts` files (non-spec) that require a spec. */
function collectUnits(dir) {
  const units = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      units.push(...collectUnits(full));
    } else if (UNIT_PATTERN.test(entry.name)) {
      units.push(full);
    }
  }
  return units;
}

function hasSpec(unitPath) {
  const dir = dirname(unitPath);
  const base = basename(unitPath).replace(/\.ts$/, '');
  return existsSync(join(dir, `${base}.spec.ts`));
}

const units = collectUnits(srcDir);
const missing = units
  .map((unit) => relative(root, unit))
  .filter((unit) => !hasSpec(join(root, unit)));

if (missing.length === 0) {
  console.log(
    `✔ test parity satisfied: ${units.length} source unit(s) all have specs`,
  );
  process.exit(0);
}

console.error(
  `✘ ${missing.length} source unit(s) missing corresponding *.spec.ts:`,
);
for (const unit of missing) {
  console.error(`  - ${unit}`);
}
process.exit(1);