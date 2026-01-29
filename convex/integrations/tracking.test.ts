import { describe, test, expect } from "vitest";
import {
  extractTrackingNumbers,
  detectCarrier,
  validateTrackingNumber,
} from "./tracking";

describe("detectCarrier", () => {
  test("detects UPS tracking number", () => {
    expect(detectCarrier("1Z999AA10123456784")).toBe("ups");
  });

  test("detects Amazon Logistics tracking number", () => {
    expect(detectCarrier("TBA123456789012")).toBe("amazon");
  });

  test("detects USPS tracking number", () => {
    expect(detectCarrier("9400111899223033005282")).toBe("usps");
  });

  test("detects USPS international", () => {
    expect(detectCarrier("LZ123456789US")).toBe("usps");
  });

  test("detects DHL eCommerce", () => {
    expect(detectCarrier("JD014600009912345678")).toBe("dhl");
  });

  test("returns null for unknown format", () => {
    expect(detectCarrier("UNKNOWN")).toBeNull();
  });
});

describe("extractTrackingNumbers", () => {
  test("extracts UPS tracking from text", () => {
    const result = extractTrackingNumbers(
      "Your package has shipped! Tracking: 1Z999AA10123456784",
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.carrier).toBe("ups");
    expect(result[0]!.number).toBe("1Z999AA10123456784");
  });

  test("extracts Amazon Logistics tracking", () => {
    const result = extractTrackingNumbers(
      "Track your order: TBA123456789012",
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.carrier).toBe("amazon");
  });

  test("extracts multiple tracking numbers from same text", () => {
    const result = extractTrackingNumbers(
      "Shipment 1: 1Z999AA10123456784\nShipment 2: TBA123456789012",
    );
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.carrier)).toEqual(
      expect.arrayContaining(["ups", "amazon"]),
    );
  });

  test("deduplicates identical tracking numbers", () => {
    const result = extractTrackingNumbers(
      "Tracking: 1Z999AA10123456784 and again 1Z999AA10123456784",
    );
    expect(result).toHaveLength(1);
  });

  test("handles case-insensitive matching", () => {
    const result = extractTrackingNumbers("tracking: 1z999aa10123456784");
    expect(result).toHaveLength(1);
    expect(result[0]!.number).toBe("1Z999AA10123456784");
  });

  test("returns empty array when no tracking numbers found", () => {
    const result = extractTrackingNumbers(
      "Your order has been placed. Thank you!",
    );
    expect(result).toHaveLength(0);
  });

  test("extracts USPS international format", () => {
    const result = extractTrackingNumbers("Tracking: LZ123456789US");
    expect(result).toHaveLength(1);
    expect(result[0]!.carrier).toBe("usps");
  });
});

describe("validateTrackingNumber", () => {
  test("accepts valid alphanumeric tracking numbers", () => {
    expect(validateTrackingNumber("1Z999AA10123456784")).toBe(true);
    expect(validateTrackingNumber("TBA123456789012")).toBe(true);
  });

  test("rejects too short", () => {
    expect(validateTrackingNumber("ABC")).toBe(false);
  });

  test("rejects non-alphanumeric", () => {
    expect(validateTrackingNumber("1Z-999-AA1")).toBe(false);
  });

  test("trims whitespace before validating", () => {
    expect(validateTrackingNumber("  1Z999AA10123456784  ")).toBe(true);
  });
});
