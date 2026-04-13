import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingDown, AlertTriangle } from 'lucide-react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageContainer from '../components/layout/PageContainer';
import { getDashboard, getYearlySummary } from '../api/dashboard';
import type { Dashboard as DashboardType } from '../types';
import { formatCurrency, formatPercent } from '../utils/currency';
import { getCurrentYearMonth, formatYearMonth, previousYearMonth, nextYearMonth } from '../utils/date';
import { useTheme } from '../contexts/ThemeContext';

echarts.use([BarChart, PieChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function DashboardPage() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth());
  const [data, setData] = useState<DashboardType | null>(null);
  const [yearlyData, setYearlyData] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const { dark } = useTheme();

  useEffect(() => {
    setLoading(true);
    getDashboard(yearMonth)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [yearMonth]);

  useEffect(() => {
    const year = parseInt(yearMonth.split('-')[0]);
    getYearlySummary(year)
      .then((res) => setYearlyData(res.data))
      .catch(() => setYearlyData([]));
  }, [yearMonth]);

  const textColor = dark ? '#9CA3AF' : '#6B7280';
  const gridLineColor = dark ? '#374151' : '#E5E7EB';

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

  const barChartOption = {
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['Receitas', 'Despesas'], textStyle: { color: textColor } },
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category' as const, data: MONTH_LABELS, axisLabel: { color: textColor }, axisLine: { lineStyle: { color: gridLineColor } } },
    yAxis: { type: 'value' as const, axisLabel: { color: textColor, formatter: (v: number) => `R$${(v / 1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: gridLineColor } } },
    series: [
      { name: 'Receitas', type: 'bar' as const, data: yearlyData.map((d) => d.income), itemStyle: { color: '#22C55E', borderRadius: [4, 4, 0, 0] } },
      { name: 'Despesas', type: 'bar' as const, data: yearlyData.map((d) => d.expense), itemStyle: { color: '#EF4444', borderRadius: [4, 4, 0, 0] } },
    ],
  };

  const donutChartOption = data && data.topCategories.length > 0 ? {
    tooltip: { trigger: 'item' as const, formatter: '{b}: R${c} ({d}%)' },
    series: [{
      type: 'pie' as const,
      radius: ['45%', '75%'],
      center: ['50%', '50%'],
      itemStyle: { borderRadius: 6, borderColor: dark ? '#111827' : '#fff', borderWidth: 2 },
      label: { color: textColor, fontSize: 12 },
      data: data.topCategories.map((cat) => ({ name: cat.categoryName, value: cat.total, itemStyle: cat.categoryColor ? { color: cat.categoryColor } : undefined })),
    }],
  } : null;

  const currentDay = new Date().getDate();
  const daysInMonth = data ? currentDay + data.daysRemainingInMonth : 30;
  const idealPace = data ? Array.from({ length: daysInMonth }, (_, i) => +((data.salary / daysInMonth) * (i + 1)).toFixed(2)) : [];
  const actualPace = data ? Array.from({ length: currentDay }, (_, i) => +((data.totalExpense / currentDay) * (i + 1)).toFixed(2)) : [];

  const paceChartOption = data ? {
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['Ritmo ideal', 'Ritmo real'], textStyle: { color: textColor } },
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category' as const, data: Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`), axisLabel: { color: textColor, interval: 4 }, axisLine: { lineStyle: { color: gridLineColor } } },
    yAxis: { type: 'value' as const, axisLabel: { color: textColor, formatter: (v: number) => `R$${(v / 1000).toFixed(1)}k` }, splitLine: { lineStyle: { color: gridLineColor } } },
    series: [
      { name: 'Ritmo ideal', type: 'line' as const, data: idealPace, lineStyle: { type: 'dashed' as const, color: '#6366F1' }, itemStyle: { color: '#6366F1' }, symbol: 'none' },
      { name: 'Ritmo real', type: 'line' as const, data: actualPace, lineStyle: { color: actualPace[actualPace.length - 1] > idealPace[currentDay - 1] ? '#EF4444' : '#22C55E' }, itemStyle: { color: actualPace[actualPace.length - 1] > idealPace[currentDay - 1] ? '#EF4444' : '#22C55E' }, symbol: 'none', areaStyle: { opacity: 0.1 } },
    ],
  } : null;

  return (
    <PageContainer
      title="Dashboard"
      action={
        <div className="flex items-center gap-3">
          <button onClick={() => setYearMonth(previousYearMonth(yearMonth))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-medium min-w-48 text-center">{formatYearMonth(yearMonth)}</span>
          <button onClick={() => setYearMonth(nextYearMonth(yearMonth))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
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
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
              <span>Consumo do salario</span>
              <span>{formatPercent(data.salaryCommittedPercent)}</span>
            </div>
            <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
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

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pace chart */}
            {paceChartOption && (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">Ritmo de gasto no mes</h3>
                <ReactEChartsCore echarts={echarts} option={paceChartOption} style={{ height: 280 }} />
              </div>
            )}

            {/* Donut chart */}
            {donutChartOption && (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">Gastos por categoria</h3>
                <ReactEChartsCore echarts={echarts} option={donutChartOption} style={{ height: 280 }} />
              </div>
            )}
          </div>

          {/* Yearly bar chart */}
          {yearlyData.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">Receitas vs Despesas — {yearMonth.split('-')[0]}</h3>
              <ReactEChartsCore echarts={echarts} option={barChartOption} style={{ height: 300 }} />
            </div>
          )}

          {/* Expense breakdown */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">Composicao dos gastos</h3>
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
        </div>
      )}
    </PageContainer>
  );
}

function Card({ label, value, color, subtitle }: { label: string; value: string; color?: string; subtitle?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color || 'text-gray-900 dark:text-gray-100'}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function BreakdownItem({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-lg font-semibold dark:text-gray-100">{formatCurrency(value)}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">{formatPercent(percent)}</p>
    </div>
  );
}
