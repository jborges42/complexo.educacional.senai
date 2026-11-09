'use strict';
/* Banco de dados (Supabase): leitura, login, salvamento com controle de versão, junção e histórico. */

// Arrastar ou escrever na planta segura referências da versão atual: trocar os dados no meio quebraria a ação.
// (A parede em cadeia só guarda pontos, então não precisa esperar.)
const mexendoNaPlanta = () => estado.modo === 'editar' && !!(arrasto || document.querySelector('#vista .renomear'));
// Lê a planta salva. Não sobrescreve um editor com alterações pendentes (a menos que ele peça).
async function carregarDoBanco(substituir = false) {
  if (!sb) return;
  const adiar = () => { setTimeout(() => carregarDoBanco(substituir), 1500); };
  if (mexendoNaPlanta()) return adiar(); // enquanto a pessoa arrasta ou escreve, só um temporizador, sem consultar o banco
  const { data, error } = await sb.from('planta').select('dados, versao').eq('id', 'principal').maybeSingle();
  if (error || !data) return;
  const remoto = migrar(data.dados), segurar = mexendoNaPlanta(); // a ação pode ter começado durante a consulta
  if (estado.modo === 'editar' && sujo() && !substituir) {
    rascunhoVisto = true; // já se começou a editar: rascunhos de antes ficam na faixa "Retomar", sem juntar sozinhos
    if (versaoBase === null) {
      if (segurar) return adiar();
      // A primeira leitura do banco chegou depois de a pessoa começar a editar a cópia local (dados.js): as edições (e o
      // desfazer) passam para cima da versão do banco, para o editor mostrar o que está salvo e o salvar não dar conflito.
      const base = JSON.parse(publicado), sobre = s => JSON.stringify(migrar(mesclar(base, JSON.parse(s), remoto)));
      dados = JSON.parse(sobre(JSON.stringify(dados)));
      desfazer.splice(0, desfazer.length, ...desfazer.map(sobre));
      refazer.splice(0, refazer.length, ...refazer.map(sobre));
      antesCampo = null; nomeAntes = null;
      publicado = JSON.stringify(remoto);
      versaoBase = data.versao;
      fonte = 'banco';
      validarAlvo();
      salvarRascunho();
      render();
      return;
    }
    if (data.versao !== versaoBase) msgPub(`Outra pessoa salvou a versão ${data.versao} enquanto você editava. Ao salvar, as alterações das duas pessoas são juntadas.`);
    return;
  }
  // igual() compara sem depender da ordem das chaves: o eco do próprio salvamento (Realtime) não troca os dados nem zera o desfazer
  const novo = JSON.stringify(remoto), mudou = substituir || !igual(remoto, JSON.parse(publicado));
  if (segurar && (mudou || !rascunhoVisto)) return adiar(); // só espera quando os dados vão ser trocados
  versaoBase = data.versao;
  fonte = 'banco';
  if (mudou) {
    dados = remoto;
    publicado = novo;
    // o desfazer guarda documentos inteiros de antes: voltar a eles apagaria o que a outra pessoa salvou
    desfazer.length = refazer.length = 0;
    antesCampo = null; nomeAntes = null;
    for (const k in fotosNovas) delete fotosNovas[k];
    validarAlvo();
    reiniciarGiro();
    render();
  } else if (estado.modo === 'editar') painelEditor();
  recuperarRascunho();
}

