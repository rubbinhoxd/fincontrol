import pino from 'pino';
import { config } from '../config.js';
import { interpret, interpretFatura } from '../llm.js';
import { buildFaturaPrompt, buildSystemPrompt } from '../prompt.js';
import {
  LlmResponse,
  TransactionRequest,
  TransactionResponse,
  LlmEditChanges,
  PendingImport,
} from '../types.js';
import { Session } from './session.js';

const logger = pino({ level: config.logLevel }).child({ mod: 'msg' });

const PENDING_TTL_MS = 10 * 60 * 1000;
const CONFIRM_REGEX = /^(sim|confirma|confirmar|ok|okay|vai|vamos|importa|beleza|isso)$/i;
const CANCEL_REGEX = /^(nao|não|cancela|cancelar|descarta|descartar)$/i;

interface IncomingMessage {
  jid: string;
  fromMe: boolean;
  text: string;
  imageBuffer?: Buffer;
  imageMimeType?: string;
}

interface CreationResult {
  ok: boolean;
  payload: TransactionRequest;
  created?: TransactionResponse;
  error?: string;
}

/** Ponto de entrada — decide fluxo imagem vs texto (com pending import). */
export async function handleMessage(session: Session, msg: IncomingMessage): Promise<void> {
  logger.info({ userId: session.userId, hasImage: !!msg.imageBuffer, text: msg.text.substring(0, 40) }, 'msg');

  if (msg.imageBuffer) {
    await handleImage(session, msg);
    return;
  }

  const pending = session.pendingImports.get(msg.jid);
  if (pending) {
    const age = Date.now() - pending.createdAt;
    if (age > PENDING_TTL_MS) {
      session.pendingImports.delete(msg.jid);
    } else if (CONFIRM_REGEX.test(msg.text.trim())) {
      session.pendingImports.delete(msg.jid);
      await confirmImport(session, pending, msg.jid);
      return;
    } else if (CANCEL_REGEX.test(msg.text.trim())) {
      session.pendingImports.delete(msg.jid);
      await session.reply(msg.jid, '✗ Import descartado.');
      return;
    } else {
      session.pendingImports.delete(msg.jid);
    }
  }

  await handleText(session, msg);
}

async function handleImage(session: Session, msg: IncomingMessage): Promise<void> {
  const [categories, cards] = await Promise.all([
    session.fincontrol.listCategories(),
    session.fincontrol.listCards(),
  ]);

  if (categories.length === 0) {
    await session.reply(msg.jid, 'Você não tem categorias cadastradas. Cadastre no app primeiro.');
    return;
  }

  const imageBase64 = msg.imageBuffer!.toString('base64');
  const mime = (msg.imageMimeType ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

  await session.reply(msg.jid, '📸 Analisando fatura... aguarda uns segundos.');

  try {
    const systemPrompt = buildFaturaPrompt(categories, cards, msg.text ?? '');
    const parsed = await interpretFatura(systemPrompt, imageBase64, mime);

    if (!parsed.transactions || parsed.transactions.length === 0) {
      await session.reply(msg.jid, 'Não consegui extrair nenhuma transação dessa imagem. Tem certeza que é uma fatura?');
      return;
    }

    const preview = buildFaturaPreview(parsed.transactions, parsed.cardHint ?? null, parsed.notes ?? null);
    const pending: PendingImport = {
      transactions: parsed.transactions,
      preview,
      createdAt: Date.now(),
      cardHint: parsed.cardHint,
    };
    session.pendingImports.set(msg.jid, pending);
    await session.reply(msg.jid, preview);
  } catch (err) {
    logger.error({ err, userId: session.userId }, 'Falha ao processar fatura');
    await session.reply(msg.jid, 'Erro ao processar a fatura. A imagem está legível?');
  }
}

async function confirmImport(session: Session, pending: PendingImport, jid: string): Promise<void> {
  await session.reply(jid, `⏳ Importando ${pending.transactions.length} transações...`);

  const results: CreationResult[] = [];
  for (const tx of pending.transactions) {
    try {
      const created = await session.fincontrol.createTransaction(tx);
      results.push({ ok: true, payload: tx, created });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'erro desconhecido';
      logger.error({ err: msg, userId: session.userId, payload: tx }, 'Falha ao criar da fatura');
      results.push({ ok: false, payload: tx, error: String(msg) });
    }
  }

  const oks = results.filter((r) => r.ok);
  const errs = results.filter((r) => !r.ok);
  const totalOk = oks.reduce((sum, r) => sum + r.payload.amount, 0);

  const lines: string[] = [];
  lines.push(`✓ Importadas ${oks.length} transações, total ${formatBrl(totalOk)}`);
  if (errs.length > 0) {
    lines.push('');
    lines.push(`✗ ${errs.length} não criei:`);
    for (const r of errs.slice(0, 5)) {
      lines.push(`  ${r.payload.description}: ${r.error}`);
    }
    if (errs.length > 5) lines.push(`  ... mais ${errs.length - 5}`);
  }
  await session.reply(jid, lines.join('\n'));
}

function buildFaturaPreview(txs: TransactionRequest[], cardHint: string | null, notes: string | null): string {
  const total = txs.reduce((sum, t) => sum + t.amount, 0);
  const cardStr = cardHint ? ` (${cardHint})` : '';
  const notesStr = notes ? `\n${notes}` : '';

  const lines: string[] = [];
  lines.push(`📋 Detectei ${txs.length} transações na fatura${cardStr}`);
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
    lines.push('Últimas:');
    for (const t of txs.slice(-5)) {
      lines.push(`  ${formatDateShort(t.transactionDate)} - ${formatBrl(t.amount)} ${t.description}`);
    }
  }

  lines.push('');
  lines.push('Responda "sim" pra importar ou "não" pra descartar.');
  return lines.join('\n');
}

