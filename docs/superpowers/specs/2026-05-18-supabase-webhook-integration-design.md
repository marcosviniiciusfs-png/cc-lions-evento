# Supabase Webhook Integration — Design

**Data:** 2026-05-18
**Escopo:** Conectar o formulário do simulador (`Simulator.tsx`) a um webhook externo Supabase Edge Function.
**Status:** Aguardando aprovação para implementação.

## Contexto

Hoje o `Simulator.tsx` tem `webhookUrl = ""` (vazio, com guard `if (webhookUrl)`). Nenhum lead vai pra lugar nenhum. O cliente forneceu um endpoint Supabase pronto e quer ligar o submit nele.

Decisões já tomadas durante o brainstorming:

- Cloudflare Worker e Meta CAPI ficam para uma fase posterior.
- O campo `tipo` no payload reflete a escolha do usuário no form (não é fixo).
- Token de autorização vai hardcoded no código (site estático no GitHub Pages — qualquer `VITE_*` é embedado no bundle público de qualquer forma, então hardcoded e env var têm a mesma segurança real).

## Endpoint

- Método: `POST`
- URL: `https://uxttihjsxfowursjyult.supabase.co/functions/v1/form-webhook/084e66911cd5927aad2a4bb74ebfd59e9730c37d3a269fa4a07e7bb3ab728a27`
- Headers:
  - `Authorization: Bearer whi_odJaxq5NdTefWkl2LxEILlItDIwbwquv`
  - `Content-Type: application/json`

## Payload

Mapeia os 9 campos do formulário + a data de entrada para snake_case em português:

```json
{
  "nome":             "<fullName>",
  "telefone":         "<whatsapp>",
  "cidade":           "<city>",
  "tipo":             "<propertyType>",
  "valor_pretendido": "<creditAmount>",
  "valor_entrada":    "<downPaymentAmount ou 'Não tem'>",
  "parcela_ideal":    "<monthlyPayment>",
  "tempo_aquisicao":  "<acquisitionTime>",
  "data_entrada":     "<YYYY-MM-DD>"
}
```

Quando `hasDownPayment === "Não"`, `valor_entrada` envia a string literal `"Não tem"`. Isso preserva a semântica atual do código que já existia com o webhook do Make.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/lead-webhook.ts` (novo) | Exporta `sendLead(data)`. Constantes do endpoint, headers, body builder, timeout, error mapping. |
| `src/components/Simulator.tsx` (alteração) | Importa e chama `sendLead(formData)` dentro de `handleFinish`. |

## Função `sendLead`

Assinatura:

```ts
export type LeadInput = {
  fullName: string;
  whatsapp: string;
  city: string;
  propertyType: string;
  creditAmount: string;
  downPaymentAmount: string;
  hasDownPayment: string;
  monthlyPayment: string;
  acquisitionTime: string;
};

export async function sendLead(input: LeadInput): Promise<void>;
```

Comportamento:

- Constrói o payload conforme a seção anterior.
- `fetch` com `AbortController` setado em **10 segundos**.
- Se a resposta não for `2xx`, lança erro com mensagem genérica.
- Se o fetch der erro (network, abort, etc), propaga o erro pro chamador.
- Sucesso: resolve sem retornar nada (`void`).

## Integração no `Simulator.tsx`

O `handleFinish` atual é substituído por:

```ts
const handleFinish = async () => {
  if (isSubmitting) return;
  setIsSubmitting(true);

  try {
    await sendLead(formData);
    setFormData({ /* reset */ });
    setCurrentStep(0);
    navigate("/obrigado");
  } catch (error) {
    console.error("Erro ao enviar:", error);
    setIsSubmitting(false);
    toast({
      title: "Erro ao enviar simulação",
      description: "Por favor, tente novamente.",
      variant: "destructive",
    });
  }
};
```

A validação atual via `canProceed()` continua intocada — ela é executada por etapa, e o botão "Finalizar Simulação" já fica disabled enquanto algum campo obrigatório está vazio.

## Tratamento de erros

- Erros de rede / timeout / status não-2xx → `toast` destrutivo "Erro ao enviar simulação. Por favor, tente novamente." (mantém o texto atual)
- Form **não é limpo** em caso de erro — usuário pode tentar de novo sem perder os dados
- `isSubmitting` volta a `false` em erro pra reabilitar o botão

## Out of scope

- Cloudflare Worker
- Meta Pixel client-side
- Meta Conversions API (CAPI)
- Retentativas automáticas em erro de rede
- Dual webhook (envio paralelo pra Make ou outros destinos)

Esses itens podem ser adicionados depois em specs separados sem mexer no `sendLead`.

## Critérios de aceite

1. Ao clicar "Finalizar Simulação" com todos os campos válidos, um POST chega no endpoint Supabase com o payload no formato definido acima.
2. Em caso de sucesso (2xx da Supabase), usuário é redirecionado pra `/obrigado` e o form é resetado.
3. Em caso de erro (não-2xx, timeout ou falha de rede), aparece o toast de erro e o usuário pode tentar de novo sem perder os dados preenchidos.
4. Nenhum outro destino recebe os dados do lead (sem Cloudflare, sem Pixel, sem CAPI).
