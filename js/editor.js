'use strict';
/* Editor: inspetor, espaços (renomear), telão e recados (as aulas vêm da planilha: js/planilha.js). A interação com a planta fica em js/desenho.js. */

// Não redesenha um painel enquanto alguém digita nele (evita perder o cursor); ele atualiza ao sair do campo.
function pintar(el, html, forcar = false) {
  const a = document.activeElement;
  if (!forcar && a && el.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
  el.innerHTML = html;
}
const campo = (c, rot, v, extra = '') => `<div class="campo"><label for="f-${c}">${rot}</label><input id="f-${c}" data-c="${c}" value="${esc(v)}" ${extra}></div>`;
const numero = (c, rot, v) => campo(c, rot, v ?? '', 'type="number" step="1" inputmode="numeric"');
const area = (c, rot, v, extra = '') => `<div class="campo"><label for="f-${c}">${rot}</label><textarea id="f-${c}" data-c="${c}" rows="2" ${extra}>${esc(v)}</textarea></div>`;
const escolha = (c, rot, opcoes, v) => `<div class="campo"><label for="f-${c}">${rot}</label><select id="f-${c}" data-c="${c}">${Object.entries(opcoes).map(([k, t]) => `<option value="${esc(k)}"${String(k) === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
const marca = (c, rot, v) => `<label class="check"><input type="checkbox" id="f-${c}" data-c="${c}"${v ? ' checked' : ''}>${rot}</label>`;
const botaoExcluir = (rot, confirmar = '') => `<div class="botoes"><button type="button" class="btn btn-perigo" data-acao="excluir"${confirmar ? ` data-confirmar="${esc(confirmar)}"` : ''}>${rot}</button></div>`;

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
function inspetor(forcar = false) {
  const el = $('#detalhe'), L = Lc(), al = estado.alvo, sel = estado.selecao;
  if (sel.length > 1) {
    const pac = pacote(), n = t => sel.filter(s => s.tipo === t).length, extra = pac.paredes.size - pac.selP.size;
    const partes = [['amb', 'espaço', 'espaços'], ['parede', 'parede', 'paredes'], ['porta', 'porta', 'portas'], ['marca', 'indicação de acesso', 'indicações de acesso'], ['texto', 'texto', 'textos']]
      .filter(([t]) => n(t)).map(([t, um, varios]) => plural(n(t), um, varios));
    $('#det-titulo').textContent = 'Seleção';
    pintar(el, `<div class="form">
      <p class="sel-resumo"><strong>${sel.length} itens selecionados</strong>${partes.join(' · ')}${extra > 0 ? ` · mais ${plural(extra, 'parede', 'paredes')} do contorno` : ''}</p>
      <div class="botoes"><button type="button" class="btn" data-acao="duplicar">Duplicar</button>${n('amb') ? '<button type="button" class="btn" data-acao="contorno">Criar paredes no contorno</button><button type="button" class="btn" data-acao="frente">Trazer para a frente</button><button type="button" class="btn" data-acao="tras">Enviar para trás</button>' : ''}</div>
      <p class="ajuda">Arraste qualquer item selecionado para mover todos juntos. Shift+clique soma ou tira itens da seleção; Esc solta a seleção.</p>
      ${botaoExcluir('Excluir seleção')}</div>`, forcar);
    return;
  }
  if (!al) {
    $('#det-titulo').textContent = 'Editar área';
    pintar(el, `<div class="form">
      ${campo('l-aba', 'Descrição da aba', L.aba)}${campo('l-titulo', 'Título da planta', L.titulo)}${area('l-sub', 'Subtítulo da planta', L.sub)}
      <div class="campo"><label for="f-foto">Foto do croqui <small>(substitui a atual ao salvar)</small></label><input type="file" id="f-foto" accept="image/*"></div>
      <hr><div class="ajuda"><strong>Como editar</strong><ul>
        <li><strong>Criar</strong>: escolha Sala (S), Zona (Z) ou Circulação (C) na barra da planta e arraste. A sala já nasce com as paredes do contorno; digite o nome e tecle Enter.</li>
        <li><strong>Selecionar</strong>: clique; Shift+clique soma itens; arraste no vazio para pegar uma área inteira.</li>
        <li><strong>Mover e mudar o tamanho</strong>: arraste o espaço (as paredes dele vão junto) ou puxe as alças laranja. O ímã alinha com as outras salas; segure ${MAC ? '⌘' : 'Ctrl'} para soltar.</li>
        <li><strong>Empurrar parede</strong>: arraste uma parede e as salas encostadas nela acompanham.</li>
        <li><strong>Renomear</strong>: dois cliques no espaço, F2 ou a lista “Espaços”.</li>
        <li><strong>Vista</strong>: a roda do mouse rola; Ctrl + roda (ou pinça) dá zoom; segure Espaço e arraste.</li>
        <li>Botão direito abre o menu; a tecla ? mostra todos os atalhos.</li></ul></div></div>`, forcar);
    return;
  }
  if (al.tipo === 'amb') {
    const a = ambSel();
    if (!a) { selecionarAlvo(null); return inspetor(true); }
    $('#det-titulo').textContent = 'Editar espaço';
    const nEnt = ents().filter(e => e.local === estado.local && e.ambiente === a.id).length, oculto = Array.isArray(a.rot) && !a.rot.length;
    const auto = quebrar(a.nome, a.giro ? a.h : a.w, a.tam || 15).join('\n'), pac = pacote(), nPar = pac.paredes.size, nComp = pac.compart.size;
    const cats = `<fieldset class="campo"><legend>Categoria</legend><div class="cats">${Object.entries(CAT).map(([k, t]) => `<label class="cat-${k}"><input type="radio" name="f-cat" id="f-cat-${k}" data-c="cat" value="${k}"${a.cat === k ? ' checked' : ''}><i aria-hidden="true"></i>${t}</label>`).join('')}</div></fieldset>`;
    pintar(el, `<div class="form">
      ${campo('nome', 'Nome do espaço', a.nome, 'maxlength="60"')}
      ${area('rot', 'Texto na planta <small>(vazio = usa o nome)</small>', Array.isArray(a.rot) ? a.rot.join('\n') : '', `placeholder="${esc(auto)}"${oculto ? ' disabled' : ''}`)}
      ${marca('ocultar', 'Esconder o texto na planta', oculto)}
      <div class="lin2">${campo('sub', 'Subtítulo', a.sub ?? '')}${numero('tam', 'Tamanho do texto', a.tam ?? 15)}</div>
      ${cats}${escolha('tipo', 'Tipo', TIPOS, a.tipo || 'sala')}
      <div class="lin4">${numero('x', 'X', a.x)}${numero('y', 'Y', a.y)}${numero('w', 'Largura', a.w)}${numero('h', 'Altura', a.h)}</div>
      <div class="lin2">${numero('rx', 'Cantos', a.rx ?? 0)}<div class="campo"><span class="rotulo">Forma</span>${marca('elipse', 'Oval', a.forma === 'elipse')}${marca('giro', 'Texto na vertical', !!a.giro)}</div></div>
      ${nPar + nComp ? `<p class="ajuda">${plural(nPar + nComp, 'parede do contorno acompanha', 'paredes do contorno acompanham')} este espaço ao mover, mudar o tamanho, duplicar e excluir${nComp ? ` (${plural(nComp, 'é dividida', 'são divididas')} com a sala vizinha, que fica com a dela)` : ''}.</p>` : ''}
      <div class="botoes"><button type="button" class="btn" data-acao="duplicar">Duplicar</button><button type="button" class="btn" data-acao="contorno">Criar paredes no contorno</button><button type="button" class="btn" data-acao="centralizar">Centralizar texto</button><button type="button" class="btn" data-acao="frente">Trazer para a frente</button><button type="button" class="btn" data-acao="tras">Enviar para trás</button></div>
      <hr><h4>Aulas</h4>
      ${marca('aloc', 'Recebe aulas (aparece no calendário e mostra “Livre” quando vazio)', !!a.aloc)}
      <p class="ajuda">${!planilha.lido ? `${esc(situacaoPlanilha())}.` : nEnt ? `${plural(nEnt, 'enturmação', 'enturmações')} da planilha neste espaço.` : 'Nenhuma aula da planilha neste espaço.'} As aulas vêm só da planilha oficial; um ambiente da planilha com o mesmo nome deste espaço aparece aqui.</p>
      <hr><h4>Informações</h4>
      ${campo('croqui', 'Texto no croqui', a.croqui ?? '')}${campo('moveis', 'Mobiliário', a.moveis ?? '')}${campo('acesso', 'Acesso', a.acesso ?? '')}
      ${area('obs', 'Observação', a.obs ?? '')}
      <div class="lin2">${escolha('postit-cor', 'Post-it', { '': 'Nenhum', ...POSTIT_NOME }, a.postit?.cor ?? '')}${a.postit ? campo('postit-texto', 'Texto do post-it', a.postit.texto) : ''}</div>
      ${botaoExcluir(nPar ? `Excluir espaço e ${plural(nPar, 'parede', 'paredes')}` : 'Excluir espaço')}</div>`, forcar);
    return;
  }
  if (al.tipo === 'parede') {
    const p = L.paredes[al.i];
    $('#det-titulo').textContent = 'Editar parede';
    pintar(el, `<div class="form">${escolha('p-ext', 'Tipo', { 0: 'Interna (fina)', 1: 'Externa (grossa)' }, p[4] ? 1 : 0)}
      <div class="lin4">${numero('p0', 'X inicial', p[0])}${numero('p1', 'Y inicial', p[1])}${numero('p2', 'X final', p[2])}${numero('p3', 'Y final', p[3])}</div>
      <p class="ajuda">Comprimento: ${Math.round(Math.hypot(p[2] - p[0], p[3] - p[1]))} unidades. Arraste a parede para empurrá-la: as paredes e as salas encostadas acompanham, e as portas vão junto. Puxe as bolinhas das pontas para mudar o comprimento.</p>${botaoExcluir('Excluir parede')}</div>`, forcar);
    return;
  }
  if (al.tipo === 'porta') {
    const p = L.portas[al.i], h = p.o === 'h';
    const lado = h ? { 1: 'Baixo', '-1': 'Cima' } : { 1: 'Direita', '-1': 'Esquerda' };
    const dob = h ? { 0: 'Lado esquerdo', 1: 'Lado direito' } : { 0: 'Em cima', 1: 'Embaixo' };
    $('#det-titulo').textContent = 'Editar porta';
    pintar(el, `<div class="form">${numero('d-w', 'Largura', p.w)}
      ${escolha('d-lado', 'Abre para', lado, p.lado)}
      ${escolha('d-inv', 'Dobradiça', dob, p.inv ? 1 : 0)}
      <p class="ajuda">Arraste a porta para deslizá-la ao longo da parede. Dois cliques nela giram a abertura.</p>${botaoExcluir('Excluir porta')}</div>`, forcar);
    return;
  }
  if (al.tipo === 'marca') {
    $('#det-titulo').textContent = 'Editar indicação de acesso';
    pintar(el, `<div class="form">${campo('m-t', 'Texto', L.marcas[al.i].t)}<p class="ajuda">Arraste a indicação na planta para movê-la; dois cliques editam o texto ali mesmo.</p>${botaoExcluir('Excluir indicação')}</div>`, forcar);
    return;
  }
  if (al.tipo === 'texto') {
    const t = L.textos[al.i];
    $('#det-titulo').textContent = 'Editar texto';
    pintar(el, `<div class="form">${campo('t-t', 'Texto', t.t)}${marca('t-nota', 'Estilo de nota (itálico)', !!t.nota)}<p class="ajuda">Arraste o texto na planta para movê-lo; dois cliques editam o texto ali mesmo.</p>${botaoExcluir('Excluir texto')}</div>`, forcar);
  }
}

function espacos() {
  const L = Lc(), lista = $('.lista-esp'), rolagem = lista?.scrollTop || 0;
  $('#esp-titulo').textContent = `Espaços · ${L.nome}`;
  const itens = Object.keys(CAT).flatMap(c => L.ambientes.filter(a => a.cat === c));
  pintar($('#esp-corpo'), `<div class="form">
    <div class="campo"><label for="f-local-nome">Nome desta área (aba)</label><input id="f-local-nome" data-local-nome value="${esc(L.nome)}" maxlength="40"></div>
    <p class="ajuda">Renomeie direto nos campos abaixo, ou dê dois cliques num espaço da planta.</p></div>
    <ul class="lista-esp">${itens.map(a => `<li class="cat-${a.cat}${estaSel('amb', a.id) ? ' atual' : ''}"><i aria-hidden="true"></i><input id="esp-${esc(a.id)}" data-renomear="${esc(a.id)}" value="${esc(a.nome)}" maxlength="60" aria-label="Nome do espaço ${esc(a.nome)}"><button type="button" class="btn btn-mini" data-sel-ed="${esc(a.id)}" aria-label="Selecionar ${esc(a.nome)} na planta">Ver</button></li>`).join('')}</ul>`);
  // O innerHTML novo voltaria a lista ao topo: mantém a rolagem e deixa o espaço selecionado à vista.
  const nova = $('.lista-esp');
  if (!nova || nova === lista) return;
  nova.scrollTop = rolagem;
  const at = $('li.atual', nova);
  if (!at) return;
  const r = at.getBoundingClientRect(), rl = nova.getBoundingClientRect();
  if (r.top < rl.top || r.bottom > rl.bottom) nova.scrollTop += r.top - rl.top - (nova.clientHeight - r.height) / 2;
}

// Tempos do telão, em segundos: giro = troca de área; recarga = busca da versão salva (15 s quando nada foi cadastrado).
const FAIXA_TEMPO = { giro: [5, 300], recarga: [5, 3600] };
const ajudaGiro = () => `O telão alterna entre ${Object.values(dados.locais).map(l => l.nome).join(', ')} a cada ${giroMs() / 1000} segundos.`;
const ajudaRecarga = () => `O telão busca a versão salva a cada ${recargaMs() / 1000} segundos${dados.config.telao.recarga ? '' : ' (padrão)'}, sem recarregar a página nem sair da tela cheia. Quando alguém salva, ele também se atualiza na hora.`;
// Os tempos só valem ao confirmar o campo (Enter, Tab, clicar fora): nada no meio da digitação. Dentro da faixa, grava;
// vazio, continua o de antes. Fora da faixa nada muda sozinho: devolve o valor mais perto, para o editor perguntar antes de usar.
function tempoTelao(k, v, final) {
  const [min, max] = FAIXA_TEMPO[k], n = Math.round(num(v));
  if (!final || !String(v).trim() || n <= 0) return null;
  if (n >= min && n <= max) { dados.config.telao[k] = n; return null; }
  return Math.min(max, Math.max(min, n));
}
// Mostra nos campos (Editor › Telão e o acesso rápido da barra) e nas ajudas os tempos que estão valendo.
function mostrarTempos(forcar = false) {
  for (const [id, v] of [['c-giro', giroMs()], ['c-recarga', recargaMs()], ['c-recarga-rapido', recargaMs()]]) {
    const c = document.getElementById(id);
    if (c && (forcar || document.activeElement !== c)) c.value = v / 1000;
  }
  for (const [id, f] of [['c-giro-ajuda', ajudaGiro], ['c-recarga-ajuda', ajudaRecarga]]) { const a = document.getElementById(id); if (a) a.textContent = f(); }
  painelEditor();
}
function configTelao() {
  const vi = dados.config.vista;
  pintar($('#form-telao'), `
    <div class="campo"><label for="c-giro">Tempo de cada tela no telão (segundos)</label><input id="c-giro" type="number" min="5" max="300" step="1" inputmode="numeric" data-cfg="giro" value="${giroMs() / 1000}">
      <small class="ajuda" id="c-giro-ajuda">${esc(ajudaGiro())}</small></div>
    <div class="campo"><label for="c-recarga">Atualizar o telão a cada (segundos)</label><input id="c-recarga" type="number" min="5" max="3600" step="1" inputmode="numeric" data-cfg="recarga" value="${recargaMs() / 1000}">
      <small class="ajuda" id="c-recarga-ajuda">${esc(ajudaRecarga())}</small></div>
    <hr><h4>Vista da planta no telão</h4>
    <p class="ajuda">Use os botões acima da planta: <strong>Espelhar</strong> (esquerda ↔ direita), <strong>Girar</strong> (90° no sentido horário), <strong>−</strong> e <strong>+</strong> (zoom) e <strong>Original</strong> (volta tudo, com confirmação). Com zoom, arraste a planta, ou clique nela e use as setas, para escolher o trecho que aparece: o telão mostra exatamente esse trecho. Cada área tem a sua vista: troque de área nas abas. Girada 90°, a planta fica em pé e, numa TV deitada, menor; o zoom compensa.</p>
    <fieldset class="campo"><legend>Onde valem o espelho e o giro</legend>
      <label class="check"><input type="radio" name="c-onde" id="c-onde-telao" value="telao" data-cfg="onde"${vi.onde !== 'todas' ? ' checked' : ''}> Só no telão</label>
      <label class="check"><input type="radio" name="c-onde" id="c-onde-todas" value="todas" data-cfg="onde"${vi.onde === 'todas' ? ' checked' : ''}> No telão e no link público</label>
      <small class="ajuda">O zoom vale só no telão. O editor da planta mostra sempre a orientação original.</small></fieldset>
    <hr><div class="botoes"><a class="btn" href="#telao" target="_blank" rel="noopener"><svg class="ic"><use href="#i-tela"/></svg>Abrir o telão em outra aba</a></div>
    <p class="ajuda">A planta desta página mostra como ela aparece no telão. As mudanças chegam ao telão depois de salvar.</p>`);
}

const statusRec = (r, iso) => r.inicio && iso < r.inicio ? { cls: 'agendado', txt: `Começa em ${ddmm(r.inicio)}` } : r.fim && iso > r.fim ? { cls: 'encerrado', txt: `Encerrado em ${ddmm(r.fim)}` } : { cls: 'ativo', txt: 'Passando agora' };
const periodoRec = r => r.inicio && r.fim ? `De ${ddmmaaaa(r.inicio)} a ${ddmmaaaa(r.fim)}` : r.inicio ? `A partir de ${ddmmaaaa(r.inicio)}` : r.fim ? `Até ${ddmmaaaa(r.fim)}` : 'Sem data de término';
function recadosEd() {
  const hoje = hojeIso(), l = dados.recados || [];
  letreiro($('#letreiro-previa'), recadosAtivos(hoje), true);
  $('#rec-lista').innerHTML = l.length ? l.map((r, i) => { const st = statusRec(r, hoje); return `<li class="${r.id === recEditando ? 'editando' : ''}"><span class="rec-st ${st.cls}">${st.txt}</span>${r.destaque ? '<span><span class="rec-imp">Importante</span></span>' : ''}<p>${esc(r.texto)}</p><small>${periodoRec(r)}</small>
    <div class="botoes"><button type="button" class="btn btn-mini" data-rec-editar="${esc(r.id)}">Editar</button><button type="button" class="btn btn-mini" data-rec-mover="${esc(r.id)}" data-dir="-1" aria-label="Subir"${i === 0 ? ' disabled' : ''}>↑</button><button type="button" class="btn btn-mini" data-rec-mover="${esc(r.id)}" data-dir="1" aria-label="Descer"${i === l.length - 1 ? ' disabled' : ''}>↓</button><button type="button" class="btn btn-mini btn-perigo" data-rec-excluir="${esc(r.id)}">Excluir</button></div></li>`; }).join('')
    : '<li class="vazio-rec">Nenhum recado ainda. Escreva o primeiro no formulário.</li>';
  $('#rec-titulo').textContent = recEditando ? 'Editar recado' : 'Novo recado';
  $('#r-ok').textContent = recEditando ? 'Atualizar recado' : 'Adicionar recado';
  $('#r-cancelar').hidden = !recEditando;
  $('#r-cont').textContent = `${$('#r-texto').value.length}/300`;
}

function secoes() {
  $('#secoes').innerHTML = Object.entries(SECOES).map(([k, [nome, ic]]) => `<button type="button" data-secao-ir="${k}"${k === estado.secao ? ' aria-current="page"' : ''}><svg class="ic"><use href="#${ic}"/></svg>${nome}</button>`).join('');
}

const sujo = () => JSON.stringify(dados) !== publicado || Object.keys(fotosNovas).length > 0;
/* Rascunho: alterações não salvas, guardadas neste navegador.
   'planta-rascunho' é o que se edita neste carregamento da página, gravado a cada alteração junto com a versão publicada de
   base (para juntar depois com o que outra pessoa salvar). Nenhum rascunho some sem a pessoa pedir: o de antes de a página
   recarregar, se ainda não voltou para o editor, passa para 'planta-rascunhos-pendentes' no primeiro salvamento. */
const lerChave = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const gravarChave = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem espaço: segue sem rascunho */ } };
const lerRascunho = () => lerChave('planta-rascunho');
const pendentes = () => lerChave('planta-rascunhos-pendentes') || [];
// Cada carregamento da página tem um id: duas abas do editor não apagam o rascunho uma da outra.
const ABA = novoId(), ehMeu = r => r?.aba === ABA;
// O rascunho tem algo a guardar? Sem depender da ordem das chaves (o banco devolve o jsonb em outra ordem).
const temMudanca = r => !!r?.dados && !igual(r.dados, JSON.parse(r.base ?? publicado));
let editouAqui = false; // já houve edição neste carregamento (a recuperação automática só vale antes disso)
// Um pendente por aba de origem: o mais novo substitui o anterior da mesma aba.
const guardarPendente = r => gravarChave('planta-rascunhos-pendentes', [...pendentes().filter(p => !r.aba || p.aba !== r.aba), r]);
function salvarRascunho() {
  const r = lerRascunho();
  if (r && !ehMeu(r) && temMudanca(r)) guardarPendente(r); // de outra aba ou de antes de recarregar: não se perde
  editouAqui = true;
  gravarChave('planta-rascunho', { dados, base: publicado, quando: new Date().toISOString(), aba: ABA });
}
// Depois de salvar ou descartar: apaga só o que é desta aba (o rascunho e as cópias dele que outra aba guardou).
function limparRascunho() {
  if (ehMeu(lerRascunho())) gravarChave('planta-rascunho', null);
  const resto = pendentes().filter(p => p.aba !== ABA);
  gravarChave('planta-rascunhos-pendentes', resto.length ? resto : null);
}
// Rascunhos que ainda não voltaram para o editor, do mais antigo ao mais novo (a faixa "Retomar / Descartar" mostra estes).
const naoRecuperados = () => {
  const r = lerRascunho(), atual = JSON.parse(publicado);
  return [...pendentes(), ...(r && !ehMeu(r) ? [r] : [])].filter(x => x?.dados && !igual(x.dados, atual) && !igual(x.dados, dados))
    .sort((x, y) => String(x.quando).localeCompare(String(y.quando)));
};
// Com base, junção de três vias (o que outra pessoa salvou depois não se perde; conf recebe os pontos que os dois mudaram);
// sem base (formato antigo), substitui.
const juntarRascunho = (r, atual, conf = []) => migrar(r.base ? mesclar(JSON.parse(r.base), r.dados, atual, '', conf) : JSON.parse(JSON.stringify(r.dados)));
// Dica da planta. Com segundos, é um aviso que fica esse tempo antes de voltar a dica da ferramenta.
let dicaTimer = 0;
function dica(t, segundos = 0) {
  clearTimeout(dicaTimer);
  dicaTimer = segundos ? setTimeout(() => { dicaTimer = 0; dicaFerramenta(); }, segundos * 1000) : 0;
  $('#ed-dica').textContent = t;
}
function msgPub(t, erro = false) { const m = $('#pub-msg'); m.textContent = t; m.classList.toggle('erro', erro); }

