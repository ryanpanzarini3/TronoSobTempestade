const CampaignState = {
    token: localStorage.getItem('authToken') || null,
    user: null,
    campaigns: [],
    sheets: [],
    currentCampaignId: Number(localStorage.getItem('selectedCampaignId')) || null,
    currentSheetId: null
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

    if (CampaignState.token) {
        headers.Authorization = `Bearer ${CampaignState.token}`;
    }

    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || 'Erro na API');
    }

    return data;
}

function defaultSheetData() {
    return {
        cabecalho: {
            nomePersonagem: '',
            classeNivel: '',
            raca: '',
            antecedente: '',
            tendencia: '',
            aparencia: ''
        },
        atributos: {
            forca: 10,
            destreza: 10,
            constituicao: 10,
            inteligencia: 10,
            sabedoria: 10,
            carisma: 10,
            proficiencia: 0
        },
        pericias: {
            Acrobacia: undefined,
            Arcanismo: undefined,
            Atletismo: undefined,
            'Enganação': undefined,
            'História': undefined,
            'Intimidação': undefined,
            'Intuição': undefined,
            'Investigação': undefined,
            'Lidar com Animais': undefined,
            Medicina: undefined,
            Natureza: undefined,
            'Percepção': undefined,
            Persuasão: undefined,
            Prestidigitação: undefined,
            Religião: undefined,
            'Sobrevivência': undefined
        },
        proficiencias: {
            armaduras: [],
            armas: [],
            ferramentas: [],
            idiomas: []
        },
        caracteristicas: [],
        talentos: [],
        aliados: [],
        combate: {
            ca: 10,
            iniciativa: 0,
            deslocamento: 9,
            vidaMaxima: 0,
            vidaAtual: 0,
            ataques: []
        },
        magias: {
            slots: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            slotsGastos: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            lista: []
        },
        historia: '',
        inventario: '',
        anotacoes: ''
    };
}

function renderUserInfo() {
    const el = document.getElementById('user-info');
    if (!el || !CampaignState.user) return;
    const roleText = CampaignState.user.role === 'master' ? 'Mestre' : 'Jogador';
    el.textContent = `${CampaignState.user.name} (${roleText})`;
}

function renderCampaigns() {
    const select = document.getElementById('campaign-select');
    const invite = document.getElementById('current-invite');
    const deleteCampaignBtn = document.getElementById('delete-campaign-btn');
    const ownerHint = document.getElementById('campaign-owner-hint');
    if (!select) return;

    select.innerHTML = '';

    if (!CampaignState.campaigns.length) {
        select.innerHTML = '<option value="">Sem campanhas</option>';
        if (invite) invite.textContent = '';
        return;
    }

    CampaignState.campaigns.forEach((campaign) => {
        const option = document.createElement('option');
        option.value = String(campaign.id);
        option.textContent = `${campaign.name} (Mestre: ${campaign.masterName})`;
        select.appendChild(option);
    });

    if (!CampaignState.currentCampaignId || !CampaignState.campaigns.some((c) => c.id === CampaignState.currentCampaignId)) {
        CampaignState.currentCampaignId = CampaignState.campaigns[0].id;
    }

    select.value = String(CampaignState.currentCampaignId);
    localStorage.setItem('selectedCampaignId', String(CampaignState.currentCampaignId));

    const current = CampaignState.campaigns.find((c) => c.id === CampaignState.currentCampaignId);
    if (invite) {
        invite.textContent = current ? `Código de convite: ${current.inviteCode}` : '';
    }

    const canDeleteCampaign = !!current && current.masterId === CampaignState.user?.id;
    if (deleteCampaignBtn) {
        deleteCampaignBtn.disabled = !canDeleteCampaign;
        deleteCampaignBtn.classList.toggle('opacity-50', !canDeleteCampaign);
        deleteCampaignBtn.classList.toggle('cursor-not-allowed', !canDeleteCampaign);
    }
    if (ownerHint) {
        ownerHint.textContent = canDeleteCampaign
            ? 'Você é o mestre desta campanha e pode apagá-la.'
            : 'Somente o mestre dono pode apagar campanha.';
    }
}

