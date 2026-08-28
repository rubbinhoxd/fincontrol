import pino from 'pino';
import { config } from './config.js';
import { FincontrolClient } from './fincontrol.js';
import { startWhatsApp, ReplyFn, IncomingMessage } from './whatsapp.js';
import { interpret, interpretFatura } from './llm.js';
import { buildFaturaPrompt, buildSystemPrompt } from './prompt.js';
import {
  LlmResponse,
  TransactionRequest,
  TransactionResponse,
  LlmEditChanges,
  PendingImport,
} from './types.js';

const logger = pino({ level: config.logLevel }).child({ mod: 'index' });

// Timeout do pending import (ms). Depois disso, ignora "sim"/"nao" e trata msg normalmente.
const PENDING_TTL_MS = 10 * 60 * 1000;

const CONFIRM_REGEX = /^(sim|confirma|confirmar|ok|okay|vai|vamos|importa|beleza|isso)$/i;
const CANCEL_REGEX = /^(nao|não|cancela|cancelar|descarta|descartar)$/i;

async function main() {
  logger.info('Iniciando fincontrol-bot...');

  const fincontrol = new FincontrolClient();
  await fincontrol.login();
  logger.info('Bot pronto para receber mensagens.');

  // In-memory: pending imports por JID
  const pendingImports = new Map<string, PendingImport>();

  await startWhatsApp(async (msg, reply) => {
    logger.info({ hasImage: !!msg.imageBuffer, text: msg.text.substring(0, 40) }, 'Mensagem recebida');

    // Fluxo IMAGEM
    if (msg.imageBuffer) {
      await handleImage(fincontrol, msg, reply, pendingImports);
      return;
    }

    // Fluxo TEXTO: primeiro checa se ha pending import pra esse jid
    const pending = pendingImports.get(msg.jid);
    if (pending) {
      const age = Date.now() - pending.createdAt;
      if (age > PENDING_TTL_MS) {
        pendingImports.delete(msg.jid);
        // segue pro fluxo normal (pending expirou)
      } else if (CONFIRM_REGEX.test(msg.text.trim())) {
        pendingImports.delete(msg.jid);
        await confirmImport(fincontrol, pending, reply, msg.jid);
        return;
      } else if (CANCEL_REGEX.test(msg.text.trim())) {
        pendingImports.delete(msg.jid);
        await reply(msg.jid, '✗ Import descartado.');
        return;
      } else {
        // Msg diferente: descarta pending e processa como texto normal
        pendingImports.delete(msg.jid);
        logger.info({ jid: msg.jid }, 'Pending descartado por nova mensagem');
      }
    }

    await handleText(fincontrol, msg, reply);
  });
}

// ============ FLUXO IMAGEM ============

async function handleImage(
  client: FincontrolClient,
  msg: IncomingMessage,
  reply: ReplyFn,
  pendingImports: Map<string, PendingImport>
) {
  const [categories, cards] = await Promise.all([
    client.listCategories(),
    client.listCards(),
  ]);

  if (categories.length === 0) {
    await reply(msg.jid, 'Voce nao tem categorias cadastradas. Cadastre no app primeiro.');
    return;
  }

  const imageBase64 = msg.imageBuffer!.toString('base64');
  const mime = msg.imageMimeType ?? 'image/jpeg';

  await reply(msg.jid, '📸 Analisando fatura... aguarda uns segundos.');

  try {
    const systemPrompt = buildFaturaPrompt(categories, cards, msg.text ?? '');
    const parsed = await interpretFatura(systemPrompt, imageBase64, mime);

    if (!parsed.transactions || parsed.transactions.length === 0) {
      await reply(msg.jid, 'Nao consegui extrair nenhuma transacao dessa imagem. Tem certeza que e uma fatura?');
      return;
    }

    const preview = buildFaturaPreview(parsed.transactions, parsed.cardHint ?? null, parsed.notes ?? null);
    pendingImports.set(msg.jid, {
      transactions: parsed.transactions,
      preview,
      createdAt: Date.now(),
      cardHint: parsed.cardHint,
    });

    await reply(msg.jid, preview);
  } catch (err) {
    logger.error({ err }, 'Falha ao processar fatura');
    await reply(msg.jid, 'Erro ao processar a fatura. A imagem esta legivel?');
  }
}

