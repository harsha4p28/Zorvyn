import { useMemo, useState } from 'react'
import { mockTransactions } from './data/mockTransactions'
import type { Transaction, UserRole } from './types/finance'
import './App.css'

function App() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('viewer')
  const [transactions] = useState<Transaction[]>(mockTransactions)

  const quickStats = useMemo(() => {
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
  }, [transactions])

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="kicker">Personal finance workspace</p>
          <h1>Finance Dashboard</h1>
        </div>
        <label className="role-switcher" htmlFor="role-selector">
          Role
          <select
            id="role-selector"
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value as UserRole)}
          >
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </header>

      <section className="grid-section summary-grid">
        <article className="panel stat-card">
          <span className="label">Total Balance</span>
          <strong>${quickStats.balance.toLocaleString()}</strong>
        </article>
        <article className="panel stat-card">
          <span className="label">Income</span>
          <strong>${quickStats.income.toLocaleString()}</strong>
        </article>
        <article className="panel stat-card">
          <span className="label">Expenses</span>
          <strong>${quickStats.expenses.toLocaleString()}</strong>
        </article>
      </section>

      <section className="grid-section charts-grid">
        <article className="panel panel-placeholder">
          <h2>Balance Trend</h2>
          <p>Time-based visualization will be added in the next feature commit.</p>
        </article>
        <article className="panel panel-placeholder">
          <h2>Spending Breakdown</h2>
          <p>Category visualization will be added in the next feature commit.</p>
        </article>
      </section>

      <section className="grid-section">
        <article className="panel panel-placeholder">
          <h2>Transactions</h2>
          <p>
            Transaction filtering, search, and sorting are coming in the next
            milestone.
          </p>
        </article>
      </section>

      <section className="grid-section">
        <article className="panel panel-placeholder">
          <h2>Insights</h2>
          <p>Insight cards will be generated from transaction data.</p>
        </article>
      </section>

      <footer className="panel footer-note">
        <p>
          Active role: <strong>{selectedRole}</strong>. Viewer can inspect data,
          admin actions will be enabled soon.
        </p>
      </footer>
    </main>
  )
}

export default App
