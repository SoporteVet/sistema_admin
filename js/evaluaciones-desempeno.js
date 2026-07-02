// ============================================================
// EVALUACIONES-DESEMPENO.JS — Evaluaciones semestrales
// Veterinaria San Martín de Porres
// ============================================================

class EvaluacionesDesempenoManager {
    static async syncJefaturasCatalog() {
        const user = AuthManager.getUser();
        if (!user || (!AuthManager.isAdmin() && user.rol !== 'encargado')) return;

        try {
            const all = await AuthManager.getAllUsers();
            if (!all?.length) return;

            const updates = {};
            Object.keys(JEFATURAS_POR_DEPARTAMENTO).forEach((dep) => {
                const map = new Map();
                getJefaturasEvaluablesEnDepartamento(dep, all, null).forEach((u) => map.set(u.id, u));
                _resolverUsuariosJefaturasConfig([dep], all, null).forEach((u, id) => map.set(id, u));
                if (!map.size) return;
                const uids = {};
                map.forEach((_, id) => { uids[id] = true; });
                updates[`evaluacionesJefaturasCatalog/${dep}`] = uids;
            });

            if (Object.keys(updates).length) {
                await db.ref().update(updates);
            }
        } catch (e) {
            console.warn('EvaluacionesDesempeno syncJefaturasCatalog:', e);
        }
    }

    static async _loadUsersForJefaturasEval(evaluador, excludeUserId) {
        const depsMap = typeof App !== 'undefined' ? App._depsMap : null;
        const deps = getDepartamentosEvaluadorJefaturas(evaluador, depsMap);
        const userMap = new Map();

        for (const dep of deps) {
            try {
                const snap = await dbRef.evaluacionesJefaturasCatalog.child(dep).once('value');
                const uids = Object.keys(snap.val() || {});
                for (const uid of uids) {
                    if (uid === excludeUserId) continue;
                    const u = await AuthManager.getUserById(uid);
                    if (u && u.activo !== false) userMap.set(uid, u);
                }
            } catch (e) {
                console.warn('EvaluacionesDesempeno catalog read:', dep, e);
            }
        }

        const all = await AuthManager.getUsersForEvaluacionDesempeno(deps);
        getJefaturasEvaluablesParaEvaluador(evaluador, all, excludeUserId, depsMap)
            .forEach((u) => userMap.set(u.id, u));

        return [...userMap.values()];
    }

    static async getById(id) {
        try {
            const snap = await dbRef.evaluacionesDesempeno.child(id).once('value');
            if (!snap.exists()) return null;
            return { id, ...snap.val() };
        } catch (e) {
            console.error('EvaluacionesDesempeno getById:', e);
            return null;
        }
    }

    static puedeVer(evaluacion) {
        const user = AuthManager.getUser();
        if (!user || !evaluacion) return false;
        if (AuthManager.isAdmin()) return true;
        if (evaluacion.evaluadorId !== user.id) return false;
        if (evaluacion.tipo === 'personal' &&
            (user.rol === 'encargado' || usuarioPuedeEvaluarPersonalDesempeno(user))) {
            return true;
        }
        if (evaluacion.tipo === 'jefaturas' && user.rol === 'empleado') return true;
        return false;
    }

    static puedeCrearTipo(tipo) {
        const user = AuthManager.getUser();
        if (!user) return false;
        if (AuthManager.isAdmin()) return tipo === 'personal' || tipo === 'jefaturas';
        if (tipo === 'personal' && usuarioPuedeEvaluarPersonalDesempeno(user)) return true;
        if (user.rol === 'empleado' && tipo === 'jefaturas') return true;
        return false;
    }

    static async puedeEvaluarUsuario(tipo, evaluadoId) {
        const user = AuthManager.getUser();
        if (!user || !evaluadoId) return false;
        if (!this.puedeCrearTipo(tipo)) return false;

        const evaluado = await AuthManager.getUserById(evaluadoId);
        if (!evaluado || !evaluado.activo) return false;

        if (AuthManager.isAdmin()) {
            if (tipo === 'personal') return usuarioEvaluableDesempenoPersonal(evaluado);
            return usuarioEsJefaturaEvaluable(evaluado);
        }

        if (tipo === 'personal' && usuarioPuedeEvaluarPersonalDesempeno(user)) {
            const deps = getDepartamentosEvaluadorPersonalDesempeno(user);
            return usuarioEvaluablePersonalEnDepartamentos(evaluado, deps);
        }

        if (tipo === 'jefaturas' && user.rol === 'empleado') {
            const depsMap = typeof App !== 'undefined' ? App._depsMap : null;
            return evaluadorPuedeEvaluarJefatura(user, evaluado, depsMap);
        }

        return false;
    }