async function confirmImport(
  client: FincontrolClient,
  pending: PendingImport,
  reply: ReplyFn,
  jid: string
) {
  await reply(jid, `⏳ Importando ${pending.transactions.length} transacoes...`);

  const results: CreationResult[] = [];
  for (const tx of pending.transactions) {
    try {
      const created = await client.createTransaction(tx);
      results.push({ ok: true, payload: tx, created });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'erro desconhecido';
      logger.error({ err: msg, payload: tx }, 'Falha ao criar transacao da fatura');
      results.push({ ok: false, payload: tx, error: String(msg) });
    }
  }

  const oks = results.filter((r) => r.ok);
  const errs = results.filter((r) => !r.ok);
  const totalOk = oks.reduce((sum, r) => sum + r.payload.amount, 0);

  const lines: string[] = [];
  lines.push(`✓ Importadas ${oks.length} transacoes, total ${formatBrl(totalOk)}`);
  if (errs.length > 0) {
    lines.push('');
    lines.push(`✗ ${errs.length} nao criei:`);
    for (const r of errs.slice(0, 5)) {
      lines.push(`  ${r.payload.description}: ${r.error}`);
    }
    if (errs.length > 5) lines.push(`  ... mais ${errs.length - 5}`);
  }
  await reply(jid, lines.join('\n'));
}

function buildFaturaPreview(
  txs: TransactionRequest[],
  cardHint: string | null,
  notes: string | null
): string {
  const total = txs.reduce((sum, t) => sum + t.amount, 0);
  const cardStr = cardHint ? ` (${cardHint})` : '';
  const notesStr = notes ? `\n${notes}` : '';

  const lines: string[] = [];
  lines.push(`📋 Detectei ${txs.length} transacoes na fatura${cardStr}`);
  lines.push(`Total: ${formatBrl(total)}${notesStr}`);
  lines.push('');

  if (txs.length <= 10) {
    for (const t of txs) {
      lines.push(`  ${formatDateShort(t.transactionDate)} - ${formatBrl(t.amount)} ${t.description}`);
    }
  } else {
    lines.push('Primeiras:');
    for (const t of txs.slice(0, 5)) {
      lines.push(`  ${formatDateShort(t.transactionDate)} - ${formatBrl(t.amount)} ${t.description}`);
    }
    lines.push(`  ... mais ${txs.length - 10} ...`);
    lines.push('Ultimas:');
    for (const t of txs.slice(-5)) {
      lines.push(`  ${formatDateShort(t.transactionDate)} - ${formatBrl(t.amount)} ${t.description}`);
    }
  }

  lines.push('');
  lines.push('Responda "sim" pra importar ou "nao" pra descartar.');
  return lines.join('\n');
}

// ============ FLUXO TEXTO (existente) ============

async function handleText(client: FincontrolClient, msg: IncomingMessage, reply: ReplyFn) {
  const [categories, cards, recent] = await Promise.all([
    client.listCategories(),
    client.listCards(),
    client.listRecentTransactions(15).catch(() => [] as TransactionResponse[]),
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
      await handleCreate(client, parsed.transactions, reply, msg.jid);
      break;
    case 'edit':
      await handleEdit(client, parsed.edit, reply, msg.jid);
      break;
    case 'delete':
      await handleDelete(client, parsed.delete, reply, msg.jid);
      break;
    case 'other':
    default:
      await reply(msg.jid, 'Nao identifiquei uma acao. Tenta algo como "sorvete 15", "edita a ultima pra ontem" ou "exclui a ultima".');
  }
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

// ============ HELPERS ============

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
    installment: false,
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

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

main().catch((err) => {
  logger.error({ err }, 'Erro fatal');
  process.exit(1);
});
