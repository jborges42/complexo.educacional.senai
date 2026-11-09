'use strict';
/* Navegação, eventos e inicialização. */

function chaveFoco() {
  const a = document.activeElement, d = a?.dataset || {};
  if (!a || a === document.body) return null;
  // Casos em que um atributo só não identifica o elemento: o mesmo chip aparece em vários dias, a mesma área no topo e no rodapé.
  if (d.ent) return `[data-ent="${CSS.escape(d.ent)}"]${d.iso ? `[data-iso="${CSS.escape(d.iso)}"]` : ''}`;
  if (d.recMover) return `[data-rec-mover="${CSS.escape(d.recMover)}"][data-dir="${CSS.escape(d.dir || '')}"]`;
  if (d.local && a.closest('.tr-locais')) return `.tr-locais [data-local="${CSS.escape(d.local)}"]`;
  if (d.id && a.closest('#base')) return `#base .amb[data-id="${CSS.escape(d.id)}"]`;
  for (const k of ['turma', 'ir', 'sel', 'turno', 'local', 'secaoIr', 'calDias', 'calModo', 'verDia', 'selEd']) {
    if (a.dataset?.[k] !== undefined) return `[data-${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}="${CSS.escape(a.dataset[k])}"]`;
  }
  return a.id ? '#' + CSS.escape(a.id) : null;
}
function render() {
  religarPlanilha(); // a planta pode ter mudado (renomear, excluir, versão nova): as aulas da planilha acompanham
  const foco = chaveFoco(), m = estado.modo, cl = document.body.classList;
  cl.remove('modo-ver', 'modo-editar', 'modo-telao', 'secao-planta', 'secao-calendario', 'secao-recados', 'secao-telao');
  cl.add(`modo-${m}`);
  if (m === 'editar') cl.add(`secao-${estado.secao}`);
  visibilidade();
  vista.classList.toggle('is-3d', estado.d3);
  cabecalho();
  desenhar();
  legenda();
  if (m === 'ver') { detalhe(); ocupacao(); recadosVer(); calendario(); }
  if (m === 'editar') {
    secoes();
    painelEditor();
    if (estado.secao === 'planta') { inspetor(); espacos(); }
    if (estado.secao === 'calendario') calendario(); // só leitura: as aulas vêm da planilha
    if (estado.secao === 'recados') recadosEd();
    if (estado.secao === 'telao') configTelao();
  }
  if (m === 'telao') { telao(); if (intervaloRecarga !== recargaMs()) reiniciarRecarga(); } // tempo novo chegou com a versão salva
  if (m === 'ver' && !rolarCal) history.replaceState(null, '', `#${estado.local}${estado.sel ? '-' + estado.sel : ''}`);
  if (foco && document.activeElement === document.body) {
    let el = $(foco);
    // ↑/↓ de um recado que foi para o topo ou para o fim fica desabilitado: o foco fica no outro botão do mesmo recado.
    if (el?.disabled && el.dataset.recMover) el = $(`[data-rec-mover="${CSS.escape(el.dataset.recMover)}"]:not(:disabled)`) || $(`[data-rec-editar="${CSS.escape(el.dataset.recMover)}"]`);
    refocando = true; // devolver o foco a um espaço não move a câmera
    el?.focus({ preventScroll: true });
    refocando = false;
  }
}
function lerHash() {
  const h = decodeURIComponent(location.hash.slice(1)), anterior = estado.modo;
  if (h === 'telao') estado.modo = 'telao';
  else if (h === 'editar' || h.startsWith('editar-')) { estado.modo = 'editar'; const s = h.split('-')[1]; estado.secao = SECOES[s] ? s : 'planta'; }
  else {
    estado.modo = 'ver';
    if (h === 'calendario') rolarCal = true;
    else {
      const i = h.indexOf('-'), l = i < 0 ? h : h.slice(0, i), id = i < 0 ? null : h.slice(i + 1);
      if (dados.locais[l]) { estado.local = l; estado.sel = dados.locais[l].ambientes.some(a => a.id === id) ? id : null; }
    }
  }
  if (estado.modo !== anterior) entrarModo(anterior);
}
function entrarModo(anterior) {
  if (anterior === 'telao' && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  estado.turma = null;
  if (estado.modo === 'telao') {
    estado.sel = null; estado.zoom = 0; estado.auto = true; estado.girar = true;
    const ag = agora(); estado.data = ag.data; estado.turno = ag.turno;
  } else if (anterior === 'telao') { estado.turno = 'todos'; estado.data = hojeIso(); }
  if (estado.modo === 'editar') { estado.d3 = false; estado.zoom = 0; estado.turno = 'todos'; selecionarAlvo(null); cam.local = null; carregarDoBanco(); }
  reiniciarGiro();
  reiniciarRecarga(); // o telão lê a versão salva com mais frequência que as outras telas
  acordar();
}
function irSecao(s) {
  estado.secao = s;
  history.replaceState(null, '', `#editar${s === 'planta' ? '' : '-' + s}`);
  render();
  window.scrollTo({ top: 0 });
}
const suave = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
function verNaPlanta(e, iso) {
  const naPlanta = !!dados.locais[e.local]; // "Outros ambientes" não estão desenhados: mostra o dia na tabela de aulas
  estado.data = iso || primeira(e, hojeIso());
  estado.turma = null;
  if (estado.modo === 'editar') { if (!naPlanta) return; estado.local = e.local; selecionarAlvo({ tipo: 'amb', id: e.ambiente }); irSecao('planta'); return; }
  if (naPlanta) { estado.local = e.local; estado.sel = e.ambiente; } else estado.sel = null;
  render();
  $(naPlanta ? '#painel-planta' : '#tab-ocup').scrollIntoView({ behavior: suave(), block: naPlanta ? 'start' : 'center' });
}
const fecharMenu = () => { $('#menu-mais').open = false; };

/* ---------- Cliques ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  const fecha = t.closest('[data-fechar]');
  if (fecha) { fecha.closest('dialog')?.close(); return; }
  if (t.tagName === 'DIALOG' && t.classList.contains('fecha-fora')) { t.close(); return; }
  if (!t.closest('#menu-mais')) fecharMenu();
  if (!t.closest('#menu-recarga')) $('#menu-recarga').open = false;

  const aba = t.closest('.aba, .tr-locais [data-local]');
  if (aba) {
    estado.local = aba.dataset.local; estado.sel = null;
    if (estado.modo === 'editar') selecionarAlvo(null);
    reiniciarGiro();
    // Dois cliques na aba (o editor recria as abas a cada clique, então o dblclick nativo não chega): renomear a área.
    if (e.detail === 2 && estado.modo === 'editar' && aba.classList.contains('aba')) {
      if (estado.secao !== 'planta') irSecao('planta'); else render();
      const f = $('#f-local-nome');
      f?.focus(); f?.select();
      return;
    }
    render(); return;
  }
  const sec = t.closest('[data-secao-ir]');
  if (sec) { irSecao(sec.dataset.secaoIr); return; }
  const tu = t.closest('#turnos [data-turno]');
  if (tu) { estado.turno = tu.dataset.turno; render(); return; }
  const tm = t.closest('.turma');
  if (tm) { estado.turma = estado.turma === tm.dataset.turma ? null : tm.dataset.turma; render(); return; }
  const ir = t.closest('button[data-ir]');
  if (ir) { const v = ir.dataset.ir, i = v.indexOf('-'); estado.local = v.slice(0, i); estado.sel = v.slice(i + 1); render(); $(`.amb[data-id="${CSS.escape(estado.sel)}"]`, base)?.focus({ preventScroll: true }); return; }
  const sel = t.closest('#legenda [data-sel]');
  if (sel) { estado.sel = estado.sel === sel.dataset.sel ? null : sel.dataset.sel; render(); return; }
  const selEd = t.closest('[data-sel-ed]');
  if (selEd) { selecionarAlvo({ tipo: 'amb', id: selEd.dataset.selEd }); render(); mostrarNaTela(selEd.dataset.selEd); return; }

  // Calendário
  const en = t.closest('[data-ent]');
  if (en) { const x = ents().find(y => y.id === en.dataset.ent); if (x) verNaPlanta(x, en.dataset.iso); return; }
  const vd = t.closest('[data-ver-dia]');
  if (vd) { estado.data = vd.dataset.verDia; render(); if (estado.modo === 'ver') $('#painel-planta').scrollIntoView({ behavior: suave(), block: 'start' }); return; }
  const cd = t.closest('[data-cal-dias]');
  if (cd) { estado.cal.dias = +cd.dataset.calDias; calendario(); return; }
  const cm = t.closest('[data-cal-modo]');
  if (cm) { estado.cal.modo = cm.dataset.calModo; calendario(); return; }

  // Recados
  const re = t.closest('[data-rec-editar]');
  if (re) { editarRecado(re.dataset.recEditar); return; }
  const rm = t.closest('[data-rec-mover]');
  if (rm) { const l = dados.recados, i = l.findIndex(r => r.id === rm.dataset.recMover), j = i + +rm.dataset.dir; if (i < 0 || j < 0 || j >= l.length) return; const antes = JSON.stringify(dados); [l[i], l[j]] = [l[j], l[i]]; registrar(antes); render(); return; }
  const rx = t.closest('[data-rec-excluir]');
  if (rx) {
    if (!rx.dataset.ok) { rx.dataset.ok = '1'; rx.textContent = 'Confirmar'; return; }
    const antes = JSON.stringify(dados), i = dados.recados.findIndex(r => r.id === rx.dataset.recExcluir);
    dados.recados = dados.recados.filter(r => r.id !== rx.dataset.recExcluir);
    if (recEditando === rx.dataset.recExcluir) { recEditando = null; $('#form-rec').reset(); }
    registrar(antes); render();
    ($$('[data-rec-editar]')[Math.min(i, dados.recados.length - 1)] || $('#r-texto')).focus(); // o foco não cai no fim da página
    return;
  }

  const ac = t.closest('[data-acao]');
  if (ac) { acaoInspetor(ac.dataset.acao, ac); return; }
  const ve = t.closest('[data-versao]');
  if (ve) { restaurar(+ve.dataset.versao); return; }
  const fe = t.closest('[data-ferr]');
  if (fe) {
    usarFerramenta(fe.dataset.ferr);
    if (e.detail === 0) criarNoCentro(fe.dataset.ferr); // acionado pelo teclado (Enter/Espaço): cria no meio da vista, como o antigo “+ Sala”
    return;
  }
  const ex = t.closest('[data-ext]');
  if (ex) { estado.paredeExt = +ex.dataset.ext; painelEditor(); return; }

  switch (t.closest('button')?.id) {
    case 'b-entrar': abrirLogin(); return;
    case 'b-sair': sb?.auth.signOut(); return;
    case 'b-publicar': salvar(); return;
    case 'b-forcar': salvar(true); return;
    case 'b-recarregar': { // as alterações desta aba vão para os pendentes (faixa "Retomar") antes de trocar pela versão nova
      const r = lerRascunho();
      if (ehMeu(r) && temMudanca(r)) guardarPendente({ ...r, aba: `${ABA}-antes` });
      carregarDoBanco(true).then(() => msgPub('Versão nova carregada. Suas alterações ficaram guardadas: use “Retomar” se quiser recuperá-las.'));
      return;
    }
    case 'b-historico': fecharMenu(); $('#menu-mais summary').focus(); historico(); return; // o diálogo devolve o foco ao “Mais” ao fechar
    case 'b-baixar': fecharMenu(); baixar(); return;
    case 'b-descartar': {
      const b = $('#b-descartar');
      if (!b.dataset.ok) { b.dataset.ok = '1'; b.textContent = 'Confirmar: descartar tudo'; setTimeout(() => { delete b.dataset.ok; b.textContent = 'Descartar alterações'; }, 4000); return; }
      delete b.dataset.ok; b.textContent = 'Descartar alterações';
      dados = JSON.parse(publicado); for (const k in fotosNovas) delete fotosNovas[k];
      desfazer.length = refazer.length = 0; limparRascunho(); selecionarAlvo(null); fecharMenu();
      msgPub('Alterações descartadas.'); render();
      carregarDoBanco(true); // a versão publicada guardada aqui pode estar velha: traz a atual do banco
      return;
    }
    case 'b-retomar': { // junta todos os rascunhos que ainda não voltaram para o editor; Ctrl+Z desfaz
      const l = naoRecuperados();
      if (!l.length) return;
      desfazer.push(JSON.stringify(dados));
      dados = l.reduce((d, r) => juntarRascunho(r, d), JSON.parse(JSON.stringify(dados)));
      gravarChave('planta-rascunhos-pendentes', null);
      if (!ehMeu(lerRascunho())) gravarChave('planta-rascunho', null);
      validarAlvo(); salvarRascunho(); render(); return;
    }
    case 'b-descartar-rascunho': // apagar alterações guardadas só com confirmação
      confirmar('Descartar o rascunho?', 'As alterações guardadas neste navegador, que ainda não foram salvas no banco, serão apagadas. Isso não dá para desfazer.', 'Descartar rascunho', () => { gravarChave('planta-rascunhos-pendentes', null); if (!ehMeu(lerRascunho())) gravarChave('planta-rascunho', null); painelEditor(); });
      return;
    case 'b-desfazer': voltar(desfazer, refazer); return;
    case 'b-refazer': voltar(refazer, desfazer); return;
    case 'r-cancelar': recEditando = null; $('#form-rec').reset(); $('#r-erro').textContent = ''; recadosEd(); return;
    case 'cal-ant': estado.cal.inicio = somaDias(estado.cal.inicio, -estado.cal.dias); calendario(); return;
    case 'cal-prox': estado.cal.inicio = somaDias(estado.cal.inicio, estado.cal.dias); calendario(); return;
    case 'cal-hoje': estado.cal.inicio = segundaDa(hojeIso()); calendario(); return;
    case 'd-ant': estado.data = somaDias(estado.data, -1); render(); return;
    case 'd-prox': estado.data = somaDias(estado.data, 1); render(); return;
    case 'd-hoje': estado.data = hojeIso(); render(); return;
    case 'b3d': case 'tc-3d': estado.d3 = !estado.d3; render(); return;
    case 'bespelho': case 'brotacao': irParaTelao(); mudarVista(t.closest('button').id === 'bespelho' ? espelhar : girar); return;
    case 'zmais': case 'zmenos': {
      const b = t.closest('button'), passo = b.id === 'zmais' ? 1 : -1;
      if (estado.modo === 'editar') { irParaTelao(); mudarVista(v => zoomVista(v, passo)); }
      else { estado.zoom = Math.min(Math.max(estado.zoom + passo, 0), ZOOMS.length - 1); render(); }
      focoVizinho(b);
      return;
    }
    case 'zajustar': { // volta à vista original: sem zoom, sem giro e sem espelho
      const b = t.closest('button'), original = () => { mudarVista(() => ({})); focoVizinho(b); };
      if (estado.modo !== 'editar') { estado.zoom = 0; delete estado.vistaLocal[estado.local]; render(); vista.scrollTo(0, 0); focoVizinho(b); return; }
      irParaTelao();
      // No editor isso apaga a vista do telão configurada para a área: pergunta antes, dizendo o que se perde.
      const v = vistaSalva(estado.local), perde = [v.espelho && 'sem espelho', +v.rotacao && 'sem giro', v.zoom > 1 && 'sem zoom'].filter(Boolean);
      if (perde.length) confirmar('Voltar à vista original?', `No telão, ${Lc().nome} fica ${perde.join(', ').replace(/, ([^,]*)$/, ' e $1')} depois que você salvar. Dá para desfazer.`, 'Voltar ao original', original);
      return;
    }
    case 'bcroqui': {
      const L = Lc();
      $('#dlg-img').src = fotosNovas[estado.local] || `${L.foto}${L.foto.includes('?') ? '&' : '?'}v=${encodeURIComponent(dados.atualizado || '')}`;
      $('#dlg-img').alt = `Foto do croqui original: ${L.nome}`;
      $('#dlg-titulo').textContent = `Croqui original · ${L.nome}`;
      $('#dlg').showModal();
      return;
    }
    case 'tc-ant': proximoLocal(-1); reiniciarGiro(); return;
    case 'tc-prox': proximoLocal(1); reiniciarGiro(); return;
    case 'tc-girar': estado.girar = !estado.girar; reiniciarGiro(); render(); return;
    case 'tc-cheia': if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {}); return;
  }
  if (estado.modo === 'ver') {
    const g = t.closest('#base .amb');
    if (g) { estado.sel = estado.sel === g.dataset.id ? null : g.dataset.id; render(); }
    else if (t.closest('#base') && estado.sel) { estado.sel = null; render(); }
  }
});

/* ---------- Formulários ---------- */
document.addEventListener('submit', e => {
  const id = e.target.id;
  if (!['form-login', 'form-rec'].includes(id)) return;
  e.preventDefault();
  if (id === 'form-login') entrar($('#f-email').value.trim(), $('#f-senha').value);
  if (id === 'form-rec') salvarRecado();
});
const LIGADOS = '[data-c],[data-renomear],[data-local-nome],[data-cfg]';
document.addEventListener('focusin', e => { if (e.target.matches?.(LIGADOS)) { antesCampo = JSON.stringify(dados); nomeAntes = null; } });
document.addEventListener('input', e => {
  const el = e.target;
  if (el.matches(LIGADOS)) { aplicarEntrada(el); render(); salvarRascunho(); return; }
  if (el.id === 'r-texto') { $('#r-cont').textContent = `${el.value.length}/300`; return; }
  if (el.id === 'cal-busca') { estado.cal.busca = el.value; calendario(); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'f-foto' && el.files?.[0]) { trocarFoto(el.files[0]); return; }
  if (el.id === 'data-plano') { if (el.value) { estado.data = el.value; render(); } return; }
  if (el.id === 'cal-local') { estado.cal.local = el.value; calendario(); return; }
  if (el.id === 'cal-fds') { estado.cal.fds = el.checked; calendario(); return; }
  if (el.id === 'cal-todos') { estado.cal.todos = el.checked; calendario(); return; }
  if (el.id === 'tc-turno') { estado.auto = el.value === 'auto'; if (estado.auto) { const ag = agora(); estado.data = ag.data; estado.turno = ag.turno; } else estado.turno = el.value; render(); return; }
  if (el.id === 'tc-data') { if (el.value) { estado.data = el.value; render(); } return; }
  // Posição e tamanho valem ao confirmar. Redesenho parcial: o change chega no mousedown de outro botão, e um render()
  // recriaria esse botão antes do mouseup (o clique se perderia).
  if (el.matches('[data-c="x"],[data-c="y"],[data-c="w"],[data-c="h"]')) {
    aplicarEntrada(el, true);
    desenhar();
    const a = ambSel();
    if (a) for (const c of 'xywh') { const f = $('#f-' + c); if (f) f.value = a[c]; }
  }
  // Tempos do telão: ao confirmar, vale o inteiro digitado se estiver na faixa. Fora dela, nada muda sem a pessoa confirmar.
  if (el.dataset.cfg === 'giro' || el.dataset.cfg === 'recarga') {
    const k = el.dataset.cfg, sugestao = tempoTelao(k, el.value, true);
    mostrarTempos(true); // os dois lugares do tempo de atualização (Editor › Telão e a barra) mostram o que vale
    if (sugestao !== null) {
      const [min, max] = FAIXA_TEMPO[k];
      confirmar('Tempo fora do limite', `${k === 'giro' ? 'O tempo de cada tela' : 'O tempo de atualização do telão'} vai de ${min} a ${max} segundos. Usar ${sugestao} segundos?`, `Usar ${sugestao} s`, () => {
        const antes = JSON.stringify(dados);
        dados.config.telao[k] = sugestao;
        registrar(antes);
        mostrarTempos(true);
        if (k === 'giro') reiniciarGiro(); else reiniciarRecarga();
      });
    }
  }
  // Campo de nome deixado vazio: o nome não mudou (aplicarEntrada manteve o anterior), então o campo volta a mostrá-lo.
  if (el.matches('[data-c="nome"],[data-renomear],[data-local-nome]') && !el.value.trim())
    el.value = el.matches('[data-local-nome]') ? Lc().nome : Lc().ambientes.find(a => a.id === (el.dataset.renomear ?? estado.alvo?.id))?.nome ?? '';
  if (el.matches(LIGADOS) && antesCampo && JSON.stringify(dados) !== antesCampo) {
    registrar(antesCampo);
    antesCampo = JSON.stringify(dados);
    if (el.dataset.cfg === 'giro') reiniciarGiro();
    if (el.dataset.cfg === 'recarga') reiniciarRecarga();
    if (REDESENHA_FORM.has(el.dataset.c)) { const id = el.id; inspetor(true); $('#' + CSS.escape(id))?.focus(); }
    painelEditor();
  }
});

/* ---------- Teclado ---------- */
base.addEventListener('keydown', e => {
  const g = e.target.closest('.amb');
  // No editor da planta, Espaço é a mão (mover a vista); Enter seleciona o espaço focado.
  if (!g || !(e.key === 'Enter' || (e.key === ' ' && !(estado.modo === 'editar' && estado.secao === 'planta')))) return;
  e.preventDefault();
  if (estado.modo === 'ver') estado.sel = estado.sel === g.dataset.id ? null : g.dataset.id;
  else if (estado.modo === 'editar' && estado.secao === 'planta') selecionarAlvo({ tipo: 'amb', id: g.dataset.id });
  render();
});
// Acesso rápido ao tempo do telão (barra do editor): ao abrir, o campo já vem selecionado.
$('#menu-recarga').addEventListener('toggle', e => {
  if (!e.target.open) return;
  const i = $('#c-recarga-rapido');
  i.value = recargaMs() / 1000;
  i.focus();
  i.select();
});
// Enter ou Esc fecham o painel e o valor digitado vale (nada volta atrás sozinho; fora da faixa, o editor pergunta).
$('#menu-recarga').addEventListener('keydown', e => {
  const i = $('#c-recarga-rapido');
  if (!(e.key === 'Escape' || (e.key === 'Enter' && e.target === i))) return;
  e.preventDefault();
  e.stopPropagation();
  i.blur(); // o change confirma o valor
  $('#menu-recarga').open = false;
  $('#menu-recarga summary').focus();
});
// Pergunta antes de mudar ou apagar algo (pedido do usuário: nada de configuração é resetado sem confirmação).
let aoConfirmar = null;
function confirmar(titulo, texto, rotuloOk, acao) {
  $('#conf-titulo').textContent = titulo;
  $('#conf-texto').textContent = texto;
  $('#conf-ok').textContent = rotuloOk;
  aoConfirmar = acao;
  $('#dlg-confirma').showModal();
  $('#conf-ok').focus();
}
$('#conf-ok').addEventListener('click', () => { const f = aoConfirmar; aoConfirmar = null; $('#dlg-confirma').close(); f?.(); });
$('#dlg-confirma').addEventListener('close', () => { aoConfirmar = null; });
$('#abas').addEventListener('keydown', e => {
  const abas = $$('.aba'), i = abas.indexOf(document.activeElement);
  const j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: abas.length - 1 }[e.key];
  if (i < 0 || j === undefined) return;
  e.preventDefault();
  estado.local = abas[(j + abas.length) % abas.length].dataset.local;
  estado.sel = null;
  if (estado.modo === 'editar') selecionarAlvo(null);
  render();
  $(`.aba[data-local="${estado.local}"]`).focus();
});
document.addEventListener('keydown', e => {
  if ($('dialog[open]')) return;
  const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
  if (estado.modo === 'editar') {
    const mod = e.ctrlKey || e.metaKey, caixa = e.target.matches?.('input[type=checkbox],input[type=radio]');
    // Ctrl/⌘+Z e Y também valem com o foco numa caixa de marcar ou num rádio (ali não há texto para desfazer).
    if (mod && /^[zy]$/i.test(e.key) && (!digitando || caixa)) {
      e.preventDefault();
      if (arrasto || arrastoVista) return;
      const id = caixa && e.target.id;
      if (id) e.target.blur(); // o inspetor não se redesenha com o foco dentro dele
      if (e.key.toLowerCase() === 'y' || e.shiftKey) voltar(refazer, desfazer); else voltar(desfazer, refazer);
      if (id) $('#' + CSS.escape(id))?.focus();
      return;
    }
    // Editor › Telão com zoom: com o foco na planta, as setas movem o enquadramento (um décimo da vista por toque).
    const seta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (seta && !digitando && e.target.closest?.('#vista') && enquadrando()) {
      e.preventDefault();
      const vb = base.viewBox.baseVal;
      mudarVista(v => deslocar(v, seta[0] * vb.width / 10, seta[1] * vb.height / 10), false);
      return;
    }
    // A caixa "Criar as paredes do contorno" da barra da planta não bloqueia Esc nem as letras das ferramentas.
    if ((digitando && !e.target.matches?.('.tela-ui input[type=checkbox]')) || estado.secao !== 'planta') return;
    teclaPlanta(e); // atalhos da planta: js/desenho.js
    return;
  }
  if (estado.modo === 'telao') {
    acordar();
    if (digitando) return;
    if (e.key === 'ArrowRight') { proximoLocal(1); reiniciarGiro(); }
    if (e.key === 'ArrowLeft') { proximoLocal(-1); reiniciarGiro(); }
    if (e.key === ' ') { e.preventDefault(); estado.girar = !estado.girar; reiniciarGiro(); render(); }
    if (e.key.toLowerCase() === 'f') { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {}); }
    if (e.key === 'Escape' && !document.fullscreenElement) location.hash = estado.local;
    return;
  }
  if (e.key === 'Escape' && (estado.sel || estado.turma)) { estado.sel = null; estado.turma = null; render(); }
});
document.addEventListener('pointermove', () => { if (estado.modo === 'telao') acordar(); });
document.addEventListener('fullscreenchange', () => { if (estado.modo === 'telao') telao(); });
window.addEventListener('hashchange', () => {
  lerHash(); render();
  if (rolarCal) { $('#calendario').scrollIntoView({ behavior: suave(), block: 'start' }); rolarCal = false; } // #calendario: vai até ele e a URL volta a acompanhar
});

