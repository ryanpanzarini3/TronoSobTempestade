function setAuthMessage(message, isError = false) {
    const el = document.getElementById('auth-status');
    if (!el) return;
    el.textContent = message;
    el.className = isError ? 'text-sm text-red-300' : 'text-sm text-gray-300';
}

function getAuthToken() {
    const currentToken = sessionStorage.getItem('authToken');
    if (currentToken) return currentToken;

    const legacyToken = localStorage.getItem('authToken');
    if (legacyToken) {
        sessionStorage.setItem('authToken', legacyToken);
        localStorage.removeItem('authToken');
        return legacyToken;
    }

    return null;
}

function clearAuthToken() {
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('authToken');
}

async function authApi(path, payload) {
    let response;

    try {
        response = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch {
        throw new Error('Não foi possível conectar ao servidor. Verifique se o deploy está online.');
    }

    const contentType = response.headers.get('content-type') || '';
    let data = {};
    let rawText = '';

    if (contentType.includes('application/json')) {
        data = await response.json().catch(() => ({}));
    } else {
        rawText = await response.text().catch(() => '');
    }

    if (!response.ok) {
        const message = data.error || data.message || rawText || `Falha na autenticação (${response.status}).`;
        throw new Error(message);
    }

    return data;
}

function bindLoginPage() {
    const form = document.getElementById('login-form');
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('registered') === '1') {
        setAuthMessage('Cadastro realizado com sucesso. Faça seu login.');
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const { token } = await authApi('/api/auth/login', { email, password });

            clearAuthToken();
            sessionStorage.setItem('authToken', token);
            window.location.href = 'campanhas.html';
        } catch (error) {
            setAuthMessage(error.message, true);
        }
    });
}

function bindRegisterPage() {
    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const name = document.getElementById('register-name').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            const role = document.getElementById('register-role').value;

            await authApi('/api/auth/register', { name, email, password, role });
            window.location.href = 'login.html?registered=1';
        } catch (error) {
            setAuthMessage(error.message, true);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    bindLoginPage();
    bindRegisterPage();
});
