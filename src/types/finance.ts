export type TransactionType = 'income' | 'expense'

export type UserRole = 'viewer' | 'admin'

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category: string
  type: TransactionType
}
