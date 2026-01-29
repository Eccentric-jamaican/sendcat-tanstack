export type MerchantKey = "amazon" | "shein" | "ebay" | "temu";

export type MerchantFilterConfig = {
  key: MerchantKey;
  displayName: string;

  // Domains to match against DKIM header.d (preferred) and From/Reply-To (fallback)
  dkimAllow: string[];
  dkimDeny?: string[];
  fromAllow?: string[];

  // Simple keyword filters (case-insensitive substring match)
  subjectInclude: string[];
  subjectExclude: string[];

  // At least one marker must appear in the body/snippet to treat as transactional
  requiredBodyMarkers: string[];
};

// NOTE: Start conservative. We can expand these allowlists as we observe real sender/signing domains.
export const merchantConfigs: Record<MerchantKey, MerchantFilterConfig> = {
  amazon: {
    key: "amazon",
    displayName: "Amazon",
    dkimAllow: ["amazon.com"],
    subjectInclude: [
      "order",
      "has shipped",
      "shipped",
      "delivery",
      "delivered",
      "out for delivery",
      "arriving",
      "dispatch",
      "confirmation",
      "track",
      "tracking",
      "shipment",
    ],
    subjectExclude: [
      "deal",
      "sale",
      "% off",
      "off ",
      "coupon",
      "promo",
      "recommend",
      "new for you",
      "top picks",
    ],
    // Avoid overly-generic markers like "order" since promos can contain "order now".
    requiredBodyMarkers: ["order #", "order number", "tracking", "total", "subtotal"],
  },

  shein: {
    key: "shein",
    displayName: "SHEIN",
    // Transactional can come from multiple signing domains depending on the campaign.
    // We'll rely on subject/body markers to filter out marketing mail.
    dkimAllow: ["sheinnotice.com", "sheinemail.com", "shein.com"],
    subjectInclude: [
      "order",
      "confirmation",
      "shipped",
      "has been shipped",
      "delivered",
      "tracking",
      "dispatch",
    ],
    subjectExclude: [
      "sale",
      "% off",
      "off ",
      "deal",
      "coupon",
      "promo",
      "every sale",
      "new",
      "arrivals",
      "limited time",
      "flash",
    ],
    requiredBodyMarkers: ["order #", "order number", "tracking", "track", "total", "subtotal", "items"],
  },

  ebay: {
    key: "ebay",
    displayName: "eBay",
    dkimAllow: ["ebay.com"],
    subjectInclude: [
      "order",
      "confirmed",
      "shipped",
      "delivered",
      "tracking",
      "your item",
    ],
    subjectExclude: ["sale", "% off", "deal", "coupon", "promo", "watch", "ending soon"],
    requiredBodyMarkers: ["order #", "order number", "tracking", "total", "subtotal"],
  },

  temu: {
    key: "temu",
    displayName: "Temu",
    dkimAllow: ["temu.com"],
    subjectInclude: [
      "order",
      "confirmation",
      "shipped",
      "delivered",
      "tracking",
      "dispatch",
    ],
    subjectExclude: ["sale", "% off", "deal", "coupon", "promo", "new", "arrivals"],
    requiredBodyMarkers: ["order #", "order number", "tracking", "total", "subtotal"],
  },
};
