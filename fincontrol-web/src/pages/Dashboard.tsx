import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingDown, AlertTriangle, TrendingUp } from 'lucide-react';
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
import StartHereCard from '../components/onboarding/StartHereCard';

echarts.use([BarChart, PieChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Paleta do visual novo (midnight) pros gráficos
const CHART_COLORS = {
  text: '#999ca1',           // mist
  gridLine: '#1b3630',       // steel-border tint
  growth: '#10B981',         // signal / growth
  danger: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  paper: '#ffffff',
};

export default function DashboardPage() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth());
  const [data, setData] = useState<DashboardType | null>(null);
  const [yearlyData, setYearlyData] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [loading, setLoading] = useState(true);

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

  const textColor = CHART_COLORS.text;
  const gridLineColor = CHART_COLORS.gridLine;
  const cardBg = '#061e1a';

  const alertMeta = {
    GREEN: { label: 'Sob controle', color: CHART_COLORS.success },
    YELLOW: { label: 'Atenção', color: CHART_COLORS.warning },
    RED: { label: 'Cuidado!', color: CHART_COLORS.danger },
  };

  const barChartOption = {
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['Receitas', 'Despesas'], textStyle: { color: textColor }, bottom: 0, itemGap: 20 },
    grid: { left: 60, right: 20, top: 20, bottom: 50 },
    xAxis: { type: 'category' as const, data: MONTH_LABELS, axisLabel: { color: textColor }, axisLine: { lineStyle: { color: gridLineColor } } },
    yAxis: { type: 'value' as const, axisLabel: { color: textColor, formatter: (v: number) => `R$${(v / 1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: gridLineColor } } },
    series: [
      { name: 'Receitas', type: 'bar' as const, data: yearlyData.map((d) => d.income), itemStyle: { color: CHART_COLORS.growth, borderRadius: [4, 4, 0, 0] } },
      { name: 'Despesas', type: 'bar' as const, data: yearlyData.map((d) => d.expense), itemStyle: { color: CHART_COLORS.danger, borderRadius: [4, 4, 0, 0] } },
    ],
  };

  const donutChartOption = data && data.topCategories.length > 0 ? {
    tooltip: { trigger: 'item' as const, formatter: '{b}: R${c} ({d}%)' },
    series: [{
      type: 'pie' as const,
      radius: ['38%', '58%'],
      center: ['50%', '50%'],
      itemStyle: { borderRadius: 6, borderColor: cardBg, borderWidth: 2 },
      label: { color: textColor, fontSize: 12, alignTo: 'edge' as const, edgeDistance: '5%' },
      labelLine: { length: 12, length2: 10 },
      data: data.topCategories.map((cat) => ({ name: cat.categoryName, value: cat.total, itemStyle: cat.categoryColor ? { color: cat.categoryColor } : undefined })),
    }],
  } : null;

  const currentDay = new Date().getDate();
  const daysInMonth = data ? currentDay + data.daysRemainingInMonth : 30;
  const effectiveIncome = data ? data.salary + data.totalIncome : 0;
  const idealPace = data ? Array.from({ length: daysInMonth }, (_, i) => +((effectiveIncome / daysInMonth) * (i + 1)).toFixed(2)) : [];
  const actualPace = data ? Array.from({ length: currentDay }, (_, i) => +((data.totalExpense / currentDay) * (i + 1)).toFixed(2)) : [];

  const actualAboveIdeal = actualPace[actualPace.length - 1] > idealPace[currentDay - 1];
  const paceChartOption = data ? {
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['Ritmo ideal', 'Ritmo real'], textStyle: { color: textColor }, bottom: 0, itemGap: 20 },
    grid: { left: 60, right: 20, top: 20, bottom: 50 },
    xAxis: { type: 'category' as const, data: Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`), axisLabel: { color: textColor, interval: 4 }, axisLine: { lineStyle: { color: gridLineColor } } },
    yAxis: { type: 'value' as const, axisLabel: { color: textColor, formatter: (v: number) => `R$${(v / 1000).toFixed(1)}k` }, splitLine: { lineStyle: { color: gridLineColor } } },
    series: [
      { name: 'Ritmo ideal', type: 'line' as const, data: idealPace, lineStyle: { type: 'dashed' as const, color: CHART_COLORS.growth }, itemStyle: { color: CHART_COLORS.growth }, symbol: 'none' },
      { name: 'Ritmo real', type: 'line' as const, data: actualPace, lineStyle: { color: actualAboveIdeal ? CHART_COLORS.danger : CHART_COLORS.success }, itemStyle: { color: actualAboveIdeal ? CHART_COLORS.danger : CHART_COLORS.success }, symbol: 'none', areaStyle: { opacity: 0.1 } },
    ],
  } : null;

  return (
    <PageContainer
      title="Dashboard"
      action={
        <div className="flex items-center gap-3">
          <button onClick={() => setYearMonth(previousYearMonth(yearMonth))} className="btn-ghost p-2" style={{ padding: '8px' }}>
            <ChevronLeft size={18} />
          </button>
          <span className="text-lg min-w-48 text-center" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--color-paper-white)' }}>
            {formatYearMonth(yearMonth)}
          </span>
          <button onClick={() => setYearMonth(nextYearMonth(yearMonth))} className="btn-ghost p-2" style={{ padding: '8px' }}>
            <ChevronRight size={18} />
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--color-mist)' }}>Carregando...</div>
      ) : !data ? (
        <div className="text-center py-12" style={{ color: 'var(--color-mist)' }}>Sem dados para este mês. Configure sua referência mensal.</div>
      ) : (
        <div className="space-y-6">
          <StartHereCard data={data} />

          {/* Alert banner — card com ponto colorido */}
          <div className="card-neo flex items-center gap-4" style={{ padding: '20px 24px' }}>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: `color-mix(in oklab, ${alertMeta[data.alertLevel].color} 20%, transparent)`, color: alertMeta[data.alertLevel].color }}
            >
              {data.alertLevel === 'GREEN' ? <TrendingDown size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div className="flex-1">
              <div className="label-meta mb-1">Status do mês</div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-lg" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: alertMeta[data.alertLevel].color }}>
                  {alertMeta[data.alertLevel].label}
                </span>
                <span className="text-sm" style={{ color: 'var(--color-fog)' }}>
                  — {formatPercent(data.salaryCommittedPercent)} da renda comprometido
                </span>
              </div>
            </div>
          </div>

          {/* Consumo da renda (progress bar) */}
          <div className="card-neo">
            <div className="flex justify-between items-baseline mb-3">
              <div className="label-meta">Consumo da renda{data.totalIncome > 0 ? ' (salário + receitas)' : ''}</div>
              <div className="text-sm value-display">{formatPercent(data.salaryCommittedPercent)}</div>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-indigo-surface)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(data.salaryCommittedPercent, 100)}%`,
                  backgroundColor:
                    data.salaryCommittedPercent >= 90 ? CHART_COLORS.danger :
                    data.salaryCommittedPercent >= 70 ? CHART_COLORS.warning : CHART_COLORS.growth,
                }}
              />
            </div>
          </div>

          {/* Main cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card label="Salário" value={formatCurrency(data.salary)} />
            <Card label="Total recebido" value={formatCurrency(data.totalIncome)} color={CHART_COLORS.growth} />
            <Card label="Total gasto" value={formatCurrency(data.totalExpense)} color={CHART_COLORS.danger} />
            <Card label="Saldo" value={formatCurrency(data.balance)} color={data.balance >= 0 ? CHART_COLORS.growth : CHART_COLORS.danger} />
          </div>

          {/* Control indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card label="Disponível no mês" value={formatCurrency(data.availableToSpend)} color={data.availableToSpend >= 0 ? CHART_COLORS.growth : CHART_COLORS.danger} />
            <Card label="Média por dia restante" value={formatCurrency(data.averagePerDayRemaining)} subtitle={`${data.daysRemainingInMonth} dias restantes`} />
            <Card label="Comprometido com parcelas" value={formatCurrency(data.totalCommittedInstallments)} color={CHART_COLORS.warning} />
            <Card
              label="vs. mês anterior"
              value={`${data.previousMonthComparison.percentChange >= 0 ? '+' : ''}${formatPercent(data.previousMonthComparison.percentChange)}`}
              color={data.previousMonthComparison.difference <= 0 ? CHART_COLORS.growth : CHART_COLORS.danger}
              subtitle={`Diferença: ${formatCurrency(data.previousMonthComparison.difference)}`}
              icon={data.previousMonthComparison.difference <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {paceChartOption && (
              <div className="card-neo">
                <div className="label-meta mb-4">Ritmo de gasto no mês</div>
                <ReactEChartsCore echarts={echarts} option={paceChartOption} style={{ height: 280 }} />
              </div>
            )}
            {donutChartOption && (
              <div className="card-neo">
                <div className="label-meta mb-4">Gastos por categoria</div>
                <ReactEChartsCore echarts={echarts} option={donutChartOption} style={{ height: 280 }} />
              </div>
            )}
          </div>

          {/* Yearly bar chart */}
          {yearlyData.length > 0 && (
            <div className="card-neo">
              <div className="label-meta mb-4">Receitas vs Despesas — {yearMonth.split('-')[0]}</div>
              <ReactEChartsCore echarts={echarts} option={barChartOption} style={{ height: 300 }} />
            </div>
          )}

          {/* Expense breakdown */}
          <div className="card-neo">
            <div className="label-meta mb-4">Composição dos gastos</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <BreakdownItem label="Fixos" value={data.expenseBreakdown.fixed} total={data.totalExpense} />
              <BreakdownItem label="Variáveis" value={data.expenseBreakdown.variable} total={data.totalExpense} />
              <BreakdownItem label="Assinaturas" value={data.expenseBreakdown.subscriptions} total={data.totalExpense} />
              <BreakdownItem label="Não planejados" value={data.expenseBreakdown.unplanned} total={data.totalExpense} />
              <BreakdownItem label="Impulso" value={data.expenseBreakdown.impulse} total={data.totalExpense} />
              <BreakdownItem label="Essenciais" value={data.expenseBreakdown.essential} total={data.totalExpense} />
              <BreakdownItem label="Supérfluo" value={data.expenseBreakdown.nonEssential} total={data.totalExpense} />
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function Card({ label, value, color, subtitle, icon }: { label: string; value: string; color?: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <div className="card-neo">
      <div className="label-meta mb-2">{label}</div>
      <div className="value-display text-2xl flex items-center gap-2" style={{ color: color || 'var(--color-paper-white)' }}>
        {value}
        {icon}
      </div>
      {subtitle && <div className="text-xs mt-2" style={{ color: 'var(--color-mist)', fontWeight: 400 }}>{subtitle}</div>}
    </div>
  );
}

function BreakdownItem({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="label-meta mb-1">{label}</div>
      <div className="value-display text-lg">{formatCurrency(value)}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--color-mist)' }}>{formatPercent(percent)}</div>
    </div>
  );
}
