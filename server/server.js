const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { customAlphabet } = require('nanoid');

const db = require('./db');
const { signToken, requireAuth } = require('./auth');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '..'), { index: false }));

function getUserByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
}

function getCampaignForUser(campaignId, userId) {
    return db.prepare(`
        SELECT c.*, m.user_id AS is_member
        FROM campaigns c
        LEFT JOIN campaign_members m ON m.campaign_id = c.id AND m.user_id = ?
        WHERE c.id = ?
    `).get(userId, campaignId);
}

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Campos obrigatórios: name, email, password, role.' });
    }

    if (!['player', 'master'].includes(role)) {
        return res.status(400).json({ error: 'Role inválido. Use player ou master.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'A senha precisa ter ao menos 6 caracteres.' });
    }

    const existing = getUserByEmail(email);
    if (existing) {
        return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const info = db.prepare(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(name.trim(), email.toLowerCase().trim(), hash, role);

    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(info.lastInsertRowid);
    const token = signToken(user);
    return res.status(201).json({ token, user });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({ error: 'Informe email e senha.' });
    }

    const userRow = getUserByEmail(email);
    if (!userRow) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const user = {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        role: userRow.role
    };

    const token = signToken(user);
    return res.json({ token, user });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
    const user = db
        .prepare('SELECT id, name, email, role FROM users WHERE id = ?')
        .get(req.user.sub);

    if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado.' });
    }

    return res.json({ user });
});

app.get('/api/campaigns', requireAuth, (req, res) => {
    const campaigns = db.prepare(`
        SELECT DISTINCT c.id, c.name, c.invite_code AS inviteCode, c.master_id AS masterId,
               u.name AS masterName
        FROM campaigns c
        JOIN users u ON u.id = c.master_id
        LEFT JOIN campaign_members m ON m.campaign_id = c.id
        WHERE c.master_id = ? OR m.user_id = ?
        ORDER BY c.id DESC
    `).all(req.user.sub, req.user.sub);

    return res.json({ campaigns });
});

app.post('/api/campaigns', requireAuth, (req, res) => {
    if (req.user.role !== 'master') {
        return res.status(403).json({ error: 'Apenas mestre pode criar campanha.' });
    }

    const { name } = req.body || {};
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nome da campanha é obrigatório.' });
    }

    const inviteCode = nanoid();
    const info = db
        .prepare('INSERT INTO campaigns (name, invite_code, master_id) VALUES (?, ?, ?)')
        .run(name.trim(), inviteCode, req.user.sub);

    db.prepare('INSERT OR IGNORE INTO campaign_members (campaign_id, user_id) VALUES (?, ?)')
        .run(info.lastInsertRowid, req.user.sub);

    const campaign = db.prepare(`
        SELECT id, name, invite_code AS inviteCode, master_id AS masterId
        FROM campaigns WHERE id = ?
    `).get(info.lastInsertRowid);

    return res.status(201).json({ campaign });
});

app.post('/api/campaigns/join', requireAuth, (req, res) => {
    const { inviteCode } = req.body || {};
    if (!inviteCode) {
        return res.status(400).json({ error: 'Informe o código da campanha.' });
    }

    const campaign = db
        .prepare('SELECT id FROM campaigns WHERE invite_code = ?')
        .get(inviteCode.trim().toUpperCase());

    if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada para este código.' });
    }

    db.prepare('INSERT OR IGNORE INTO campaign_members (campaign_id, user_id) VALUES (?, ?)')
        .run(campaign.id, req.user.sub);

    return res.status(201).json({ ok: true, campaignId: campaign.id });
});

