import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Transaction } from '../types';

export interface ExportMeta {
  yearMonth: string;              // "2026-11"
  yearMonthLabel: string;         // "Novembro 2026"
  totalIncome: number;
  totalExpense: number;
  totalCount: number;
  filters: {
    type?: string;                // "Todos os tipos" | "Receitas" | ...
    classification?: string;
    category?: string;
  };
}

/**
 * Transforma uma transacao numa linha de tabela — lista de strings.
 * Mesma ordem usada no CSV e no PDF.
 */
function toRow(t: Transaction): string[] {
  const sign = t.type === 'INCOME' ? '+' : '-';
  const amount = `${sign} ${formatBrl(t.amount)}`;
  const parcela = t.totalInstallments
    ? (t.currentInstallment ? `${t.currentInstallment}/${t.totalInstallments}` : `${t.totalInstallments}x`)
    : '';
  const flags: string[] = [];
  if (t.cardName) flags.push(t.cardName);
  if (t.sharedWithPartner) flags.push('½ casal');
  if (t.impulse) flags.push('Impulso');
  if (!t.planned && !t.impulse) flags.push('Não planejado');
  if (t.fixed) flags.push('Fixo');
  if (t.subscription) flags.push('Assinatura');
  if (!t.essential) flags.push('Supérfluo');
  return [
    formatDateBr(t.transactionDate),
    t.description,
    t.categoryName ?? '',
    t.type === 'INCOME' ? 'Receita' : 'Despesa',
    amount,
    parcela,
    flags.join(', '),
  ];
}

const HEADERS = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Parcela', 'Tags'];

function fileName(meta: ExportMeta, ext: 'csv' | 'pdf'): string {
  return `savey-transacoes-${meta.yearMonth}.${ext}`;
}

// ============ CSV ============

export function exportTransactionsToCsv(transactions: Transaction[], meta: ExportMeta): void {
  const rows = transactions.map(toRow);
  const csv = [HEADERS, ...rows]
    .map((row) => row.map(csvEscape).join(','))
    .join('\n');
  // BOM pra Excel reconhecer UTF-8 e exibir acentos corretamente
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, fileName(meta, 'csv'));
}

function csvEscape(value: string): string {
  if (value == null) return '';
  // Se contem virgula, aspas ou quebra de linha → encapsula em aspas, escapando aspas internas
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ============ PDF ============

export function exportTransactionsToPdf(transactions: Transaction[], meta: ExportMeta): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  // Cabecalho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor('#10B981');
  doc.text('Savey', 40, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#6B7280');
  doc.text('smart money, simple control', 40, 56);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor('#111827');
  doc.text(`Transações — ${meta.yearMonthLabel}`, 40, 90);

  // Filtros e totalizadores
  const activeFilters: string[] = [];
  if (meta.filters.type && meta.filters.type !== 'Todos os tipos') activeFilters.push(`Tipo: ${meta.filters.type}`);
  if (meta.filters.classification) activeFilters.push(`Classificação: ${meta.filters.classification}`);
  if (meta.filters.category) activeFilters.push(`Categoria: ${meta.filters.category}`);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#6B7280');
  let infoY = 108;
  if (activeFilters.length > 0) {
    doc.text(`Filtros: ${activeFilters.join(' · ')}`, 40, infoY);
    infoY += 14;
  }
  doc.text(
    `${meta.totalCount} transações · Receitas ${formatBrl(meta.totalIncome)} · Despesas ${formatBrl(meta.totalExpense)} · Saldo ${formatBrl(meta.totalIncome - meta.totalExpense)}`,
    40,
    infoY,
  );

  // Tabela
  autoTable(doc, {
    startY: infoY + 18,
    head: [HEADERS],
    body: transactions.map(toRow),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [15, 61, 50], textColor: 255, fontStyle: 'bold' }, // Evergreen
    alternateRowStyles: { fillColor: [247, 250, 249] },
    columnStyles: {
      4: { halign: 'right' }, // Valor
      5: { halign: 'center' }, // Parcela
    },
    didDrawPage: (data) => {
      // Rodape com data da exportacao e pagina
      const pageCount = doc.getNumberOfPages();
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height || pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor('#9CA3AF');
      doc.text(
        `Exportado em ${new Date().toLocaleString('pt-BR')}`,
        40,
        pageHeight - 20,
      );
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        (pageSize.width || pageSize.getWidth()) - 40,
        pageHeight - 20,
        { align: 'right' },
      );
    },
  });

  doc.save(fileName(meta, 'pdf'));
}

// ============ Helpers ============

function triggerDownload(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatBrl(v: number): string {
  return `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function formatDateBr(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
