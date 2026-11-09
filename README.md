# complexo.educacional.senai

Planta interativa dos ambientes do novo complexo educacional, com calendário de enturmação, recados e modo telão. Foi digitalizada a partir do croqui de 06/11/2026; as fotos originais estão em `fotos/`.

**As aulas (ensalamento das turmas e ocupação dos ambientes) vêm só da planilha oficial no Google Planilhas.** O site não edita aulas: para mudar uma aula, mude a planilha.

## Links

O site é estático e é publicado na Vercel a partir da branch `main`, sem etapa de build. Use o domínio da Vercel com:

| Uso | Endereço |
|---|---|
| Visualização (link público, só leitura) | `/` |
| Calendário (link público, só leitura) | `/#calendario` |
| Telão / projetor (tela cheia, aulas do horário atual) | `/#telao` |
| Edição da planta, dos recados e do telão | `/#editar` |

Quem abre o link público só visualiza. O editor só salva para quem entra com um usuário de editor. Quando alguém salva, o link público e o telão se atualizam na hora.

No link público, Espelhar e Girar mudam a planta só para quem está vendo, sem salvar. O editor da planta mostra sempre a orientação original.

## Funcionalidades

- **Planta**: três áreas — 1º Andar (todas as salas), 2º Andar (Maker) e Carretas. Clique num espaço para ver os detalhes e as aulas do dia. Há modo 3D, zoom e a foto do croqui original.
- **Aulas da planilha**: a planta, a tabela "Aulas" do dia, o calendário e o telão mostram turma, módulo e docente de cada ambiente, lidos da planilha oficial (veja abaixo).
- **Calendário de enturmação**: mostra 1 semana, 15 dias ou 30 dias, em grade (ambiente × dia) ou em lista, com busca por turma, módulo, professor(a) ou ambiente. As aulas da planilha se repetem toda semana. O "!" marca duas aulas no mesmo ambiente e turno.
- **Renomear espaços**: pela lista "Espaços" do editor, com dois cliques no espaço ou com F2. O texto da planta acompanha o novo nome. O nome da área se troca no campo da lista ou com dois cliques na aba.
- **Recados**: mensagens com data de início e de fim opcionais. A opção "importante" coloca o recado no começo. Os recados passam numa faixa na parte de baixo do telão e também aparecem no link público.
- **Telão**:
  - Alterna entre as áreas a cada **15 segundos** (o tempo é configurável no editor, de 5 a 300 s).
  - Mostra as aulas do turno atual.
  - Mostra a planta com a vista salva de cada área: espelhada (esquerda ↔ direita, como a câmera frontal do celular), girada de 90° em 90° e com zoom na parte escolhida.

## Planilha oficial (aulas)

Planilha: <https://docs.google.com/spreadsheets/d/1beylnyKjSrpFCWxZTmiQyUDLVt_xlE7F6WBmZr_MQB0>. Ela precisa continuar compartilhada como **"Qualquer pessoa com o link: leitor"**; se ficar restrita, o site deixa de ler.

**O que o site lê.** As abas **Ambientes manhã**, **Ambientes tarde** e **Ambientes noite**:

- colunas `Ambiente`, `Dia da semana`, `Módulo`, `Docente` e `Turma`, na primeira linha;
- o turno vem da própria aba: cada uma está ligada a um turno pelo número dela (gid), em `PLANILHA_ABAS` (`js/planilha.js`); renomear a aba não muda nada;
- o nome do ambiente pode ficar só na primeira linha do grupo, e as linhas de baixo herdam esse nome;
- o dia pode ser escrito `2ª`, `2a`, `Segunda` ou `Segunda-feira`, ou como lista (`2ª e 4ª`, `seg/qua`). Data ou intervalo (`2ª a 6ª`) não é adivinhado: a linha vira aviso;
- linha sem módulo, docente e turma é ignorada (é um horário livre);
- uma coluna `Observações`, se for criada, também aparece no site.

As abas por turma (**Matutino** e **Vespertino**) repetem a mesma informação em outro formato e **não são lidas**. Se as duas formas divergirem, o site segue as abas de **Ambientes**.

**Como o site lê.** O navegador baixa cada aba em CSV direto do Google, pelo endereço de exportação `https://docs.google.com/spreadsheets/d/<id>/export?format=csv&gid=<gid>`, com os valores como aparecem na planilha. Não precisa de chave nem de "Publicar na Web".

- A leitura acontece ao abrir a página e depois a cada 5 minutos. No telão, acontece no mesmo intervalo da atualização do telão (padrão: 15 s).
- A última leitura boa fica guardada no aparelho. Se a internet ou o Google falharem, o site continua com ela e o rodapé avisa de quando ela é.
- Linhas que o site não entender aparecem contadas no rodapé; passe o mouse para ver quais.
- Se uma aba for apagada e recriada, o número dela (gid) muda. Nesse caso o rodapé avisa ("não foi possível ler a planilha") e o gid precisa ser atualizado em `PLANILHA_ABAS`, em `js/planilha.js`. O gid é o número que aparece no fim do endereço com a aba aberta (`…#gid=54130094`).

