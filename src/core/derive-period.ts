import type { VisitPeriod } from "./domain";

const PERIODS = [
  { start: 5, end: 11, period: "morning" },
  { start: 11, end: 14, period: "noon" },
  { start: 14, end: 18, period: "afternoon" },
  { start: 18, end: 24, period: "evening" },
] as const;

export const localHourFromRfc3339 = (value: string): number => {
  const match = value.match(/^\d{4}-\d{2}-\d{2}T(\d{2}):/);
  return match ? Number(match[1]) : Number.NaN;
};

export const derivePeriod = (capturedAt: string): VisitPeriod | "unknown" => {
  const hour = localHourFromRfc3339(capturedAt);
  if (!Number.isFinite(hour)) return "unknown";
  return PERIODS.find(({ start, end }) => hour >= start && hour < end)?.period ?? "night";
};
