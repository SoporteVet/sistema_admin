const { getAuth } = require('firebase-admin/auth');
const { Resend } = require('resend');
const { resolveRequestEmailRecipients } = require('./recipients');
const { buildRequestEmail } = require('./templates');

/**
 * @param {import('firebase-admin/database').Database} db
 * @param {string|null} before
 * @param {object|null} after
 * @returns {'submitted'|'approved'|'rejected'|null}
 */
function detectEmailEvent(before, after) {
  if (!after) return null;
  if (!before) return 'submitted';
  const prev = before.estado;
  const next = after.estado;
  if (prev !== 'aprobada' && next === 'aprobada') return 'approved';
  if (prev !== 'rechazada' && next === 'rechazada') return 'rejected';
  return null;
}

/**
 * @param {import('firebase-admin/database').Reference} logRef
 */
async function claimDeliveryLog(logRef) {
  const result = await logRef.transaction((current) => {
    if (current && (current.status === 'completed' || current.status === 'processing')) {
      return undefined;
    }
    return {
      status: 'processing',
      startedAt: new Date().toISOString()
    };
  });
  if (!result.committed || !result.snapshot.val()) {
    return false;
  }
  const val = result.snapshot.val();
  return val.status === 'processing';
}

/**
 * @param {object} opts
 * @param {import('firebase-admin/database').Database} opts.db
 * @param {string} opts.requestId
 * @param {object} opts.request
 * @param {'submitted'|'approved'|'rejected'} opts.eventType
 * @param {string} opts.resendApiKey
 * @param {string} opts.resendFrom
 * @param {string} opts.appPublicUrl
 */
async function sendRequestEmails(opts) {
  const { db, requestId, request, eventType, resendApiKey, resendFrom, appPublicUrl } = opts;

  if (!resendApiKey || !resendFrom) {
    console.error('requestEmail: RESEND_API_KEY o RESEND_FROM no configurados');
    return;
  }

  const logRef = db.ref(`emailDeliveryLog/${requestId}/${eventType}`);
  const claimed = await claimDeliveryLog(logRef);
  if (!claimed) {
    console.log(`requestEmail: skip ${requestId}/${eventType} (ya procesado o en curso)`);
    return;
  }

  const usersSnap = await db.ref('users').once('value');
  const usersMap = usersSnap.val() || {};
  const recipients = await resolveRequestEmailRecipients(request, usersMap, getAuth());
  console.log(
    `requestEmail: destinatarios ${requestId}/${eventType}`,
    recipients.map((r) => `${r.grupo}:${r.email}(${r.emailSource || '?'})`).join(', ')
  );

  if (recipients.length === 0) {
    await logRef.set({
      status: 'completed',
      finishedAt: new Date().toISOString(),
      sentCount: 0,
      error: 'no_recipients'
    });
    console.warn(`requestEmail: sin destinatarios para ${requestId}/${eventType}`);
    return;
  }

  const resend = new Resend(resendApiKey);
  const sent = [];
  const failed = [];

  for (const recipient of recipients) {
    const { subject, text, html } = buildRequestEmail(eventType, request, appPublicUrl, recipient);
    try {
      const { data, error } = await resend.emails.send({
        from: resendFrom,
        to: recipient.email,
        subject,
        text,
        html
      });
      if (error) {
        failed.push({ email: recipient.email, error: error.message || String(error) });
        console.error('Resend error', recipient.email, error);
      } else {
        sent.push({ email: recipient.email, id: data?.id });
      }
    } catch (err) {
      failed.push({ email: recipient.email, error: err.message || String(err) });
      console.error('Resend exception', recipient.email, err);
    }
  }

  await logRef.set({
    status: 'completed',
    finishedAt: new Date().toISOString(),
    eventType,
    requestId,
    recipients: recipients.map((r) => ({
      email: r.email,
      emailSource: r.emailSource,
      grupo: r.grupo,
      id: r.id
    })),
    sentCount: sent.length,
    failedCount: failed.length,
    sent,
    failed: failed.length ? failed : null
  });

  console.log(
    `requestEmail: ${requestId}/${eventType} — enviados ${sent.length}, fallidos ${failed.length}`
  );
}

module.exports = {
  detectEmailEvent,
  sendRequestEmails
};