**Nomes dos ambientes.** Um ambiente com o mesmo nome de um espaço da planta se liga sozinho a ele (sem diferença de acentos e maiúsculas). Os outros nomes se ligam pela lista `PLANILHA_APELIDOS`, em `js/planilha.js`:

| Na planilha | Na planta |
|---|---|
| Lab. Info. complexo | Laboratório de Informática (1º Andar) |
| Cozinha complexo | Cozinha (1º Andar) |
| Sala óculos | Sala 3D (1º Andar) |
| Maker | Maker (2º Andar) |
| UM Civil, UM Elétrica, UM Automação | Carreta Civil, Carreta Elétrica, Carreta Automação |
| UM Manutenção | Carreta Mecânica |

Ambiente da planilha que não está desenhado na planta (hoje, **Auditório 1** e **Auditório 2**) aparece no grupo **Outros ambientes**: na tabela de aulas, no calendário e no telão. A ligação acompanha a planta na hora: renomear, excluir ou criar um espaço muda para onde as aulas vão, sem esperar a próxima leitura.

**"Livre"** só aparece nos espaços e horários que a planilha lista sem aula. Um espaço que não está na planilha fica sem selo e fora da tabela de aulas, porque o site não sabe se ele está ocupado.

**Conferir a leitura sem navegador**: `node testes/planilha.mjs`.

## Modo telão

Abra `/#telao` no computador ligado ao projetor ou à TV e clique em **Tela cheia** (ou tecle `F`).

- Usa o dia e o turno atuais pelo relógio do computador: manhã até 12h30, tarde até 18h e noite depois disso. No fim de semana, mostra o próprio dia; se não houver aulas na planilha, avisa.
- A troca de área segue o tempo configurado em **Editor › Telão** (padrão: 15 s). A barra de espaço pausa a troca e as setas mudam de área.
- Busca a versão salva e a planilha a cada 15 segundos, sem recarregar a página nem sair da tela cheia. O tempo pode ser mudado em **Editor › Telão › "Atualizar o telão a cada (segundos)"**, de 5 a 3600. Quando alguém salva no editor, o telão também se atualiza na hora.
- Com os botões **Espelhar**, **Girar**, **−**, **+** e **Original** (no editor, em Planta e espaços ou em Telão), cada área ganha a vista do telão. Com zoom, arraste a planta, ou clique nela e use as setas, para escolher o trecho: o telão mostra exatamente esse trecho. **Original** volta tudo e pede confirmação. Vale no telão depois de **Salvar alterações**. Em *Onde valem o espelho e o giro* dá para usar a mesma orientação também no link público; o zoom vale só no telão.
- Os controles somem depois de alguns segundos sem mexer o mouse.

## Como editar

Abra `/#editar`. O editor tem quatro seções:

- **Planta e espaços**: desenhar e organizar os espaços, renomear.
- **Calendário**: só leitura, com as aulas da planilha e um atalho para abri-la. Clicar numa aula leva ao espaço na planta.
- **Recados**.
- **Telão**: tempo de troca, atualização e a vista da planta (espelho, giro e zoom).

As aulas não são editadas aqui: elas vêm da planilha oficial.

Depois de editar, clique em **Salvar alterações**. Na primeira vez, o editor pede seu e-mail e senha de editor.

- Cada salvamento vira uma versão nova em **Mais › Histórico de versões**, de onde qualquer uma das 30 versões mais recentes pode voltar.
- **Duas pessoas ao mesmo tempo**: se outra pessoa salvou enquanto você editava, ao salvar as alterações das duas pessoas são juntadas; no mesmo campo, vale a sua. Se ela salvar várias vezes seguidas, o editor deixa carregar a versão nova ou salvar a sua por cima.
- **Alterações não salvas** ficam guardadas no navegador. Se a página recarregar ou fechar, elas voltam sozinhas quando o editor abrir de novo, juntadas com o que outra pessoa tenha salvado nesse meio-tempo; se alguém mudou o mesmo ponto, vale o rascunho, e a mensagem avisa quantos pontos foram. Nada é apagado sem você pedir: um rascunho que não voltou sozinho (de outra aba, ou de antes de "Carregar a versão nova") fica na faixa **Retomar / Descartar rascunho**, e descartar pede confirmação. Para voltar à versão salva, use Ctrl/⌘ + Z ou **Mais › Descartar alterações**. A **foto nova do croqui** não entra no rascunho: se a página recarregar antes de salvar, escolha a foto de novo.
- **Mais › Baixar cópia** baixa uma cópia de segurança dos dados.

### Editar a planta

A planta do editor funciona como um quadro branco, no estilo do Miro e do Excalidraw. A barra no alto da planta tem as ferramentas, e a letra de cada uma é o atalho.

