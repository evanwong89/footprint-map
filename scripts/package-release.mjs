import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { verifyRelease } from "./verify-release.mjs";

execFileSync(process.execPath, ["esbuild.config.mjs"], { stdio: "inherit" });
const manifest = JSON.parse(await readFile("release/footprint-map/manifest.json", "utf8"));
if (manifest.id !== "footprint-map") throw new Error("Unexpected plugin manifest id.");
await verifyRelease();
console.log("Plugin package is ready in release/footprint-map.");
