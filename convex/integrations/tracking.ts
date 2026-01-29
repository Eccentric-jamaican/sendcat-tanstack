import type { CarrierKey, TrackingInfo } from "./types";

const CARRIER_PATTERNS: { carrier: CarrierKey; patterns: RegExp[] }[] = [
  {
    carrier: "amazon",
    // Amazon Logistics — must be checked before generic numeric patterns
    patterns: [/\bTBA\d{12,}\b/i],
  },
  {
    carrier: "ups",
    patterns: [
      /\b1Z[A-Z0-9]{16}\b/i, // UPS standard
      /\bT\d{10}\b/, // UPS freight
    ],
  },
  {
    carrier: "usps",
    patterns: [
      /\b(94|93|92|95)\d{18,22}\b/, // USPS domestic
      /\b[A-Z]{2}\d{9}US\b/i, // USPS international
    ],
  },
  {
    carrier: "dhl",
    patterns: [
      /\bJD\d{18}\b/i, // DHL eCommerce
      /\b\d{10}\b/, // DHL Express (10 digits)
    ],
  },
  {
    carrier: "fedex",
    patterns: [
      /\b\d{12}\b/, // FedEx Express (12 digits)
      /\b\d{15}\b/, // FedEx Ground (15 digits)
      /\b\d{20,22}\b/, // FedEx SmartPost (20-22 digits)
    ],
  },
];

/**
 * Detects the carrier from a tracking number string.
 * Returns null if no pattern matches.
 */
export function detectCarrier(trackingNumber: string): CarrierKey | null {
  const trimmed = trackingNumber.trim();
  for (const { carrier, patterns } of CARRIER_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) return carrier;
    }
  }
  return null;
}

/**
 * Extracts tracking numbers from free text using carrier-specific patterns.
 * Deduplicates by uppercased tracking number.
 */
export function extractTrackingNumbers(text: string): TrackingInfo[] {
  const results: TrackingInfo[] = [];
  const seen = new Set<string>();

  function add(num: string, carrier: CarrierKey) {
    const upper = num.toUpperCase();
    if (!seen.has(upper)) {
      seen.add(upper);
      results.push({ number: upper, carrier });
    }
  }

  // Amazon Logistics (TBA...)
  for (const m of text.matchAll(/\bTBA\d{12,}\b/gi)) {
    add(m[0], "amazon");
  }

  // UPS (1Z...)
  for (const m of text.matchAll(/\b1Z[A-Z0-9]{16}\b/gi)) {
    add(m[0], "ups");
  }

  // USPS domestic
  for (const m of text.matchAll(/\b(94|93|92|95)\d{18,22}\b/g)) {
    add(m[0], "usps");
  }

  // USPS international
  for (const m of text.matchAll(/\b[A-Z]{2}\d{9}US\b/gi)) {
    add(m[0], "usps");
  }

  // DHL eCommerce
  for (const m of text.matchAll(/\bJD\d{18}\b/gi)) {
    add(m[0], "dhl");
  }

  return results;
}

/**
 * Basic validation: tracking numbers should be 8-40 alphanumeric characters.
 */
export function validateTrackingNumber(number: string): boolean {
  const trimmed = number.trim();
  return (
    trimmed.length >= 8 && trimmed.length <= 40 && /^[A-Z0-9]+$/i.test(trimmed)
  );
}
