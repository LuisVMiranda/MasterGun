import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { ASSET_MANIFEST, validateAssetManifest } from "../src/render/assets/assetManifest.js";

const strict = process.argv.includes("--strict");
const errors = validateAssetManifest();
const pending = [];

for (const asset of ASSET_MANIFEST.filter((item) => item.modelUrl)) {
  await validateModel(asset, errors, pending);
}

if (pending.length > 0) console.log(`Pending prototype GLBs: ${pending.join(", ")}`);
if (strict && pending.length > 0) errors.push(`${pending.length} runtime GLBs are missing.`);

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Art manifest valid: ${ASSET_MANIFEST.length} assets, ${pending.length} GLBs pending approval/build.`);

async function validateModel(asset, errors, pending) {
  const path = join(process.cwd(), "public", asset.modelUrl.replace(/^\/assets\//, "assets/"));
  try {
    const [header, metadata] = await Promise.all([readFile(path, { encoding: null, flag: "r" }), stat(path)]);
    if (header.subarray(0, 4).toString("utf8") !== "glTF") errors.push(`${asset.id} is not a binary glTF file.`);
    if (metadata.size > asset.budget.kilobytes * 1024) errors.push(`${asset.id} exceeds its ${asset.budget.kilobytes} KB budget.`);
  } catch {
    pending.push(asset.id);
  }
}
