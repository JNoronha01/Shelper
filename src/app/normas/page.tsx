import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Rodape } from "@/components/rodape";
import { TopoPublico } from "@/components/topo-publico";

export const metadata: Metadata = { title: "Normas que seguimos · Shelper" };

// Normas e guias em que o Shelper se baseia. Texto honesto: "nos baseamos", nunca "certificado".
// Cada item diz o que, no site, atende àquela norma, para dar para conferir.

type Norma = { id: string; sigla: string; nome: string; resumo: string; itens: ReactNode[] };

const NORMAS: Norma[] = [
  {
    id: "lgpd",
    sigla: "LGPD",
    nome: "Lei Geral de Proteção de Dados (Lei 13.709/2018)",
    resumo: "Quais dados pessoais guardamos, para quê, e o que você pode pedir.",
    itens: [
      <>
        <strong>O que guardamos:</strong> nome, e-mail, foto (se você enviar), e o que o time cria nos projetos (cartões, Sprints e os
        movimentos do board). A senha fica com hash no Supabase Auth; ninguém do time consegue lê-la.
      </>,
      <>
        <strong>Para quê:</strong> só para o Shelper funcionar: entrar na conta, mostrar o board ao seu time e calcular as métricas. Não
        vendemos nem passamos dados a ninguém, e não há anúncios nem rastreamento.
      </>,
      <>
        <strong>Onde ficam:</strong> no banco de dados do Supabase e no servidor da Vercel, os serviços que hospedam o site. A conexão é
        sempre por HTTPS.
      </>,
      <>
        <strong>Cookies:</strong> só o cookie de sessão, que mantém você logado. Ele não serve para mais nada.
      </>,
      <>
        <strong>Seus direitos:</strong> ver e corrigir nome, e-mail, foto e senha em Meu perfil; pedir a exclusão da conta e dos dados pelo{" "}
        <Link href="/contato" className="underline underline-offset-4">
          formulário de contato
        </Link>
        .
      </>,
      <>
        <strong>Mínimo necessário:</strong> o bloqueio de login guarda o e-mail embaralhado (hash), e o formulário de contato pede só nome e
        e-mail, para podermos responder.
      </>,
    ],
  },
  {
    id: "iso-25010",
    sigla: "ISO/IEC 25010",
    nome: "Qualidade de produto de software",
    resumo: "O modelo de qualidade que usamos para decidir o que testar e o que medir.",
    itens: [
      <>
        <strong>Adequação funcional:</strong> cada métrica (Lead Time, Cycle Time, Throughput, WIP, Velocity, Burndown) tem testes
        automatizados com casos conhecidos. São mais de 100 testes, rodados antes de cada entrega.
      </>,
      <>
        <strong>Confiabilidade:</strong> o histórico de movimentos não pode ser editado nem apagado (o banco recusa), então as métricas não
        mudam depois de calculadas.
      </>,
      <>
        <strong>Usabilidade:</strong> mensagens de erro dizem o que fazer, o board avisa antes de passar do limite de WIP e o celular tem
        botões Avançar e Voltar no lugar de arrastar.
      </>,
      <>
        <strong>Manutenibilidade:</strong> código em TypeScript com verificação de tipos e lint, regras de negócio separadas da tela e cada
        mudança revisada em pull request.
      </>,
      <>
        <strong>Segurança:</strong> veja ISO/IEC 27001 e OWASP abaixo.
      </>,
    ],
  },
  {
    id: "seguranca",
    sigla: "ISO/IEC 27001 + OWASP",
    nome: "Boas práticas de segurança da informação",
    resumo: "Não temos certificação ISO 27001; seguimos os controles que cabem num site como o Shelper e o guia OWASP.",
    itens: [
      <>
        <strong>Controle de acesso:</strong> cada projeto só é visto pelo próprio time. O banco confere isso em toda consulta (Row Level
        Security), não só a tela. Cada papel (PO, SM, Dev) tem permissões diferentes.
      </>,
      <>
        <strong>Senhas:</strong> pelo menos 8 caracteres com maiúscula, número e caractere especial; guardadas com hash (bcrypt).
      </>,
      <>
        <strong>Tentativas de login:</strong> 5 erros seguidos bloqueiam o e-mail por 15 minutos. Esqueci minha senha responde igual exista
        ou não a conta, para não revelar quem tem cadastro.
      </>,
      <>
        <strong>Sessões:</strong> dá para sair de todos os aparelhos em Meu perfil; trocar a senha pelo link do e-mail desconecta os outros
        aparelhos.
      </>,
      <>
        <strong>Entradas:</strong> tudo o que chega ao servidor é conferido de novo lá (nunca só no navegador), e o banco repete os limites.
      </>,
      <>
        <strong>Navegador:</strong> cabeçalhos de segurança impedem o site de ser aberto dentro de outro site (clickjacking) e deixam
        câmera, microfone e localização desligados.
      </>,
    ],
  },
  {
    id: "wcag",
    sigla: "WCAG 2.2",
    nome: "Diretrizes de acessibilidade para conteúdo web",
    resumo: "Buscamos o nível AA nas telas principais.",
    itens: [
      <>
        <strong>Teclado:</strong> tudo funciona sem mouse, com o foco sempre visível; as abas do projeto também trocam com as teclas 1 a 8.
      </>,
      <>
        <strong>Leitor de tela:</strong> campos com rótulo, erros ligados ao campo, avisos anunciados e gráficos com tabela equivalente.
      </>,
      <>
        <strong>Cor não é a única pista:</strong> atrasos e bloqueios têm texto além da cor; as cores dos gráficos foram escolhidas para
        quem tem daltonismo.
      </>,
      <>
        <strong>Menos movimento:</strong> quem ativa reduzir movimento no sistema não vê as animações.
      </>,
    ],
  },
  {
    id: "ageis",
    sigla: "Scrum Guide e Kanban Guide",
    nome: "Guias oficiais de Scrum (2020) e Kanban (2020)",
    resumo: "As regras do board vêm dos dois guias.",
    itens: [
      <>
        <strong>Scrum:</strong> os três papéis (Product Owner, Scrum Master e Desenvolvedores), Sprints com meta e datas, e o Backlog que o
        PO prioriza.
      </>,
      <>
        <strong>Kanban:</strong> fluxo visível em colunas, limite de WIP por coluna e as métricas de fluxo (Lead Time, Cycle Time,
        Throughput e WIP).
      </>,
      <>
        <strong>Estimativa:</strong> pontos na escala de Fibonacci e votação do time (Planning Poker) dentro do cartão.
      </>,
    ],
  },
];

