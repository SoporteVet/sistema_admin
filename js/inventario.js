// ============================================================
// INVENTARIO.JS — Inventario de equipos (departamento de TI)
// Veterinaria San Martín de Porres
// ============================================================

class InventarioManager {
    static TIPOS = ['Computadora', 'Laptop', 'Tableta', 'Impresora', 'Monitor', 'Equipo de red', 'Teléfono', 'Otro'];
    static ESTADOS = ['En uso', 'En bodega', 'En reparación', 'Dado de baja'];

    static _clip(value, max) {
        return String(value || '').trim().slice(0, max);
    }

    static _clean(data) {
        const nombre = this._clip(data.nombre, 120);
        if (!nombre) throw new Error('El nombre del equipo es obligatorio');
        const tipo = this.TIPOS.includes(data.tipo) ? data.tipo : 'Otro';
        const estado = this.ESTADOS.includes(data.estado) ? data.estado : 'En uso';
        return {
            nombre,
            tipo,
            marca: this._clip(data.marca, 80),
            modelo: this._clip(data.modelo, 80),
            serie: this._clip(data.serie, 80),
            configuracion: this._clip(data.configuracion, 120),
            color: this._clip(data.color, 40),
            accesorio: this._clip(data.accesorio, 80),
            fechaEtiqueta: this._clip(data.fechaEtiqueta, 40),
            cantidad: this._clip(data.cantidad, 40),
            departamentoReceptor: this._clip(data.departamentoReceptor, 120),
            ubicacion: this._clip(data.ubicacion, 120),
            asignadoA: this._clip(data.asignadoA, 120),
            estado,
            observaciones: this._clip(data.observaciones, 500)
        };
    }

    static _assertAccess() {
        const user = AuthManager.getUser();
        if (!user || typeof usuarioVeInventario !== 'function' || !usuarioVeInventario(user)) {
            throw new Error('No tiene permiso para el inventario');
        }
        return user;
    }

    static async getAll() {
        const snapshot = await dbRef.inventario.once('value');
        return snapshotToArray(snapshot).map((item) => {
            const tieneCarta = Boolean(item.cartaPdf);
            delete item.cartaPdf;
            return { ...item, tieneCarta };
        }).sort((a, b) =>
            String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' })
        );
    }

    static async getCartaPdf(id) {
        this._assertAccess();
        const snap = await dbRef.inventario.child(id).child('cartaPdf').once('value');
        if (!snap.exists() || !snap.val()) throw new Error('No hay una carta firmada para este equipo');
        return snap.val();
    }

    static async guardarCarta(id, pdfBase64, meta) {
        this._assertAccess();
        if (!id) throw new Error('Equipo no especificado');
        if (!pdfBase64) throw new Error('No se generó el PDF');
        await dbRef.inventario.child(id).update({
            cartaPdf: pdfBase64,
            cartaFecha: meta.fecha,
            cartaEntregadoPor: this._clip(meta.entregadoPor, 120),
            cartaRecibidoPor: this._clip(meta.recibidoPor, 120),
            fechaActualizacion: meta.fecha
        });
    }

    static async create(data) {
        const user = this._assertAccess();
        const now = new Date().toISOString();
        const payload = {
            ...this._clean(data),
            creadoPor: user.id,
            creadoPorNombre: `${user.nombre || ''} ${user.apellido || ''}`.trim(),
            fechaCreacion: now,
            fechaActualizacion: now
        };
        const ref = dbRef.inventario.push();
        await ref.set(payload);
        return { id: ref.key, ...payload };
    }

    static async update(id, data) {
        this._assertAccess();
        if (!id) throw new Error('Equipo no especificado');
        const clean = this._clean(data);
        clean.fechaActualizacion = new Date().toISOString();
        await dbRef.inventario.child(id).update(clean);
    }

    static async remove(id) {
        this._assertAccess();
        if (!id) throw new Error('Equipo no especificado');
        await dbRef.inventario.child(id).remove();
    }

