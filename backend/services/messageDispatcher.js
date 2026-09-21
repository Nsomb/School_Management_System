// backend/services/messageDispatcher.js
const { sendWhatsAppMessage, isNotOnWhatsApp, WHATSAPP_ENABLED } = require('./whatsappService');
const { sendSmsViaProvider } = require('./smsService');

/**
 * Send one message to one recipient using the hybrid strategy.
 *
 * @param {string} phone       Recipient phone (any format)
 * @param {string} message     Text content
 * @param {string} preferred   'auto' | 'sms' | 'whatsapp'
 * @returns {Promise<{ success, channel, providerMessageId?, error? }>}
 */
async function dispatchMessage(phone, message, preferred = 'auto') {
  // Force WhatsApp (no fallback)
  if (preferred === 'whatsapp') {
    const wa = await sendWhatsAppMessage(phone, message);
    return {
      success: wa.success,
      channel: 'whatsapp',
      providerMessageId: wa.providerMessageId,
      error: wa.success ? null : wa.errorMessage,
    };
  }

  // Force SMS
  if (preferred === 'sms') {
    const sms = await sendSmsViaProvider(phone, message);
    return {
      success: sms.success,
      channel: 'sms',
      providerMessageId: sms.providerMessageId,
      error: sms.success ? null : sms.errorMessage,
    };
  }

  // ─── AUTO (hybrid) ────────────────────────────────────
  // 1. Try WhatsApp first (cheaper, richer)
  if (WHATSAPP_ENABLED) {
    const wa = await sendWhatsAppMessage(phone, message);
    if (wa.success) {
      return {
        success: true,
        channel: 'whatsapp',
        providerMessageId: wa.providerMessageId,
      };
    }

    // 2. If the failure is "number not on WhatsApp", fall back to SMS.
    //    If it's a different error (auth, rate limit), also fall back —
    //    we want the message delivered by any means necessary.
    console.warn(`WhatsApp failed for ${phone} (${wa.errorCode}): ${wa.errorMessage}. Falling back to SMS.`);
  }

  // 3. SMS fallback
  const sms = await sendSmsViaProvider(phone, message);
  return {
    success: sms.success,
    channel: 'sms',
    providerMessageId: sms.providerMessageId,
    error: sms.success ? null : sms.errorMessage,
  };
}

module.exports = { dispatchMessage };