import pino from 'pino';
import { config } from './config.js';
import { FincontrolClient } from './fincontrol.js';
import { startWhatsApp, ReplyFn } from './whatsapp.js';
import { interpret } from './llm.js';
import { buildSystemPrompt } from './prompt.js';
import {
  LlmResponse,
  TransactionRequest,
  TransactionResponse,
  LlmEditChanges,
} from './types.js';

const logger = pino({ level: config.logLevel }).child({ mod: 'index' });

async function main() {
  logger.info('Iniciando fincontrol-bot...');

  const fincontrol = new FincontrolClient();
  await fincontrol.login();
  logger.info('Bot pronto para receber mensagens.');

  await startWhatsApp(async (msg, reply) => {
    logger.info({ text: msg.text }, 'Mensagem recebida');

    const [categories, cards, recent] = await Promise.all([
      fincontrol.listCategories(),
      fincontrol.listCards(),
      fincontrol.listRecentTransactions(15).catch(() => [] as TransactionResponse[]),
    ]);

    if (categories.length === 0) {
      await reply(msg.jid, 'Voce nao tem categorias cadastradas. Cadastre no app primeiro.');
      return;
    }

    let parsed: LlmResponse;
    try {
      const systemPrompt = buildSystemPrompt(categories, cards, recent);
      parsed = await interpret(systemPrompt, msg.text);
    } catch (err) {
      logger.error({ err }, 'Falha ao chamar LLM');
      await reply(msg.jid, 'Nao consegui entender agora. Tenta algo mais simples, tipo "sorvete 15 no posto".');
      return;
    }

    switch (parsed.intent) {
      case 'create_transactions':
        await handleCreate(fincontrol, parsed.transactions, reply, msg.jid);
        break;
      case 'edit':
        await handleEdit(fincontrol, parsed.edit, reply, msg.jid);
        break;
      case 'delete':
        await handleDelete(fincontrol, parsed.delete, reply, msg.jid);
        break;
      case 'other':
      default:
        await reply(msg.jid, 'Nao identifiquei uma acao. Tenta algo como "sorvete 15", "edita a ultima pra ontem" ou "exclui a ultima".');
    }
  });
}

async function handleCreate(
  client: FincontrolClient,
  txs: TransactionRequest[] | undefined,
  reply: ReplyFn,
  jid: string
) {
  if (!txs || txs.length === 0) {
    await reply(jid, 'Sem transacoes pra criar.');
    return;
  }
  const results: CreationResult[] = [];
  for (const tx of txs) {
    try {
      const created = await client.createTransaction(tx);
      results.push({ ok: true, payload: tx, created });
      logger.info({ id: created.id, description: tx.description }, 'Transacao criada');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'erro desconhecido';
      logger.error({ err: msg, payload: tx }, 'Falha ao criar transacao');
      results.push({ ok: false, payload: tx, error: String(msg) });
    }
  }
  await reply(jid, buildCreateSummary(results));
}

async function handleEdit(
  client: FincontrolClient,
  edit: { targetTransactionId: string; changes: LlmEditChanges } | undefined,
  reply: ReplyFn,
  jid: string
) {
  if (!edit || !edit.targetTransactionId) {
    await reply(jid, 'Nao identifiquei qual transacao editar. Tenta ser mais especifico.');
    return;
  }
  try {
    const current = await client.getTransaction(edit.targetTransactionId);
    const merged = mergeChanges(current, edit.changes);
    const updated = await client.updateTransaction(edit.targetTransactionId, merged);
    logger.info({ id: edit.targetTransactionId, changes: edit.changes }, 'Transacao editada');
    await reply(jid, buildEditSummary(current, updated, edit.changes));
  } catch (err: any) {
    const msg = err?.response?.data?.message ?? err?.message ?? 'erro desconhecido';
    logger.error({ err: msg, edit }, 'Falha ao editar');
    await reply(jid, `Nao consegui editar: ${msg}`);
  }
}

async function handleDelete(
  client: FincontrolClient,
  del: { targetTransactionId: string; mode?: 'single' | 'future' } | undefined,
  reply: ReplyFn,
  jid: string
) {
  if (!del || !del.targetTransactionId) {
    await reply(jid, 'Nao identifiquei qual transacao excluir. Tenta ser mais especifico.');
    return;
  }
  try {
    const current = await client.getTransaction(del.targetTransactionId);
    const mode = del.mode ?? 'single';
    await client.deleteTransaction(del.targetTransactionId, mode);
    logger.info({ id: del.targetTransactionId, mode }, 'Transacao excluida');
    const modeLabel = mode === 'future' ? ' (mais todas as parcelas futuras)' : '';
    await reply(
      jid,
      `✗ Excluida: ${current.description} — ${formatBrl(current.amount)} em ${formatDate(current.transactionDate)}${modeLabel}`
    );
  } catch (err: any) {
    const msg = err?.response?.data?.message ?? err?.message ?? 'erro desconhecido';
    logger.error({ err: msg, del }, 'Falha ao excluir');
    await reply(jid, `Nao consegui excluir: ${msg}`);
  }
}

