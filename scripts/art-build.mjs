import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const output = join(root, "public", "assets", "models");
const script = join(root, "scripts", "blender", "master_gun_assets.py");
const blender = findBlender();

if (!blender) {
  console.error("Blender was not found. Set BLENDER_PATH or install Blender before generating runtime GLBs.");
  process.exit(1);
}

await mkdir(output, { recursive: true });
const result = spawnSync(blender, ["--background", "--python", script, "--", "--output", output], { cwd: root, stdio: "inherit" });
process.exit(result.status ?? 1);

function findBlender() {
  const candidates = [
    process.env.BLENDER_PATH,
    "C:/Program Files/Blender Foundation/Blender 4.5/blender.exe",
    "C:/Program Files/Blender Foundation/Blender 4.4/blender.exe",
    "C:/Program Files/Blender Foundation/Blender 4.3/blender.exe",
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}
