require('dotenv').config();

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    throw new Error('Falta DATABASE_URL. Copia .env.example a .env y configura PostgreSQL.');
}

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sessionCookieName = 'festival_session';
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;
const eventDate = '12-14 Feb 2027 • Parque Norte';
const alwaysAdminEmail = 'jacob289355@gmail.com';

app.disable('x-powered-by');
app.use(express.json({ limit: '6mb' }));

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function generateTicketCode() {
    return `NB-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function publicUser(row) {
    const esAdministrador = row.correo_electronico.trim().toLowerCase() === alwaysAdminEmail
        || row.rol === 'administrador';
    return {
        id: row.num_identificacion,
        nombre: row.nombre,
        correo: row.correo_electronico,
        attendeeCode: row.num_identificacion,
        rol: esAdministrador ? 'administrador' : row.rol
    };
}

function readSessionToken(req) {
    const cookieHeader = req.headers.cookie || '';
    const cookie = cookieHeader.split(';').map((part) => part.trim())
        .find((part) => part.startsWith(`${sessionCookieName}=`));
    if (!cookie) return null;
    try {
        return decodeURIComponent(cookie.slice(sessionCookieName.length + 1));
    } catch {
        return null;
    }
}

function setSessionCookie(res, token) {
    res.cookie(sessionCookieName, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: sessionDurationMs
    });
}

async function createSession(numIdentificacion, client = pool) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + sessionDurationMs);
    await client.query(
        'INSERT INTO sesion_asistente (token_hash, num_identificacion, expira_en) VALUES ($1, $2, $3)',
        [hashToken(token), numIdentificacion, expiresAt]
    );
    return token;
}

async function requireAuth(req, res, next) {
    try {
        const token = readSessionToken(req);
        if (!token) {
            return res.status(401).json({ error: 'Inicia sesión para continuar.' });
        }

        const result = await pool.query(
            `SELECT a.num_identificacion, a.nombre, a.correo_electronico, a.rol
             FROM sesion_asistente s
             JOIN asistente a ON a.num_identificacion = s.num_identificacion
             WHERE s.token_hash = $1 AND s.expira_en > NOW()`,
            [hashToken(token)]
        );

        if (result.rowCount === 0) {
            return res.status(401).json({ error: 'La sesión expiró. Inicia sesión nuevamente.' });
        }

        req.user = publicUser(result.rows[0]);
        next();
    } catch (error) {
        next(error);
    }
}

function requireAdmin(req, res, next) {
    if (req.user.rol !== 'administrador') {
        return res.status(403).json({ error: 'Esta acción requiere permisos de administrador.' });
    }
    next();
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/api/health', async (req, res, next) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
        next(error);
    }
});

app.post('/api/auth/register', async (req, res, next) => {
    const client = await pool.connect();
    let transactionStarted = false;
    try {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
        const numIdentificacion = typeof body.numIdentificacion === 'string'
            ? body.numIdentificacion.trim()
            : '';
        const telefono = typeof body.telefono === 'string' ? body.telefono.trim() : '';
        const correo = typeof body.correo === 'string' ? body.correo.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';

        if (nombre.length < 2 || nombre.length > 100) {
            return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres.' });
        }
        if (!/^[A-Za-z0-9.-]{1,10}$/.test(numIdentificacion)) {
            return res.status(400).json({ error: 'La identificación debe tener entre 1 y 10 caracteres alfanuméricos.' });
        }
        if (telefono.length > 20) {
            return res.status(400).json({ error: 'El teléfono no puede superar 20 caracteres.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 100) {
            return res.status(400).json({ error: 'Ingresa un correo electrónico válido de máximo 100 caracteres.' });
        }
        if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres y un máximo de 72 bytes.' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        await client.query('BEGIN');
        transactionStarted = true;
        const result = await client.query(
            `INSERT INTO asistente (num_identificacion, nombre, telefono, correo_electronico)
             VALUES ($1, $2, $3, $4)
             RETURNING num_identificacion, nombre, correo_electronico, rol`,
            [numIdentificacion, nombre, telefono || null, correo]
        );
        await client.query(
            'INSERT INTO credencial_asistente (num_identificacion, password_hash) VALUES ($1, $2)',
            [numIdentificacion, passwordHash]
        );
        const token = await createSession(numIdentificacion, client);
        await client.query('COMMIT');
        transactionStarted = false;
        setSessionCookie(res, token);

        res.status(201).json({ user: publicUser(result.rows[0]) });
    } catch (error) {
        if (transactionStarted) await client.query('ROLLBACK');
        if (error.code === '23505') {
            return res.status(409).json({ error: 'La identificación o el correo ya están registrados.' });
        }
        next(error);
    } finally {
        client.release();
    }
});

app.post('/api/auth/login', async (req, res, next) => {
    try {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const correo = typeof body.correo === 'string' ? body.correo.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';

        const result = await pool.query(
            `SELECT a.num_identificacion, a.nombre, a.correo_electronico, a.rol, c.password_hash
             FROM asistente a
             JOIN credencial_asistente c ON c.num_identificacion = a.num_identificacion
             WHERE LOWER(a.correo_electronico) = $1`,
            [correo]
        );
        const user = result.rows[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
        }

        const token = await createSession(user.num_identificacion);
        setSessionCookie(res, token);
        res.json({ user: publicUser(user) });
    } catch (error) {
        next(error);
    }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
});

app.post('/api/auth/logout', async (req, res, next) => {
    try {
        const token = readSessionToken(req);
        if (token) {
            await pool.query('DELETE FROM sesion_asistente WHERE token_hash = $1', [hashToken(token)]);
        }
        res.clearCookie(sessionCookieName, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

app.get('/api/ticket-types', async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT id_tipo_entrada, tipo_entrada, precio
             FROM tipo_entrada
             WHERE precio IS NOT NULL AND precio > 0
             ORDER BY tipo_entrada`
        );
        res.json({
            tipos: result.rows.map((row) => ({
                id: row.id_tipo_entrada,
                nombre: row.tipo_entrada,
                precioCop: Number(row.precio)
            }))
        });
    } catch (error) {
        next(error);
    }
});

