import Link from "next/link";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from "@/components/botoes";
import { Rodape } from "@/components/rodape";
import { TelaDeErro } from "@/components/tela-de-erro";
import { TopoPublico } from "@/components/topo-publico";

// 404: endereço que não existe, ou projeto que não é do seu time.
export default function NaoEncontrada() {
  return (
    <div className="flex flex-1 flex-col">
      <TopoPublico />
      <TelaDeErro
        codigo="Erro 404"
        titulo="Esta página não está em nenhuma coluna"
        texto="O endereço pode ter mudado ou estar digitado errado. Se era um projeto, talvez você não faça parte do time dele."
      >
        <Link href="/painel" className={BOTAO_PRINCIPAL}>
          Ir para Meus projetos
        </Link>
        <Link href="/" className={BOTAO_SECUNDARIO}>
          Página inicial
        </Link>
      </TelaDeErro>
      <Rodape />
    </div>
  );
}
