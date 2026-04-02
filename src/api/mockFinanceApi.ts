import { mockTransactions } from '../data/mockTransactions'
import type { Transaction } from '../types/finance'

const latency = (minimum = 450, maximum = 1100) =>
  new Promise((resolve) => {
    const duration = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum
    window.setTimeout(resolve, duration)
  })

export async function fetchMockTransactions(): Promise<Transaction[]> {
  await latency()
  return structuredClone(mockTransactions)
}
