import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../frontend/js/sfx-core.js', import.meta.url), 'utf8');
function storage() {
    const data = new Map();
    return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: k => data.delete(k) };
}
function token(papel = 'cliente', exp = Math.floor(Date.now() / 1000) + 3600) {
    return 'header.' + Buffer.from(JSON.stringify({ papel, exp, nome: 'João' })).toString('base64url') + '.signature';
}
function ambiente(fetcher = async () => new Response('{}')) {
    const redirects = [];
    const window = { sessionStorage: storage(), localStorage: storage(), SFX_API_BASE_URL: 'https://api.example.test/',
        location: { replace: path => redirects.push(path) } };
    const ctx = vm.createContext({ window, fetch: fetcher, Headers, AbortController, Uint8Array,
        TextDecoder, Date, atob, setTimeout, clearTimeout });
    vm.runInContext(source, ctx);
    return { Sfx: window.Sfx, window, redirects };
}
function login(a, lembrar = false) {
    a.Sfx.salvarSessao(token(), { id: 'cliente', nome: 'João', papel: 'cliente' }, lembrar);
}

test('decodifica JWT com UTF-8 e base64url sem padding', () => {
    const { Sfx } = ambiente();
    assert.equal(Sfx.payloadToken(token()).nome, 'João');
    assert.equal(Sfx.payloadToken('quebrado'), null);
});
test('remove sessões expiradas sem permitir acesso ao painel', () => {
    const a = ambiente();
    a.window.localStorage.setItem('sfx_usuario', JSON.stringify({ token: token('admin', 1) }));
    assert.equal(a.Sfx.exigirPapel(['admin']), false);
    assert.deepEqual(a.redirects, ['login.html']);
    assert.equal(a.window.localStorage.getItem('sfx_usuario'), null);
});
test('sessão inválida não impede recuperação de outra sessão válida', () => {
    const a = ambiente();
    a.window.sessionStorage.setItem('sfx_usuario', '{corrompido');
    a.window.localStorage.setItem('sfx_usuario', JSON.stringify({ token: token(), nome: 'Maria' }));
    assert.equal(a.Sfx.obterSessao().nome, 'Maria');
    assert.equal(a.window.sessionStorage.getItem('sfx_usuario'), null);
});
test('novo cadastro não reutiliza a conta antiga do localStorage', () => {
    const a = ambiente();
    login(a, true);
    a.Sfx.salvarSessao(token(), { id: 'novo' });
    assert.equal(a.Sfx.obterSessao().id, 'novo');
    assert.equal(a.window.localStorage.getItem('sfx_usuario'), null);
    assert.equal(a.window.localStorage.getItem('sfx_lembrar'), null);
});
test('lembrar-me limpa a conta temporária da aba', () => {
    const a = ambiente();
    login(a);
    a.Sfx.salvarSessao(token('mecanica'), { id: 'oficina' }, true);
    assert.equal(a.window.sessionStorage.getItem('sfx_usuario'), null);
    assert.equal(a.Sfx.obterSessao().id, 'oficina');
});
test('recusa token inválido antes de apagar a sessão atual', () => {
    const a = ambiente();
    login(a);
    assert.throws(() => a.Sfx.salvarSessao('ruim', {}), /inválida/);
    assert.equal(a.Sfx.obterSessao().id, 'cliente');
});
test('papel de navegação vem do token; papel no armazenamento não basta', () => {
    const a = ambiente();
    a.Sfx.salvarSessao(token('cliente'), { papel: 'admin' });
    assert.equal(a.Sfx.exigirPapel(['admin']), false);
    assert.deepEqual(a.redirects, ['dashboard.html']);
});
test('escapa atributos com aspas e tags que causavam XSS nos serviços', () => {
    const { Sfx } = ambiente();
    assert.equal(Sfx.escapeHtml('"><img src=x onerror="alert(1)">'),
        '&quot;&gt;&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    assert.equal(Sfx.escapeHtml("O'Neil & filhos"), 'O&#39;Neil &amp; filhos');
});
test('GET autenticado usa a sessão atual e não força Content-Type', async () => {
    let recebido;
    const a = ambiente(async (url, opcoes) => { recebido = { url, opcoes }; return new Response('{"ok":true}'); });
    login(a);
    await a.Sfx.request('/api/dashboard', { auth: true });
    assert.equal(recebido.url, 'https://api.example.test/api/dashboard');
    assert.match(recebido.opcoes.headers.get('Authorization'), /^Bearer /);
    assert.equal(recebido.opcoes.headers.has('Content-Type'), false);
});
test('POST informa JSON; respostas 204 são aceitas', async () => {
    const a = ambiente(async (_, opcoes) => {
        assert.equal(opcoes.headers.get('Content-Type'), 'application/json');
        return new Response(null, { status: 204 });
    });
    assert.equal(await a.Sfx.request('/api/contact', { method: 'POST', body: '{}' }), null);
});
test('erro 401 protegido limpa a sessão e redireciona', async () => {
    const a = ambiente(async () => new Response('', { status: 401 }));
    login(a);
    await assert.rejects(a.Sfx.request('/api/auth/me', { auth: true }), { status: 401 });
    assert.equal(a.Sfx.obterSessao(), null);
    assert.deepEqual(a.redirects, ['login.html']);
});
test('erro 403 mostra a falta de permissão sem desconectar o usuário', async () => {
    const a = ambiente(async () => new Response('{"erro":"Oficina bloqueada."}', { status: 403 }));
    login(a);
    await assert.rejects(a.Sfx.request('/api/mecanica/perfil', { auth: true }), /Oficina bloqueada/);
    assert.ok(a.Sfx.obterSessao());
    assert.deepEqual(a.redirects, []);
});
test('falha temporária 503 preserva a sessão', async () => {
    const a = ambiente(async () => new Response('{"erro":"Tente mais tarde."}', { status: 503 }));
    login(a);
    await assert.rejects(a.Sfx.request('/api/auth/me', { auth: true }), { status: 503 });
    assert.ok(a.Sfx.obterSessao());
});
test('erros de validação da API são mostrados ao usuário', async () => {
    const a = ambiente(async () => new Response('{"erro":"Confira os campos.","campos":{"Cpf":["Informe um CPF válido."]}}', { status: 400 }));
    await assert.rejects(a.Sfx.request('/api/auth/register', { method: 'POST', body: '{}' }), /CPF válido/);
});
test('falhas HTML da hospedagem não vazam como mensagens nem quebram JSON', async () => {
    const a = ambiente(async () => new Response('<html>Detalhes internos</html>', { status: 502 }));
    await assert.rejects(a.Sfx.request('/api/mechanics'), erro => erro.status === 502 && !erro.message.includes('internos'));
});
test('resposta de sucesso com HTML é rejeitada', async () => {
    const a = ambiente(async () => new Response('<html>Página de login</html>'));
    await assert.rejects(a.Sfx.request('/api/mechanics'), /inesperada/);
});
test('timeout cancela a requisição e não repete uma gravação', async () => {
    let chamadas = 0;
    const a = ambiente((_, { signal }) => new Promise((resolve, reject) => {
        chamadas++;
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    await assert.rejects(a.Sfx.request('/api/auth/register', { method: 'POST', body: '{}', timeout: 10 }), /confirmar a operação/);
    assert.equal(chamadas, 1);
});
test('cancelamento de busca é propagado para ignorar resultados antigos', async () => {
    const a = ambiente((_, { signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    const controller = new AbortController();
    const promessa = a.Sfx.request('/api/mechanics', { signal: controller.signal });
    controller.abort();
    await assert.rejects(promessa, { name: 'AbortError' });
});
test('site publicado sem URL configurada não chama localhost', async () => {
    let chamadas = 0;
    const a = ambiente(async () => { chamadas++; return new Response('{}'); });
    a.window.SFX_API_BASE_URL = '';
    await assert.rejects(a.Sfx.request('/api/mechanics'), /sem conexão configurada/);
    assert.equal(chamadas, 0);
});