app.get('/api/artists', async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT a.id_artista, a.nombre_artistico, a.genero_musical,
                    COALESCE(d.escenario, 'Escenario por anunciar') AS escenario,
                    COALESCE(d.horario, 'Horario por anunciar') AS horario,
                    COALESCE(d.foto_data_url, '') AS foto
             FROM artista a
             LEFT JOIN festival_artista_detalle d ON d.id_artista = a.id_artista
             ORDER BY a.nombre_artistico`
        );
        res.json({
            artistas: result.rows.map((row) => ({
                id: row.id_artista,
                nombre: row.nombre_artistico,
                genero: row.genero_musical || 'Género por anunciar',
                escenario: row.escenario,
                horario: row.horario,
                foto: row.foto
            }))
        });
    } catch (error) {
        next(error);
    }
});

app.post('/api/admin/artists', requireAuth, requireAdmin, async (req, res, next) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
    const genero = typeof body.genero === 'string' ? body.genero.trim() : '';
    const escenario = typeof body.escenario === 'string' ? body.escenario.trim() : '';
    const horario = typeof body.horario === 'string' ? body.horario.trim() : '';
    const foto = typeof body.foto === 'string' ? body.foto : '';

    if (nombre.length < 1 || nombre.length > 100 || genero.length < 1 || genero.length > 50) {
        return res.status(400).json({ error: 'El nombre (máx. 100) y género (máx. 50) son obligatorios.' });
    }
    if (escenario.length < 1 || escenario.length > 100 || horario.length < 1 || horario.length > 100) {
        return res.status(400).json({ error: 'El escenario y horario son obligatorios (máx. 100 caracteres).' });
    }
    if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(foto)
        || Buffer.byteLength(foto, 'utf8') > 4 * 1024 * 1024 + 128) {
        return res.status(400).json({ error: 'La foto debe ser PNG, JPG o WebP y pesar como máximo 3 MB.' });
    }

    const client = await pool.connect();
    let transactionStarted = false;
    try {
        await client.query('BEGIN');
        transactionStarted = true;
        const artistId = `A${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const artistResult = await client.query(
            `INSERT INTO artista (id_artista, genero_musical, pais, numero_integrantes, nombre_artistico)
             VALUES ($1, $2, $3, 1, $4)
             RETURNING id_artista, genero_musical, nombre_artistico`,
            [artistId, genero, 'No especificado', nombre]
        );
        await client.query(
            `INSERT INTO festival_artista_detalle (id_artista, escenario, horario, foto_data_url)
             VALUES ($1, $2, $3, $4)`,
            [artistId, escenario, horario, foto]
        );
        await client.query('COMMIT');
        transactionStarted = false;
        res.status(201).json({
            artista: {
                id: artistResult.rows[0].id_artista,
                nombre: artistResult.rows[0].nombre_artistico,
                genero: artistResult.rows[0].genero_musical,
                escenario,
                horario,
                foto
            }
        });
    } catch (error) {
        if (transactionStarted) await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});

