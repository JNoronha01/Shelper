# DoR e DoD - Shelper

## Definition of Ready (entra na Sprint)

1. Está escrita no formato "Como…, quero…, para…".
2. Tem critérios de aceite verificáveis (sim ou não).
3. Passou no INVEST, as 6 letras conferidas.
4. Está fatiada na vertical e entrega algo que o usuário consegue usar.
5. Foi pontuada pelo time e cabe em uma Sprint (abaixo do teto de pontos combinado).
6. Não depende de história ainda não concluída.
7. Se envolve cálculo, tem arquivo de exemplo com o resultado esperado conferido à mão.
8. O PO definiu a prioridade e os três integrantes conseguem explicar a história, sem dúvidas abertas.

## Definition of Done (está pronta)

1. Todos os critérios de aceite foram demonstrados.
2. O build passa e o código roda sem erros no CI.
3. Os testes automatizados passam e os cálculos foram conferidos à mão com um exemplo.
4. O código entrou por pull request e foi revisado por outro integrante.
5. Se a história lê dados, entradas inválidas (data vazia, formato errado, fim antes do início) geram mensagem clara, sem quebrar o sistema.
6. A tela segue o padrão visual do time (cores, fontes, componentes); gráficos têm título, eixos e unidade; o PO aprovou.
7. O deploy automático rodou e a funcionalidade está no ar.
8. Nenhuma senha ou chave está no repositório (segredos ficam em variáveis de ambiente).
9. O código escrito pela IA foi revisado, quem o aceitou consegue explicá-lo e o registro de IA está preenchido.
10. As datas do cartão no board estão atualizadas e o PO aceitou na Review.
