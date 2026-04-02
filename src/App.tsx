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
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | Transaction['type']>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc')
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
  const transactionCategories = useMemo(
    () => [...new Set(transactions.map((transaction) => transaction.category))],
    [transactions],
  )

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    const filtered = transactions.filter((transaction) => {
      const matchesQuery =
        transaction.description.toLowerCase().includes(normalizedQuery) ||
        transaction.category.toLowerCase().includes(normalizedQuery)
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter
      const matchesCategory =
        categoryFilter === 'all' || transaction.category === categoryFilter

      return matchesQuery && matchesType && matchesCategory
    })

    const sorted = [...filtered]
    switch (sortBy) {
      case 'date-asc':
        sorted.sort((left, right) => left.date.localeCompare(right.date))
        break
      case 'amount-desc':
        sorted.sort((left, right) => right.amount - left.amount)
        break
      case 'amount-asc':
        sorted.sort((left, right) => left.amount - right.amount)
        break
      default:
        sorted.sort((left, right) => right.date.localeCompare(left.date))
    }

    return sorted
  }, [transactions, searchQuery, typeFilter, categoryFilter, sortBy])

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`
  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString))

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
        <article className="panel">
          <h2>Transactions</h2>
          <div className="toolbar">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search description or category"
              aria-label="Search transactions"
            />

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as 'all' | Transaction['type'])
              }
              aria-label="Filter by type"
            >
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              {transactionCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value as
                    | 'date-desc'
                    | 'date-asc'
                    | 'amount-desc'
                    | 'amount-asc',
                )
              }
              aria-label="Sort transactions"
            >
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="amount-desc">Highest amount</option>
              <option value="amount-asc">Lowest amount</option>
            </select>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <h3>No transactions match this filter set.</h3>
              <p>Try clearing the search or changing filters.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{formatDate(transaction.date)}</td>
                      <td>{transaction.description}</td>
                      <td>{transaction.category}</td>
                      <td>
                        <span className={`pill ${transaction.type}`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className={`num amount-${transaction.type}`}>
                        {formatCurrency(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
