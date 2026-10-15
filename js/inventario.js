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
        return snapshotToArray(snapshot).sort((a, b) =>
            String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' })
        );
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

    static async descargarCartaEntrega(item, entregadoPorNombre) {
        if (!item) throw new Error('Equipo no especificado');
        if (typeof html2canvas !== 'function' || !window.jspdf) {
            throw new Error('No se pudo preparar el PDF');
        }
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
        const recibe = String(item.asignadoA || '').trim() || '__________________________';

        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.width = '210mm';
        tempDiv.style.background = '#fff';
        tempDiv.style.color = '#111';
        tempDiv.style.fontFamily = 'Arial, sans-serif';
        tempDiv.innerHTML = `
            <div style="padding:16mm 16mm 14mm;font-size:13px;line-height:1.45;">
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
                            <div style="border-top:1px solid #222;margin-bottom:8px;"></div>
                            <div style="font-weight:700;margin-bottom:8px;">ENTREGADO POR</div>
                            <div>Nombre: ${this._esc(entrega)}</div>
                            <div style="margin-top:4px;">Departamento de TI</div>
                            <div style="margin-top:4px;">Fecha: ____ / ____ / ______</div>
                        </td>
                        <td style="width:4%;"></td>
                        <td style="width:48%;vertical-align:top;padding-left:16px;">
                            <div style="border-top:1px solid #222;margin-bottom:8px;"></div>
                            <div style="font-weight:700;margin-bottom:8px;">RECIBIDO POR</div>
                            <div>Nombre: ${this._esc(recibe)}</div>
                            <div style="margin-top:4px;">Departamento de ${this._esc(depto)}</div>
                            <div style="margin-top:4px;">Fecha: ____ / ____ / ______</div>
                        </td>
                    </tr>
                </table>
            </div>`;
        document.body.appendChild(tempDiv);
        try {
            const canvas = await html2canvas(tempDiv, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true
            });
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const img = canvas.toDataURL('image/jpeg', 0.92);
            let drawW = pageWidth;
            let drawH = canvas.height * pageWidth / canvas.width;
            let x = 0;
            if (drawH > pageHeight) {
                drawH = pageHeight;
                drawW = canvas.width * pageHeight / canvas.height;
                x = (pageWidth - drawW) / 2;
            }
            pdf.addImage(img, 'JPEG', x, 0, drawW, drawH);
            const safe = [item.tipo, item.marca, item.modelo, item.serie]
                .map((part) => String(part || '').trim())
                .filter(Boolean)
                .join('_')
                .replace(/[^\w\-]+/g, '_')
                .slice(0, 80) || 'equipo';
            pdf.save(`Acta_Entrega_${safe}.pdf`);
        } finally {
            tempDiv.remove();
        }
    }
}