// Depois de a página recarregar (o Live Server recarrega a cada arquivo salvo), as alterações não salvas voltam sozinhas,
// juntadas com o que outra pessoa tenha salvado nesse meio-tempo. Nada se perde: Ctrl+Z desfaz a recuperação.
// Rascunho antigo, sem base, continua com a faixa "Retomar / Descartar" do editor, e nenhum rascunho é sobrescrito antes disso.
let rascunhoVisto = false;
function recuperarRascunho() {
  if (rascunhoVisto || estado.modo !== 'editar') return;
  rascunhoVisto = true;
  if (editouAqui) return; // já se editou neste carregamento: os rascunhos de antes ficam na faixa "Retomar", sem juntar sozinhos
  const principal = lerRascunho(), meu = ehMeu(principal);
  const l = [...pendentes(), ...(meu ? [] : [principal])].filter(r => r?.base && temMudanca(r))
    .sort((x, y) => String(x.quando).localeCompare(String(y.quando)));
  const resto = pendentes().filter(r => !r.base); // sem base (formato antigo): seguem na faixa "Retomar"
  gravarChave('planta-rascunhos-pendentes', resto.length ? resto : null);
  if (principal?.base && !meu) gravarChave('planta-rascunho', null);
  if (!l.length) return;
  const antes = JSON.stringify(dados), conf = [], junto = l.reduce((d, r) => juntarRascunho(r, d, conf), JSON.parse(antes));
  if (igual(junto, JSON.parse(antes))) return;
  desfazer.push(antes);
  dados = junto;
  validarAlvo();
  salvarRascunho();
  render();
  const n = conf.filter(c => !/\.atualizado$/.test(c)).length;
  msgPub(`Recuperamos as alterações não salvas de ${dataBr(l.at(-1).quando)}${n ? `; em ${n} ${n === 1 ? 'ponto alterado' : 'pontos alterados'} também por outra pessoa, ficou valendo o rascunho` : ''}. Para voltar à versão salva, use Mais › Descartar alterações.`);
}

async function definirSessao(s) {
  sessao = s;
  ehEditor = false;
  if (s) { const { data } = await sb.rpc('eh_editor'); ehEditor = data === true; }
  if (estado.modo === 'editar') painelEditor();
}
function abrirLogin(texto = '') {
  const m = $('#login-msg');
  m.textContent = texto;
  m.classList.remove('erro');
  $('#dlg-login').showModal();
  $('#f-email').focus();
}
async function entrar(email, senha) {
  const m = $('#login-msg');
  m.classList.remove('erro');
  if (!email || !senha) { m.classList.add('erro'); m.textContent = 'Preencha o e-mail e a senha.'; return; }
  m.textContent = 'Entrando…';
  const { error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) { m.classList.add('erro'); m.textContent = /invalid/i.test(error.message) ? 'E-mail ou senha incorretos.' : `Não foi possível entrar: ${error.message}`; return; }
  m.textContent = '';
  $('#dlg-login').close();
  const { data: pode } = await sb.rpc('eh_editor');
  msgPub(pode === true ? 'Você entrou. Já pode salvar as alterações.' : 'Você entrou, mas este e-mail não está na lista de editores. Peça para incluí-lo na tabela “editores” do banco.', pode !== true);
}

/* Junção de três vias: base = última versão que este navegador viu; meu = rascunho; deles = versão nova do banco.
   Itens com id (espaços, enturmações, recados) são juntados um a um; se os dois mexeram no mesmo campo, vale o meu. */
