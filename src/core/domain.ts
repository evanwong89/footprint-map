export type VisitSource = "manual" | "photo-exif" | "gpx-stop";
export type VisitPeriod = "morning" | "noon" | "afternoon" | "evening" | "night";
export type TimeConfidence = "exact-offset" | "configured-timezone" | "manual";

export interface FootprintPhoto {
  path: string;
  capturedAt?: string;
  caption?: string;
  isPrimary?: boolean;
}

export interface FootprintVisit {
  id: string;
  observedAt: string;
  timeConfidence: TimeConfidence;
  coordinates: {
    longitude: number;
    latitude: number;
  };
  label?: string;
  note?: string;
  photos: readonly FootprintPhoto[];
  source: VisitSource;
  period?: VisitPeriod;
}

export interface FootprintDocument {
  schemaVersion: "1.0";
  title?: string;
  timezone: string;
  createdAt: string;
  visits: readonly FootprintVisit[];
}

export type IssueSeverity = "fatal" | "warning";

export interface FootprintIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  featureIndex?: number;
  path?: string;
}

export interface ValidationResult {
  document?: FootprintDocument;
  issues: readonly FootprintIssue[];
}

export interface VisitViewModel extends FootprintVisit {
  sequence: number;
  displayTime: string;
  displayPeriod: VisitPeriod | "unknown";
}

export interface SequenceSegment {
  fromId: string;
  toId: string;
  from: FootprintVisit["coordinates"];
  to: FootprintVisit["coordinates"];
}

export interface FootprintViewModel {
  title: string;
  visits: readonly VisitViewModel[];
  segments: readonly SequenceSegment[];
  issues: readonly FootprintIssue[];
}
