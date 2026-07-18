export const dirname = (path: string): string => {
  const index = path.lastIndexOf("/");
  return index < 0 ? "" : path.slice(0, index);
};

export const basename = (path: string): string => path.slice(path.lastIndexOf("/") + 1);

export const resolveVaultPath = (reference: string, sourcePath: string): string => {
  const decoded = decodeURIComponent(reference).replaceAll("\\", "/");
  const parts = (decoded.startsWith("/") ? decoded.slice(1) : `${dirname(sourcePath)}/${decoded}`)
    .split("/")
    .filter((part) => part && part !== ".");
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "..") {
      if (!resolved.length) throw new Error("FM_PATH_OUTSIDE_VAULT: 路径越过 Vault 根目录。");
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  return resolved.join("/");
};
