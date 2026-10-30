function formatDateTimeEs(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(iso);
  }
}

function summarizeDatos(datos) {
  if (!datos || typeof datos !== 'object') return '';
  const parts = [];
  if (datos.fecha_inicio && datos.fecha_fin) {
    parts.push(`Período: ${datos.fecha_inicio} al ${datos.fecha_fin}`);
  } else if (datos.fecha) {
    parts.push(`Fecha: ${datos.fecha}`);
  }
  if (datos.motivo) parts.push(`Motivo: ${datos.motivo}`);
  if (datos.observaciones) parts.push(`Observaciones: ${datos.observaciones}`);
  return parts.join('\n');
}

const GRUPO_LABEL = {
  solicitante: 'Usted envió esta solicitud',
  encargado_area: 'Como encargado(a) del área debe conocer este caso',
  gerencia: 'Como Gerencia General debe conocer este caso'
};

function introForRecipient(eventType, req, recipient) {
  const tipo = req.tipoNombre || req.tipo;
  const quien = req.solicitanteNombre || 'el colaborador';
  const g = recipient.grupo || 'solicitante';
  if (eventType === 'submitted') {
    if (g === 'solicitante') {
      return `Su solicitud de ${tipo} fue registrada correctamente en el sistema.`;
    }
    if (g === 'encargado_area') {
      return `${quien} envió una solicitud de ${tipo} en su área. Revise y gestione en el sistema.`;
    }
    return `Se registró una solicitud de ${tipo} por ${quien} (copia informativa para Gerencia General).`;
  }
  if (eventType === 'approved') {
    if (g === 'solicitante') {
      return `Su solicitud de ${tipo} fue aprobada.`;
    }
    if (g === 'encargado_area') {
      return `La solicitud de ${tipo} de ${quien} (su área) fue aprobada por Gerencia.`;
    }
    return `La solicitud de ${tipo} de ${quien} fue aprobada (resolución de Gerencia General).`;
  }
  if (g === 'solicitante') {
    return `Su solicitud de ${tipo} fue rechazada.`;
  }
  if (g === 'encargado_area') {
    return `La solicitud de ${tipo} de ${quien} (su área) fue rechazada.`;
  }
  return `La solicitud de ${tipo} de ${quien} fue rechazada (Gerencia General).`;
}

const EVENT_COPY = {
  submitted: { headline: 'Solicitud enviada' },
  approved: { headline: 'Solicitud aprobada' },
  rejected: { headline: 'Solicitud rechazada' }
};

function buildSubject(eventType, request) {
  const tipo = request.tipoNombre || request.tipo || 'Solicitud';
  const nombre = request.solicitanteNombre || '';
  if (eventType === 'submitted') {
    return `[VSMP] Solicitud enviada: ${tipo}${nombre ? ` — ${nombre}` : ''}`;
  }
  if (eventType === 'approved') {
    return `[VSMP] Solicitud aprobada: ${tipo}`;
  }
  return `[VSMP] Solicitud rechazada: ${tipo}`;
}

/**
 * @param {'submitted'|'approved'|'rejected'} eventType
 * @param {object} request
 * @param {string} appPublicUrl
 * @param {object} recipient
 */
function buildRequestEmail(eventType, request, appPublicUrl, recipient) {
  const copy = EVENT_COPY[eventType];
  const intro = introForRecipient(eventType, request, recipient);
  const rolLine = GRUPO_LABEL[recipient.grupo] || '';
  const resumen = summarizeDatos(request.datos);
  const fechaSol = formatDateTimeEs(request.fechaSolicitud);
  const fechaResp = formatDateTimeEs(request.fechaRespuesta);
  const link = appPublicUrl ? `${appPublicUrl.replace(/\/$/, '')}/` : '';

  let extra = '';
  if (eventType === 'rejected' && request.justificacion) {
    extra = `\nMotivo del rechazo: ${request.justificacion}`;
    if (request.etapaRechazo) {
      extra += `\nEtapa: ${request.etapaRechazo}`;
    }
  }
  if (eventType === 'approved' && request.justificacion) {
    extra = `\nComentario: ${request.justificacion}`;
  }

  const text = [
    `Hola ${recipient.nombre},`,
    '',
    rolLine ? `${rolLine}.` : '',
    intro,
    '',
    `Tipo: ${request.tipoNombre || request.tipo}`,
    `Solicitante: ${request.solicitanteNombre || '—'}`,
    `Departamento: ${request.departamento || '—'}`,
    `Fecha de solicitud: ${fechaSol}`,
    eventType !== 'submitted' ? `Fecha de resolución: ${fechaResp}` : '',
    resumen ? `\n${resumen}` : '',
    extra,
    link ? `\nVer en el sistema: ${link}` : '',
    '',
    '— Veterinaria San Martín de Porres · Sistema Administrativo'
  ]
    .filter(Boolean)
    .join('\n');

  const htmlExtra =
    eventType === 'rejected' && request.justificacion
      ? `<p><strong>Motivo del rechazo:</strong> ${escapeHtml(request.justificacion)}</p>`
      : eventType === 'approved' && request.justificacion
        ? `<p><strong>Comentario:</strong> ${escapeHtml(request.justificacion)}</p>`
        : '';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>${escapeHtml(copy.headline)}</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="color:#006064;margin:0 0 16px;">${escapeHtml(copy.headline)}</h2>
  <p>Hola <strong>${escapeHtml(recipient.nombre)}</strong>,</p>
  ${rolLine ? `<p style="font-size:13px;color:#666;">${escapeHtml(rolLine)}</p>` : ''}
  <p>${escapeHtml(intro)}</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
    <tr><td style="padding:6px 0;color:#666;">Tipo</td><td><strong>${escapeHtml(request.tipoNombre || request.tipo || '')}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#666;">Solicitante</td><td>${escapeHtml(request.solicitanteNombre || '—')}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">Departamento</td><td>${escapeHtml(request.departamento || '—')}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">Fecha solicitud</td><td>${escapeHtml(fechaSol)}</td></tr>
    ${eventType !== 'submitted' ? `<tr><td style="padding:6px 0;color:#666;">Fecha resolución</td><td>${escapeHtml(fechaResp)}</td></tr>` : ''}
  </table>
  ${resumen ? `<pre style="background:#f5f5f5;padding:12px;border-radius:8px;font-size:13px;white-space:pre-wrap;">${escapeHtml(resumen)}</pre>` : ''}
  ${htmlExtra}
  ${link ? `<p style="margin-top:20px;"><a href="${escapeHtml(link)}" style="color:#006064;">Abrir sistema administrativo</a></p>` : ''}
  <p style="margin-top:24px;font-size:12px;color:#888;">Veterinaria San Martín de Porres · Sistema Administrativo</p>
</body>
</html>`;

  return {
    subject: buildSubject(eventType, request),
    text,
    html
  };
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  buildRequestEmail,
  buildSubject,
  formatDateTimeEs
};