app.get('/api/campaigns/:campaignId/sheets', requireAuth, (req, res) => {
    const campaignId = Number(req.params.campaignId);
    const campaign = getCampaignForUser(campaignId, req.user.sub);

    if (!campaign || (!campaign.is_member && campaign.master_id !== req.user.sub)) {
        return res.status(403).json({ error: 'Sem acesso à campanha.' });
    }

    let query;
    let sheets;

    if (req.user.role === 'master' && campaign.master_id === req.user.sub) {
        query = `
            SELECT s.id, s.name, s.player_id AS playerId, u.name AS playerName, s.updated_at AS updatedAt
            FROM sheets s
            JOIN users u ON u.id = s.player_id
            WHERE s.campaign_id = ?
            ORDER BY s.updated_at DESC
        `;
        sheets = db.prepare(query).all(campaignId);
    } else {
        query = `
            SELECT s.id, s.name, s.player_id AS playerId, u.name AS playerName, s.updated_at AS updatedAt
            FROM sheets s
            JOIN users u ON u.id = s.player_id
            WHERE s.campaign_id = ? AND s.player_id = ?
            ORDER BY s.updated_at DESC
        `;
        sheets = db.prepare(query).all(campaignId, req.user.sub);
    }

    return res.json({ sheets });
});

app.post('/api/campaigns/:campaignId/sheets', requireAuth, (req, res) => {
    const campaignId = Number(req.params.campaignId);
    const { name, data } = req.body || {};
    const campaign = getCampaignForUser(campaignId, req.user.sub);

    if (!campaign || (!campaign.is_member && campaign.master_id !== req.user.sub)) {
        return res.status(403).json({ error: 'Sem acesso à campanha.' });
    }

    if (!name || !data) {
        return res.status(400).json({ error: 'Campos obrigatórios: name e data.' });
    }

    const info = db.prepare(`
        INSERT INTO sheets (campaign_id, player_id, name, data_json)
        VALUES (?, ?, ?, ?)
    `).run(campaignId, req.user.sub, name.trim(), JSON.stringify(data));

    const sheet = db.prepare(`
        SELECT id, name, player_id AS playerId, campaign_id AS campaignId
        FROM sheets WHERE id = ?
    `).get(info.lastInsertRowid);

    return res.status(201).json({ sheet });
});

app.get('/api/sheets/:sheetId', requireAuth, (req, res) => {
    const sheetId = Number(req.params.sheetId);
    const sheet = db.prepare(`
        SELECT s.*, c.master_id AS masterId
        FROM sheets s
        JOIN campaigns c ON c.id = s.campaign_id
        WHERE s.id = ?
    `).get(sheetId);

    if (!sheet) {
        return res.status(404).json({ error: 'Ficha não encontrada.' });
    }

    const isOwner = sheet.player_id === req.user.sub;
    const isMaster = sheet.masterId === req.user.sub;

    if (!isOwner && !isMaster) {
        return res.status(403).json({ error: 'Sem acesso à ficha.' });
    }

    return res.json({
        sheet: {
            id: sheet.id,
            name: sheet.name,
            campaignId: sheet.campaign_id,
            playerId: sheet.player_id,
            data: JSON.parse(sheet.data_json)
        }
    });
});

app.put('/api/sheets/:sheetId', requireAuth, (req, res) => {
    const sheetId = Number(req.params.sheetId);
    const { name, data } = req.body || {};

    const sheet = db.prepare('SELECT * FROM sheets WHERE id = ?').get(sheetId);
    if (!sheet) {
        return res.status(404).json({ error: 'Ficha não encontrada.' });
    }

    if (sheet.player_id !== req.user.sub) {
        return res.status(403).json({ error: 'Apenas o dono da ficha pode editar.' });
    }

    db.prepare(`
        UPDATE sheets
        SET name = ?, data_json = ?, updated_at = datetime('now')
        WHERE id = ?
    `).run(name?.trim() || sheet.name, JSON.stringify(data || JSON.parse(sheet.data_json)), sheetId);

    return res.json({ ok: true });
});

app.get('/api/health', (_, res) => {
    res.json({ ok: true, service: 'trono-api' });
});

app.get('/', (_, res) => {
    res.sendFile(path.join(__dirname, '..', 'login.html'));
});

app.get('*', (_, res) => {
    res.sendFile(path.join(__dirname, '..', 'login.html'));
});

function startServer(port, attemptsLeft = 10) {
    const server = app.listen(port, () => {
        console.log(`Servidor iniciado em http://localhost:${port}`);
    });

    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
            const nextPort = port + 1;
            console.log(`Porta ${port} ocupada. Tentando porta ${nextPort}...`);
            startServer(nextPort, attemptsLeft - 1);
            return;
        }

        console.error('Falha ao iniciar o servidor:', error.message);
        process.exit(1);
    });
}

startServer(PORT);
