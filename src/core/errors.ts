import type { FootprintIssue, IssueSeverity } from "./domain";

export const issue = (
  code: string,
  severity: IssueSeverity,
  message: string,
  details: Pick<FootprintIssue, "featureIndex" | "path"> = {},
): FootprintIssue => ({ code, severity, message, ...details });

export const fatal = (
  code: string,
  message: string,
  details?: Pick<FootprintIssue, "featureIndex" | "path">,
): FootprintIssue => issue(code, "fatal", message, details);

export const warning = (
  code: string,
  message: string,
  details?: Pick<FootprintIssue, "featureIndex" | "path">,
): FootprintIssue => issue(code, "warning", message, details);