function painelEditor() {
  // Acesso rápido ao tempo de atualização do telão, na barra do editor.
  const seg = recargaMs() / 1000, rapido = $('#c-recarga-rapido');
  $('#recarga-rotulo').textContent = `Telão: ${seg} s`;
  if (document.activeElement !== rapido) rapido.value = seg;
  $('#c-recarga-rapido-ajuda').textContent = `${ajudaRecarga()} Salve as alterações para valer no telão.`;
  const s = sujo(), est = $('#pub-estado');
  est.classList.toggle('sujo', s);
  $('span', est).textContent = s ? 'Há alterações não salvas' : fonte === 'banco' ? `Tudo salvo · versão ${versaoBase}` : 'Sem alterações';
  est.title = fonte === 'banco' ? `Atualizado em ${dataBr(dados.atualizado)}` : 'Mostrando os dados locais: o banco não está ligado ou não respondeu';
  $('#b-publicar').disabled = !s || salvando;
  $('#b-descartar').disabled = !s;
  $('#b-historico').disabled = !(sb && ehEditor);
  $('#b-desfazer').disabled = !desfazer.length;
  $('#b-refazer').disabled = !refazer.length;
  $('#conta').innerHTML = !sb ? '<span title="Preencha SUPABASE_URL e SUPABASE_CHAVE em js/config.js">Banco não ligado</span>'
    : sessao ? `<span>Entrou como <strong>${esc(sessao.user.email)}</strong></span>${ehEditor ? '' : '<span class="aviso-ed">sem permissão para salvar</span>'}<button type="button" class="ir" id="b-sair">Sair</button>`
    : '<button type="button" class="btn" id="b-entrar">Entrar para salvar</button>';
  const l = naoRecuperados(), faixa = $('#ed-rascunho');
  faixa.hidden = !l.length;
  if (l.length) faixa.innerHTML = `<span>Há alterações não salvas guardadas neste navegador (${l.length > 1 ? `${l.length} rascunhos, o último de ` : ''}${dataBr(l.at(-1).quando)}).</span><button type="button" class="btn" id="b-retomar">Retomar</button><button type="button" class="btn btn-perigo" id="b-descartar-rascunho">Descartar rascunho</button>`;
  ferramentasUI();
}

