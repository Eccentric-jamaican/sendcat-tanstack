import type { ExtractionResult, TrackingInfo } from "../../types";
import { extractTrackingNumbers } from "../../tracking";

const ORDER_NUMBER_REGEX = /\b\d{3}-\d{7}-\d{7}\b/;
const CURRENCY_SYMBOLS: Record<string, string> = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
};

function parseMoney(fragment: string): { amount: number; currency: string | null } | null {
  const patterns: RegExp[] = [
    /([A-Z]{3})\s*([0-9][0-9,]*(?:\.[0-9]{2})?)/i,
    /([A-Z]{3})([0-9][0-9,]*(?:\.[0-9]{2})?)/i,
    /([0-9][0-9,]*(?:\.[0-9]{2})?)\s*([A-Z]{3})/i,
    /([$€£])\s*([0-9][0-9,]*(?:\.[0-9]{2})?)/,
  ];

  for (const pattern of patterns) {
    const match = fragment.match(pattern);
    if (!match) continue;

    let currency: string | null = null;
    let amountRaw: string | null = null;

    if (pattern.source.includes("[$€£]")) {
      currency = CURRENCY_SYMBOLS[match[1]] ?? null;
      amountRaw = match[2];
    } else if (match[1] && match[2]) {
      const first = match[1].toUpperCase();
      const second = match[2];
      if (/^[A-Z]{3}$/.test(first)) {
        currency = first;
        amountRaw = second;
      } else {
        amountRaw = first;
        currency = second.toUpperCase();
      }
    }

    if (!amountRaw) continue;
    const amount = Number.parseFloat(amountRaw.replace(/,/g, ""));
    if (!Number.isFinite(amount)) continue;
    return { amount, currency };
  }

  return null;
}

function parseOrderNumber(text: string): string | null {
  const match =
    text.match(/Order\s*#\s*([0-9]{3}-[0-9]{7}-[0-9]{7})/i) ||
    text.match(/orderID=([0-9]{3}-[0-9]{7}-[0-9]{7})/i) ||
    text.match(/Order\s*number\s*[:#]?\s*([0-9]{3}-[0-9]{7}-[0-9]{7})/i) ||
    text.match(ORDER_NUMBER_REGEX);

  return match?.[1] ?? match?.[0] ?? null;
}

function parseTotalAmount(text: string): { valueUsd: number; currency: string | null; originalValue: number } | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  const totalIndex = normalized.toLowerCase().indexOf("total");
  const slices: string[] = [];

  if (totalIndex >= 0) {
    slices.push(normalized.slice(totalIndex, totalIndex + 80));
  }

  // Fallback: search for explicit "Total" blocks in raw text
  slices.push(text);

  for (const slice of slices) {
    const match =
      slice.match(/Total[^A-Z0-9$€£]*([A-Z]{3})\s*([0-9][0-9,]*(?:\.[0-9]{2})?)/i) ||
      slice.match(/Total[^A-Z0-9$€£]*([A-Z]{3})([0-9][0-9,]*(?:\.[0-9]{2})?)/i) ||
      slice.match(/Total[^0-9$€£]*([$€£])\s*([0-9][0-9,]*(?:\.[0-9]{2})?)/i) ||
      slice.match(/Total[^0-9]*([0-9][0-9,]*(?:\.[0-9]{2})?)\s*([A-Z]{3})/i) ||
      slice.match(/Order total[^A-Z0-9$€£]*([A-Z]{3})\s*([0-9][0-9,]*(?:\.[0-9]{2})?)/i) ||
      slice.match(/Order total[^0-9]*([0-9][0-9,]*(?:\.[0-9]{2})?)\s*([A-Z]{3})/i);

    if (match) {
      const currency =
        match[1] && match[1].length === 1
          ? CURRENCY_SYMBOLS[match[1]] ?? null
          : match[1]?.toUpperCase() ?? match[2]?.toUpperCase() ?? null;
      const amountRaw = match[2] ?? match[1];
      const amount = Number.parseFloat(String(amountRaw).replace(/,/g, ""));
      if (!Number.isFinite(amount)) continue;
      const cents = Math.round(amount * 100);
      return { valueUsd: cents, currency, originalValue: cents };
    }

    const money = parseMoney(slice);
    if (money) {
      const cents = Math.round(money.amount * 100);
      return { valueUsd: cents, currency: money.currency, originalValue: cents };
    }
  }

  return null;
}

function parseItemsSummary(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items: { name: string; qty?: number }[] = [];
  let lastItemIndex = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const bulletMatch = line.match(/^[*•\-]\s+(.+)/);
    if (bulletMatch?.[1]) {
      const name = bulletMatch[1].trim();
      if (name) {
        items.push({ name });
        lastItemIndex = items.length - 1;
      }
      continue;
    }

    const qtyMatch = line.match(/quantity:\s*(\d+)/i);
    if (qtyMatch && lastItemIndex >= 0) {
      items[lastItemIndex].qty = Number.parseInt(qtyMatch[1], 10);
    }
  }

  if (items.length === 0) {
    const qtyMatches = text.match(/quantity:\s*\d+/gi) ?? [];
    if (qtyMatches.length > 0) {
      return `${qtyMatches.length} item${qtyMatches.length === 1 ? "" : "s"}`;
    }
    return null;
  }

  if (items.length === 1) {
    const item = items[0];
    return item.qty ? `${item.name} x${item.qty}` : item.name;
  }

  const totalQty = items.reduce((sum, item) => sum + (item.qty ?? 1), 0);
  return `${totalQty} items`;
}

function addTracking(
  list: TrackingInfo[],
  seen: Set<string>,
  info: TrackingInfo,
) {
  const upper = info.number.trim().toUpperCase();
  if (!upper || seen.has(upper)) return;
  seen.add(upper);
  list.push({ number: upper, carrier: info.carrier });
}

export function extractAmazonPurchaseData(text: string): ExtractionResult | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const orderNumber = parseOrderNumber(text);

  const trackingNumbers: TrackingInfo[] = [];
  const seen = new Set<string>();
  for (const t of extractTrackingNumbers(text)) {
    addTracking(trackingNumbers, seen, t);
  }

  const totals = parseTotalAmount(text);
  const itemsSummary = parseItemsSummary(text);

  const invoicePresent = /order\s*#|order number|total|subtotal/i.test(
    normalized,
  );

  let confidence = 0.45;
  if (orderNumber) confidence += 0.2;
  if (trackingNumbers.length > 0) confidence += 0.1;
  if (totals) confidence += 0.15;
  if (itemsSummary) confidence += 0.1;
  confidence = Math.max(0.2, Math.min(0.95, confidence));

  const missingFields: string[] = [];
  if (!orderNumber) missingFields.push("orderNumber");
  if (!totals) missingFields.push("valueUsd");
  if (trackingNumbers.length === 0) missingFields.push("trackingNumbers");
  if (!itemsSummary) missingFields.push("itemsSummary");

  return {
    merchant: "amazon",
    storeName: "Amazon",
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