/* ---------- Vista da planta: Espelhar, Girar, zoom e enquadramento ---------- */
// No Editor › Telão os botões mudam a vista salva da área: valem o desfazer e o "Salvar alterações", e o telão mostra a salva.
// No link público, Espelhar e Girar valem só para quem está vendo (o zoom de lá aumenta a planta e a vista rola).
function mudarVista(fn, avisar = true) {
  const lid = estado.local, ed = estado.modo === 'editar', v = fn({ ...(ed ? vistaSalva(lid) : vistaDe(lid)) });
  if (!ed) {
    // Só para quem vê. Quando volta a ser igual à vista com que a página abre, deixa de ser "só nesta tela".
    const ini = dados.config.vista.onde === 'todas' ? vistaSalva(lid) : {}, nova = { espelho: !!v.espelho, rotacao: +v.rotacao || 0 };
    if (nova.espelho === !!ini.espelho && nova.rotacao === (+ini.rotacao || 0)) delete estado.vistaLocal[lid]; else estado.vistaLocal[lid] = nova;
    render(); if (avisar) avisarVista(); return;
  }
  const nova = limparVista(v);
  if (igual(vistaSalva(lid), nova)) return;
  const antes = JSON.stringify(dados);
  gravarVista(lid, nova);
  registrar(antes);
  render(); if (avisar) avisarVista();
}
// Só o que difere do original. As áreas e as chaves ficam na ordem em que o banco (jsonb) as devolve, a chave mais curta
// primeiro: assim, voltar ao que estava salvo não deixa "Há alterações não salvas" só por diferença de ordem.
const limparVista = v => ({ ...(v.zoom > 1 && { zoom: +v.zoom, ...(v.centro && { centro: v.centro }) }), ...(v.espelho && { espelho: true }), ...(+v.rotacao && { rotacao: +v.rotacao }) });
function gravarVista(lid, nova) {
  const ordem = ([a], [b]) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
  dados.config.vista.locais = Object.fromEntries(Object.entries({ ...dados.config.vista.locais, [lid]: nova }).filter(([, x]) => Object.keys(x).length).sort(ordem));
}
// No editor os botões também ficam em "Planta e espaços", onde a planta fica na orientação original para desenhar:
// o clique leva para a seção Telão, que mostra a planta como o telão vai mostrar.
function irParaTelao() { if (estado.modo === 'editar' && estado.secao !== 'telao') irSecao('telao'); }
// Botão que ficou desabilitado (zoom no limite, nada mais a desfazer): o foco do teclado vai para o vizinho, não para o topo.
const VIZINHO = { zmais: 'zmenos', zmenos: 'zmais', zajustar: 'brotacao' };
function focoVizinho(b) { if (b.disabled && [b, document.body].includes(document.activeElement)) document.getElementById(VIZINHO[b.id])?.focus(); }
// Leitores de tela: anuncia como a planta ficou (a mudança não move o foco).
function avisarVista() { $('#vista-aviso').textContent = `Planta ${sobreVista() || 'na vista original'}.`; }
// Com zoom, arrastar a planta no Editor › Telão (ou, com o foco nela, usar as setas) escolhe a parte que aparece no telão.
const enquadrando = () => estado.modo === 'editar' && estado.secao === 'telao' && (+vistaSalva(estado.local).zoom || 1) > 1;
let arrastoVista = null;
vista.addEventListener('pointerdown', e => {
  if (e.button !== 0 || arrastoVista || !enquadrando()) return; // um dedo só: o segundo não mexe em nada
  e.preventDefault(); // sem selecionar os textos da planta
  vista.focus({ preventScroll: true }); // confirma o campo que estava aberto e deixa as setas valendo
  arrastoVista = { id: e.pointerId, x: e.clientX, y: e.clientY, lid: estado.local, doc: dados, v: vistaSalva(estado.local), antes: JSON.stringify(dados), k: base.getScreenCTM()?.a || 1 };
  vista.setPointerCapture(e.pointerId);
  vista.classList.add('arrastando');
});
vista.addEventListener('pointermove', e => {
  const p = arrastoVista;
  if (!p || e.pointerId !== p.id) return;
  // Os dados ou a área mudaram no meio do arrasto (versão nova do banco, troca de aba): o arrasto para sem gravar nada.
  if (dados !== p.doc || estado.local !== p.lid) { arrastoVista = null; vista.classList.remove('arrastando'); return; }
  gravarVista(p.lid, limparVista(deslocar(p.v, (p.x - e.clientX) / p.k, (p.y - e.clientY) / p.k)));
  desenhar();
});
function soltarVista(e) {
  const p = arrastoVista;
  if (!p || e.pointerId !== p.id) return;
  arrastoVista = null;
  vista.classList.remove('arrastando');
  if (dados === p.doc && JSON.stringify(dados) !== p.antes) registrar(p.antes);
  render();
}
vista.addEventListener('pointerup', soltarVista);
vista.addEventListener('pointercancel', soltarVista);