/* ---------- Campos ligados aos dados ---------- */
const REDESENHA_FORM = new Set(['aloc', 'postit-cor', 'tipo', 'elipse', 'giro', 'p-ext', 'ocultar']);
// Nome digitado num campo: guarda como o espaço estava ao focar. Se o campo voltar ao nome original ou ficar vazio,
// o espaço volta a ser exatamente o que era (inclusive o texto personalizado da planta). O focusin zera nomeAntes.
let nomeAntes = null;
function renomearCampo(a, v) {
  if (nomeAntes?.id !== a.id) nomeAntes = { id: a.id, obj: JSON.stringify(a) };
  const n = v.trim(), orig = JSON.parse(nomeAntes.obj);
  if (n && n !== orig.nome) renomear(a, n);
  else { for (const k of Object.keys(a)) delete a[k]; Object.assign(a, orig); } // mesma ordem de chaves: os dados ficam idênticos
  const r = $('#f-rot'); // o painel não é redesenhado enquanto se digita: atualiza só o "Texto na planta"
  if (r && estado.alvo?.id === a.id) { r.value = Array.isArray(a.rot) ? a.rot.join('\n') : ''; r.placeholder = quebrar(a.nome, a.giro ? a.h : a.w, a.tam || 15).join('\n'); }
}
// final: o campo foi confirmado (change); senão é uma tecla no meio da digitação (input).
function aplicarCampo(el, final = false) {
  const c = el.dataset.c, v = el.type === 'checkbox' ? el.checked : el.value, L = Lc(), al = estado.alvo;
  if (!al) { const k = c.slice(2); if (['aba', 'titulo', 'sub'].includes(k)) L[k] = v; return; }
  if (al.tipo === 'amb') {
    const a = ambSel();
    if (!a) return;
    switch (c) {
      case 'nome': renomearCampo(a, v); break;
      case 'rot': { const ls = v.split('\n').map(s => s.trim()).filter(Boolean); if (ls.length) a.rot = ls; else delete a.rot; break; }
      // Esconder guarda o texto personalizado; mostrar de novo o devolve.
      case 'ocultar':
        if (v) { if (Array.isArray(a.rot) && a.rot.length) a.rotOculto = a.rot; a.rot = []; }
        else { if (a.rotOculto) a.rot = a.rotOculto; else delete a.rot; delete a.rotOculto; }
        break;
      // Posição e tamanho valem ao confirmar o campo (Enter, Tab, setinhas): as paredes da sala vão junto, como no mouse,
      // e um valor no meio da digitação (o "2" de "250") não recorta paredes.
      case 'x': case 'y': case 'w': case 'h': if (final) ajustarPeloInspetor(a, c, c === 'w' || c === 'h' ? Math.max(10, num(v)) : num(v)); break;
      case 'tam': case 'rx': a[c] = Math.max(0, num(v)); break;
      case 'elipse': if (v) a.forma = 'elipse'; else delete a.forma; break;
      case 'giro': if (v) a.giro = -90; else delete a.giro; break;
      case 'aloc': if (v) a.aloc = true; else delete a.aloc; break;
      case 'postit-cor': if (v) a.postit = { cor: v, texto: a.postit?.texto || '' }; else delete a.postit; break;
      case 'postit-texto': if (a.postit) a.postit.texto = v; break;
      default: if (v) a[c] = v; else delete a[c];
    }
    return;
  }
  if (al.tipo === 'parede') { const p = L.paredes[al.i]; if (c === 'p-ext') p[4] = +v; else p[+c[1]] = num(v); return; }
  if (al.tipo === 'porta') { const p = L.portas[al.i]; if (c === 'd-w') p.w = Math.max(6, num(v)); if (c === 'd-lado') p.lado = +v; if (c === 'd-inv') { if (+v) p.inv = true; else delete p.inv; } return; }
  if (al.tipo === 'marca' && c === 'm-t') L.marcas[al.i].t = v;
  if (al.tipo === 'texto') { const t = L.textos[al.i]; if (c === 't-t') t.t = v; if (c === 't-nota') { if (v) t.nota = true; else delete t.nota; } }
}
function aplicarEntrada(el, final = false) {
  const d = el.dataset, v = el.type === 'checkbox' ? el.checked : el.value;
  if (d.c !== undefined) return aplicarCampo(el, final);
  if (d.renomear !== undefined) { const a = Lc().ambientes.find(x => x.id === d.renomear); if (a) renomearCampo(a, v); return; }
  if (d.localNome !== undefined) {
    const L = Lc();
    if (nomeAntes?.local !== estado.local) nomeAntes = { local: estado.local, nome: L.nome };
    L.nome = v.trim() || nomeAntes.nome; // vazio não vale: fica o nome de antes
    return;
  }
  if (d.cfg !== undefined) {
    const cfg = dados.config;
    if (d.cfg === 'giro' || d.cfg === 'recarga') tempoTelao(d.cfg, v, final);
    if (d.cfg === 'onde' && el.checked) cfg.vista.onde = v === 'todas' ? 'todas' : 'telao';
  }
}