    static _esc(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    static _firmaHtml(dataUrl) {
        if (!dataUrl) {
            return '<div style="height:54px;"></div>';
        }
        return `<img src="${dataUrl}" alt="Firma" style="height:54px;max-width:220px;object-fit:contain;display:block;" />`;
    }

    static async construirPdfCarta(item, opciones = {}) {
        if (!item) throw new Error('Equipo no especificado');
        if (typeof html2canvas !== 'function' || !window.jspdf) {
            throw new Error('No se pudo preparar el PDF');
        }
        const entregadoPorNombre = opciones.entregadoPor;
        const firmaEntrega = opciones.firmaEntrega || '';
        const firmaRecibe = opciones.firmaRecibe || '';
        const depto = String(item.departamentoReceptor || item.ubicacion || '').trim() || '________________';
        const hoy = typeof formatDate === 'function'
            ? formatDate(new Date().toISOString().slice(0, 10))
            : new Date().toLocaleDateString('es-CR');
        const filas = [
            ['Tipo de equipo', item.tipo],
            ['Marca', item.marca],
            ['Modelo', item.modelo],
            ['Configuración', item.configuracion],
            ['Color', item.color],
            ['Accesorio incluido', item.accesorio],
            ['Número de serie (S/N)', item.serie],
            ['Fecha indicada en la etiqueta', item.fechaEtiqueta],
            ['Cantidad', item.cantidad || '1 unidad']
        ];
        const filasHtml = filas.map(([label, value]) => `
            <tr>
                <td style="width:42%;padding:6px 8px;border:1px solid #bbb;font-weight:700;">${this._esc(label)}</td>
                <td style="padding:6px 8px;border:1px solid #bbb;">${this._esc(String(value || '').trim() || '—')}</td>
            </tr>`).join('');
        const entrega = String(entregadoPorNombre || '').trim() || '__________________________';
        const recibe = String(opciones.recibidoPor || item.asignadoA || '').trim() || '__________________________';

        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.width = '210mm';
        tempDiv.style.background = 'transparent';
        tempDiv.style.color = '#111';
        tempDiv.style.fontFamily = 'Arial, sans-serif';
        tempDiv.innerHTML = `
            <div style="position:relative;padding:16mm 16mm 14mm;font-size:13px;line-height:1.45;overflow:hidden;background:transparent;">
                <div style="position:relative;z-index:1;">
                <div style="text-align:center;font-weight:700;font-size:15px;letter-spacing:0.2px;">CLÍNICA VETERINARIA SAN MARTÍN DE PORRES</div>
                <div style="text-align:center;font-weight:700;font-size:16px;margin-top:8px;">ACTA DE ENTREGA Y RECIBIMIENTO DE EQUIPO</div>
                <p style="margin:16px 0 10px;"><strong>Fecha:</strong> ${this._esc(hoy)}</p>
                <p style="margin:0 0 14px;text-align:justify;">Por medio de la presente, el Departamento de Tecnología de la Información (TI) hace entrega formal al Departamento de ${this._esc(depto)} del equipo descrito a continuación. La persona que firma confirma haber recibido el equipo indicado.</p>
                <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">${filasHtml}</table>
                <p style="margin:0 0 6px;font-weight:700;">Condiciones de recibimiento</p>
                <p style="margin:0 0 8px;text-align:justify;">La persona receptora declara recibir el equipo descrito y se compromete a darle un uso adecuado, mantenerlo bajo resguardo y comunicar al Departamento de TI cualquier daño, pérdida o inconveniente que se presente, conforme a los procedimientos internos de la empresa.</p>
                <p style="margin:0 0 28px;text-align:justify;">Con la firma de este documento, ambas partes dejan constancia de la entrega y recepción del equipo para los fines administrativos correspondientes.</p>
                <table style="width:100%;border-collapse:collapse;margin-top:18px;">
                    <tr>
                        <td style="width:48%;vertical-align:top;padding-right:16px;">
                            ${this._firmaHtml(firmaEntrega)}
                            <div style="border-top:1px solid #222;margin-bottom:8px;"></div>
                            <div style="font-weight:700;margin-bottom:8px;">ENTREGADO POR</div>
                            <div>Nombre: ${this._esc(entrega)}</div>
                            <div style="margin-top:4px;">Departamento de TI</div>
                            <div style="margin-top:4px;">Fecha: ${this._esc(hoy)}</div>
                        </td>
                        <td style="width:4%;"></td>
                        <td style="width:48%;vertical-align:top;padding-left:16px;">
                            ${this._firmaHtml(firmaRecibe)}
                            <div style="border-top:1px solid #222;margin-bottom:8px;"></div>
                            <div style="font-weight:700;margin-bottom:8px;">RECIBIDO POR</div>
                            <div>Nombre: ${this._esc(recibe)}</div>
                            <div style="margin-top:4px;">Departamento de ${this._esc(depto)}</div>
                            <div style="margin-top:4px;">Fecha: ${this._esc(hoy)}</div>
                        </td>
                    </tr>
                </table>
                </div>
            </div>`;
        document.body.appendChild(tempDiv);
        try {
            await Promise.all([...tempDiv.querySelectorAll('img')].map((img) => {
                if (img.complete && img.naturalWidth) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                });
            }));
            const shot = await html2canvas(tempDiv, {
                scale: 2,
                backgroundColor: null,
                useCORS: true
            });
            const canvas = document.createElement('canvas');
            canvas.width = shot.width;
            canvas.height = shot.height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const logo = await this._loadImage('img/empresa_marca_agua.jpg');
            const maxW = canvas.width * 0.62;
            const maxH = canvas.height * 0.52;
            const logoScale = Math.min(maxW / logo.width, maxH / logo.height);
            const logoW = logo.width * logoScale;
            const logoH = logo.height * logoScale;
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.drawImage(logo, (canvas.width - logoW) / 2, (canvas.height - logoH) / 2, logoW, logoH);
            ctx.restore();
            ctx.drawImage(shot, 0, 0);
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const img = canvas.toDataURL('image/jpeg', 0.86);
            let drawW = pageWidth;
            let drawH = canvas.height * pageWidth / canvas.width;
            let x = 0;
            if (drawH > pageHeight) {
                drawH = pageHeight;
                drawW = canvas.width * pageHeight / canvas.height;
                x = (pageWidth - drawW) / 2;
            }
            pdf.addImage(img, 'JPEG', x, 0, drawW, drawH);
            const dataUri = pdf.output('datauristring');
            const base64 = String(dataUri).split(',')[1] || '';
            if (!base64) throw new Error('No se pudo generar el PDF');
            return base64;
        } finally {
            tempDiv.remove();
        }
    }

    static _loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('No se pudo cargar el logo de la veterinaria'));
            img.src = src;
        });
    }

    static nombreArchivoCarta(item) {
        const safe = [item.tipo, item.marca, item.modelo, item.serie]
            .map((part) => String(part || '').trim())
            .filter(Boolean)
            .join('_')
            .replace(/[^\w\-]+/g, '_')
            .slice(0, 80) || 'equipo';
        return `Acta_Entrega_${safe}.pdf`;
    }

    static descargarPdfBase64(base64, fileName) {
        const bin = atob(base64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const blob = new Blob([arr], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || 'Acta_Entrega.pdf';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}
