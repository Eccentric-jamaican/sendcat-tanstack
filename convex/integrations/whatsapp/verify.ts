import { hmacSha256Hex } from "../crypto";

/**
 * Verifies WhatsApp webhook HMAC-SHA256 signature.
 * The signature is provided in the X-Hub-Signature-256 header.
 */
export async function verifyWhatsAppSignature(
  body: string,
  signature: string | null,
): Promise<boolean> {
  if (!signature) return false;
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return false;

  const hex = await hmacSha256Hex(secret, body);
  const expectedSignature = `sha256=${hex}`;

  return signature === expectedSignature;
}
