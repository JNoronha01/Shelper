import { Campo } from "@/app/(acesso)/campo";
import { CAMPO } from "@/components/botoes";

// Campos do cadastro do projeto, usados ao criar (pop-up) e ao editar (aba Projeto).
// Tudo obrigatório: são os dados que os cálculos e o acompanhamento do contrato usam.
type Valores = Partial<Record<string, string>>;

function Grupo({ titulo, descricao, children }: { titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 border-t border-linha pt-4 first:border-t-0 first:pt-0">
      <legend className="sr-only">{titulo}</legend>
      <div>
        <p className="font-semibold">{titulo}</p>
        <p className="text-sm text-suave">{descricao}</p>
      </div>
      {children}
    </fieldset>
  );
}

export function CamposCadastro({ valores, erros, autoFocus = false }: { valores: Valores; erros?: Valores; autoFocus?: boolean }) {
  const campo = (name: string) => ({ name, defaultValue: valores[name], erro: erros?.[name], required: true });
  return (
    <>
      <Grupo titulo="Projeto" descricao="O que é e para quem.">
        <Campo {...campo("nome")} rotulo="Nome do projeto" placeholder="Ex.: Shelper" maxLength={80} autoFocus={autoFocus} />
        <Campo {...campo("cliente")} rotulo="Cliente" placeholder="Ex.: UMC – Métodos Ágeis" maxLength={80} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="campo-objetivo" className="text-sm font-medium">
            Objetivo do projeto
          </label>
          <textarea
            id="campo-objetivo"
            name="objetivo"
            required
            rows={2}
            maxLength={300}
            defaultValue={valores.objetivo}
            placeholder="Em uma frase, o que o projeto entrega."
            aria-invalid={erros?.objetivo ? true : undefined}
            aria-describedby={erros?.objetivo ? "campo-objetivo-erro" : undefined}
            className={`${CAMPO} resize-y py-2.5 text-base`}
          />
          {erros?.objetivo && (
            <p id="campo-objetivo-erro" className="text-sm text-perigo">
              {erros.objetivo}
            </p>
          )}
        </div>
      </Grupo>

      <Grupo titulo="Contrato" descricao="Horas acertadas com o cliente e o prazo.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo {...campo("horas")} rotulo="Horas contratadas" inputMode="numeric" placeholder="Ex.: 400" />
          <Campo {...campo("inicio")} rotulo="Início" type="date" />
          <Campo {...campo("entrega")} rotulo="Entrega" type="date" />
        </div>
      </Grupo>

      <Grupo titulo="Sprints e metas" descricao="As metas definem a faixa bom, mais ou menos ou ruim das métricas.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo {...campo("duracao")} rotulo="Duração da Sprint (dias)" inputMode="numeric" dica="Sugestão para as datas da próxima Sprint." />
          <Campo {...campo("velocity")} rotulo="Meta de Velocity (pontos por Sprint)" inputMode="numeric" placeholder="Ex.: 13" />
          <Campo {...campo("lead")} rotulo="Meta de Lead Time (dias)" inputMode="decimal" placeholder="Ex.: 3,5" dica="Da criação até a conclusão do cartão." />
          <Campo {...campo("cycle")} rotulo="Meta de Cycle Time (horas)" inputMode="decimal" placeholder="Ex.: 8" dica="De Em andamento até a conclusão." />
        </div>
      </Grupo>
    </>
  );
}
