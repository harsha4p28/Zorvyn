import type { Transaction } from '../types/finance'

export interface FinanceSummary {
  income: number
  expenses: number
  balance: number
}

export interface MonthlyTrendRow {
  month: string
  balance: number
}

export interface CategoryBreakdownRow {
  category: string
  amount: number
}

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: '2-digit',
})

export function calculateSummary(transactions: Transaction[]): FinanceSummary {
  const income = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0)
  const expenses = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0)

  return {
    income,
    expenses,
    balance: income - expenses,
  }
}

export function getMonthlyTrendData(
  transactions: Transaction[],
): MonthlyTrendRow[] {
  const monthlyMap = new Map<string, { income: number; expenses: number }>()

  transactions.forEach((transaction) => {
    const monthKey = transaction.date.slice(0, 7)
    const existing = monthlyMap.get(monthKey) ?? { income: 0, expenses: 0 }

    if (transaction.type === 'income') {
      existing.income += transaction.amount
    } else {
      existing.expenses += transaction.amount
    }

    monthlyMap.set(monthKey, existing)
  })

  return Array.from(monthlyMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, values]) => ({
      month: monthFormatter.format(new Date(`${month}-01`)),
      balance: values.income - values.expenses,
    }))
}

export function getCategoryBreakdown(
  transactions: Transaction[],
): CategoryBreakdownRow[] {
  const expenses = transactions.filter((transaction) => transaction.type === 'expense')
  const categoryMap = new Map<string, number>()

  expenses.forEach((expense) => {
    categoryMap.set(expense.category, (categoryMap.get(expense.category) ?? 0) + expense.amount)
  })

  return Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
    }))
    .sort((left, right) => right.amount - left.amount)
}
