# Product Backlog - Shelper

Ordem por valor. Pontos: estimativa inicial (Fibonacci), a confirmar no Planning Poker. Sprint 1 = histórias 1 a 3.

## H1 - Importar arquivo TSV/CSV

Como Scrum Master, quero enviar o arquivo TSV ou CSV com as datas dos cartões do meu board, para ver a lista de cartões que o sistema leu.

**Critérios de aceite**
- Aceita separador tabulação, vírgula ou ponto e vírgula.
- Mostra uma tabela com id, título, sprint, pontos e as quatro datas (criação, início, revisão e conclusão).
- Arquivo vazio ou sem as colunas obrigatórias mostra uma mensagem dizendo o que falta.

**Pontos:** 5 | **Sprint alvo:** 1

## H2 - Ver Lead Time e Cycle Time

Como Scrum Master, quero ver o Lead Time e o Cycle Time de cada cartão e as médias, para saber quanto tempo o trabalho leva.

**Critérios de aceite**
- Lead Time = conclusão − criação e Cycle Time = conclusão − início, em dias corridos.
- Cartão sem data de conclusão não entra nas médias.
- Com o arquivo de exemplo (Apêndice B) as médias são 5,33 e 4,33 dias, iguais à conta feita à mão.

**Pontos:** 3 | **Sprint alvo:** 1

## H3 - Ver erros claros de datas inválidas

Como Scrum Master, quero ver mensagens claras quando o arquivo tem datas inválidas, para corrigir o arquivo sem adivinhar o erro.

**Critérios de aceite**
- Data vazia (onde é obrigatória), formato errado e conclusão antes do início geram erro com o número da linha e o nome da coluna.
- O sistema não quebra: mostra os erros e permite um novo envio.

**Pontos:** 3 | **Sprint alvo:** 1

## H4 - Ver Throughput por Sprint

Como Scrum Master, quero ver o Throughput de cada Sprint, para saber quantos cartões o time entrega.

**Critérios de aceite**
- Conta os cartões com data de conclusão dentro das datas da Sprint.
- Mostra o valor de cada Sprint lado a lado.
- No arquivo de exemplo, o resultado é 3 cartões na Sprint 1.

**Pontos:** 3 | **Sprint alvo:** 2

## H5 - Ver WIP por dia contra os limites

Como Scrum Master, quero ver o WIP por dia contra os limites, para saber se o time está começando coisas demais.

**Critérios de aceite**
- Conta, para cada dia, os cartões em Em andamento e em Em revisão.
- Compara cada coluna com o limite configurável e destaca os dias acima dele.
- No arquivo de exemplo, o WIP total de 10 a 17/11 é 1, 2, 3, 3, 3, 3, 2, 1.

**Pontos:** 5 | **Sprint alvo:** 2

## H6 - Ver o gargalo do fluxo

Como Scrum Master, quero ver em que coluna os cartões ficam mais tempo, para saber onde está o gargalo.

**Critérios de aceite**
- Calcula o tempo médio dos cartões concluídos em cada coluna (A Fazer, Em andamento, Em revisão).
- Destaca a coluna de maior tempo médio.
- No arquivo de exemplo, aponta Em revisão (2,67 dias).

**Pontos:** 3 | **Sprint alvo:** 2

## H7 - Ver painel da Sprint e Velocity

Como Scrum Master, quero ver o painel da Sprint com a Meta, os pontos comprometidos e entregues e a Velocity, para saber se cumprimos o que planejamos.

**Critérios de aceite**
- Velocity = soma dos pontos dos cartões concluídos dentro da Sprint.
- Mostra as histórias prontas e as que voltaram ao backlog.
- Mostra a Velocity das Sprints anteriores lado a lado.

**Pontos:** 5 | **Sprint alvo:** 2

## H8 - Página inicial explicativa

Como visitante, quero ver uma página inicial que explique o sistema, para entender o que ele faz antes de enviar meu arquivo.

**Critérios de aceite**
- Explica em poucas linhas o que o sistema faz e como o arquivo deve ser.
- Oferece um arquivo de exemplo para baixar.
- Leva à tela de envio com um clique.

**Pontos:** 2 | **Sprint alvo:** 2

## H9 - Ver Burndown da Sprint

Como Scrum Master, quero ver o Burndown da Sprint, para saber se estamos no ritmo.

**Critérios de aceite**
- Mostra os pontos restantes por dia contra a linha ideal, do primeiro ao último dia da Sprint.
- Usa os pontos comprometidos no Planning.
- No arquivo de exemplo, os pontos restantes de 10 a 17/11 são 13, 13, 13, 8, 8, 8, 5, 2.

**Pontos:** 5 | **Sprint alvo:** 3

## H10 - Ver CFD do projeto

Como Scrum Master, quero ver o CFD do projeto, para ver como o fluxo se acumula ao longo do tempo.

**Critérios de aceite**
- Gráfico de áreas empilhadas com os cartões acumulados em cada coluna a cada dia.
- Legenda e eixos com título e unidade.
- Em dois dias do exemplo, a contagem confere com a feita à mão.

**Pontos:** 5 | **Sprint alvo:** 3

## H11 - Definir metas e comparar com a média

Como Scrum Master, quero definir metas (por exemplo, Lead Time médio de até 5 dias) e ver a média real contra a meta, para saber se o time está dentro do esperado.

**Critérios de aceite**
- Meta editável para cada indicador.
- O dashboard mostra a média e a meta lado a lado.
- Indicador fora da meta é destacado com texto e cor, não só com cor.

**Pontos:** 3 | **Sprint alvo:** 3

## H12 - Salvar e reabrir análises

Como Scrum Master, quero salvar uma análise e abri-la depois, para acompanhar a evolução entre as Sprints.

**Critérios de aceite**
- Salva com nome e data e lista as análises salvas.
- Ao reabrir, mostra o mesmo dashboard.
- Guarda só os dados do arquivo, sem dados pessoais.

**Pontos:** 5 | **Sprint alvo:** 3

## H13 - (Hipótese) Importar direto do Trello

Hipótese. Como Scrum Master, quero importar os cartões direto do Trello, para não montar o arquivo à mão.

**Critérios de aceite**
- A confirmar com o professor. Só entra se for aprovada e se a Velocity permitir.
- Ideia: ler as movimentações dos cartões pela API do Trello.
- A chave e o token nunca ficam no repositório nem são guardados pelo sistema.

**Pontos:** a estimar | **Sprint alvo:** 3 (hipótese)

## H14 - (Hipótese) Gerar rascunho de backlog com Gemini

Hipótese. Como Product Owner, quero gerar um rascunho de histórias a partir de uma descrição, para ganhar tempo ao montar o backlog.

**Critérios de aceite**
- Depende da cota gratuita da API do Gemini e da Velocity.
- Chave só em variável de ambiente; se a cota ou a rede falhar, mostra mensagem clara.
- O PO revisa o rascunho; só dados fictícios são enviados.

**Pontos:** épica | **Sprint alvo:** 3 (hipótese)
