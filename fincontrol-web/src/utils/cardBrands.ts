// Curated bank/card brand templates. Mostra o estilo visual do cartao real.
// "custom" e o fallback: usa apenas a cor escolhida pelo usuario.

export interface CardBrandTemplate {
  id: string;
  label: string;
  bank: string;
  gradient: string;          // CSS background (linear-gradient)
  textColor: string;         // cor para nome/texto principal
  accentColor: string;       // cor para detalhes (limite, brand chip)
}

export const CARD_BRANDS: CardBrandTemplate[] = [
  // Banco do Brasil
  {
    id: 'bb-black',
    label: 'BB Black / Visa Infinite',
    bank: 'Banco do Brasil',
    gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 60%, #3a2c00 100%)',
    textColor: '#FCDA62',
    accentColor: '#D4AF37',
  },
  {
    id: 'bb-platinum',
    label: 'BB Platinum',
    bank: 'Banco do Brasil',
    gradient: 'linear-gradient(135deg, #4a4a4a 0%, #7a7a7a 50%, #2a2a2a 100%)',
    textColor: '#ffffff',
    accentColor: '#c0c0c0',
  },
  {
    id: 'bb-ourocard',
    label: 'BB Ourocard',
    bank: 'Banco do Brasil',
    gradient: 'linear-gradient(135deg, #003366 0%, #0066b3 60%, #fcc200 130%)',
    textColor: '#ffffff',
    accentColor: '#FCDA62',
  },

  // Nubank
  {
    id: 'nubank',
    label: 'Nubank Roxinho',
    bank: 'Nubank',
    gradient: 'linear-gradient(135deg, #820AD1 0%, #5f0094 100%)',
    textColor: '#ffffff',
    accentColor: '#f7f7f7',
  },
  {
    id: 'nubank-ultravioleta',
    label: 'Nubank Ultravioleta',
    bank: 'Nubank',
    gradient: 'linear-gradient(135deg, #1a0033 0%, #2d0052 50%, #4a0a78 100%)',
    textColor: '#e0d4f7',
    accentColor: '#c084fc',
  },

  // Itau
  {
    id: 'itau-personnalite',
    label: 'Itau Personnalite Black',
    bank: 'Itau',
    gradient: 'linear-gradient(135deg, #000000 0%, #1a1a1a 60%, #ff7a00 110%)',
    textColor: '#ffffff',
    accentColor: '#ff8c1a',
  },
  {
    id: 'itau-uniclass',
    label: 'Itau Uniclass',
    bank: 'Itau',
    gradient: 'linear-gradient(135deg, #003c8e 0%, #0066c0 60%, #ff8c1a 130%)',
    textColor: '#ffffff',
    accentColor: '#ff8c1a',
  },
  {
    id: 'itau-black',
    label: 'Itau Black',
    bank: 'Itau',
    gradient: 'linear-gradient(135deg, #050505 0%, #2a2a2a 100%)',
    textColor: '#ff8c1a',
    accentColor: '#ff8c1a',
  },

  // Santander
  {
    id: 'santander-classic',
    label: 'Santander Free',
    bank: 'Santander',
    gradient: 'linear-gradient(135deg, #ec0000 0%, #a30000 100%)',
    textColor: '#ffffff',
    accentColor: '#ffd1d1',
  },
  {
    id: 'santander-black',
    label: 'Santander Black',
    bank: 'Santander',
    gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #5a0000 100%)',
    textColor: '#ffffff',
    accentColor: '#ec0000',
  },
  {
    id: 'santander-elite',
    label: 'Santander Elite',
    bank: 'Santander',
    gradient: 'linear-gradient(135deg, #2a2a2a 0%, #4a4a4a 50%, #ec0000 130%)',
    textColor: '#ffffff',
    accentColor: '#ec0000',
  },

  // Bradesco
  {
    id: 'bradesco-elo',
    label: 'Bradesco Elo Mais',
    bank: 'Bradesco',
    gradient: 'linear-gradient(135deg, #cc092f 0%, #8b0420 100%)',
    textColor: '#ffffff',
    accentColor: '#ffd700',
  },
  {
    id: 'bradesco-nanquim',
    label: 'Bradesco Elo Nanquim',
    bank: 'Bradesco',
    gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1f1f1f 50%, #5b0000 130%)',
    textColor: '#ffffff',
    accentColor: '#cc092f',
  },

  // Generic
  {
    id: 'custom',
    label: 'Personalizado (usa cor escolhida)',
    bank: 'Outro',
    gradient: '',
    textColor: '#ffffff',
    accentColor: '#ffffff',
  },
];

export function findBrand(id: string | null | undefined): CardBrandTemplate | null {
  if (!id) return null;
  return CARD_BRANDS.find((b) => b.id === id) ?? null;
}
