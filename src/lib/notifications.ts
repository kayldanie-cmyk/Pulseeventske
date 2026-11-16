/**
 * Pulse Events KE Notification Engine
 * Handles Africa's Talking SMS delivery and WhatsApp message dispatch.
 * Includes graceful simulation mode for development and testing.
 */

const AT_API_KEY = process.env.AFRICASTALKING_API_KEY ?? "";
const AT_USERNAME = process.env.AFRICASTALKING_USERNAME ?? "sandbox";
const AT_SENDER_ID = process.env.AFRICASTALKING_SENDER_ID ?? "PULSE";

export interface TicketNotificationPayload {
  phone: string;
  eventTitle: string;
  tierName: string;
  ticketCode: string;
  receiptNumber: string;
  passUrl?: string;
}

export interface NotificationResult {
  success: boolean;
  channel: "sms" | "whatsapp";
  recipient: string;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

/**
 * Sends an instant ticket confirmation SMS via Africa's Talking API
 */
export async function sendTicketSMS(
  payload: TicketNotificationPayload
): Promise<NotificationResult> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://pulseevents.co.ke";
  const passUrl = payload.passUrl || `${baseUrl}/tickets/${payload.ticketCode}`;

  const message =
    `PULSE EVENTS KE: You're in! 🎟️\n` +
    `Event: ${payload.eventTitle}\n` +
    `Tier: ${payload.tierName}\n` +
    `Ticket Code: ${payload.ticketCode}\n` +
    `M-Pesa Receipt: ${payload.receiptNumber}\n` +
    `Pass: ${passUrl}\n` +
    `Present this code at the gate for check-in.`;

  // If live Africa's Talking credentials exist, send real SMS
  if (AT_API_KEY && AT_USERNAME && AT_USERNAME !== "sandbox") {
    try {
      const endpoint = "https://api.africastalking.com/version1/messaging";
      const body = new URLSearchParams({
        username: AT_USERNAME,
        to: payload.phone,
        message,
        from: AT_SENDER_ID,
      });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          apiKey: AT_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body.toString(),
      });

      const data = await res.json();
      const recipientData =
        data?.SMSMessageData?.Recipients?.[0];

      if (recipientData && recipientData.status === "Success") {
        return {
          success: true,
          channel: "sms",
          recipient: payload.phone,
          messageId: recipientData.messageId,
          simulated: false,
        };
      } else {
        return {
          success: false,
          channel: "sms",
          recipient: payload.phone,
          error: recipientData?.status || "SMS dispatch failed",
        };
      }
    } catch (err) {
      console.error("Africa's Talking SMS dispatch failed:", err);
      return {
        success: false,
        channel: "sms",
        recipient: payload.phone,
        error: err instanceof Error ? err.message : "SMS dispatch error",
      };
    }
  }

  // Fallback / Development Simulation
  console.log(`[SMS SIMULATION to ${payload.phone}]:\n${message}`);
  return {
    success: true,
    channel: "sms",
    recipient: payload.phone,
    messageId: `SIM-SMS-${Date.now()}`,
    simulated: true,
  };
}

/**
 * Generates WhatsApp click-to-chat URL or dispatches via WhatsApp Cloud API
 */
export function getWhatsAppTicketLink(
  payload: TicketNotificationPayload
): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://pulseevents.co.ke";
  const passUrl = payload.passUrl || `${baseUrl}/tickets/${payload.ticketCode}`;

  const text =
    `🎟️ *Pulse Events KE Ticket Pass*\n\n` +
    `*Event:* ${payload.eventTitle}\n` +
    `*Pass:* ${payload.tierName}\n` +
    `*Code:* \`${payload.ticketCode}\`\n` +
    `*Receipt:* ${payload.receiptNumber}\n\n` +
    `View Digital Pass & Gate QR: ${passUrl}`;

  return `https://wa.me/${payload.phone.replace(/\+/g, "")}?text=${encodeURIComponent(
    text
  )}`;
}
