# complexo.educacional.senai

Planta interativa dos ambientes do novo complexo educacional, digitalizada a partir do croqui de 06/11/2026 (fotos em `fotos/`), com o quadro de aulas da semana.

## Links

| Uso | Endereço |
|---|---|
| Visualização (link público, só leitura) | https://jborges42.github.io/complexo.educacional.senai/ |
| Telão / projetor (tela cheia, aulas do horário atual) | https://jborges42.github.io/complexo.educacional.senai/#telao |
| Edição (planta e quadro de aulas) | https://jborges42.github.io/complexo.educacional.senai/#editar |

Quem abre o link público só visualiza. Qualquer pessoa pode abrir `#editar`, mas só consegue **publicar** quem tiver um token do GitHub com permissão de escrita neste repositório.

## Ambientes

- **1º Andar**: salas multiuso, laboratório de informática, sala 3D, administração, TI, arquibancada, refeitório, sanitários e circulação.
- **2º Andar**: sala Maker.
- **Carretas**: Civil, Elétrica, Automação e Mecânica.

## Modo telão

Abra `#telao` no computador ligado ao projetor ou à TV e clique em **Tela cheia** (ou tecle `F`).

- Mostra o dia e o turno atuais pelo relógio do computador: manhã até 12h30, tarde até 18h e noite depois disso. No fim de semana, mostra a segunda-feira de manhã.
- Alterna entre 1º Andar, 2º Andar e Carretas a cada 20 segundos. A barra de espaço pausa a troca e as setas mudam de ambiente.
- Recarrega os dados publicados a cada 2 minutos, sem precisar atualizar a página.
- Os controles somem depois de alguns segundos sem mexer o mouse.

## Como editar

1. Abra o link `#editar`.
2. **Planta**: clique num espaço para editar nome, categoria, tipo e informações.
   - Arraste o espaço para movê-lo e use o quadrado laranja para mudar o tamanho.
   - A ferramenta **Parede** desenha paredes retas; a ferramenta **Porta** coloca uma porta sobre uma parede.
   - Atalhos: `Ctrl+Z` desfaz, `Delete` exclui e as setas movem o item selecionado.
3. **Quadro de aulas**: a tabela abaixo da planta tem os turnos Manhã, Tarde, Noite e "Sem turno" de cada dia da semana.
   - Digite as turmas separadas por vírgula.
   - **Copiar este dia para** replica um dia nos outros.
4. **Publicar**: na primeira vez, cole um token do GitHub. Depois disso, clique em **Publicar alterações**. O link público se atualiza em cerca de 1 minuto.

As alterações não publicadas ficam guardadas no navegador. Se a página fechar, use **Retomar** para recuperá-las.

### Criar o token (uma vez por computador)

1. GitHub → Settings → Developer settings → [Fine-grained tokens](https://github.com/settings/personal-access-tokens/new).
2. Em *Repository access*, escolha **Only select repositories** e marque `complexo.educacional.senai`.
3. Em *Permissions → Repository permissions*, defina **Contents: Read and write**.
4. Gere o token e cole-o no campo **Token do GitHub** do editor. Ele fica salvo só naquele navegador.

Sem token, use **Baixar dados.js** e envie o arquivo pelo GitHub (*Add file › Upload files*).

## Arquivos

- `index.html`: o site inteiro, com visualização, telão e editor.
- `dados.js`: a planta e o quadro de aulas. É o arquivo que o editor atualiza.
- `assets/`: logos, fontes (TeX Gyre Adventor, alternativa livre à Century Gothic) e fotos endireitadas do croqui.
- `fotos/`: fotos originais do croqui.

Para abrir localmente, basta abrir o `index.html` no navegador. Antes de alterar arquivos no computador, rode `git pull`, porque o editor publica direto no GitHub.