function renderSheets() {
    const select = document.getElementById('sheet-select');
    const deleteSheetBtn = document.getElementById('delete-sheet-btn');
    const hint = document.getElementById('sheet-hint');
    if (!select) return;

    select.innerHTML = '';

    if (!CampaignState.sheets.length) {
        select.innerHTML = '<option value="">Sem fichas nesta campanha</option>';
        CampaignState.currentSheetId = null;
        if (deleteSheetBtn) {
            deleteSheetBtn.disabled = true;
            deleteSheetBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        if (hint) hint.textContent = 'Não há fichas nesta campanha.';
        return;
    }

    CampaignState.sheets.forEach((sheet) => {
        const option = document.createElement('option');
        option.value = String(sheet.id);
        option.textContent = `${sheet.name} - ${sheet.playerName}`;
        select.appendChild(option);
    });

    if (!CampaignState.currentSheetId || !CampaignState.sheets.some((s) => s.id === CampaignState.currentSheetId)) {
        CampaignState.currentSheetId = CampaignState.sheets[0].id;
    }

    select.value = String(CampaignState.currentSheetId);

    const selected = CampaignState.sheets.find((s) => s.id === CampaignState.currentSheetId);
    const canDeleteSheet = !!selected && selected.playerId === CampaignState.user?.id;
    if (deleteSheetBtn) {
        deleteSheetBtn.disabled = !canDeleteSheet;
        deleteSheetBtn.classList.toggle('opacity-50', !canDeleteSheet);
        deleteSheetBtn.classList.toggle('cursor-not-allowed', !canDeleteSheet);
    }
    if (hint) {
        hint.textContent = canDeleteSheet
            ? 'Ficha selecionada é sua e pode ser apagada.'
            : 'Você só pode apagar fichas criadas por você.';
    }
}

async function loadCampaigns() {
    const { campaigns } = await api('/api/campaigns');
    CampaignState.campaigns = campaigns;
    renderCampaigns();

    if (CampaignState.currentCampaignId) {
        await loadSheets(CampaignState.currentCampaignId);
    } else {
        CampaignState.sheets = [];
        renderSheets();
    }
}

async function loadSheets(campaignId) {
    CampaignState.currentCampaignId = Number(campaignId);
    localStorage.setItem('selectedCampaignId', String(CampaignState.currentCampaignId));

    const { sheets } = await api(`/api/campaigns/${campaignId}/sheets`);
    CampaignState.sheets = sheets;
    renderSheets();
}

async function createCampaign() {
    if (CampaignState.user?.role !== 'master') {
        throw new Error('Apenas mestre pode criar campanha.');
    }

    const nameInput = document.getElementById('campaign-name');
    const name = nameInput.value.trim();
    if (!name) {
        throw new Error('Digite o nome da campanha.');
    }

    await api('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({ name })
    });

    nameInput.value = '';
    await loadCampaigns();
}

async function joinCampaign() {
    const inviteInput = document.getElementById('invite-code');
    const inviteCode = inviteInput.value.trim().toUpperCase();
    if (!inviteCode) {
        throw new Error('Digite o código de convite.');
    }

    await api('/api/campaigns/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode })
    });

    inviteInput.value = '';
    await loadCampaigns();
}

async function createSheet() {
    if (!CampaignState.currentCampaignId) {
        throw new Error('Selecione uma campanha primeiro.');
    }

    const base = defaultSheetData();
    const { sheet } = await api(`/api/campaigns/${CampaignState.currentCampaignId}/sheets`, {
        method: 'POST',
        body: JSON.stringify({
            name: 'Novo Personagem',
            data: base
        })
    });

    await loadSheets(CampaignState.currentCampaignId);
    window.location.href = `index.html?campaignId=${CampaignState.currentCampaignId}&sheetId=${sheet.id}`;
}

async function deleteSelectedCampaign() {
    if (!CampaignState.currentCampaignId) {
        throw new Error('Selecione uma campanha para apagar.');
    }

    const current = CampaignState.campaigns.find((c) => c.id === CampaignState.currentCampaignId);
    if (!current || current.masterId !== CampaignState.user?.id) {
        throw new Error('Apenas o mestre dono pode apagar campanha.');
    }

    const confirmed = confirm(`Apagar a campanha "${current.name}" e todas as fichas dela?`);
    if (!confirmed) return;

    await api(`/api/campaigns/${CampaignState.currentCampaignId}`, {
        method: 'DELETE'
    });

    CampaignState.currentCampaignId = null;
    CampaignState.currentSheetId = null;
    localStorage.removeItem('selectedCampaignId');
    await loadCampaigns();
}

