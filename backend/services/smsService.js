// backend/services/smsService.js
const axios = require('axios');
const { normalizePhone } = require('./phoneUtils');

const SMS_API_URL = process.env.SMS_API_URL;
const SMS_API_KEY = process.env.SMS_API_KEY;
const SMS_SENDER_ID = process.env.SMS_SENDER_ID;

async function sendSmsViaProvider(toPhone, message) {
  const normalized = normalizePhone(toPhone);

  // Simulation mode when no provider configured
  if (!SMS_API_URL || !SMS_API_KEY) {
    console.warn(`SMS provider not configured — simulating send to ${normalized}`);
    return {
      success: true,
      simulated: true,
      providerMessageId: `sim_sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  try {
    const payload = {
      to: normalized,
      from: SMS_SENDER_ID,
      text: message,
    };
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SMS_API_KEY}`,
    };

    const response = await axios.post(SMS_API_URL, payload, { headers, timeout: 15000 });
    const providerMessageId = response.data?.message_id || response.data?.sid;

    return { success: true, providerMessageId, providerResponse: response.data };
  } catch (error) {
    return {
      success: false,
      errorMessage: error.response?.data?.message || error.message,
      providerResponse: error.response?.data || error.message,
    };
  }
}

module.exports = { sendSmsViaProvider };