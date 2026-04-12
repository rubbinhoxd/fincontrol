import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingDown, AlertTriangle } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import { getDashboard } from '../api/dashboard';
import type { Dashboard as DashboardType } from '../types';
import { formatCurrency, formatPercent } from '../utils/currency';
import { getCurrentYearMonth, formatYearMonth, previousYearMonth, nextYearMonth } from '../utils/date';

export default function DashboardPage() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth());
  const [data, setData] = useState<DashboardType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDashboard(yearMonth)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [yearMonth]);

  const alertColors = {
    GREEN: 'bg-success/10 text-success border-success/30',
    YELLOW: 'bg-warning/10 text-warning border-warning/30',
    RED: 'bg-danger/10 text-danger border-danger/30',
  };

  const alertLabels = {
    GREEN: 'Sob controle',
    YELLOW: 'Atencao',
    RED: 'Cuidado!',
  };

  return (
    <PageContainer
      title="Dashboard"
      action={
        <div className="flex items-center gap-3">
          <button onClick={() => setYearMonth(previousYearMonth(yearMonth))} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-medium min-w-48 text-center">{formatYearMonth(yearMonth)}</span>
          <button onClick={() => setYearMonth(nextYearMonth(yearMonth))} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight size={20} />
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : !data ? (
        <div className="text-center py-12 text-gray-400">Sem dados para este mes. Configure sua referencia mensal.</div>
      ) : (
        <div className="space-y-6">
          {/* Alert banner */}
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${alertColors[data.alertLevel]}`}>
            {data.alertLevel === 'GREEN' ? <TrendingDown size={20} /> : <AlertTriangle size={20} />}
            <span className="font-medium">{alertLabels[data.alertLevel]}</span>
            <span>— {formatPercent(data.salaryCommittedPercent)} do salario comprometido</span>
          </div>

          {/* Salary progress bar */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Consumo do salario</span>
              <span>{formatPercent(data.salaryCommittedPercent)}</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  data.salaryCommittedPercent >= 90 ? 'bg-danger' :
                  data.salaryCommittedPercent >= 70 ? 'bg-warning' : 'bg-success'
                }`}
                style={{ width: `${Math.min(data.salaryCommittedPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Main cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card label="Salario" value={formatCurrency(data.salary)} />
            <Card label="Total recebido" value={formatCurrency(data.totalIncome)} color="text-success" />
            <Card label="Total gasto" value={formatCurrency(data.totalExpense)} color="text-danger" />
            <Card label="Saldo" value={formatCurrency(data.balance)} color={data.balance >= 0 ? 'text-success' : 'text-danger'} />
          </div>

          {/* Control indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card label="Disponivel no mes" value={formatCurrency(data.availableToSpend)} color={data.availableToSpend >= 0 ? 'text-primary' : 'text-danger'} />
            <Card label="Media por dia restante" value={formatCurrency(data.averagePerDayRemaining)} subtitle={`${data.daysRemainingInMonth} dias restantes`} />
            <Card label="Comprometido com parcelas" value={formatCurrency(data.totalCommittedInstallments)} color="text-warning" />
            <Card
              label="vs. mes anterior"
              value={`${data.previousMonthComparison.percentChange >= 0 ? '+' : ''}${formatPercent(data.previousMonthComparison.percentChange)}`}
              color={data.previousMonthComparison.difference <= 0 ? 'text-success' : 'text-danger'}
              subtitle={`Diferenca: ${formatCurrency(data.previousMonthComparison.difference)}`}
            />
          </div>

          {/* Expense breakdown */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4">Composicao dos gastos</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <BreakdownItem label="Fixos" value={data.expenseBreakdown.fixed} total={data.totalExpense} />
              <BreakdownItem label="Variaveis" value={data.expenseBreakdown.variable} total={data.totalExpense} />
              <BreakdownItem label="Assinaturas" value={data.expenseBreakdown.subscriptions} total={data.totalExpense} />
              <BreakdownItem label="Nao planejados" value={data.expenseBreakdown.unplanned} total={data.totalExpense} />
              <BreakdownItem label="Impulso" value={data.expenseBreakdown.impulse} total={data.totalExpense} />
              <BreakdownItem label="Essenciais" value={data.expenseBreakdown.essential} total={data.totalExpense} />
              <BreakdownItem label="Superfluo" value={data.expenseBreakdown.nonEssential} total={data.totalExpense} />
            </div>
          </div>

          {/* Top categories */}
          {data.topCategories.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">Categorias que mais consomem</h3>
              <div className="space-y-3">
                {data.topCategories.map((cat) => (
                  <div key={cat.categoryName} className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 w-32 truncate">{cat.categoryName}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${cat.percent}%` }} />
                    </div>
                    <span className="text-sm font-medium w-24 text-right">{formatCurrency(cat.total)}</span>
                    <span className="text-xs text-gray-400 w-12 text-right">{formatPercent(cat.percent)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}

function Card({ label, value, color, subtitle }: { label: string; value: string; color?: string; subtitle?: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color || 'text-gray-900'}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function BreakdownItem({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-semibold">{formatCurrency(value)}</p>
      <p className="text-xs text-gray-400">{formatPercent(percent)}</p>
    </div>
  );
}