/**
 * Mescla as mudancas parciais do LLM sobre o estado atual da transacao.
 * A API PUT exige o payload completo, entao a gente joga o estado atual e sobrescreve.
 */
function mergeChanges(current: TransactionResponse, changes: LlmEditChanges): TransactionRequest {
  return {
    categoryId: changes.categoryId ?? current.categoryId,
    cardId: changes.cardId ?? current.cardId,
    type: changes.type ?? current.type,
    description: changes.description ?? current.description,
    amount: changes.amount ?? current.amount,
    transactionDate: changes.transactionDate ?? current.transactionDate,
    planned: changes.planned ?? current.planned,
    fixed: changes.fixed ?? current.fixed,
    recurring: changes.recurring ?? current.recurring,
    subscription: changes.subscription ?? current.subscription,
    essential: changes.essential ?? current.essential,
    impulse: changes.impulse ?? current.impulse,
    sharedWithPartner: changes.sharedWithPartner ?? current.sharedWithPartner,
    notes: changes.notes ?? current.notes ?? null,
    installment: false, // marcador de "criar parcelas" e so pra POST, no PUT nao aplica
    currentInstallment: current.currentInstallment,
    totalInstallments: current.totalInstallments,
  };
}

interface CreationResult {
  ok: boolean;
  payload: TransactionRequest;
  created?: TransactionResponse;
  error?: string;
}

function buildCreateSummary(results: CreationResult[]): string {
  const lines: string[] = [];
  const oks = results.filter((r) => r.ok);
  const errs = results.filter((r) => !r.ok);

  if (oks.length > 0) {
    lines.push(oks.length === 1 ? '✓ Criei:' : `✓ Criei ${oks.length} transacoes:`);
    for (const r of oks) {
      const amount = formatBrl(r.payload.amount);
      const sign = r.payload.type === 'INCOME' ? '+' : '-';
      const catBadge = r.created?.categoryName ? ` (${r.created.categoryName})` : '';
      const cardBadge = r.created?.cardName ? ` no ${r.created.cardName}` : '';
      const installmentBadge = r.payload.installment
        ? ` — parcela ${r.payload.currentInstallment}/${r.payload.totalInstallments}`
        : '';
      const recurringBadge = r.payload.recurring ? ' — recorrente' : '';
      lines.push(`  ${sign} ${amount} ${r.payload.description}${catBadge}${cardBadge}${installmentBadge}${recurringBadge}`);
    }
  }

  if (errs.length > 0) {
    lines.push('');
    lines.push(`✗ ${errs.length} nao criei:`);
    for (const r of errs) {
      lines.push(`  ${r.payload.description}: ${r.error}`);
    }
  }

  return lines.join('\n');
}

function buildEditSummary(
  before: TransactionResponse,
  after: TransactionResponse,
  changes: LlmEditChanges
): string {
  const diffs: string[] = [];
  if (changes.description !== undefined && before.description !== after.description) {
    diffs.push(`descricao: "${before.description}" → "${after.description}"`);
  }
  if (changes.amount !== undefined && before.amount !== after.amount) {
    diffs.push(`valor: ${formatBrl(before.amount)} → ${formatBrl(after.amount)}`);
  }
  if (changes.transactionDate !== undefined && before.transactionDate !== after.transactionDate) {
    diffs.push(`data: ${formatDate(before.transactionDate)} → ${formatDate(after.transactionDate)}`);
  }
  if (changes.categoryId !== undefined && before.categoryName !== after.categoryName) {
    diffs.push(`categoria: ${before.categoryName} → ${after.categoryName}`);
  }
  if (changes.cardId !== undefined && before.cardName !== after.cardName) {
    diffs.push(`cartao: ${before.cardName ?? '(nenhum)'} → ${after.cardName ?? '(nenhum)'}`);
  }
  // Flags booleanas — reportar so as que mudaram
  for (const key of ['planned', 'fixed', 'recurring', 'subscription', 'essential', 'impulse', 'sharedWithPartner'] as const) {
    if (changes[key] !== undefined && before[key] !== after[key]) {
      diffs.push(`${key}: ${before[key]} → ${after[key]}`);
    }
  }

  if (diffs.length === 0) {
    return `✓ ${after.description} — nada mudou.`;
  }
  return `✓ Editei ${after.description}:\n  ${diffs.join('\n  ')}`;
}

function formatBrl(v: number): string {
  return `R$ ${v.toFixed(2).replace('.', ',')}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

main().catch((err) => {
  logger.error({ err }, 'Erro fatal');
  process.exit(1);
});