    static async listParaUsuario(tipo, periodoSemestre) {
        const user = AuthManager.getUser();
        if (!user) return [];

        try {
            if (AuthManager.isAdmin()) {
                const snap = await dbRef.evaluacionesDesempeno.once('value');
                let list = snapshotToArray(snap);
                if (tipo) list = list.filter((e) => e.tipo === tipo);
                if (periodoSemestre) list = list.filter((e) => e.periodoSemestre === periodoSemestre);
                return this._sortDesc(list);
            }

            const idxSnap = await dbRef.evaluacionesByEvaluador.child(user.id).once('value');
            const ids = Object.keys(idxSnap.val() || {});
            const list = [];
            for (const id of ids) {
                const ev = await this.getById(id);
                if (!ev) continue;
                if (tipo && ev.tipo !== tipo) continue;
                if (periodoSemestre && ev.periodoSemestre !== periodoSemestre) continue;
                if (this.puedeVer(ev)) list.push(ev);
            }
            return this._sortDesc(list);
        } catch (e) {
            console.error('EvaluacionesDesempeno listParaUsuario:', e);
            return [];
        }
    }

    static _sortDesc(list) {
        return [...list].sort((a, b) =>
            String(b.fechaCreacion || '').localeCompare(String(a.fechaCreacion || '')));
    }

    static validarRespuestas(tipo, respuestas) {
        const plantilla = getPlantillaEvaluacion(tipo);
        if (!plantilla) throw new Error('Tipo de evaluación no válido');
        const out = {};
        plantilla.secciones.forEach((sec) => {
            sec.criterios.forEach((c) => {
                const raw = respuestas[c.id];
                if (raw === undefined || raw === null || raw === '') {
                    throw new Error(`Complete el criterio: ${c.texto.substring(0, 60)}…`);
                }
                const v = Number(raw);
                if (!Number.isInteger(v) || v < 0 || v > c.max) {
                    throw new Error(`Puntaje inválido en "${c.id}" (0–${c.max})`);
                }
                out[c.id] = v;
            });
        });
        return out;
    }

    static async existeEvaluacionSemestre(tipo, periodoSemestre, evaluadorId, evaluadoId) {
        const key = buildEvaluacionUniqueKey(tipo, periodoSemestre, evaluadorId, evaluadoId);
        const snap = await dbRef.evaluacionesUnique.child(key).once('value');
        return snap.exists();
    }

    static async create(payload) {
        const user = AuthManager.getUser();
        if (!user) throw new Error('Sesión no válida');

        const tipo = String(payload.tipo || '').trim();
        if (tipo !== 'personal' && tipo !== 'jefaturas') throw new Error('Tipo inválido');
        if (!this.puedeCrearTipo(tipo)) throw new Error('No tiene permiso para este tipo de evaluación');

        const evaluadoId = String(payload.evaluadoId || '').trim();
        if (!evaluadoId) throw new Error('Seleccione a la persona evaluada');
        if (!(await this.puedeEvaluarUsuario(tipo, evaluadoId))) {
            throw new Error('No puede evaluar a esta persona');
        }

        const periodoSemestre = String(payload.periodoSemestre || getPeriodoSemestreActual()).trim();
        if (await this.existeEvaluacionSemestre(tipo, periodoSemestre, user.id, evaluadoId)) {
            throw new Error('Ya existe una evaluación suya para esta persona en el periodo seleccionado');
        }

        const evaluado = await AuthManager.getUserById(evaluadoId);
        const respuestas = this.validarRespuestas(tipo, payload.respuestas || {});
        const observacionesSecciones = payload.observacionesSecciones || {};
        const { puntajeTotal, desgloseSecciones, clasificacion } =
            calcularPuntajeEvaluacion(tipo, respuestas, observacionesSecciones);

        const plantilla = getPlantillaEvaluacion(tipo);
        const rango = getPeriodoSemestreRango(periodoSemestre);
        const now = new Date().toISOString();
        const uniqueKey = buildEvaluacionUniqueKey(tipo, periodoSemestre, user.id, evaluadoId);

        const isAdmin = AuthManager.isAdmin();
        const decisionAdministrativa = isAdmin ? String(payload.decisionAdministrativa || '').trim() : '';
        const observacionAdministracion = isAdmin ? String(payload.observacionAdministracion || '').trim() : '';

        const newRef = dbRef.evaluacionesDesempeno.push();
        const evalId = newRef.key;

        const record = {
            tipo,
            periodoSemestre,
            periodoDesde: payload.periodoDesde || rango.desde,
            periodoHasta: payload.periodoHasta || rango.hasta,
            fechaEvaluacion: payload.fechaEvaluacion || now.split('T')[0],
            evaluadorId: user.id,
            evaluadorNombre: `${user.nombre} ${user.apellido}`.trim(),
            evaluadorRol: user.rol,
            evaluadoId,
            evaluadoNombre: `${evaluado.nombre} ${evaluado.apellido}`.trim(),
            evaluadoRol: evaluado.rol,
            evaluadoDepartamento: evaluado.departamento || '',
            evaluadoPuesto: String(
                payload.evaluadoPuesto ||
                getPuestoJefaturaConfig(evaluado, evaluado.departamento) ||
                evaluado.puesto ||
                ''
            ).trim(),
            respuestas,
            desgloseSecciones,
            observacionesSecciones,
            puntajeTotal,
            categoriaResultado: clasificacion.categoria,
            resultadoSugerido: clasificacion.resultadoSugerido,
            fortalezas: String(payload.fortalezas || '').trim(),
            areasMejora: String(payload.areasMejora || '').trim(),
            recomendaciones: String(payload.recomendaciones || '').trim(),
            decisionAdministrativa: decisionAdministrativa || null,
            observacionAdministracion: observacionAdministracion || null,
            estado: 'enviada',
            fechaCreacion: now,
            fechaActualizacion: now,
            tieneAdjunto: false
        };

        // Escritura en dos pasos: evaluacionesByPeriodo valida contra evaluacionesDesempeno,
        // y en un update multi-ruta ese registro aún no existe al evaluar las reglas.
        await db.ref().update({
            [`evaluacionesDesempeno/${evalId}`]: record,
            [`evaluacionesByEvaluador/${user.id}/${evalId}`]: true,
            [`evaluacionesUnique/${uniqueKey}`]: true
        });
        await db.ref().update({
            [`evaluacionesByPeriodo/${periodoSemestre}/${tipo}/${evalId}`]: true
        });

        if (payload.file) {
            await this._guardarAdjunto(evalId, payload.file, record);
        }

        return { id: evalId, ...record };
    }

