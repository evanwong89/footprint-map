import { describe, expect, it, vi } from "vitest";
import { FEEDBACK_FORM_URL, openFeedbackForm } from "../../src/platform/feedback";

describe("feedback form", () => {
  it("opens the public Tally form in a separate, isolated page", () => {
    const openPage = vi.fn(() => null);

    openFeedbackForm(openPage);

    expect(openPage).toHaveBeenCalledOnce();
    expect(openPage).toHaveBeenCalledWith(
      FEEDBACK_FORM_URL,
      "_blank",
      "noopener,noreferrer",
    );
  });
});