async function handleText(session: Session, msg: IncomingMessage): Promise<void> {
  const [categories, cards, recent] = await Promise.all([
    session.fincontrol.listCategories(),
    session.fincontrol.listCards(),
    session.fincontrol.listRecentTransactions(15).catch(() => [] as TransactionResponse[]),
  ]);

  if (categories.length === 0) {
    await session.reply(msg.jid, 'Você não tem categorias cadastradas. Cadastre no app primeiro.');
    return;
  }

  let parsed: LlmResponse;
  try {
    const systemPrompt = buildSystemPrompt(categories, cards, recent);
    parsed = await interpret(systemPrompt, msg.text);
  } catch (err) {
    logger.error({ err, userId: session.userId }, 'Falha no LLM');
    await session.reply(msg.jid, 'Não consegui entender agora. Tenta algo mais simples, tipo "sorvete 15 no posto".');
    return;
  }

  switch (parsed.intent) {
    case 'create_transactions':
      await handleCreate(session, parsed.transactions, msg.jid);
      break;
    case 'edit':
      await handleEdit(session, parsed.edit, msg.jid);
      break;
    case 'delete':
      await handleDelete(session, parsed.delete, msg.jid);
      break;
    default:
      await session.reply(msg.jid, 'Não identifiquei uma ação. Tenta algo como "sorvete 15", "edita a última pra ontem" ou "exclui a última".');
  }
}

async function handleCreate(session: Session, txs: TransactionRequest[] | undefined, jid: string): Promise<void> {
  if (!txs || txs.length === 0) {
    await session.reply(jid, 'Sem transações pra criar.');
    return;
  }
  const results: CreationResult[] = [];
  for (const tx of txs) {
    try {
      const created = await session.fincontrol.createTransaction(tx);
      results.push({ ok: true, payload: tx, created });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'erro desconhecido';
      logger.error({ err: msg, userId: session.userId, payload: tx }, 'Falha ao criar');
      results.push({ ok: false, payload: tx, error: String(msg) });
    }
  }
  await session.reply(jid, buildCreateSummary(results));
}

async function handleEdit(
  session: Session,
  edit: { targetTransactionId: string; changes: LlmEditChanges } | undefined,
  jid: string
): Promise<void> {
  if (!edit || !edit.targetTransactionId) {
    await session.reply(jid, 'Não identifiquei qual transação editar. Tenta ser mais específico.');
    return;
  }
  try {
    const current = await session.fincontrol.getTransaction(edit.targetTransactionId);
    const merged = mergeChanges(current, edit.changes);
    const updated = await session.fincontrol.updateTransaction(edit.targetTransactionId, merged);
    await session.reply(jid, buildEditSummary(current, updated, edit.changes));
  } catch (err: any) {
    const msg = err?.response?.data?.message ?? err?.message ?? 'erro desconhecido';
    await session.reply(jid, `Não consegui editar: ${msg}`);
  }
}

async function handleDelete(
  session: Session,
  del: { targetTransactionId: string; mode?: 'single' | 'future' } | undefined,
  jid: string
): Promise<void> {
  if (!del || !del.targetTransactionId) {
    await session.reply(jid, 'Não identifiquei qual transação excluir. Tenta ser mais específico.');
    return;
  }
  try {
    const current = await session.fincontrol.getTransaction(del.targetTransactionId);
    const mode = del.mode ?? 'single';
    await session.fincontrol.deleteTransaction(del.targetTransactionId, mode);
    const modeLabel = mode === 'future' ? ' (mais todas as parcelas futuras)' : '';
    await session.reply(
      jid,
      `✗ Excluída: ${current.description} — ${formatBrl(current.amount)} em ${formatDate(current.transactionDate)}${modeLabel}`
    );
  } catch (err: any) {
    const msg = err?.response?.data?.message ?? err?.message ?? 'erro desconhecido';
    await session.reply(jid, `Não consegui excluir: ${msg}`);
  }
}

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

function buildCreateSummary(results: CreationResult[]): string {
  const lines: string[] = [];
  const oks = results.filter((r) => r.ok);
  const errs = results.filter((r) => !r.ok);

  if (oks.length > 0) {
    lines.push(oks.length === 1 ? '✓ Criei:' : `✓ Criei ${oks.length} transações:`);
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
    lines.push(`✗ ${errs.length} não criei:`);
    for (const r of errs) {
      lines.push(`  ${r.payload.description}: ${r.error}`);
    }
  }

  return lines.join('\n');
}

function buildEditSummary(before: TransactionResponse, after: TransactionResponse, changes: LlmEditChanges): string {
  const diffs: string[] = [];
  if (changes.description !== undefined && before.description !== after.description) {
    diffs.push(`descrição: "${before.description}" → "${after.description}"`);
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
    diffs.push(`cartão: ${before.cardName ?? '(nenhum)'} → ${after.cardName ?? '(nenhum)'}`);
  }
  for (const key of ['planned', 'fixed', 'recurring', 'subscription', 'essential', 'impulse', 'sharedWithPartner'] as const) {
    if (changes[key] !== undefined && before[key] !== after[key]) {
      diffs.push(`${key}: ${before[key]} → ${after[key]}`);
    }
  }
  if (diffs.length === 0) return `✓ ${after.description} — nada mudou.`;
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
