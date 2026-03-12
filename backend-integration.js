const AppSync = {
    token: localStorage.getItem('authToken') || null,
    user: null,
    campaignId: null,
    campaignName: '-',
    sheetId: null,
    sheetName: '-',
    sheetOwnerId: null,
    canEdit: true,
    suppressAutosave: false,
    saveTimer: null,
    lastSavedHash: null
};

function statusMessage(message, isError = false) {
    const el = document.getElementById('auth-status');
    if (!el) return;
    el.textContent = message;
    el.className = isError ? 'text-sm text-red-300' : 'text-sm text-gray-300';
}

async function api(path, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (AppSync.token) {
        headers.Authorization = `Bearer ${AppSync.token}`;
    }

    const response = await fetch(path, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || 'Erro na API');
    }

    return data;
}

function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const campaignId = Number(params.get('campaignId'));
    const sheetId = Number(params.get('sheetId'));

    if (!campaignId || !sheetId) {
        return null;
    }

    return { campaignId, sheetId };
}

function renderHeaderInfo() {
    const userInfo = document.getElementById('user-info');
    if (userInfo && AppSync.user) {
        const roleText = AppSync.user.role === 'master' ? 'Mestre' : 'Jogador';
        userInfo.textContent = `${AppSync.user.name} (${roleText})`;
    }

    const campaignBadge = document.getElementById('campaign-name-badge');
    if (campaignBadge) campaignBadge.textContent = AppSync.campaignName || '-';

    const sheetBadge = document.getElementById('sheet-name-badge');
    if (sheetBadge) sheetBadge.textContent = AppSync.sheetName || '-';
}

async function loadCampaignMeta() {
    const { campaigns } = await api('/api/campaigns');
    const campaign = campaigns.find((c) => c.id === AppSync.campaignId);
    if (!campaign) {
        throw new Error('Campanha não encontrada para esta ficha.');
    }

    AppSync.campaignName = campaign.name;
    renderHeaderInfo();
}

function setReadonlyMode(readonly) {
    AppSync.canEdit = !readonly;

    const saveButton = document.getElementById('save-sheet-btn');
    const deleteButton = document.getElementById('delete-sheet-btn');
    if (saveButton) {
        saveButton.disabled = readonly;
        saveButton.classList.toggle('opacity-50', readonly);
        saveButton.classList.toggle('cursor-not-allowed', readonly);
    }
    if (deleteButton) {
        deleteButton.disabled = readonly;
        deleteButton.classList.toggle('opacity-50', readonly);
        deleteButton.classList.toggle('cursor-not-allowed', readonly);
    }

    if (readonly) {
        statusMessage('Você está em modo leitura (ficha de outro jogador).');
    }
}

async function loadSheet(sheetId) {
    const { sheet } = await api(`/api/sheets/${sheetId}`);

    if (sheet.campaignId !== AppSync.campaignId) {
        throw new Error('A ficha não pertence à campanha selecionada.');
    }

    AppSync.sheetId = sheet.id;
    AppSync.sheetName = sheet.name;
    AppSync.sheetOwnerId = sheet.playerId;

    AppSync.suppressAutosave = true;
    if (typeof window.__applyFichaData === 'function') {
        window.__applyFichaData(sheet.data);
    }
    localStorage.setItem('fichaKael', JSON.stringify(sheet.data));
    AppSync.lastSavedHash = JSON.stringify(sheet.data);
    AppSync.suppressAutosave = false;

    setReadonlyMode(AppSync.sheetOwnerId !== AppSync.user.id);
    renderHeaderInfo();
    statusMessage(`Ficha "${sheet.name}" carregada.`);
}

async function saveCurrentSheet() {
    if (AppSync.suppressAutosave || !AppSync.sheetId || !AppSync.token || !AppSync.canEdit) return;

    const data = typeof window.__getFichaData === 'function'
        ? window.__getFichaData()
        : JSON.parse(localStorage.getItem('fichaKael') || '{}');

    const hash = JSON.stringify(data);
    if (hash === AppSync.lastSavedHash) return;

    const name = (data?.cabecalho?.nomePersonagem || AppSync.sheetName || 'Ficha sem nome').trim();

    await api(`/api/sheets/${AppSync.sheetId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, data })
    });

    AppSync.sheetName = name;
    AppSync.lastSavedHash = hash;
    renderHeaderInfo();
    statusMessage('Ficha sincronizada com o servidor.');
}

async function deleteCurrentSheet() {
    if (!AppSync.sheetId) {
        throw new Error('Ficha não carregada.');
    }

    if (!AppSync.canEdit) {
        throw new Error('Você só pode apagar sua própria ficha.');
    }

    const confirmed = confirm(`Deseja apagar a ficha "${AppSync.sheetName}"?`);
    if (!confirmed) return false;

    await api(`/api/sheets/${AppSync.sheetId}`, {
        method: 'DELETE'
    });

    return true;
}

function setupAutosaveIntercept() {
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (key, value) {
        originalSetItem(key, value);

        if (key === 'fichaKael' && !AppSync.suppressAutosave && AppSync.sheetId) {
            if (AppSync.saveTimer) clearTimeout(AppSync.saveTimer);
            AppSync.saveTimer = setTimeout(() => {
                saveCurrentSheet().catch((err) => statusMessage(err.message, true));
            }, 800);
        }
    };
}

async function restoreSessionAndContext() {
    if (!AppSync.token) {
        window.location.href = 'login.html';
        return false;
    }

    const query = getQueryParams();
    if (!query) {
        window.location.href = 'campanhas.html';
        return false;
    }

    AppSync.campaignId = query.campaignId;
    AppSync.sheetId = query.sheetId;

    try {
        const { user } = await api('/api/auth/me');
        AppSync.user = user;
        renderHeaderInfo();
        await loadCampaignMeta();
        await loadSheet(AppSync.sheetId);
        return true;
    } catch {
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
        return false;
    }
}

function bindEvents() {
    const logoutBtn = document.getElementById('logout-btn');
    const saveSheetBtn = document.getElementById('save-sheet-btn');
    const backCampaignsBtn = document.getElementById('back-campaigns');
    const deleteSheetBtn = document.getElementById('delete-sheet-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
        });
    }

    if (backCampaignsBtn) {
        backCampaignsBtn.addEventListener('click', () => {
            window.location.href = 'campanhas.html';
        });
    }

    if (saveSheetBtn) {
        saveSheetBtn.addEventListener('click', async () => {
            try {
                if (!AppSync.canEdit) {
                    throw new Error('Esta ficha está em modo leitura para você.');
                }
                await saveCurrentSheet();
                statusMessage('Ficha salva manualmente.');
            } catch (error) {
                statusMessage(error.message, true);
            }
        });
    }

    if (deleteSheetBtn) {
        deleteSheetBtn.addEventListener('click', async () => {
            try {
                const deleted = await deleteCurrentSheet();
                if (deleted) {
                    window.location.href = 'campanhas.html';
                }
            } catch (error) {
                statusMessage(error.message, true);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    setupAutosaveIntercept();
    bindEvents();
    await restoreSessionAndContext();
});
