# Board (Trello) - Shelper

| Coluna | Limite de WIP | Política para entrar |
|---|---|---|
| Backlog | - | História escrita no formato Como/Quero/Para e priorizada pelo PO. Registrar a data de criação. |
| A Fazer (Sprint) | o que foi escolhido no Planning | Passou na DoR e foi selecionada no Planning. |
| Em andamento | 3 | Tem responsável e branch criada. Registrar a data de início. |
| Em revisão | 2 | Pull request aberto, testes passando e outro integrante revisando. Registrar a data de revisão. |
| Concluído | - | Passou na DoD e o PO aceitou. Registrar a data de conclusão. |

Nome das listas no Trello (o limite vai escrito no nome): `Backlog`, `A Fazer (Sprint)`, `Em andamento (WIP 3)`, `Em revisão (WIP 2)`, `Concluído`.

## Datas dos cartões
A cada movimentação, atualizar a linha do cartão em `docs/dados/cartoes.tsv` (ou na planilha equivalente): data_inicio, data_revisao, data_conclusao.
Esse arquivo é o dado de entrada do sistema.
