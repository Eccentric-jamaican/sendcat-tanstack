import { describe, expect, test } from "vitest";
import { shouldProcessGmailMessage } from "./filter";

function msg(headers: Record<string, string>, opts?: { labelIds?: string[]; snippet?: string }) {
  return {
    labelIds: opts?.labelIds ?? ["INBOX"],
    snippet: opts?.snippet ?? "",
    payload: {
      headers: Object.entries(headers).map(([name, value]) => ({ name, value })),
    },
  };
}

describe("shouldProcessGmailMessage", () => {
  test("falls back to HTML-derived text when bodyText is empty", () => {
    const result = shouldProcessGmailMessage({
      message: msg({
        Subject: "Your SHEIN order has been shipped",
        "Authentication-Results": "dkim=pass header.d=sheinnotice.com;",
        From: "SHEIN <noreply@sheinnotice.com>",
      }),
      bodyText: "",
      bodyHtml: "<p>Order number: GSU1TB05400MV2T</p><p>Tracking number: GFUS010...</p>",
    });

    expect(result.matched).toBe(true);
    if (result.matched) expect(result.merchant).toBe("shein");
  });

  test("allows CATEGORY_PROMOTIONS when it matches transactional signals", () => {
    const result = shouldProcessGmailMessage({
      message: msg(
        {
          Subject: "Your SHEIN order has been shipped",
          "Authentication-Results": "dkim=pass header.d=sheinnotice.com;",
          From: "SHEIN <noreply@sheinnotice.com>",
        },
        { labelIds: ["INBOX", "CATEGORY_PROMOTIONS"] },
      ),
      bodyText: "Order #12345 Total $19.99",
    });

    expect(result.matched).toBe(true);
    if (result.matched) expect(result.merchant).toBe("shein");
  });

  test("matches SHEIN transactional (dkim allow)", () => {
    const result = shouldProcessGmailMessage({
      message: msg({
        Subject: "Your SHEIN order has been shipped",
        "Authentication-Results": "dkim=pass header.d=sheinnotice.com;",
        From: "SHEIN <noreply@sheinnotice.com>",
        "Reply-To": "SHEIN <noreply@sheinemail.com>",
      }),
      bodyText: "Order #12345 Tracking number: 1Z999 Total $19.99",
    });

    expect(result.matched).toBe(true);
    if (result.matched) expect(result.merchant).toBe("shein");
  });

  test("rejects SHEIN marketing domain (dkim deny)", () => {
    const result = shouldProcessGmailMessage({
      message: msg({
        Subject: "Every Sale You Want, Inside",
        "Authentication-Results": "dkim=pass header.d=market-us.shein.com;",
        From: "SHEIN <shein@market-us.shein.com>",
      }),
      bodyText: "Flash sale 70% off",
    });

    expect(result.matched).toBe(false);
  });

  test("matches Amazon order confirmation", () => {
    const result = shouldProcessGmailMessage({
      message: msg({
        Subject: "Your Amazon.com order #123-1234567-1234567",
        "Authentication-Results": "dkim=pass header.d=amazon.com;",
        From: "Amazon.com <auto-confirm@amazon.com>",
      }),
      bodyText: "Order #123-1234567-1234567 Total: $49.99",
    });

    expect(result.matched).toBe(true);
    if (result.matched) expect(result.merchant).toBe("amazon");
  });
});
