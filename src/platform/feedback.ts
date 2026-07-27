export const FEEDBACK_FORM_URL = "https://tally.so/r/obY2J5";

export type ExternalPageOpener = (
  url: string,
  target: string,
  features: string,
) => Window | null;

export const openFeedbackForm = (openPage: ExternalPageOpener): void => {
  openPage(FEEDBACK_FORM_URL, "_blank", "noopener,noreferrer");
};
