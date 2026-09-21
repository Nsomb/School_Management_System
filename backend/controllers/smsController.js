// controllers/smsController.js
const SmsModel = require("../models/smsModel");
const { dispatchMessage } = require("../services/messageDispatcher");

const getSchoolId = (req) => {
  const sid = req.schoolId || req.user?.schoolId;
  if (!sid) throw new Error('No school context available');
  return sid;
};

exports.sendSMS = async (req, res) => {
  const schoolId = getSchoolId(req);
  const {
    message,
    recipientType,
    targetStudentIds,
    targetTeacherIds,
    channel = 'auto',           // 'auto' | 'sms' | 'whatsapp'
  } = req.body;
  const adminId = req.user?.id;

  // ─── Validation ────────────────────────────────────────
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message content is required.' });
  }
  if (!['parents', 'teachers', 'both'].includes(recipientType)) {
    return res.status(400).json({ error: "recipientType must be 'parents', 'teachers', or 'both'." });
  }
  if (!['auto', 'sms', 'whatsapp'].includes(channel)) {
    return res.status(400).json({ error: "channel must be 'auto', 'sms', or 'whatsapp'." });
  }

  let parentRecipients = [];
  let teacherRecipients = [];

  try {
    if (recipientType === 'parents' || recipientType === 'both') {
      parentRecipients = await SmsModel.getDistinctParentPhoneNumbers(targetStudentIds, schoolId);
    }
    if (recipientType === 'teachers' || recipientType === 'both') {
      teacherRecipients = await SmsModel.getTeacherPhoneNumbers(targetTeacherIds, schoolId);
    }

    const total = parentRecipients.length + teacherRecipients.length;
    if (total === 0) {
      await SmsModel.createLog({
        senderId: adminId, messageContent: message, recipientType,
        recipientCount: 0, status: 'failed', channel: 'sms',
        whatsappCount: 0, smsCount: 0, failedCount: 0,
        providerResponse: { message: 'No recipients found.' }, schoolId,
      });
      return res.status(404).json({ message: 'No recipients found.' });
    }

    // ─── Create the log FIRST so we have an ID to attach deliveries to ───
    const smsLogId = await SmsModel.createLog({
      senderId: adminId, messageContent: message, recipientType,
      recipientCount: total, status: 'pending', channel,
      whatsappCount: 0, smsCount: 0, failedCount: 0,
      providerResponse: {}, schoolId,
    });

    // ─── Dispatch to every recipient ──────────────────────
    let whatsappCount = 0;
    let smsCount = 0;
    let failedCount = 0;
    const providerLog = [];

    const dispatchBatch = async (recipients, type) => {
      for (const r of recipients) {
        const result = await dispatchMessage(r.phone, message, channel);

        if (result.success) {
          if (result.channel === 'whatsapp') whatsappCount++;
          else smsCount++;
        } else {
          failedCount++;
        }

        await SmsModel.logDelivery({
          smsLogId,
          recipientType: type,     // 'parent' | 'teacher'
          recipientId: r.id,
          phoneNumber: r.phone,
          channel: result.channel,
          status: result.success ? 'sent' : 'failed',
          providerMessageId: result.providerMessageId,
          errorMessage: result.error,
          schoolId,
        });

        providerLog.push({
          recipientType: type,
          phone: r.phone,
          channel: result.channel,
          success: result.success,
          error: result.error || null,
        });
      }
    };

    await dispatchBatch(parentRecipients, 'parent');
    await dispatchBatch(teacherRecipients, 'teacher');

    // ─── Determine overall status ─────────────────────────
    let overallStatus;
    if (failedCount === 0) overallStatus = 'sent';
    else if (failedCount === total) overallStatus = 'failed';
    else overallStatus = 'partial_success';

    // ─── Determine summary channel ────────────────────────
    let summaryChannel;
    if (whatsappCount > 0 && smsCount > 0) summaryChannel = 'mixed';
    else if (whatsappCount > 0) summaryChannel = 'whatsapp';
    else summaryChannel = 'sms';

    // ─── Update the log with final counts ────────────────
    await SmsModel.updateLogSummary?.(smsLogId, {
      status: overallStatus,
      channel: summaryChannel,
      whatsappCount, smsCount, failedCount,
      providerResponse: { deliveries: providerLog },
      schoolId,
    });

    // Fallback if updateLogSummary doesn't exist — do it inline
    if (!SmsModel.updateLogSummary) {
      const db = require('../config/db');
      await db.tenantQuery(
        `UPDATE sms_logs
         SET status = $1, channel = $2, whatsapp_count = $3,
             sms_count = $4, failed_count = $5, sms_provider_response = $6
         WHERE id = $7 AND school_id = $8`,
        [overallStatus, summaryChannel, whatsappCount, smsCount, failedCount,
         JSON.stringify({ deliveries: providerLog }), smsLogId, schoolId],
        schoolId
      );
    }

    return res.status(200).json({
      message: `Sent: ${whatsappCount} via WhatsApp, ${smsCount} via SMS, ${failedCount} failed.`,
      smsLogId,
      whatsappCount,
      smsCount,
      failedCount,
      status: overallStatus,
      channel: summaryChannel,
    });
  } catch (error) {
    console.error('Error in sendSMS:', error);
    res.status(500).json({ error: 'Failed to send messages.', details: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { status, limit } = req.query;
    const logs = await SmsModel.getHistory(schoolId, {
      status,
      limit: limit ? parseInt(limit) : 100,
    });
    res.status(200).json(logs);
  } catch (error) {
    console.error('Error in getHistory:', error);
    res.status(500).json({ error: 'Failed to load history.' });
  }
};

exports.getRecipientOptions = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const options = await SmsModel.getRecipientOptions(schoolId);
    res.status(200).json(options);
  } catch (error) {
    console.error('Error in getRecipientOptions:', error);
    res.status(500).json({ error: 'Failed to load recipients.' });
  }
};

exports.getDeliveries = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { smsLogId } = req.params;
    const deliveries = await SmsModel.getDeliveriesForLog(smsLogId, schoolId);
    res.status(200).json(deliveries);
  } catch (error) {
    console.error('Error in getDeliveries:', error);
    res.status(500).json({ error: 'Failed to load deliveries.' });
  }
};