import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Circle, ChevronRight, X, Rocket } from 'lucide-react';
import { listCards } from '../../api/cards';
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
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    listCards()
      .then((res) => setHasCard(res.data.length > 0))
      .catch(() => setHasCard(false));
  }, []);

  const hasSalary = data.salary > 0;
  const hasTransaction = data.totalIncome > 0 || data.totalExpense > 0;

  const steps: Step[] = [
    { key: 'account', label: 'Criar conta', done: true },
    { key: 'salary', label: 'Configurar renda mensal', done: hasSalary, href: '/monthly-reference' },
    { key: 'transaction', label: 'Adicionar primeira transação', done: hasTransaction, href: '/transactions/new' },
    { key: 'card', label: 'Cadastrar um cartão', done: hasCard === true, href: '/cards', optional: true },
  ];

  const essentialDone = hasSalary && hasTransaction;
  const doneCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;
  const percent = Math.round((doneCount / totalCount) * 100);

  // Some quando essenciais concluidos ou usuario dispensou
  if (dismissed || essentialDone) return null;

  const dispensar = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-primary/20 dark:border-primary/30 relative">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Rocket size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold dark:text-gray-100">Comece por aqui</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure em passos rápidos pra tirar mais valor do Savey
            </p>
          </div>
        </div>

        <button
          onClick={() => setConfirming(true)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          title="Ocultar"
          aria-label="Ocultar"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {steps.map((step) => (
          <StepRow
            key={step.key}
            step={step}
            onClick={() => step.href && !step.done && navigate(step.href)}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {doneCount} de {totalCount} concluídos
        </span>
      </div>

      {confirming && (
        <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 rounded-xl flex flex-col items-center justify-center p-6 backdrop-blur-sm">
          <p className="text-center dark:text-gray-100 font-medium mb-1">
            Ocultar este guia?
          </p>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
            Você não verá mais este card, mesmo com passos pendentes.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={dispensar}
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors text-sm font-medium"
            >
              Ocultar
            </button>
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
      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
        clickable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''
      }`}
    >
      {step.done ? (
        <Check size={18} className="text-primary flex-shrink-0" />
      ) : (
        <Circle size={18} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
      )}
      <span className={`flex-1 text-sm ${step.done ? 'text-gray-400 dark:text-gray-500 line-through' : 'dark:text-gray-200'}`}>
        {step.label}
        {step.optional && <span className="text-xs text-gray-400 ml-2">(opcional)</span>}
      </span>
      {clickable && <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />}
    </div>
  );
}
