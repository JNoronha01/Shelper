import Link from "next/link";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from "@/components/botoes";
import { TelaDeErro } from "@/components/tela-de-erro";

// 404 dentro do painel (o cabeçalho com a sua conta continua em cima).
export default function NaoEncontradaNoPainel() {
  return (
    <TelaDeErro
      codigo="Erro 404"
      titulo="Este projeto não está no seu board"
      texto="O endereço pode estar errado, o projeto pode ter sido apagado, ou você ainda não faz parte do time. Peça um convite ao PO."
    >
      <Link href="/painel" className={BOTAO_PRINCIPAL}>
        Voltar para Meus projetos
      </Link>
      <Link href="/contato" className={BOTAO_SECUNDARIO}>
        Falar com o time do Shelper
      </Link>
    </TelaDeErro>
  );
}