export default function PaginaNormas() {
  return (
    <div className="flex flex-1 flex-col">
      <TopoPublico />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-12 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="Normas" className="lg:sticky lg:top-6 lg:self-start">
          <ul className="flex flex-wrap gap-2 text-sm lg:flex-col lg:gap-1">
            {NORMAS.map((n) => (
              <li key={n.id}>
                <a
                  href={`#${n.id}`}
                  className="block rounded-lg px-3 py-1.5 text-suave transition-colors hover:bg-elevado hover:text-texto"
                >
                  {n.sigla}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex max-w-3xl flex-col gap-12">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Normas que seguimos</h1>
            <p className="text-pretty text-suave">
              O Shelper se baseia nestas leis, normas e guias. Ele não tem certificação: para cada norma, listamos o que no site atende a
              ela, para você poder conferir.
            </p>
          </div>
          {NORMAS.map((n) => (
            <section key={n.id} id={n.id} aria-labelledby={`titulo-${n.id}`} className="flex scroll-mt-6 flex-col gap-4">
              <div>
                <h2 id={`titulo-${n.id}`} className="text-xl font-semibold">
                  {n.sigla}
                </h2>
                <p className="text-sm text-suave">{n.nome}</p>
              </div>
              <p className="text-pretty">{n.resumo}</p>
              <ul className="flex flex-col gap-3 border-l border-linha-forte pl-5 text-sm text-pretty text-suave [&_strong]:font-medium [&_strong]:text-texto">
                {n.itens.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <Rodape />
    </div>
  );
}
