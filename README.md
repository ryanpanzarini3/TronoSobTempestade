# Trono Sob a Tempestade - Sistema Completo de Fichas

Este projeto agora funciona como um sistema full stack com:

- Login e cadastro (`jogador` e `mestre`)
- Campanhas com código de convite
- Fichas por campanha
- Acesso do mestre a todas as fichas da campanha
- Persistência em banco SQLite

## Requisitos

- Node.js 18+

## Instalação

```bash
npm install
```

## Executar

```bash
npm start
```

Abra no navegador:

`http://localhost:3000`

Se a porta `3000` estiver ocupada, o servidor tenta automaticamente `3001`, `3002`, etc.
Use a URL exibida no terminal (`Servidor iniciado em http://localhost:PORTA`).

## Subir em nuvem (Render)

Este projeto já está preparado para Render com disco persistente (`render.yaml`).

Passos:

1. Suba o projeto no GitHub.
2. No Render, escolha **New + > Blueprint**.
3. Selecione seu repositório.
4. O Render vai ler o `render.yaml` e criar:
	- Web service Node
	- Disco persistente em `/var/data`
	- `DB_PATH=/var/data/app.db`
	- `JWT_SECRET` gerado automaticamente
5. Faça o deploy e abra a URL pública gerada.

Com isso, seu servidor fica online 24h sem precisar deixar o PC ligado.

A página inicial agora é a de login.

## Fluxo recomendado

1. Acesse a tela de login e clique em cadastrar (ou vá para `cadastro.html`).
2. Após cadastrar, você é redirecionado para login.
3. Faça login e entre na tela inicial do servidor (`campanhas.html`) com campanhas.
4. Mestre cria campanha e compartilha o código de convite.
5. Jogadores entram na campanha com o código e criam suas fichas.
6. Abra a ficha no editor (`index.html?campaignId=...&sheetId=...`) pela própria tela de campanhas.
7. Mestre visualiza fichas de todos da campanha (modo leitura para fichas que não são dele).

## Estrutura adicionada

- `server/server.js`: API REST + servidor estático
- `server/db.js`: criação e conexão SQLite
- `server/auth.js`: JWT e middleware de autenticação
- `backend-integration.js`: integração do front atual com API
- `auth-pages.js`: lógica de login e cadastro
- `login.html`: tela de login
- `cadastro.html`: tela de cadastro
- `campanhas.html`: painel de campanhas e listagem de fichas
- `campanhas-integration.js`: lógica de campanhas/convite/listagem de fichas
- `data/app.db`: banco SQLite (criado automaticamente na primeira execução)

## Endpoints principais

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/campaigns`
- `POST /api/campaigns`
- `POST /api/campaigns/join`
- `GET /api/campaigns/:campaignId/sheets`
- `POST /api/campaigns/:campaignId/sheets`
- `GET /api/sheets/:sheetId`
- `PUT /api/sheets/:sheetId`

## Observações

- O salvamento automático continua acontecendo ao editar a ficha, agora sincronizando com o servidor quando uma ficha de campanha está selecionada.
- Em produção, defina `JWT_SECRET` no ambiente para trocar o segredo padrão.
