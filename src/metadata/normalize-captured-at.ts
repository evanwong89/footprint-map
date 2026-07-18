const pad = (value: number): string => String(value).padStart(2, "0");
const OFFSET = /^(?:Z|[+-]\d{2}:?\d{2})$/;

const normalizedOffset = (value: string): string => {
  if (value === "Z") return value;
  return value.includes(":") ? value : `${value.slice(0, 3)}:${value.slice(3)}`;
};

export const normalizeCapturedAt = (date: unknown, offset: unknown): string | undefined => {
  if (typeof offset !== "string" || !OFFSET.test(offset)) return undefined;
  const suffix = normalizedOffset(offset);
  if (date instanceof Date && Number.isFinite(date.getTime())) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${suffix}`;
  }
  if (typeof date === "string") {
    const match = date.match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}${suffix}`;
  }
  return undefined;
};
