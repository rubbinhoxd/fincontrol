import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Circle, ChevronRight, X, Rocket } from 'lucide-react';
import { listCards } from '../../api/cards';
import { getWhatsAppStatus } from '../../api/whatsapp';
import type { Dashboard as DashboardType } from '../../types';

const DISMISSED_KEY = 'savey:startHereDismissed';

interface Step {
  key: string;
  label: string;
  done: boolean;
  href?: string;
  optional?: boolean;
}

export default function StartHereCard({ data }: { data: DashboardType }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<boolean>(() => localStorage.getItem(DISMISSED_KEY) === '1');
  const [hasCard, setHasCard] = useState<boolean | null>(null);
  const [hasWhatsApp, setHasWhatsApp] = useState<boolean | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    listCards()
      .then((res) => setHasCard(res.data.length > 0))
      .catch(() => setHasCard(false));
    getWhatsAppStatus()
      .then((res) => setHasWhatsApp(res.data.status === 'ACTIVE'))
      .catch(() => setHasWhatsApp(false));
  }, []);

  const hasSalary = data.salary > 0;
  const hasTransaction = data.totalIncome > 0 || data.totalExpense > 0;

  const steps: Step[] = [
    { key: 'account', label: 'Criar conta', done: true },
    { key: 'salary', label: 'Configurar renda mensal', done: hasSalary, href: '/monthly-reference' },
    { key: 'transaction', label: 'Adicionar primeira transação', done: hasTransaction, href: '/transactions/new' },
    { key: 'card', label: 'Cadastrar um cartão', done: hasCard === true, href: '/cards', optional: true },
    { key: 'whatsapp', label: 'Ativar assistente WhatsApp', done: hasWhatsApp === true, href: '/whatsapp', optional: true },
  ];

  const essentialDone = hasSalary && hasTransaction;
  const doneCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;
  const percent = Math.round((doneCount / totalCount) * 100);

  if (dismissed || essentialDone) return null;

  const dispensar = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <div
      className="card-neo relative"
      style={{
        border: '1px solid color-mix(in oklab, var(--color-signal) 30%, transparent)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl"
            style={{
              backgroundColor: 'color-mix(in oklab, var(--color-signal) 12%, transparent)',
              border: '1px solid color-mix(in oklab, var(--color-signal) 25%, transparent)',
            }}
          >
            <Rocket size={18} style={{ color: 'var(--color-signal)' }} />
          </div>
          <div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize: 18,
                color: 'var(--color-paper-white)',
                letterSpacing: '-0.01em',
              }}
            >
              Comece por aqui
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-fog)' }}>
              Configure em passos rápidos pra tirar mais valor do Savey
            </p>
          </div>
        </div>

        <button
          onClick={() => setConfirming(true)}
          className="transition-colors"
          style={{ color: 'var(--color-mist)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-paper-white)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-mist)')}
          title="Ocultar"
          aria-label="Ocultar"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-1 mb-4">
        {steps.map((step) => (
          <StepRow
            key={step.key}
            step={step}
            onClick={() => step.href && !step.done && navigate(step.href)}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex-1 h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--color-midnight-canvas)', border: '1px solid var(--color-steel-border)' }}
        >
          <div
            className="h-full transition-all"
            style={{
              width: `${percent}%`,
              backgroundColor: 'var(--color-signal)',
            }}
          />
        </div>
        <span className="text-xs whitespace-nowrap" style={{ color: 'var(--color-mist)' }}>
          {doneCount} de {totalCount} concluídos
        </span>
      </div>

      {confirming && (
        <div
          className="absolute inset-0 rounded-3xl flex flex-col items-center justify-center p-6 backdrop-blur-sm"
          style={{ backgroundColor: 'color-mix(in oklab, var(--color-deep-surface) 90%, transparent)' }}
        >
          <p
            className="text-center mb-1"
            style={{ color: 'var(--color-paper-white)', fontWeight: 500 }}
          >
            Ocultar este guia?
          </p>
          <p
            className="text-center text-sm mb-4"
            style={{ color: 'var(--color-fog)' }}
          >
            Você não verá mais este card, mesmo com passos pendentes.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirming(false)} className="btn-ghost">Cancelar</button>
            <button onClick={dispensar} className="btn-primary">Ocultar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepRow({ step, onClick }: { step: Step; onClick: () => void }) {
  const clickable = !step.done && !!step.href;
  return (
    <div
      onClick={clickable ? onClick : undefined}
      className="flex items-center gap-3 p-2.5 rounded-xl transition-colors"
      style={{ cursor: clickable ? 'pointer' : 'default' }}
      onMouseEnter={(e) => { if (clickable) e.currentTarget.style.backgroundColor = 'color-mix(in oklab, var(--color-paper-white) 4%, transparent)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {step.done ? (
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--color-signal)' }}
        >
          <Check size={12} strokeWidth={3} style={{ color: 'white' }} />
        </div>
      ) : (
        <Circle size={20} style={{ color: 'var(--color-mist)' }} className="flex-shrink-0" />
      )}
      <span
        className="flex-1 text-sm"
        style={{
          color: step.done ? 'var(--color-mist)' : 'var(--color-paper-white)',
          textDecoration: step.done ? 'line-through' : 'none',
          fontWeight: step.done ? 400 : 400,
        }}
      >
        {step.label}
        {step.optional && <span className="text-xs ml-2" style={{ color: 'var(--color-mist)' }}>(opcional)</span>}
      </span>
      {clickable && <ChevronRight size={16} style={{ color: 'var(--color-mist)' }} className="flex-shrink-0" />}
    </div>
  );
}