function excluirAmbiente(a) {
  const L = Lc();
  L.ambientes = L.ambientes.filter(x => x.id !== a.id);
}
function acaoInspetor(acao, botao = null) {
  const a = ambSel();
  if (acao === 'excluir' && botao?.dataset.confirmar && !botao.dataset.ok) {
    botao.dataset.ok = '1';
    botao.dataset.rotulo = botao.textContent;
    botao.textContent = botao.dataset.confirmar;
    setTimeout(() => { if (botao.isConnected) { delete botao.dataset.ok; botao.textContent = botao.dataset.rotulo; } }, 5000);
    return;
  }
  // Excluir, duplicar, contorno e ordem valem para a seleção inteira e levam junto as paredes das salas (js/desenho.js).
  if (acao === 'excluir') return excluirSelecao();
  if (acao === 'duplicar') return duplicarSelecao();
  if (acao === 'contorno') return contornoSelecao();
  if (acao === 'frente' || acao === 'tras') return ordemZ(acao === 'frente');
  if (acao === 'centralizar' && a) {
    const antes = JSON.stringify(dados);
    delete a.lx; delete a.ly;
    if (JSON.stringify(dados) !== antes) registrar(antes);
    render();
  }
}

/* ---------- Desfazer ---------- */
function registrar(antes) {
  desfazer.push(antes);
  if (desfazer.length > 100) desfazer.shift();
  refazer.length = 0;
  salvarRascunho();
}
// Depois que os dados são trocados (desfazer, versão do banco, rascunho), um índice pode apontar para outro item:
// a seleção mantém só os espaços (por id). manterIndices: os dados voltaram exatamente ao que eram (cancelar arrasto).
function validarAlvo(manterIndices = false) {
  if (!dados.locais[estado.local]) estado.local = Object.keys(dados.locais)[0];
  const L = Lc(), existe = s => s.tipo === 'amb' ? L.ambientes.some(a => a.id === s.id) : manterIndices && !!({ parede: L.paredes, porta: L.portas, marca: L.marcas, texto: L.textos })[s.tipo]?.[s.i];
  if (estado.modo === 'editar') selecionar(estado.selecao.filter(existe)); // no modo visitante, estado.sel é a escolha de quem vê
  if (estado.sel && !L.ambientes.some(a => a.id === estado.sel)) estado.sel = null;
}
function voltar(de, para) {
  if (!de.length) return;
  if (cadeia) terminarCadeia(false); // a parede em andamento partia de um canto que o desfazer pode ter tirado
  para.push(JSON.stringify(dados));
  dados = JSON.parse(de.pop());
  validarAlvo();
  salvarRascunho();
  render();
}