/* ---------- Relógio do telão e leitura periódica (o Realtime avisa na hora; isto cobre quedas de conexão) ---------- */
setInterval(() => {
  if (estado.modo !== 'telao') return;
  if (estado.auto) {
    const ag = agora();
    if (ag.data !== estado.data || ag.turno !== estado.turno) { estado.data = ag.data; estado.turno = ag.turno; render(); return; }
  }
  relogio();
}, 15000);
// Leitura periódica da versão salva. O Realtime avisa na hora quando alguém salva; esta leitura garante a atualização mesmo
// sem ele. No telão roda a cada N segundos (Editor › Telão › “Atualizar o telão a cada”; sem nada cadastrado, 15 s); nas
// outras telas, a cada 5 minutos. Não recarrega a página: a troca de áreas segue de onde estava e a tela cheia continua.
// A planilha oficial (js/planilha.js) é lida no mesmo ciclo; só redesenha quando as aulas mudam.
async function atualizarPlanilha() { if (await carregarPlanilha()) render(); else mostrarSituacao(); } // sem mudança: só o horário da leitura
let temporizadorRecarga = 0, intervaloRecarga = 0;
function reiniciarRecarga() {
  clearTimeout(temporizadorRecarga);
  intervaloRecarga = estado.modo === 'telao' ? recargaMs() : RECARGA_MS;
  // Período fixo: a próxima leitura já fica marcada antes desta, então uma resposta lenta (ou que nunca chega) não atrasa nem trava o telão.
  temporizadorRecarga = setTimeout(() => { reiniciarRecarga(); carregarDoBanco(); atualizarPlanilha(); }, intervaloRecarga);
}
reiniciarRecarga();

/* ---------- Início ---------- */
if (!dados) {
  document.body.innerHTML = '<p style="padding:32px;font:16px system-ui">Não foi possível carregar <code>dados.js</code>. Confira se o arquivo está na mesma pasta do <code>index.html</code>.</p>';
} else {
  lerHash();
  render();
  atualizarPlanilha();
  if (rolarCal) { $('#calendario').scrollIntoView({ block: 'start' }); rolarCal = false; }
  document.fonts?.ready.then(() => $$('.selo', base).forEach(medir));
  if (sb) {
    carregarDoBanco();
    sb.auth.onAuthStateChange((_evento, s) => setTimeout(() => definirSessao(s), 0));
    sb.channel('planta').on('postgres_changes', { event: '*', schema: 'public', table: 'planta' }, () => carregarDoBanco()).subscribe();
  }
}
