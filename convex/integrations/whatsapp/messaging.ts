/**
 * Sends a text message to a WhatsApp user via Cloud API.
 * Only works within the 24-hour messaging window after last inbound message.
 */
export async function sendWhatsAppMessage(
  recipientPhone: string,
  text: string,
): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.error("[WhatsApp] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN");
    return false;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipientPhone,
          type: "text",
          text: { body: text },
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      console.error(`[WhatsApp] Send failed (${response.status}):`, err);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[WhatsApp] Send error:", err);
    return false;
  }
}

/**
 * Downloads media from WhatsApp Cloud API by media ID.
 * Returns the media URL that can be fetched with the access token.
 */
export async function getWhatsAppMediaUrl(
  mediaId: string,
): Promise<string | null> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) return null;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${mediaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.url || null;
  } catch {
    return null;
  }
}
