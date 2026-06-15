import { findBrand } from '../../utils/cardBrands';
import { formatCurrency } from '../../utils/currency';

interface Props {
  name: string;
  brand: string | null;
  color: string | null;
  creditLimit: number;
  totalSpent?: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function CardVisual({ name, brand, color, creditLimit, totalSpent, size = 'md' }: Props) {
  const template = findBrand(brand);
  const fallbackColor = color || '#6366F1';
  const background = template && template.id !== 'custom'
    ? template.gradient
    : `linear-gradient(135deg, ${fallbackColor} 0%, ${darken(fallbackColor, 0.4)} 100%)`;

  const textColor = template && template.id !== 'custom' ? template.textColor : '#ffffff';
  const accentColor = template && template.id !== 'custom' ? template.accentColor : '#ffffff';
  const bank = template?.bank ?? 'Cartao';

  const dimensions = {
    sm: { height: 'h-32', name: 'text-sm', limit: 'text-xs', bank: 'text-[10px]' },
    md: { height: 'h-44', name: 'text-base', limit: 'text-xs', bank: 'text-xs' },
    lg: { height: 'h-56', name: 'text-xl', limit: 'text-sm', bank: 'text-sm' },
  }[size];

  const percentUsed = totalSpent !== undefined && creditLimit > 0
    ? Math.min((totalSpent / creditLimit) * 100, 100)
    : null;

  return (
    <div
      className={`relative w-full ${dimensions.height} rounded-2xl overflow-hidden shadow-lg`}
      style={{ background, color: textColor }}
    >
      {/* Shine overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
           style={{ background: 'linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)' }} />

      <div className="absolute inset-0 p-5 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <span className={`${dimensions.bank} font-medium uppercase tracking-widest opacity-80`}>{bank}</span>
          <div className="w-9 h-7 rounded-md opacity-70" style={{ background: 'linear-gradient(135deg, #f5d76e 0%, #c8a64f 100%)' }} />
        </div>

        <div>
          <p className={`${dimensions.name} font-semibold leading-tight`}>{name}</p>
          {totalSpent !== undefined && (
            <div className="mt-2">
              <div className="flex justify-between items-baseline">
                <span className={`${dimensions.limit} opacity-80`}>Fatura aberta</span>
                <span className={`${dimensions.bank} opacity-60`}>
                  limite {formatCurrency(creditLimit)}
                </span>
              </div>
              <p className={`${dimensions.name} font-bold mt-0.5`} style={{ color: accentColor }}>
                {formatCurrency(totalSpent)}
              </p>
              {percentUsed !== null && (
                <div className="mt-2 h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.18)' }}>
                  <div className="h-full rounded-full transition-all"
                       style={{ width: `${percentUsed}%`, background: percentUsed >= 90 ? '#ff5252' : percentUsed >= 70 ? '#ffb84d' : accentColor }} />
                </div>
              )}
            </div>
          )}
          {totalSpent === undefined && (
            <p className={`${dimensions.limit} opacity-80 mt-1`}>Limite {formatCurrency(creditLimit)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper: escurece uma cor hex para o gradient fallback
function darken(hex: string, amount: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  const dr = Math.max(0, Math.floor(r * (1 - amount)));
  const dg = Math.max(0, Math.floor(g * (1 - amount)));
  const db = Math.max(0, Math.floor(b * (1 - amount)));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}
