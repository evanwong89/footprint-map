export interface TextPosition {
  line: number;
  ch: number;
}

export interface FootprintBlockInput {
  source: string;
  title: string;
  height?: number;
}

export const createFootprintBlockInsertion = ({
  source,
  title,
  height = 420,
}: FootprintBlockInput): string => (
  `\n\n\`\`\`footprint-map\nsource: ${source}\nheight: ${height}\ntitle: ${title}\n\`\`\`\n`
);

export const positionAfterInsertion = (
  start: TextPosition,
  insertedText: string,
): TextPosition => {
  const lines = insertedText.split("\n");
  if (lines.length === 1) return { line: start.line, ch: start.ch + insertedText.length };
  return {
    line: start.line + lines.length - 1,
    ch: lines.at(-1)?.length ?? 0,
  };
};

export const positionsEqual = (left: TextPosition, right: TextPosition): boolean => (
  left.line === right.line && left.ch === right.ch
);
