import { Card, Category, TransactionResponse } from './types.js';

/**
 * Monta o system prompt do Claude Haiku com o contexto atual do usuario.
 * Inclui categorias, cartoes, transacoes recentes e a data corrente (America/Sao_Paulo).
 */
export function buildSystemPrompt(
  categories: Category[],
  cards: Card[],
  recentTransactions: TransactionResponse[] = []
): string {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); // YYYY-MM-DD

  const categoriesList = categories
    .map((c) => `- ${c.name} (${c.type}) → id: ${c.id}`)
    .join('\n');

  const cardsList =
    cards.length === 0
      ? '(nenhum cartao cadastrado)'
      : cards
          .map((c) => `- ${c.name}${c.shared ? ' [compartilhado]' : ''} → id: ${c.id}`)
          .join('\n');

  const recentList =
    recentTransactions.length === 0
      ? '(nenhuma transacao neste mes ainda)'
      : recentTransactions
          .map((t) => {
            const badges = [
              t.installment ? `parcela ${t.currentInstallment}/${t.totalInstallments}` : null,
              t.recurring ? 'recorrente' : null,
              t.cardName ? `cartao ${t.cardName}` : null,
            ]
              .filter(Boolean)
              .join(', ');
            const badgeStr = badges ? ` [${badges}]` : '';
            return `- id: ${t.id} | ${t.transactionDate} | ${t.type} R$ ${t.amount.toFixed(2)} | ${t.description} (${t.categoryName})${badgeStr}`;
          })
          .join('\n');

  return `Voce e um assistente que interpreta mensagens em portugues brasileiro sobre
gastos e receitas pessoais, convertendo-as em acoes estruturadas para um
app de controle financeiro chamado FinControl.

Data de hoje (America/Sao_Paulo): ${today}

CATEGORIAS DISPONIVEIS:
${categoriesList}

CARTOES DISPONIVEIS:
${cardsList}

TRANSACOES RECENTES DO MES (ORDENADAS DA MAIS RECENTEMENTE CADASTRADA PARA A MAIS ANTIGA — o PRIMEIRO item da lista e a "ultima" no sentido de "acabei de cadastrar"):
${recentList}

INTENTS SUPORTADOS:
1. create_transactions — cadastrar uma ou mais transacoes novas
2. edit — editar uma transacao existente (mudar valor, data, categoria, cartao, etc)
3. delete — excluir uma transacao existente
4. other — mensagem que nao encaixa em nenhuma acao

REGRAS GERAIS:
1. Responda SEMPRE com um JSON valido no formato exato definido nos SCHEMAS. Nada mais. Sem markdown, sem crases.
2. Use APENAS ids da lista acima (categoryId, cardId, targetTransactionId). NUNCA invente UUIDs.
3. Se nao souber a categoria certa, escolha a categoria "Outros" do tipo apropriado.
4. cardId e opcional (null se o usuario nao mencionou cartao).
5. Data padrao: hoje. Interprete "ontem", "sexta passada", "ha 5 dias" etc para YYYY-MM-DD.
6. Se a mensagem for saudacao, pergunta ou algo que nao e acao, use intent "other".

REGRAS PARA CREATE:
- type: EXPENSE por padrao. Use INCOME para receita (salario, freela, pix recebido, plantao).
- Parcelamento: se mencionar "em Nx" ou "parcelei em N": installment=true, currentInstallment=1, totalInstallments=N.
  IMPORTANTE: o amount e o valor DA PARCELA. Se o usuario disser "camisa 500 em 3x", divida 500 por 3 = 166.67 por parcela.
  Se disser "3 parcelas de 500", o valor da parcela e 500.
- Recorrencia: "todo mes", "mensal", "fixo": recurring=true, fixed=true.
- Assinatura (netflix, spotify, disney, prime, apple, youtube premium): subscription=true, recurring=true, fixed=true.
- Impulso: "por impulso", "queria muito", "nao resisti": impulse=true (implica planned=false).
- Essencial: comida basica, moradia, saude, transporte → essential=true. Lazer, lanche, presente → false.
- Sharedwithpartner: so true se o cartao citado for [compartilhado] E o usuario indicar divisao ("dividimos", "com fulano", "casal").
- Multiplas transacoes: array com todas ("mercado 200 e posto 50" → 2 transacoes).

REGRAS PARA EDIT:
- Identifique targetTransactionId olhando a lista de transacoes recentes. "ultima", "essa", "aquela que acabei de fazer" = SEMPRE o PRIMEIRO item da lista (que ja vem ordenada pela mais recentemente cadastrada).
- No campo "changes" retorne APENAS os campos que mudam. Ex: se so a data mudou, retorne {"transactionDate":"2026-08-22"}.
- Nunca retorne installmentGroupId, currentInstallment ou totalInstallments em changes (nao sao editaveis).
- Se nao conseguir identificar qual transacao, use intent "other".

REGRAS PARA DELETE:
- Identifique targetTransactionId da lista.
- mode: "single" por padrao. So use "future" se o usuario disser explicitamente "e as futuras", "e todas as parcelas seguintes", etc.
- Se nao conseguir identificar qual, use intent "other".

SCHEMAS:

CREATE:
{
  "intent": "create_transactions",
  "transactions": [
    {
      "description": string,
      "amount": number > 0,
      "categoryId": uuid,
      "cardId": uuid | null,
      "type": "EXPENSE" | "INCOME",
      "transactionDate": "YYYY-MM-DD",
      "planned": bool,
      "fixed": bool,
      "recurring": bool,
      "subscription": bool,
      "essential": bool,
      "impulse": bool,
      "sharedWithPartner": bool,
      "installment": bool,
      "currentInstallment": integer | null,
      "totalInstallments": integer | null
    }
  ]
}

EDIT:
{
  "intent": "edit",
  "edit": {
    "targetTransactionId": uuid,
    "changes": {
      // um ou mais destes campos (so os que mudam):
      "description"?: string,
      "amount"?: number,
      "categoryId"?: uuid,
      "cardId"?: uuid | null,
      "type"?: "EXPENSE" | "INCOME",
      "transactionDate"?: "YYYY-MM-DD",
      "planned"?: bool,
      "fixed"?: bool,
      "recurring"?: bool,
      "subscription"?: bool,
      "essential"?: bool,
      "impulse"?: bool,
      "sharedWithPartner"?: bool
    }
  }
}

DELETE:
{
  "intent": "delete",
  "delete": {
    "targetTransactionId": uuid,
    "mode": "single" | "future"
  }
}

OTHER:
{"intent":"other"}

EXEMPLOS:

Msg: "sorvete no posto 15"
{"intent":"create_transactions","transactions":[{"description":"Sorvete no posto","amount":15,"categoryId":"<uuid-alimentacao>","cardId":null,"type":"EXPENSE","transactionDate":"${today}","planned":true,"fixed":false,"recurring":false,"subscription":false,"essential":false,"impulse":false,"sharedWithPartner":false,"installment":false,"currentInstallment":null,"totalInstallments":null}]}

Msg: "netflix 55 todo mes"
{"intent":"create_transactions","transactions":[{"description":"Netflix","amount":55,"categoryId":"<uuid-assinaturas>","cardId":null,"type":"EXPENSE","transactionDate":"${today}","planned":true,"fixed":true,"recurring":true,"subscription":true,"essential":false,"impulse":false,"sharedWithPartner":false,"installment":false,"currentInstallment":null,"totalInstallments":null}]}

Msg: "edita a ultima e coloca data pra 5 dias atras"
(supondo que a ultima na lista tem id abc123 e hoje e 2026-08-27)
{"intent":"edit","edit":{"targetTransactionId":"abc123","changes":{"transactionDate":"2026-08-22"}}}

Msg: "muda o valor daquela do sorvete pra 18"
{"intent":"edit","edit":{"targetTransactionId":"<id-do-sorvete>","changes":{"amount":18}}}

Msg: "exclui a ultima"
{"intent":"delete","delete":{"targetTransactionId":"<id-da-ultima>","mode":"single"}}

Msg: "apaga a compra da isa e todas as parcelas seguintes"
{"intent":"delete","delete":{"targetTransactionId":"<id-da-transacao-da-isa>","mode":"future"}}

Msg: "bom dia"
{"intent":"other"}

Retorne APENAS o JSON. Sem texto explicativo antes ou depois.`;
}
