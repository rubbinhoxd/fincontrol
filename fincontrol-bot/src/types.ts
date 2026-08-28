// Modelos que espelham os DTOs da fincontrol-api.

export type TransactionType = 'EXPENSE' | 'INCOME';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
}

export interface Card {
  id: string;
  name: string;
  shared: boolean;
}

export interface TransactionRequest {
  categoryId: string;
  cardId: string | null;
  type: TransactionType;
  description: string;
  amount: number;
  transactionDate: string; // YYYY-MM-DD
  planned: boolean;
  fixed: boolean;
  recurring: boolean;
  subscription: boolean;
  essential: boolean;
  impulse: boolean;
  sharedWithPartner: boolean;
  notes?: string | null;
  installment: boolean;
  currentInstallment: number | null;
  totalInstallments: number | null;
}

// Retorno das listagens/leitura da API. Contem os campos "resolvidos" (nomes ao inves de so ids).
export interface TransactionResponse extends TransactionRequest {
  id: string;
  categoryName: string;
  cardName: string | null;
  installmentGroupId: string | null;
  recurringGroupId: string | null;
  createdAt?: string;
}

// Formato que o LLM devolve pra intent create.
export type LlmParsedTransaction = TransactionRequest;

// Mudancas parciais que o LLM devolve pra intent edit.
export type LlmEditChanges = Partial<
  Pick<
    TransactionRequest,
    | 'categoryId'
    | 'cardId'
    | 'type'
    | 'description'
    | 'amount'
    | 'transactionDate'
    | 'planned'
    | 'fixed'
    | 'recurring'
    | 'subscription'
    | 'essential'
    | 'impulse'
    | 'sharedWithPartner'
    | 'notes'
  >
>;

export type LlmResponse =
  | { intent: 'create_transactions'; transactions: LlmParsedTransaction[] }
  | {
      intent: 'edit';
      edit: {
        targetTransactionId: string;
        changes: LlmEditChanges;
      };
    }
  | {
      intent: 'delete';
      delete: {
        targetTransactionId: string;
        mode?: 'single' | 'future';
      };
    }
  | { intent: 'other'; reason?: string };

// Resposta do LLM quando esta parseando uma imagem de fatura.
export interface FaturaLlmResponse {
  intent: 'import_fatura';
  transactions: LlmParsedTransaction[];
  cardHint?: string | null;
  notes?: string | null;
}

// Estado pendente de importacao de fatura por JID (in-memory, com TTL).
export interface PendingImport {
  transactions: LlmParsedTransaction[];
  preview: string;
  createdAt: number;
  cardHint?: string | null;
}
