// backend/services/whatsappService.js
const axios = require('axios');
const { normalizePhone } = require('./phoneUtils');

const API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const ENABLED = String(process.env.WHATSAPP_ENABLED).toLowerCase() === 'true';

/**
 * Send a WhatsApp text message via Meta Cloud API.
 * Returns { success, providerMessageId, errorCode, errorMessage }
 */
async function sendWhatsAppMessage(toPhone, message) {
  const normalized = normalizePhone(toPhone);

  if (!ENABLED || !PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    // Simulation mode — pretend it succeeded so the flow doesn't break.
    return {
      success: true,
      simulated: true,
      providerMessageId: `sim_wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  try {
    const url = `${API_URL}/${PHONE_NUMBER_ID}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalized,
      type: 'text',
      text: { preview_url: false, body: message },
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    const providerMessageId = response.data?.messages?.[0]?.id;

    return {
      success: true,
      providerMessageId,
      providerResponse: response.data,
    };
  } catch (error) {
    const errorData = error.response?.data?.error;
    const errorCode = errorData?.code;
    const errorMessage = errorData?.message || error.message;

    return {
      success: false,
      errorCode,
      errorMessage,
      providerResponse: errorData || error.message,
    };
  }
}

/**
 * Meta error codes that mean "this number is not on WhatsApp" —
 * we should fall back to SMS for these.
 */
const NOT_ON_WHATSAPP_CODES = new Set([
  131026, // Message undeliverable (number not on WA)
  131047, // Re-engagement message needed
  470,    // User's number is not on WhatsApp (Twilio-style)
]);

function isNotOnWhatsApp(errorCode) {
  return NOT_ON_WHATSAPP_CODES.has(errorCode);
}

module.exports = { sendWhatsAppMessage, isNotOnWhatsApp, WHATSAPP_ENABLED: ENABLED };