function canon(v) {
  if (v === undefined) return 'u';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  return `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
}
const igual = (a, b) => canon(a) === canon(b);
const ehObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const listaComIds = v => Array.isArray(v) && v.every(x => ehObj(x) && typeof x.id === 'string');
function mesclar(base, meu, deles, caminho = '', conflitos = []) {
  if (igual(meu, base)) return deles;
  if (igual(deles, base) || igual(meu, deles)) return meu;
  if (ehObj(meu) && ehObj(deles) && (base === undefined || ehObj(base))) {
    const b = base || {}, r = {};
    for (const k of new Set([...Object.keys(deles), ...Object.keys(meu)])) {
      const v = mesclar(b[k], meu[k], deles[k], `${caminho}.${k}`, conflitos);
      if (v !== undefined) r[k] = v;
    }
    return r;
  }
  const temIds = [meu, deles, base].some(l => Array.isArray(l) && l.length && listaComIds(l));
  if (temIds && listaComIds(meu) && listaComIds(deles) && (base === undefined || listaComIds(base))) {
    const mapa = l => new Map((l || []).map(x => [x.id, x]));
    const B = mapa(base), M = mapa(meu), D = mapa(deles), out = [];
    // ordem: se só eu reordenei (ex.: recados), vale a minha ordem; se os dois reordenaram, vale a minha e registra
    const comuns = (X, Y) => [...X.keys()].filter(id => Y.has(id));
    const mudouMeu = !igual(comuns(B, M), comuns(M, B)), mudouDeles = !igual(comuns(B, D), comuns(D, B));
    if (mudouMeu && mudouDeles) conflitos.push(`${caminho}#ordem`);
    const ids = mudouMeu ? [...M.keys(), ...[...D.keys()].filter(id => !M.has(id))] : [...D.keys(), ...[...M.keys()].filter(id => !D.has(id))];
    for (const id of ids) {
      const v = mesclar(B.get(id), M.get(id), D.get(id), `${caminho}[${id}]`, conflitos);
      if (v !== undefined) out.push(v);
    }
    return out;
  }
  // Listas de itens sem id (paredes, portas, indicações, textos): junta como conjunto —
  // mantém o que a outra pessoa tem (menos o que eu removi) e acrescenta o que eu criei.
  const ehItem = x => x !== null && typeof x === 'object';
  if (Array.isArray(meu) && Array.isArray(deles) && (base === undefined || Array.isArray(base)) && [...meu, ...deles].every(ehItem)) {
    const B = new Set((base || []).map(canon)), M = new Set(meu.map(canon)), D = new Set(deles.map(canon));
    return [...deles.filter(x => !(B.has(canon(x)) && !M.has(canon(x)))), ...meu.filter(x => !B.has(canon(x)) && !D.has(canon(x)))];
  }
  conflitos.push(caminho);
  return meu;
}
async function mesclarRemoto() {
  const { data, error } = await sb.from('planta').select('dados, versao').eq('id', 'principal').maybeSingle();
  if (error || !data) return false;
  const deles = migrar(data.dados), conf = [];
  dados = mesclar(JSON.parse(publicado), dados, deles, '', conf);
  versaoBase = data.versao;
  publicado = JSON.stringify(deles);
  mescla = { versao: data.versao, conflitos: conf.filter(c => !/\.atualizado$/.test(c)).length };
  desfazer.length = refazer.length = 0; // os estados antigos não têm o trabalho da outra pessoa
  antesCampo = null;
  validarAlvo();
  return true;
}

