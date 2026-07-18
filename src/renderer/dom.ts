export const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = createEl(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
