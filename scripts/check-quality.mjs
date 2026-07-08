import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const TARGETS = ["src", "tests", "scripts"];
const MAX_LINES = 600;
const MAX_NESTING = 3;

const files = [];

for (const target of TARGETS) {
  await collectFiles(join(ROOT, target), files);
}

const failures = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  checkLines(file, source, failures);
  checkNesting(file, source, failures);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Quality check passed for ${files.length} files.`);

async function collectFiles(directory, output) {
  let entries = [];

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collectFiles(path, output);
    if (/\.(js|mjs|css|html|md)$/.test(entry.name)) output.push(path);
  }
}

function checkLines(file, source, failures) {
  const count = source.split(/\r?\n/).length;

  if (count > MAX_LINES) {
    failures.push(`${relative(file)} has ${count} lines; max is ${MAX_LINES}.`);
  }
}

function checkNesting(file, source, failures) {
  if (!/\.(js|mjs)$/.test(file)) return;

  const maxDepth = getControlDepth(source);

  if (maxDepth > MAX_NESTING) {
    failures.push(`${relative(file)} has control nesting depth ${maxDepth}; max is ${MAX_NESTING}.`);
  }
}

function getControlDepth(source) {
  let depth = 0;
  let maxDepth = 0;

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    const opensControl = /^(if|for|while|switch|try|catch)\b/.test(trimmed);
    const closeCount = (trimmed.match(/}/g) ?? []).length;
    const openCount = (trimmed.match(/{/g) ?? []).length;
    if (opensControl) maxDepth = Math.max(maxDepth, depth + 1);
    depth += openCount - closeCount;
  }

  return maxDepth;
}

function relative(file) {
  return file.replace(`${ROOT}\\`, "").replaceAll("\\", "/");
}
