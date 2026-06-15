export type TransactionType = 'INCOME' | 'EXPENSE';

export interface AuthResponse {
  token: string;
  name: string;
  email: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
  active: boolean;
}

export interface Transaction {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  type: TransactionType;
  description: string;
  amount: number;
  transactionDate: string;
  planned: boolean;
  fixed: boolean;
  recurring: boolean;
  subscription: boolean;
  essential: boolean;
  impulse: boolean;
  notes: string | null;
  cardId: string | null;
  cardName: string | null;
  cardColor: string | null;
  recurringGroupId: string | null;
  installmentGroupId: string | null;
  currentInstallment: number | null;
  totalInstallments: number | null;
  createdAt: string;
}

export interface TransactionRequest {
  categoryId: string;
  type: TransactionType;
  description: string;
  amount: number;
  transactionDate: string;
  planned: boolean;
  fixed: boolean;
  recurring: boolean;
  subscription: boolean;
  essential: boolean;
  impulse: boolean;
  notes: string | null;
  cardId: string | null;
  activateRecurring: boolean;
  installment: boolean;
  currentInstallment: number | null;
  totalInstallments: number | null;
}

export interface MonthlyReference {
  id: string;
  yearMonth: string;
  salary: number;
  notes: string | null;
}

export interface ExpenseBreakdown {
  fixed: number;
  variable: number;
  subscriptions: number;
  unplanned: number;
  impulse: number;
  essential: number;
  nonEssential: number;
}

export interface CategoryTotal {
  categoryName: string;
  categoryColor: string | null;
  total: number;
  percent: number;
}

export interface MonthComparison {
  previousTotal: number;
  difference: number;
  percentChange: number;
}

export interface Dashboard {
  yearMonth: string;
  salary: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  salaryCommittedPercent: number;
  availableToSpend: number;
  averagePerDayRemaining: number;
  daysRemainingInMonth: number;
  expenseBreakdown: ExpenseBreakdown;
  topCategories: CategoryTotal[];
  totalCommittedInstallments: number;
  previousMonthComparison: MonthComparison;
  alertLevel: 'GREEN' | 'YELLOW' | 'RED';
}

export interface SimulatedItem {
  type: TransactionType;
  amount: number;
  categoryId: string | null;
  planned: boolean;
  fixed: boolean;
  recurring: boolean;
  subscription: boolean;
  essential: boolean;
  impulse: boolean;
}

export interface SimulationRequest {
  yearMonth: string;
  salaryOverride: number | null;
  items: SimulatedItem[];
}

export interface Card {
  id: string;
  name: string;
  color: string | null;
  brand: string | null;
  closingDay: number;
  dueDay: number;
  creditLimit: number;
  active: boolean;
}

export interface CardCycle {
  id: string;
  name: string;
  color: string | null;
  brand: string | null;
  closingDay: number;
  dueDay: number;
  creditLimit: number;
  cycleStart: string;
  cycleEnd: string;
  totalSpent: number;
  percentOfLimit: number;
  percentOfSalary: number;
  daysUntilClosing: number;
  transactionCount: number;
  closed: boolean;
}

export interface CardCycleDetail {
  cycle: CardCycle;
  transactions: Transaction[];
}

export interface CardRequest {
  name: string;
  color: string | null;
  brand: string | null;
  closingDay: number;
  dueDay: number;
  creditLimit: number;
}
