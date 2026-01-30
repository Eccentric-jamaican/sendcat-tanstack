import type { ExtractionResult, TrackingInfo } from "../../types";
import { extractTrackingNumbers } from "../../tracking";

const ORDER_NUMBER_REGEX = /\b[A-Z]{2,4}U?1?TB[A-Z0-9]{6,}\b/g;
const TRACKING_LABEL_REGEX = /tracking number[^A-Z0-9]*([A-Z0-9]{8,})/i;
const GOFO_TRACKING_REGEX = /\bGFUS\d{6,}\b/i;

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const trimmed = v.trim();
    if (!trimmed) continue;
    const upper = trimmed.toUpperCase();
    if (seen.has(upper)) continue;
    seen.add(upper);
    out.push(upper);
  }
  return out;
}

function addTracking(
  list: TrackingInfo[],
  seen: Set<string>,
  number: string,
  carrier: TrackingInfo["carrier"],
) {
  const upper = number.trim().toUpperCase();
  if (!upper || seen.has(upper)) return;
  seen.add(upper);
  list.push({ number: upper, carrier });
}

function parseTotalAmount(text: string): { valueUsd: number; currency: string; originalValue: number } | null {
  const match =
    text.match(/Total Amount:\s*\$?([0-9]+(?:\.[0-9]{2})?)/i) ||
    text.match(/Total:\s*\$?([0-9]+(?:\.[0-9]{2})?)/i);
  if (!match) return null;

  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) return null;

  const cents = Math.round(amount * 100);
  const currency = match[0].includes("$") || /USD/i.test(match[0]) ? "USD" : "USD";
  return { valueUsd: cents, currency, originalValue: cents };
}

function parseItemsSummary(text: string): string | null {
  const itemsMatch = text.match(/(\d+)\s*Item\(s\)\s*shipped/i);
  if (itemsMatch) return `${itemsMatch[1]} items shipped`;
  const qtyMatch = text.match(/\bQTY:\s*(\d+)\b/i);
  if (qtyMatch) return `Qty ${qtyMatch[1]}`;
  return null;
}

export function extractSheinPurchaseData(text: string): ExtractionResult | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const orderNumbers = uniqueStrings(
    Array.from(normalized.matchAll(ORDER_NUMBER_REGEX)).map((m) => m[0]),
  );
  const orderNumber =
    orderNumbers.length > 0 ? orderNumbers.join(",") : null;

  const trackingNumbers: TrackingInfo[] = [];
  const trackingSeen = new Set<string>();

  const labelMatch = normalized.match(TRACKING_LABEL_REGEX);
  if (labelMatch?.[1]) {
    addTracking(trackingNumbers, trackingSeen, labelMatch[1], "other");
  }

  const gofoMatch = normalized.match(GOFO_TRACKING_REGEX);
  if (gofoMatch?.[0]) {
    addTracking(trackingNumbers, trackingSeen, gofoMatch[0], "other");
  }

  for (const t of extractTrackingNumbers(normalized)) {
    addTracking(trackingNumbers, trackingSeen, t.number, t.carrier);
  }

  const totals = parseTotalAmount(normalized);
  const itemsSummary = parseItemsSummary(normalized);

  const invoicePresent = /order summary|total amount|payment method/i.test(
    normalized,
  );

  let confidence = 0.4;
  if (orderNumber) confidence += 0.2;
  if (trackingNumbers.length > 0) confidence += 0.2;
  if (totals) confidence += 0.1;
  if (itemsSummary) confidence += 0.1;
  confidence = Math.max(0.2, Math.min(0.95, confidence));

  const missingFields: string[] = [];
  if (!orderNumber) missingFields.push("orderNumber");
  if (!totals) missingFields.push("valueUsd");
  if (trackingNumbers.length === 0) missingFields.push("trackingNumbers");
  if (!itemsSummary) missingFields.push("itemsSummary");

  return {
    merchant: "shein",
    storeName: "SHEIN",
    orderNumber,
    itemsSummary,
    valueUsd: totals?.valueUsd ?? null,
    currency: totals?.currency ?? null,
    originalValue: totals?.originalValue ?? null,
    trackingNumbers,
    invoicePresent,
    confidence,
    missingFields,
  };
}
