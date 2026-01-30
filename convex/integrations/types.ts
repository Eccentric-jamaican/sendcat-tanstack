export type CarrierKey = "ups" | "usps" | "fedex" | "dhl" | "amazon" | "other";

export type TrackingInfo = {
  number: string;
  carrier: CarrierKey | null;
};

export type ExtractionResult = {
  merchant: string;
  storeName: string;
  orderNumber: string | null;
  itemsSummary: string | null;
  valueUsd: number | null; // cents
  currency: string | null;
  originalValue: number | null; // cents in original currency
  trackingNumbers: TrackingInfo[];
  invoicePresent: boolean;
  confidence: number; // 0-1
  missingFields: string[];
};

export type EvidenceSource = "gmail" | "whatsapp" | "manual";
