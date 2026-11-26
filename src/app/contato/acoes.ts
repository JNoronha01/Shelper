"use server";

import { validarContato } from "@/lib/contato/validacao";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoContato = {
  erros?: Partial<Record<"nome" | "email" | "assunto" | "mensagem", string>>;
  mensagem?: string;
  sucesso?: string;
  valores?: Partial<Record<"nome" | "email" | "assunto" | "mensagem", string>>;
};

export async function enviarContato(_anterior: EstadoContato, form: FormData): Promise<EstadoContato> {
  // Campo escondido que pessoas não veem e robôs preenchem: finge que deu certo e não grava.
  if (String(form.get("site") ?? "")) return { sucesso: "Mensagem enviada. Obrigado!" };
  const valores = Object.fromEntries(["nome", "email", "assunto", "mensagem"].map((c) => [c, String(form.get(c) ?? "")]));
  const v = validarContato(form);
  if (!v.ok) return { erros: v.erros, valores };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("enviar_contato", {
    p_nome: v.dados.nome,
    p_email: v.dados.email,
    p_assunto: v.dados.assunto,
    p_mensagem: v.dados.mensagem,
  });
  if (error) {
    if (error.code === "22023") return { mensagem: error.message, valores };
    console.error("Falha ao salvar contato", { code: error.code });
    return { mensagem: "Não foi possível enviar agora. Tente de novo em instantes.", valores };
  }
  return { sucesso: `Mensagem enviada. Vamos responder no e-mail ${v.dados.email}.` };
}