- **Criar espaços**: escolha Sala (S), Zona aberta (Z) ou Circulação (C) e arraste na planta. Um clique cria um espaço de tamanho padrão. A sala já nasce com as paredes do contorno; dá para desligar isso na opção ao lado da barra. Digite o nome e tecle Enter.
- **Paredes e portas**: Parede (P) desenha clique a clique ou arrastando. Clicar no ponto inicial fecha o contorno; Esc, Enter ou dois cliques terminam. Porta (O) entra na parede clicada e abre para o lado do clique; dois cliques na porta giram a abertura.
- **Texto (T) e Indicação de acesso (A)**, como ENTRADA, também são criados com um clique ou arrastando.
- **Selecionar**: clique; Shift + clique soma itens; arraste no vazio para pegar uma área; Ctrl/⌘ + A pega tudo.
- **Mover e mudar o tamanho**: arraste o espaço ou puxe as alças laranja, e as paredes da sala vão junto. O ímã alinha com as paredes e as salas vizinhas e mostra uma guia. Segure ⌘ (no Mac) ou Ctrl (nos outros) para posicionar livremente, e Shift para andar só na horizontal ou só na vertical. As setas movem 5 unidades (com Shift, 1).
- **Empurrar parede**: arraste uma parede, e as salas encostadas nela mudam de tamanho junto. A parede não entra numa sala mais comprida que ela (para isso, puxe a alça dessa sala), e a sala vizinha que não muda de tamanho continua com as paredes dela.
- **Renomear**: dois cliques no espaço, F2 ou a lista Espaços. Dois cliques na aba renomeiam a área. Dar a um espaço o mesmo nome de um ambiente da planilha liga as aulas desse ambiente a ele.
- **Duplicar, copiar, recortar e colar**: Ctrl/⌘ + D, C, X e V. Colar põe o item onde está o mouse, inclusive em outra área; recortar e colar é o jeito de passar um espaço para outra área, com o mesmo nome, texto e croqui. Alt + arrastar duplica e move a cópia. A cópia de "Sala 1" vira "Sala 2" quando a área já tem uma "Sala 1". A cópia de uma porta fica ao lado dela, na mesma parede.
- **Excluir**: Delete. As aulas continuam na planilha; as de um espaço excluído passam para "Outros ambientes". Ctrl/⌘ + Z desfaz.
- **Vista**: a roda do mouse rola a planta; Ctrl + roda (ou pinça) dá zoom no ponto do mouse; segure Espaço e arraste para mover; Shift + 1 enquadra a planta. O botão de tela cheia, no canto da planta, deixa só a planta e o inspetor na janela.
- **Só pelo teclado**: Tab chega aos espaços e à barra (←/→ andam entre as ferramentas). Enter num botão de criar, ou com a ferramenta escolhida, cria o item no meio da vista.
- O botão direito abre um menu com as ações, e a tecla ? mostra todos os atalhos.

## Banco de dados (Supabase)

O banco guarda a planta, os recados e a configuração do telão. **As aulas não ficam no banco**: vêm da planilha.

O banco já está criado e ligado:

- Projeto **complexo-educacional-senai**, organização SENAI FRAIBURGO, plano gratuito, região São Paulo.
- O site usa a URL e a chave publicável que estão em `js/config.js`. A chave publicável pode ficar no código: as regras do banco (RLS) só deixam ler a planta e só deixam gravar pela função `salvar_planta`, para os e-mails da tabela `editores`.
- **Nunca** coloque a chave secreta (`sb_secret_…`) no site.
- O cadastro público de usuários está desligado.

**Cadastrar um editor**:

1. No Supabase, abra **Authentication › Users › Add user › Create new user**. Informe o e-mail e uma senha e marque **Auto Confirm User**.
2. Se o e-mail ainda não estiver na lista, rode no **SQL Editor**: `insert into public.editores (email) values ('nome@exemplo.com');`. O e-mail `joaovitorborgesmatias@gmail.com` já está na lista.

**Recriar o banco do zero** (outro projeto): rode `supabase/configurar.sql` no SQL Editor (pode rodar de novo sem problema). Depois troque a URL e a chave em `js/config.js`.

## Arquivos

- `index.html`: estrutura da página.
- `estilo.css` e `estilo2.css`: visual, no padrão SENAI 2026.
- `js/config.js`: URL e chave publicável do Supabase.
- `js/base.js`: datas, migração dos dados e desenho da planta.
- `js/planilha.js`: leitura da planilha oficial (abas, colunas, nomes dos ambientes).
- `js/paineis.js`: detalhes, aulas do dia, calendário, recados e telão.
- `js/editor.js` e `js/desenho.js`: editor (inspetor, espaços, recados, telão) e o quadro de desenho da planta.
- `js/banco.js`: leitura, login, salvamento com versões, junção de alterações, rascunho e histórico.
- `js/eventos.js`: navegação, teclado, leitura periódica e inicialização.
- `testes/planilha.mjs`: conferência da leitura da planilha (`node testes/planilha.mjs`).
- `dados.js`: cópia local da planta. O site usa esse arquivo enquanto o banco carrega ou se ficar sem conexão.
- `supabase/configurar.sql`: script único de configuração do banco, com a estrutura e a versão inicial da planta.
- `supabase/schema.sql`: só a estrutura do banco.
- `assets/`:
  - logos;
  - fontes (TeX Gyre Adventor, alternativa livre à Century Gothic);
  - fotos endireitadas do croqui.
- `fotos/`: fotos originais do croqui.
