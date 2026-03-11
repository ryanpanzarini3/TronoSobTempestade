function setAuthMessage(message, isError = false) {
    const el = document.getElementById('auth-status');
    if (!el) return;
    el.textContent = message;
    el.className = isError ? 'text-sm text-red-300' : 'text-sm text-gray-300';
}

async function authApi(path, payload) {
    const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Erro de autenticação');
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

            localStorage.setItem('authToken', token);
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
    const token = localStorage.getItem('authToken');
    if (token && (window.location.pathname.endsWith('/login.html') || window.location.pathname.endsWith('/cadastro.html'))) {
        window.location.href = 'campanhas.html';
        return;
    }

    bindLoginPage();
    bindRegisterPage();
});
