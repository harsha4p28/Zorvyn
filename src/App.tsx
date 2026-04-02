import { useMemo, useState } from 'react'
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { mockTransactions } from './data/mockTransactions'
import type { Transaction, UserRole } from './types/finance'
import {
  calculateSummary,
  getCategoryBreakdown,
  getMonthlyTrendData,
} from './utils/finance'
import './App.css'

function App() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('viewer')
  const [transactions] = useState<Transaction[]>(mockTransactions)
  const trendData = useMemo(() => getMonthlyTrendData(transactions), [transactions])
  const categoryData = useMemo(
    () => getCategoryBreakdown(transactions),
    [transactions],
  )

  const chartColors = ['#0d7f66', '#eaa640', '#ca5f52', '#7296d1', '#5f7d46']
  const formatTooltipValue = (value: unknown) => {
    const rawValue = Array.isArray(value) ? value[0] : value
    const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue)
    return `$${numericValue.toLocaleString()}`
  }

  const quickStats = useMemo(() => calculateSummary(transactions), [transactions])

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
        <article className="panel">
          <h2>Balance Trend</h2>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={formatTooltipValue} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#0d7f66"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0d7f66' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel">
          <h2>Spending Breakdown</h2>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="amount"
                  nameKey="category"
                  outerRadius={96}
                  innerRadius={56}
                >
                  {categoryData.map((slice, index) => (
                    <Cell
                      key={`${slice.category}-${index}`}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={formatTooltipValue} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-row">
            {categoryData.slice(0, 4).map((row, index) => (
              <span key={row.category}>
                <i
                  style={{ backgroundColor: chartColors[index % chartColors.length] }}
                />
                {row.category}
              </span>
            ))}
          </div>
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