app.delete('/api/admin/artists/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const result = await pool.query(
            'DELETE FROM artista WHERE id_artista = $1 RETURNING id_artista',
            [req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'No se encontró el artista.' });
        }
        res.status(204).end();
    } catch (error) {
        if (error.code === '23503') {
            return res.status(409).json({ error: 'No se puede eliminar: el artista tiene presentaciones asociadas.' });
        }
        next(error);
    }
});

app.get('/api/map', async (req, res, next) => {
    try {
        const [mapResult, serviceResult] = await Promise.all([
            pool.query('SELECT imagen_data_url FROM mapa_festival WHERE id = TRUE'),
            pool.query('SELECT id, x, y, x_fin, y_fin, tipo, descripcion FROM servicio_mapa ORDER BY id')
        ]);
        res.json({
            imagen: mapResult.rows[0]?.imagen_data_url || null,
            servicios: serviceResult.rows.map((service) => ({
                id: service.id,
                x: Number(service.x),
                y: Number(service.y),
                xFin: service.x_fin === null ? null : Number(service.x_fin),
                yFin: service.y_fin === null ? null : Number(service.y_fin),
                tipo: service.tipo,
                descripcion: service.descripcion
            }))
        });
    } catch (error) {
        next(error);
    }
});

app.put('/api/admin/map', requireAuth, requireAdmin, async (req, res, next) => {
    const imagen = req.body && typeof req.body.imagen === 'string' ? req.body.imagen : '';
    if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(imagen)
        || Buffer.byteLength(imagen, 'utf8') > 4 * 1024 * 1024 + 128) {
        return res.status(400).json({ error: 'La imagen debe ser PNG, JPG o WebP y pesar como máximo 3 MB.' });
    }
    try {
        await pool.query(
            `INSERT INTO mapa_festival (id, imagen_data_url) VALUES (TRUE, $1)
             ON CONFLICT (id) DO UPDATE SET imagen_data_url = EXCLUDED.imagen_data_url`,
            [imagen]
        );
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

app.post('/api/admin/services', requireAuth, requireAdmin, async (req, res, next) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const x = Number(body.x);
    const y = Number(body.y);
    const xFin = body.xFin === null || body.xFin === undefined ? null : Number(body.xFin);
    const yFin = body.yFin === null || body.yFin === undefined ? null : Number(body.yFin);
    const tipo = typeof body.tipo === 'string' ? body.tipo.trim() : '';
    const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : '';
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
        return res.status(400).json({ error: 'La posición del servicio no es válida.' });
    }
    if (tipo.length < 1 || tipo.length > 100 || descripcion.length < 1 || descripcion.length > 200) {
        return res.status(400).json({ error: 'El tipo y descripción del servicio son obligatorios (máx. 100 y 200 caracteres).' });
    }
    if (tipo === '♿ Rutas accesibles'
        ? !Number.isFinite(xFin) || !Number.isFinite(yFin) || xFin < 0 || xFin > 100 || yFin < 0 || yFin > 100
        : xFin !== null || yFin !== null) {
        return res.status(400).json({ error: 'Las rutas accesibles deben incluir dos puntos válidos en el mapa.' });
    }
    try {
        const result = await pool.query(
            `INSERT INTO servicio_mapa (x, y, x_fin, y_fin, tipo, descripcion)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, x, y, x_fin, y_fin, tipo, descripcion`,
            [x, y, xFin, yFin, tipo, descripcion]
        );
        res.status(201).json({ servicio: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

app.put('/api/admin/services/:id', requireAuth, requireAdmin, async (req, res, next) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const x = Number(body.x);
    const y = Number(body.y);
    const xFin = body.xFin === null || body.xFin === undefined ? null : Number(body.xFin);
    const yFin = body.yFin === null || body.yFin === undefined ? null : Number(body.yFin);
    const tipo = typeof body.tipo === 'string' ? body.tipo.trim() : '';
    const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : '';
    if (!/^\d+$/.test(req.params.id)
        || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100
        || tipo.length < 1 || tipo.length > 100
        || descripcion.length < 1 || descripcion.length > 200) {
        return res.status(400).json({ error: 'El tipo o la descripción del servicio no son válidos.' });
    }
    if (tipo === '♿ Rutas accesibles'
        ? !Number.isFinite(xFin) || !Number.isFinite(yFin) || xFin < 0 || xFin > 100 || yFin < 0 || yFin > 100
        : xFin !== null || yFin !== null) {
        return res.status(400).json({ error: 'Las rutas accesibles deben incluir dos puntos válidos en el mapa.' });
    }
    try {
        const result = await pool.query(
            `UPDATE servicio_mapa SET x = $1, y = $2, x_fin = $3, y_fin = $4, tipo = $5, descripcion = $6
             WHERE id = $7 RETURNING id`,
            [x, y, xFin, yFin, tipo, descripcion, req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'No se encontró el servicio.' });
        }
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

app.delete('/api/admin/services/:id', requireAuth, requireAdmin, async (req, res, next) => {
    if (!/^\d+$/.test(req.params.id)) {
        return res.status(400).json({ error: 'El identificador del servicio no es válido.' });
    }
    try {
        const result = await pool.query(
            'DELETE FROM servicio_mapa WHERE id = $1 RETURNING id',
            [req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'No se encontró el servicio.' });
        }
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

app.delete('/api/admin/map', requireAuth, requireAdmin, async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM servicio_mapa');
        await client.query('DELETE FROM mapa_festival WHERE id = TRUE');
        await client.query('COMMIT');
        res.status(204).end();
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});

app.get('/api/announcements', async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT id, titulo, mensaje, categoria, creado_en
             FROM aviso_festival
             ORDER BY creado_en DESC, id DESC`
        );
        res.json({
            avisos: result.rows.map((row) => ({
                id: row.id,
                titulo: row.titulo,
                mensaje: row.mensaje,
                categoria: row.categoria,
                creadoEn: row.creado_en
            }))
        });
    } catch (error) {
        next(error);
    }
});

app.post('/api/admin/announcements', requireAuth, requireAdmin, async (req, res, next) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : '';
    const mensaje = typeof body.mensaje === 'string' ? body.mensaje.trim() : '';
    const categoria = typeof body.categoria === 'string' ? body.categoria : '';
    if (titulo.length < 1 || titulo.length > 120 || mensaje.length < 1 || mensaje.length > 1000
        || !['Información', 'Última hora', 'Accesibilidad'].includes(categoria)) {
        return res.status(400).json({ error: 'El título, mensaje o categoría del aviso no son válidos.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO aviso_festival (titulo, mensaje, categoria)
             VALUES ($1, $2, $3)
             RETURNING id, titulo, mensaje, categoria, creado_en`,
            [titulo, mensaje, categoria]
        );
        res.status(201).json({ aviso: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

app.put('/api/admin/announcements/:id', requireAuth, requireAdmin, async (req, res, next) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : '';
    const mensaje = typeof body.mensaje === 'string' ? body.mensaje.trim() : '';
    const categoria = typeof body.categoria === 'string' ? body.categoria : '';
    if (!/^\d+$/.test(req.params.id)
        || titulo.length < 1 || titulo.length > 120 || mensaje.length < 1 || mensaje.length > 1000
        || !['Información', 'Última hora', 'Accesibilidad'].includes(categoria)) {
        return res.status(400).json({ error: 'El aviso no es válido.' });
    }

    try {
        const result = await pool.query(
            `UPDATE aviso_festival
             SET titulo = $1, mensaje = $2, categoria = $3
             WHERE id = $4
             RETURNING id`,
            [titulo, mensaje, categoria, req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'No se encontró el aviso.' });
        }
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

app.delete('/api/admin/announcements/:id', requireAuth, requireAdmin, async (req, res, next) => {
    if (!/^\d+$/.test(req.params.id)) {
        return res.status(400).json({ error: 'El identificador del aviso no es válido.' });
    }
    try {
        const result = await pool.query(
            'DELETE FROM aviso_festival WHERE id = $1 RETURNING id',
            [req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'No se encontró el aviso.' });
        }
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

app.get('/api/tickets', requireAuth, async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT e.cod_entrada, e.fecha_compra, te.tipo_entrada, te.precio
             FROM entrada e
             JOIN tipo_entrada te ON te.id_tipo_entrada = e.id_tipo_entrada
             WHERE e.num_identificacion = $1
             ORDER BY e.fecha_compra DESC, e.cod_entrada`,
            [req.user.id]
        );
        res.json({
            tickets: result.rows.map((ticket) => ({
                codigo: ticket.cod_entrada,
                tipo: ticket.tipo_entrada,
                precioCop: Number(ticket.precio),
                estado: 'Activo',
                compradoEn: ticket.fecha_compra,
                titulo: `Entrada ${ticket.tipo_entrada} - Festival 2027`,
                fecha: eventDate
            }))
        });
    } catch (error) {
        next(error);
    }
});

app.post('/api/tickets', requireAuth, async (req, res, next) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const idTipoEntrada = typeof body.idTipoEntrada === 'string' ? body.idTipoEntrada : '';
    const quantity = Number(body.cantidad);
    if (!/^[A-Za-z0-9-]{1,10}$/.test(idTipoEntrada)) {
        return res.status(400).json({ error: 'Selecciona un tipo de entrada válido.' });
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        return res.status(400).json({ error: 'La cantidad debe estar entre 1 y 10.' });
    }

    const client = await pool.connect();
    let transactionStarted = false;
    try {
        await client.query('BEGIN');
        transactionStarted = true;
        const typeResult = await client.query(
            `SELECT id_tipo_entrada, tipo_entrada, precio
             FROM tipo_entrada
             WHERE id_tipo_entrada = $1 AND precio IS NOT NULL AND precio > 0
             FOR SHARE`,
            [idTipoEntrada]
        );
        if (typeResult.rowCount === 0) {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(400).json({ error: 'El tipo de entrada no existe o no tiene un precio válido.' });
        }

        const ticketType = typeResult.rows[0];
        const tickets = [];
        for (let index = 0; index < quantity; index += 1) {
            const result = await client.query(
                `INSERT INTO entrada (cod_entrada, id_tipo_entrada, fecha_compra, num_identificacion)
                 VALUES ($1, $2, CURRENT_DATE, $3)
                 RETURNING cod_entrada, fecha_compra`,
                [generateTicketCode(), ticketType.id_tipo_entrada, req.user.id]
            );
            tickets.push({
                codigo: result.rows[0].cod_entrada,
                tipo: ticketType.tipo_entrada,
                precioCop: Number(ticketType.precio),
                estado: 'Activo',
                compradoEn: result.rows[0].fecha_compra,
                titulo: `Entrada ${ticketType.tipo_entrada} - Festival 2027`,
                fecha: eventDate
            });
        }
        await client.query('COMMIT');
        transactionStarted = false;
        res.status(201).json({
            tickets,
            totalCop: Number(ticketType.precio) * quantity
        });
    } catch (error) {
        if (transactionStarted) await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});

app.post('/api/admin/qr/validate', requireAuth, requireAdmin, async (req, res, next) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const rawCode = typeof body.codigo === 'string' ? body.codigo.trim().toUpperCase() : '';

    if (!rawCode || rawCode.length > 50) {
        return res.status(400).json({
            status: 'invalida',
            alerta: 'Código inválido: ingresa un código QR válido.'
        });
    }

    const client = await pool.connect();
    let transactionStarted = false;

    try {
        await client.query('BEGIN');
        transactionStarted = true;

        const ticketResult = await client.query(
            `SELECT e.cod_entrada, e.estado_qr, e.fecha_redencion, e.fecha_compra,
                    e.num_identificacion, te.tipo_entrada, a.nombre AS asistente_nombre
             FROM entrada e
             LEFT JOIN tipo_entrada te ON te.id_tipo_entrada = e.id_tipo_entrada
             LEFT JOIN asistente a ON a.num_identificacion = e.num_identificacion
             WHERE UPPER(e.cod_entrada) = $1
             FOR UPDATE OF e`,
            [rawCode]
        );

        if (ticketResult.rowCount === 0) {
            await client.query(
                `INSERT INTO registro_acceso (codigo_escaneado, cod_entrada, resultado)
                 VALUES ($1, NULL, 'invalida')`,
                [rawCode]
            );
            await client.query('COMMIT');
            transactionStarted = false;

            return res.status(404).json({
                status: 'invalida',
                alerta: `ALERTA: El código "${rawCode}" no existe o es inválido.`
            });
        }

        const ticket = ticketResult.rows[0];

        if (ticket.estado_qr === 'redimida') {
            await client.query(
                `INSERT INTO registro_acceso (codigo_escaneado, cod_entrada, resultado)
                 VALUES ($1, $2, 'ya_redimida')`,
                [rawCode, ticket.cod_entrada]
            );
            await client.query('COMMIT');
            transactionStarted = false;

            return res.status(409).json({
                status: 'ya_redimida',
                alerta: `ALERTA DE SEGURIDAD: La entrada "${ticket.cod_entrada}" ya fue redimida.`,
                fechaRedencion: ticket.fecha_redencion,
                entrada: {
                    codigo: ticket.cod_entrada,
                    tipo: ticket.tipo_entrada || 'General',
                    asistente: ticket.asistente_nombre || ticket.num_identificacion
                }
            });
        }

        const updatedResult = await client.query(
            `UPDATE entrada
             SET estado_qr = 'redimida', fecha_redencion = NOW()
             WHERE cod_entrada = $1
             RETURNING cod_entrada, estado_qr, fecha_redencion`,
            [ticket.cod_entrada]
        );

        await client.query(
            `INSERT INTO registro_acceso (codigo_escaneado, cod_entrada, resultado)
             VALUES ($1, $2, 'valido')`,
            [rawCode, ticket.cod_entrada]
        );

        await client.query('COMMIT');
        transactionStarted = false;

        return res.json({
            status: 'valido',
            mensaje: `Acceso aprobado: entrada "${ticket.cod_entrada}" redimida con éxito.`,
            fechaRedencion: updatedResult.rows[0].fecha_redencion,
            entrada: {
                codigo: ticket.cod_entrada,
                tipo: ticket.tipo_entrada || 'General',
                asistente: ticket.asistente_nombre || ticket.num_identificacion,
                estadoQr: updatedResult.rows[0].estado_qr
            }
        });
    } catch (error) {
        if (transactionStarted) await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});

app.get('/api/admin/access-logs', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT r.id_acceso, r.codigo_escaneado, r.cod_entrada, r.resultado, r.fecha_acceso,
                    te.tipo_entrada, a.nombre AS asistente_nombre
             FROM registro_acceso r
             LEFT JOIN entrada e ON e.cod_entrada = r.cod_entrada
             LEFT JOIN tipo_entrada te ON te.id_tipo_entrada = e.id_tipo_entrada
             LEFT JOIN asistente a ON a.num_identificacion = e.num_identificacion
             ORDER BY r.fecha_acceso DESC, r.id_acceso DESC
             LIMIT 100`
        );
        res.json({
            registros: result.rows.map((row) => ({
                id: row.id_acceso,
                codigoEscaneado: row.codigo_escaneado,
                codigoEntrada: row.cod_entrada,
                resultado: row.resultado,
                fechaAcceso: row.fecha_acceso,
                tipoEntrada: row.tipo_entrada || null,
                asistente: row.asistente_nombre || null
            }))
        });
    } catch (error) {
        next(error);
    }
});

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ruta de API no encontrada.' });
});

app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) return next(error);
    res.status(500).json({ error: 'Error interno del servidor.' });
});

async function start() {
    const schema = await fs.readFile(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
    await pool.query(schema);
    await pool.query('DELETE FROM sesion_asistente WHERE expira_en <= NOW()');

    const port = Number(process.env.PORT) || 3000;
    app.listen(port, () => {
        console.log(`Night Bass Festival disponible en http://localhost:${port}`);
    });
}

start().catch(async (error) => {
    console.error('No se pudo iniciar el backend:', error);
    await pool.end();
    process.exitCode = 1;
});