/* ---------- Recados ---------- */
function salvarRecado() {
  const texto = $('#r-texto').value.trim(), inicio = $('#r-inicio').value, fim = $('#r-fim').value, destaque = $('#r-destaque').checked;
  const erro = !texto ? 'Escreva a mensagem do recado.' : inicio && fim && fim < inicio ? 'A data final precisa ser igual ou depois da inicial.' : '';
  $('#r-erro').textContent = erro;
  if (erro) return;
  const antes = JSON.stringify(dados), r = { id: recEditando || novoId(), texto, ...(inicio && { inicio }), ...(fim && { fim }), ...(destaque && { destaque: true }) };
  const i = dados.recados.findIndex(x => x.id === r.id);
  if (i >= 0) dados.recados[i] = r; else dados.recados.push(r);
  registrar(antes);
  recEditando = null;
  $('#form-rec').reset();
  msgPub('Recado guardado. Salve as alterações para ele passar no telão.');
  render();
}
function editarRecado(id) {
  const r = dados.recados.find(x => x.id === id);
  if (!r) return;
  recEditando = id;
  $('#r-texto').value = r.texto;
  $('#r-inicio').value = r.inicio || '';
  $('#r-fim').value = r.fim || '';
  $('#r-destaque').checked = !!r.destaque;
  $('#r-erro').textContent = '';
  recadosEd();
  $('#r-texto').focus();
}

async function trocarFoto(arquivo) {
  try {
    const img = await createImageBitmap(arquivo), k = Math.min(1, 1400 / Math.max(img.width, img.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    fotosNovas[estado.local] = cv.toDataURL('image/jpeg', .76);
    msgPub('Foto nova pronta. Ela vai para o banco quando você salvar.');
  } catch { msgPub('Não foi possível ler essa imagem. Use uma foto JPG ou PNG.', true); }
  painelEditor();
}