async function deleteSelectedSheet() {
    if (!CampaignState.currentSheetId) {
        throw new Error('Selecione uma ficha para apagar.');
    }

    const selected = CampaignState.sheets.find((s) => s.id === CampaignState.currentSheetId);
    if (!selected || selected.playerId !== CampaignState.user?.id) {
        throw new Error('Você só pode apagar fichas que são suas.');
    }

    const confirmed = confirm(`Apagar a ficha "${selected.name}"?`);
    if (!confirmed) return;

    await api(`/api/sheets/${CampaignState.currentSheetId}`, {
        method: 'DELETE'
    });

    CampaignState.currentSheetId = null;
    await loadSheets(CampaignState.currentCampaignId);
}

function openSelectedSheet() {
    if (!CampaignState.currentCampaignId || !CampaignState.currentSheetId) {
        statusMessage('Selecione campanha e ficha para abrir.', true);
        return;
    }

    window.location.href = `index.html?campaignId=${CampaignState.currentCampaignId}&sheetId=${CampaignState.currentSheetId}`;
}

async function restoreSession() {
    if (!CampaignState.token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const { user } = await api('/api/auth/me');
        CampaignState.user = user;
        renderUserInfo();
        await loadCampaigns();
        statusMessage('Campanhas carregadas com sucesso.');
    } catch {
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    }
}

function bindEvents() {
    const logoutBtn = document.getElementById('logout-btn');
    const campaignSelect = document.getElementById('campaign-select');
    const createCampaignBtn = document.getElementById('create-campaign-btn');
    const joinCampaignBtn = document.getElementById('join-campaign-btn');
    const refreshSheetsBtn = document.getElementById('refresh-sheets-btn');
    const newSheetBtn = document.getElementById('new-sheet-btn');
    const openSheetBtn = document.getElementById('open-sheet-btn');
    const deleteCampaignBtn = document.getElementById('delete-campaign-btn');
    const deleteSheetBtn = document.getElementById('delete-sheet-btn');
    const sheetSelect = document.getElementById('sheet-select');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
        });
    }

    if (campaignSelect) {
        campaignSelect.addEventListener('change', async (event) => {
            try {
                await loadSheets(event.target.value);
                renderCampaigns();
                statusMessage('Campanha selecionada.');
            } catch (error) {
                statusMessage(error.message, true);
            }
        });
    }

    if (sheetSelect) {
        sheetSelect.addEventListener('change', (event) => {
            CampaignState.currentSheetId = Number(event.target.value);
            renderSheets();
        });
    }

    if (createCampaignBtn) {
        createCampaignBtn.addEventListener('click', async () => {
            try {
                await createCampaign();
                statusMessage('Campanha criada com sucesso.');
            } catch (error) {
                statusMessage(error.message, true);
            }
        });
    }

    if (joinCampaignBtn) {
        joinCampaignBtn.addEventListener('click', async () => {
            try {
                await joinCampaign();
                statusMessage('Você entrou na campanha com sucesso.');
            } catch (error) {
                statusMessage(error.message, true);
            }
        });
    }

    if (refreshSheetsBtn) {
        refreshSheetsBtn.addEventListener('click', async () => {
            try {
                if (!CampaignState.currentCampaignId) {
                    throw new Error('Selecione uma campanha primeiro.');
                }
                await loadSheets(CampaignState.currentCampaignId);
                statusMessage('Lista de fichas atualizada.');
            } catch (error) {
                statusMessage(error.message, true);
            }
        });
    }

    if (newSheetBtn) {
        newSheetBtn.addEventListener('click', async () => {
            try {
                await createSheet();
            } catch (error) {
                statusMessage(error.message, true);
            }
        });
    }

    if (openSheetBtn) {
        openSheetBtn.addEventListener('click', openSelectedSheet);
    }

    if (deleteCampaignBtn) {
        deleteCampaignBtn.addEventListener('click', async () => {
            try {
                await deleteSelectedCampaign();
                statusMessage('Campanha apagada com sucesso.');
            } catch (error) {
                statusMessage(error.message, true);
            }
        });
    }

    if (deleteSheetBtn) {
        deleteSheetBtn.addEventListener('click', async () => {
            try {
                await deleteSelectedSheet();
                statusMessage('Ficha apagada com sucesso.');
            } catch (error) {
                statusMessage(error.message, true);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    await restoreSession();
});
