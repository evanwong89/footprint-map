import { build, context } from "esbuild";
import { chmod, cp, mkdir } from "node:fs/promises";

const watch = process.argv.includes("--watch");

const builds = [
  {
    entryPoints: ["src/main.ts"],
    bundle: true,
    external: ["obsidian"],
    format: "cjs",
    outfile: "release/footprint-map/main.js",
    platform: "browser",
    minify: !watch,
    sourcemap: watch ? "inline" : false,
    target: "es2022",
    loader: { ".png": "dataurl" },
  },
  {
    entryPoints: ["src/adapters/standalone/bootstrap.ts"],
    bundle: true,
    format: "esm",
    outfile: "dist/standalone/footprint-map.js",
    platform: "browser",
    minify: !watch,
    sourcemap: watch ? "inline" : false,
    target: "es2022",
    loader: { ".png": "dataurl" },
  },
  {
    entryPoints: [{ in: "styles.css", out: "styles" }],
    bundle: true,
    outdir: "release/footprint-map",
    platform: "browser",
    minify: !watch,
    loader: { ".png": "dataurl" },
  },
  {
    entryPoints: [{ in: "styles.css", out: "footprint-map" }],
    bundle: true,
    outdir: "dist/standalone",
    platform: "browser",
    minify: !watch,
    loader: { ".png": "dataurl" },
  },
  {
    entryPoints: ["src/tools/build-test-vault.ts"],
    bundle: true,
    external: ["exifr"],
    format: "esm",
    outfile: "dist/tools/build-test-vault.mjs",
    platform: "node",
    sourcemap: false,
    target: "node20",
  },
  {
    entryPoints: ["src/tools/footprint-map-cli.ts"],
    bundle: true,
    external: ["exifr"],
    format: "esm",
    outfile: "dist/cli/footprint-map.mjs",
    platform: "node",
    sourcemap: false,
    target: "node20",
    banner: { js: "#!/usr/bin/env node" },
  },
];

await mkdir("release/footprint-map", { recursive: true });
await mkdir("dist/standalone/assets", { recursive: true });
await mkdir("dist/tools", { recursive: true });
await mkdir("dist/cli", { recursive: true });
await Promise.all([
  cp("manifest.json", "release/footprint-map/manifest.json"),
  cp("versions.json", "release/footprint-map/versions.json"),
  cp("standalone/index.html", "dist/standalone/index.html"),
  cp("standalone/amap-config.js", "dist/standalone/amap-config.js"),
  cp("examples/2026-07-17.geojson", "dist/standalone/example.geojson"),
  cp("assets/footprint-map-concept-v1.jpg", "dist/standalone/assets/footprint-map-concept-v1.jpg"),
]);

if (watch) {
  const contexts = await Promise.all(builds.map((options) => context(options)));
  await Promise.all(contexts.map((item) => item.watch()));
  console.log("Footprint Map is watching for changes.");
} else {
  await Promise.all(builds.map((options) => build(options)));
}
await chmod("dist/cli/footprint-map.mjs", 0o755);
