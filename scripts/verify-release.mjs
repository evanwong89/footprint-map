import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const requiredRepositoryFiles = [
  "README.md",
  "LICENSE",
  "manifest.json",
  "versions.json",
  "THIRD_PARTY_NOTICES.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "package-lock.json",
];
const requiredReleaseFiles = ["main.js", "manifest.json", "styles.css"];
const excludedDirectories = new Set([".git", "node_modules", "dist", "release", "test-vault", "coverage"]);
const textExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".ts", ".yml", ".yaml"]);

const existsAndIsNonEmpty = async (path) => {
  try {
    return (await stat(path)).size > 0;
  } catch {
    return false;
  }
};

const extensionOf = (path) => {
  const index = path.lastIndexOf(".");
  return index < 0 ? "" : path.slice(index).toLowerCase();
};

const collectTextFiles = async (directory, root = directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectTextFiles(path, root));
    else if (textExtensions.has(extensionOf(entry.name))) files.push({ path, relative: path.slice(root.length + 1) });
  }
  return files;
};

export const verifyRelease = async (root = process.cwd()) => {
  const errors = [];
  for (const file of requiredRepositoryFiles) {
    if (!await existsAndIsNonEmpty(resolve(root, file))) errors.push(`Missing required repository file: ${file}`);
  }
  for (const file of requiredReleaseFiles) {
    if (!await existsAndIsNonEmpty(resolve(root, "release/footprint-map", file))) {
      errors.push(`Missing required release asset: ${file}`);
    }
  }

  const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));
  const releaseManifest = JSON.parse(await readFile(resolve(root, "release/footprint-map/manifest.json"), "utf8"));
  const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const versions = JSON.parse(await readFile(resolve(root, "versions.json"), "utf8"));
  if (manifest.version !== packageJson.version) errors.push("manifest.json and package.json versions differ.");
  if (JSON.stringify(manifest) !== JSON.stringify(releaseManifest)) errors.push("Release manifest differs from the repository manifest.");
  if (versions[manifest.version] !== manifest.minAppVersion) {
    errors.push("versions.json does not map the current plugin version to manifest.minAppVersion.");
  }
  if (
    process.env.GITHUB_REF_TYPE === "tag"
    && process.env.GITHUB_REF_NAME
    && process.env.GITHUB_REF_NAME !== manifest.version
  ) {
    errors.push(`Git tag ${process.env.GITHUB_REF_NAME} must exactly match manifest version ${manifest.version}.`);
  }

  const config = await readFile(resolve(root, "standalone/amap-config.js"), "utf8");
  for (const field of ["webServiceKey"]) {
    const match = config.match(new RegExp(`${field}\\s*:\\s*["']([^"']*)["']`));
    if (!match) errors.push(`Unable to verify standalone AMap ${field}.`);
    else if (match[1].trim()) errors.push(`standalone/amap-config.js contains a non-empty ${field}.`);
  }

  for (const { path, relative } of await collectTextFiles(root)) {
    const content = await readFile(path, "utf8");
    if (/\/Users\/[^/]+\//.test(content)) errors.push(`${relative} contains a macOS user path.`);
    if (/\bLifeOS\b/.test(content)) errors.push(`${relative} contains a private workspace name.`);
  }

  const bundle = await readFile(resolve(root, "release/footprint-map/main.js"), "utf8");
  if (/sourceMappingURL=/.test(bundle)) errors.push("Production main.js contains a source map reference.");
  if (/\b(?:amapKey|webServiceKey|securityJsCode)\s*[:=]\s*["'][A-Za-z0-9_-]{16,}["']/.test(bundle)) {
    errors.push("Production main.js may contain a hard-coded AMap credential.");
  }

  if (errors.length) throw new Error(`Release verification failed:\n- ${errors.join("\n- ")}`);
  console.log(`Verified Footprint Map ${manifest.version} release assets.`);
};

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  await verifyRelease();
}