    static async _guardarAdjunto(evalId, file, record) {
        const mime = file.type || '';
        const nameLower = String(file.name || '').toLowerCase();
        if (mime !== 'application/pdf' && !nameLower.endsWith('.pdf')) {
            throw new Error('Solo se permiten archivos PDF');
        }
        if (file.size > PoliticaInternaManager.MAX_BYTES) {
            throw new Error(`El PDF supera ${PoliticaInternaManager.formatBytes(PoliticaInternaManager.MAX_BYTES)}`);
        }
        const pdfBase64 = await PoliticaInternaManager.fileToBase64Data(file);
        await dbRef.evaluacionesDesempenoFiles.child(evalId).set({ pdfBase64 });
        await dbRef.evaluacionesDesempeno.child(evalId).update({
            tieneAdjunto: true,
            nombreArchivo: file.name,
            tamañoBytes: file.size,
            fechaActualizacion: new Date().toISOString()
        });
    }

    static async updateAdminFields(id, { decisionAdministrativa, observacionAdministracion }) {
        if (!AuthManager.isAdmin()) throw new Error('Solo administración puede actualizar estos campos');
        const prev = await this.getById(id);
        if (!prev) throw new Error('Evaluación no encontrada');
        const patch = { fechaActualizacion: new Date().toISOString() };
        if (decisionAdministrativa !== undefined) patch.decisionAdministrativa = decisionAdministrativa || null;
        if (observacionAdministracion !== undefined) patch.observacionAdministracion = observacionAdministracion || null;
        await dbRef.evaluacionesDesempeno.child(id).update(patch);
        return this.getById(id);
    }

    static async getPdfBlob(id) {
        const meta = await this.getById(id);
        if (!meta || !meta.tieneAdjunto) throw new Error('No hay PDF adjunto');
        const fileSnap = await dbRef.evaluacionesDesempenoFiles.child(id).once('value');
        if (!fileSnap.exists()) throw new Error('Archivo no encontrado');
        const b64 = fileSnap.val().pdfBase64;
        const blob = PoliticaInternaManager.base64ToBlob(b64, 'application/pdf');
        return { blob, nombreArchivo: meta.nombreArchivo || 'evaluacion.pdf' };
    }

    static async getEvaluadosDisponibles(tipo) {
        const user = AuthManager.getUser();
        if (!user || !this.puedeCrearTipo(tipo)) return [];

        if (tipo === 'jefaturas' && (AuthManager.isAdmin() || user.rol === 'encargado')) {
            await this.syncJefaturasCatalog();
        }

        const depsMap = typeof App !== 'undefined' ? App._depsMap : null;

        if (tipo === 'jefaturas' && user.rol === 'empleado') {
            return this._loadUsersForJefaturasEval(user, user.id);
        }

        const users = await AuthManager.getUsersForEvaluacionDesempeno(
            getDepartamentosEvaluadorJefaturas(user, depsMap)
        );
        const activos = (users || []).filter((u) => u.activo && u.id !== user.id);

        if (AuthManager.isAdmin()) {
            if (tipo === 'personal') return getAllEvaluadosPersonal(activos, user.id);
            return getAllJefaturasEvaluables(activos, user.id);
        }

        if (tipo === 'personal' && usuarioPuedeEvaluarPersonalDesempeno(user)) {
            const deps = getDepartamentosEvaluadorPersonalDesempeno(user);
            return getEvaluadosPersonalEnDepartamentos(deps, activos, user.id);
        }

        return [];
    }

    static etiquetaTipo(tipo) {
        if (tipo === 'personal') return 'Desempeño del personal';
        if (tipo === 'jefaturas') return 'Desempeño de jefaturas';
        return tipo || '—';
    }

    static etiquetaDecision(tipo, decisionId) {
        if (!decisionId) return '—';
        const plantilla = getPlantillaEvaluacion(tipo);
        const d = (plantilla?.decisionesAdministrativas || []).find((x) => x.id === decisionId);
        return d ? d.label : decisionId;
    }
}
