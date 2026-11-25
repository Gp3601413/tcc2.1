/** Compatibilidade com as páginas existentes. */
function sfxObterSessao() { return Sfx.obterSessao(); }
function sfxDecodificarPapel(token) { return Sfx.payloadToken(token)?.papel || null; }
function sfxExigirPapel(papeis) { return Sfx.exigirPapel(papeis); }
function sfxSair() { Sfx.sair(); }
