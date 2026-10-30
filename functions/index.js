const { initializeApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const { onValueWritten } = require('firebase-functions/v2/database');
const { defineSecret, defineString } = require('firebase-functions/params');
const { detectEmailEvent, sendRequestEmails } = require('./src/onRequestWrite');

initializeApp();

const resendApiKey = defineSecret('RESEND_API_KEY');
const resendFrom = defineString('RESEND_FROM', {
  description: 'Remitente Resend, ej. Sistema VSMP <noreply@dominio.com>',
  default: ''
});
const appPublicUrl = defineString('APP_PUBLIC_URL', {
  description: 'URL pública del sistema administrativo',
  default: 'https://sistema-administrativo-36a03.web.app'
});

exports.onRequestEmail = onValueWritten(
  {
    ref: '/requests/{requestId}',
    secrets: [resendApiKey],
    region: 'us-central1',
    retry: false
  },
  async (event) => {
    const requestId = event.params.requestId;
    const before = event.data.before.val();
    const after = event.data.after.val();

    const eventType = detectEmailEvent(before, after);
    if (!eventType) {
      return null;
    }

    const db = getDatabase();
    try {
      await sendRequestEmails({
        db,
        requestId,
        request: after,
        eventType,
        resendApiKey: resendApiKey.value(),
        resendFrom: resendFrom.value(),
        appPublicUrl: appPublicUrl.value()
      });
    } catch (err) {
      console.error(`onRequestEmail ${requestId}:`, err);
      await db.ref(`emailDeliveryLog/${requestId}/${eventType}`).update({
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: err.message || String(err)
      });
    }
    return null;
  }
);
