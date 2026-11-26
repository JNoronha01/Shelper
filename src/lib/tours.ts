import type { PassoTour } from "@/components/tour";

// Textos dos tours de primeiro acesso. Cada "alvo" é um data-tour na tela.

export const TOUR_PAINEL: PassoTour[] = [
  {
    alvo: "novo-projeto",
    titulo: "Bem-vindo ao Shelper",
    texto:
      "Comece por aqui: crie um projeto com o cadastro completo (cliente, prazo, horas e metas). Quem cria o projeto vira o Product Owner.",
  },
  {
    alvo: "projetos",
    titulo: "Seus projetos",
    texto:
      "Os projetos em que você está aparecem aqui, com o seu papel, a Sprint ativa e o andamento do fluxo. Clique em um para abrir o board.",
  },
  {
    alvo: "perfil",
    titulo: "Meu perfil",
    texto: "Mude nome, foto, e-mail e senha, saia de todos os aparelhos e refaça este tour quando quiser.",
  },
  {
    alvo: "guia",
    titulo: "Guia passo a passo",
    texto: "O ciclo completo do projeto, do cadastro à Review, com o que cada papel faz. Abre em outra aba.",
  },
];

export const TOUR_PROJETO: PassoTour[] = [
  {
    alvo: "colunas",
    titulo: "O board",
    texto:
      "Backlog → A fazer → Em andamento → Em revisão → Concluído. Arraste os cartões ou use as setas: cada movimento é gravado e vira métrica.",
  },
  {
    alvo: "novo-cartao",
    titulo: "Novo cartão",
    texto: "Como PO, crie os cartões sempre no Backlog, com a história de usuário na descrição e os critérios de aceite no checklist.",
  },
  {
    alvo: "sprint",
    titulo: "A Sprint",
    texto:
      "Aqui aparece a Sprint ativa e o prazo. A Sprint nasce do Backlog e só existe uma por vez: o PO ou o SM planeja e encerra na aba Sprint.",
  },
  {
    alvo: "abas",
    titulo: "As abas do projeto",
    texto: "Sprint, Métricas, Votação, Histórico, Time e Projeto. Cada papel vê só as que usa. Atalho: as teclas 1 a 8 trocam de aba.",
  },
  {
    alvo: "numeros",
    titulo: "Números do projeto",
    texto: "Cartões, concluídos, pontos feitos e horas usadas do contrato, sempre atualizados.",
  },
  {
    alvo: "guia-projeto",
    titulo: "Dúvida? Guia de uso",
    texto: "O passo a passo completo fica aqui. Para ver este tour de novo, use Refazer o tour em Meu perfil.",
  },
];
