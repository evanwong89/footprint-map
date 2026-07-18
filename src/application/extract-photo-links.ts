const IMAGE_EXTENSION = /\.(?:jpe?g|heic|png)$/i;

export const extractEmbeddedPhotoLinks = (markdown: string): string[] => {
  const links: string[] = [];
  for (const match of markdown.matchAll(/!\[\[([^\]]+)\]\]/g)) {
    const target = match[1]?.split(/\\?\||#/)[0]?.trim();
    if (target && IMAGE_EXTENSION.test(target)) links.push(target);
  }
  for (const match of markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
    const raw = match[1]?.trim().replace(/^<|>$/g, "");
    if (raw && IMAGE_EXTENSION.test(raw)) links.push(raw);
  }
  return [...new Set(links)];
};