let salvando = false;
async function salvar(forcar = false) {
  if (!sb) { msgPub('O banco de dados ainda não está ligado neste site. Use “Mais › Baixar cópia” para guardar o arquivo.', true); return; }
  if (!sessao) { abrirLogin('Entre com seu e-mail e senha de editor para salvar.'); return; }
  if (!ehEditor) { msgPub('Seu e-mail não está na lista de editores. Peça para incluí-lo na tabela “editores” do banco.', true); return; }
  if (salvando) return; // um clique a mais durante o envio não dispara outro salvamento
  salvando = true;
  $('#b-publicar').disabled = true;
  try { await enviarVersao(forcar); } finally { salvando = false; mescla = null; render(); }
}
async function enviarVersao(forcar, tentativa = 0) {
  const anterior = dados.atualizado;
  msgPub(tentativa ? 'Juntando com as alterações de outra pessoa…' : 'Salvando…');
  try {
    for (const [lid, url] of Object.entries(fotosNovas)) {
      const caminho = `${lid}-${Date.now()}.jpg`, blob = await (await fetch(url)).blob();
      const up = await sb.storage.from('croquis').upload(caminho, blob, { contentType: 'image/jpeg' });
      if (up.error) throw up.error;
      dados.locais[lid].foto = sb.storage.from('croquis').getPublicUrl(caminho).data.publicUrl;
      delete fotosNovas[lid];
    }
    let versao = versaoBase ?? 0;
    if (forcar) { const r = await sb.from('planta').select('versao').eq('id', 'principal').maybeSingle(); versao = r.data?.versao ?? 0; }
    dados.atualizado = new Date().toISOString();
    // Serializa uma vez: o que for editado durante o envio continua pendente, em vez de virar "salvo" sem ir ao banco.
    const enviado = JSON.stringify(dados);
    const { data, error } = await sb.rpc('salvar_planta', { p_dados: JSON.parse(enviado), p_versao: versao });
    if (error?.code === '40001' && !forcar && tentativa < 2 && await mesclarRemoto()) return enviarVersao(false, tentativa + 1);
    if (error) throw error;
    versaoBase = data.versao;
    fonte = 'banco';
    publicado = enviado;
    if (JSON.stringify(dados) === enviado) limparRascunho(); else salvarRascunho();
    const extra = mescla ? ` Suas alterações foram juntadas com a versão ${mescla.versao}, salva antes por outra pessoa${mescla.conflitos ? `; em ${mescla.conflitos} ${mescla.conflitos === 1 ? 'ponto alterado pelas duas pessoas ficou valendo a sua versão' : 'pontos alterados pelas duas pessoas ficou valendo a sua versão'}` : ''}.` : '';
    msgPub(`Salvo como versão ${data.versao}. O link público e o telão já mostram esta versão.${extra}`);
  } catch (e) {
    dados.atualizado = anterior;
    erroSalvar(e);
  }
}
function erroSalvar(e) {
  if (e?.code === '40001') {
    const m = $('#pub-msg');
    m.classList.add('erro');
    m.innerHTML = 'Outra pessoa salvou várias vezes seguidas enquanto você editava. <button type="button" class="ir" id="b-recarregar">Carregar a versão nova</button> (as suas alterações ficam guardadas para retomar) ou <button type="button" class="ir" id="b-forcar">salvar a sua por cima</button>.';
    return;
  }
  const t = e?.message || '';
  msgPub(e?.code === '42501' || String(e?.statusCode) === '403' || /row-level security|permission denied/i.test(t) ? 'Seu e-mail não está na lista de editores. Peça para incluí-lo na tabela “editores” do banco.'
    : e?.code === 'PGRST202' ? 'O banco ainda não foi preparado. Rode o arquivo supabase/configurar.sql no SQL Editor do Supabase.'
    : e instanceof TypeError || /fetch|network/i.test(t) ? 'Sem conexão com o banco. Tente de novo; suas alterações continuam guardadas neste navegador.'
    : /jwt|token|session/i.test(t) ? 'Sua sessão expirou. Saia e entre de novo.'
    : `Não foi possível salvar: ${t || 'erro desconhecido'}.`, true);
}

async function historico() {
  const ol = $('#hist-lista');
  ol.innerHTML = '<li class="ajuda">Carregando…</li>';
  if (!$('#dlg-hist').open) $('#dlg-hist').showModal();
  const { data, error } = await sb.from('planta_historico').select('versao, salvo_em, salvo_por').order('versao', { ascending: false }).limit(30);
  ol.innerHTML = error ? '<li class="ajuda">Não foi possível carregar o histórico.</li>'
    : data.map(h => `<li><span><strong>Versão ${h.versao}</strong> · ${dataBr(h.salvo_em)}<small>${esc(h.salvo_por || '')}</small></span><button type="button" class="ir" data-versao="${h.versao}">Abrir no editor</button></li>`).join('');
}
async function restaurar(versao) {
  const { data, error } = await sb.from('planta_historico').select('dados').eq('versao', versao).order('id', { ascending: false }).limit(1).maybeSingle();
  if (error || !data) { msgPub('Não foi possível abrir essa versão.', true); return; }
  const antes = JSON.stringify(dados);
  dados = migrar(data.dados);
  selecionarAlvo(null);
  validarAlvo();
  registrar(antes);
  $('#dlg-hist').close();
  render();
  msgPub(`Versão ${versao} aberta no editor. Clique em “Salvar alterações” para ela voltar a valer.`);
}

const textoDados = () => `window.DADOS = ${JSON.stringify(dados, null, 1)};\n`;
function baixar() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([textoDados()], { type: 'text/javascript' }));
  a.download = 'dados.js';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  msgPub('Cópia de segurança baixada (dados.js).');
}
