// ============================================================
// CALENDARIO.JS — Ausencias de colaboradores (admin y encargados)
// Veterinaria San Martín de Porres
// ============================================================

const CALENDARIO_AUSENCIAS = {
    vacaciones: true,
    sin_goce: true,
    estudio: true,
    ingreso_posterior: true,
    salida_anticipada: true,
    dias_festivos: true
};

function usuarioVeCalendario(user) {
    return !!(user && (user.rol === 'admin' || user.rol === 'encargado'));
}

function _calendarioYmd(year, month, day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function _calendarioParseYmd(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || '').trim());
    if (!match) return '';
    return `${match[1]}-${match[2]}-${match[3]}`;
}

function fechasDeAusencia(req) {
    if (!req || req.estado === 'rechazada' || !CALENDARIO_AUSENCIAS[req.tipo]) return [];
    const datos = req.datos || {};
    const inicio = _calendarioParseYmd(datos.fecha_inicio);
    const fin = _calendarioParseYmd(datos.fecha_fin);
    if (inicio && fin) {
        let [year, month, day] = inicio.split('-').map(Number);
        const limite = fin < inicio ? inicio : fin;
        const fechas = [];
        for (let i = 0; i < 366; i++) {
            const clave = _calendarioYmd(year, month, day);
            fechas.push(clave);
            if (clave >= limite) break;
            const siguiente = new Date(year, month - 1, day + 1);
            year = siguiente.getFullYear();
            month = siguiente.getMonth() + 1;
            day = siguiente.getDate();
        }
        return fechas;
    }
    const unica = _calendarioParseYmd(datos.fecha);
    return unica ? [unica] : [];
}

function detalleAusencia(req) {
    const datos = req.datos || {};
    if (req.tipo === 'ingreso_posterior' && datos.hora_ingreso) return `Ingresa a las ${datos.hora_ingreso}`;
    if (req.tipo === 'salida_anticipada' && datos.hora_salida) return `Sale a las ${datos.hora_salida}`;
    if (req.tipo === 'dias_festivos' && datos.descripcion) return String(datos.descripcion);
    return '';
}

function solicitudesParaCalendario(lista, user) {
    if (!usuarioVeCalendario(user)) return [];
    let areas = null;
    if (user.rol !== 'admin') {
        const ids = (typeof AuthManager !== 'undefined' && AuthManager.getDepartamentosEncargado)
            ? AuthManager.getDepartamentosEncargado(user)
            : [];
        areas = new Set(ids.length ? ids : [user.departamento].filter(Boolean));
    }
    return (lista || []).filter((req) => {
        if (!fechasDeAusencia(req).length) return false;
        if (!areas) return true;
        return areas.has(req.departamento);
    });
}

function capitalizar(texto) {
    const limpio = String(texto || '');
    return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : '';
}

function htmlCalendario(opciones) {
    const year = opciones.year;
    const month = opciones.month;
    const selected = opciones.selected || '';
    const items = opciones.items || [];
    const esc = opciones.escapeHtml || ((value) => String(value ?? ''));
    const nombreDepartamento = opciones.nombreDepartamento || ((codigo) => codigo || '');
    const hoy = new Date();
    const hoyClave = _calendarioYmd(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate());
    const tituloMes = capitalizar(new Date(year, month, 1).toLocaleDateString('es-CR', { month: 'long', year: 'numeric' }));
    const porDia = {};
    items.forEach((req) => {
        fechasDeAusencia(req).forEach((fecha) => {
            if (!porDia[fecha]) porDia[fecha] = [];
            porDia[fecha].push(req);
        });
    });

    const primero = new Date(year, month, 1);
    const offset = (primero.getDay() + 6) % 7;
    const inicio = new Date(year, month, 1 - offset);
    const celdas = [];
    for (let i = 0; i < 42; i++) {
        const fecha = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
        const clave = _calendarioYmd(fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate());
        const delMes = fecha.getMonth() === month;
        const eventos = porDia[clave] || [];
        const visibles = eventos.slice(0, 2);
        const extra = eventos.length - visibles.length;
        const marcas = visibles.map((req) => {
            const clase = req.estado === 'aprobada' ? 'aprobada' : 'pendiente';
            return `<span class="cal-event ${clase}">${esc(req.solicitanteNombre || 'Colaborador')}</span>`;
        }).join('');
        const mas = extra > 0 ? `<span class="cal-more">+${extra}</span>` : '';
        const clases = [
            'cal-day',
            delMes ? '' : 'cal-out',
            clave === hoyClave ? 'cal-today' : '',
            clave === selected ? 'cal-selected' : ''
        ].filter(Boolean).join(' ');
        celdas.push(`<button type="button" class="${clases}" onclick="App.calendarioIr(${fecha.getFullYear()}, ${fecha.getMonth()}, ${fecha.getDate()})">
            <span class="cal-num">${fecha.getDate()}</span>
            <span class="cal-events">${marcas}${mas}</span>
        </button>`);
    }

    const elegidos = selected ? (porDia[selected] || []) : [];
    const tituloDia = selected
        ? capitalizar(new Date(selected + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
        : '';
    const estadoTxt = {
        aprobada: 'Aprobada',
        pendiente: 'Pendiente',
        pendiente_ti: 'Pendiente',
        pendiente_gerencia: 'Pendiente'
    };
    const lista = elegidos.length
        ? elegidos.map((req) => {
            const detalle = detalleAusencia(req);
            const dep = nombreDepartamento(req.departamento);
            const clase = req.estado === 'aprobada' ? 'aprobada' : 'pendiente';
            return `<li class="cal-person">
                <div>
                    <strong>${esc(req.solicitanteNombre || 'Colaborador')}</strong>
                    <div class="cal-person-meta">${esc(req.tipoNombre || req.tipo || 'Solicitud')}${dep ? ` · ${esc(dep)}` : ''}${detalle ? ` · ${esc(detalle)}` : ''}</div>
                </div>
                <span class="status-badge ${clase}">${esc(estadoTxt[req.estado] || req.estado || '')}</span>
            </li>`;
        }).join('')
        : `<li class="cal-empty">Nadie tiene una ausencia registrada este día.</li>`;

    return `<div class="cal-wrap">
        <div class="cal-toolbar">
            <div class="cal-nav">
                <button type="button" class="btn btn-outline btn-sm" onclick="App.calendarioMes(-1)" aria-label="Mes anterior"><i class="fas fa-chevron-left"></i></button>
                <h2>${esc(tituloMes)}</h2>
                <button type="button" class="btn btn-outline btn-sm" onclick="App.calendarioMes(1)" aria-label="Mes siguiente"><i class="fas fa-chevron-right"></i></button>
            </div>
            <button type="button" class="btn btn-outline btn-sm" onclick="App.calendarioHoy()">Hoy</button>
        </div>
        <p class="cal-hint">Aparecen las solicitudes de vacaciones, permisos y días en que un colaborador va a faltar. Las rechazadas no se muestran.</p>
        <div class="cal-legend">
            <span class="cal-event aprobada">Aprobada</span>
            <span class="cal-event pendiente">Pendiente de aprobar</span>
        </div>
        <div class="cal-grid">
            ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dia) => `<div class="cal-dow">${dia}</div>`).join('')}
            ${celdas.join('')}
        </div>
        <div class="cal-detail">
            <h3>${esc(tituloDia)}</h3>
            <ul>${lista}</ul>
        </div>
    </div>`;
}
