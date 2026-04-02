import { useMemo, useState, type FormEvent } from 'react'
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
import {
  mockTransactions,
  transactionCategories as baseCategories,
} from './data/mockTransactions'
import type { Transaction, UserRole } from './types/finance'
import {
  calculateSummary,
  getCategoryBreakdown,
  getMonthlyTrendData,
} from './utils/finance'
import './App.css'

function App() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('viewer')
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | Transaction['type']>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc')
  const [editorMode, setEditorMode] = useState<'add' | 'edit' | null>(null)
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(
    null,
  )
  const [formState, setFormState] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    amount: '',
    category: baseCategories[0],
    type: 'expense' as Transaction['type'],
  })
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
    () =>
      Array.from(
        new Set([
          ...baseCategories,
          ...transactions.map((transaction) => transaction.category),
        ]),
      ),
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

  const clearEditor = () => {
    setEditorMode(null)
    setEditingTransactionId(null)
    setFormState({
      date: new Date().toISOString().slice(0, 10),
      description: '',
      amount: '',
      category: transactionCategories[0] ?? 'Groceries',
      type: 'expense',
    })
  }

  const openAddEditor = () => {
    setEditorMode('add')
    setEditingTransactionId(null)
    setFormState({
      date: new Date().toISOString().slice(0, 10),
      description: '',
      amount: '',
      category: transactionCategories[0] ?? 'Groceries',
      type: 'expense',
    })
  }

  const openEditEditor = (transaction: Transaction) => {
    setEditorMode('edit')
    setEditingTransactionId(transaction.id)
    setFormState({
      date: transaction.date,
      description: transaction.description,
      amount: String(transaction.amount),
      category: transaction.category,
      type: transaction.type,
    })
  }

  const saveTransaction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsedAmount = Number(formState.amount)
    if (!formState.description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return
    }

    const payload: Omit<Transaction, 'id'> = {
      date: formState.date,
      description: formState.description.trim(),
      amount: parsedAmount,
      category: formState.category,
      type: formState.type,
    }

    if (editorMode === 'edit' && editingTransactionId) {
      setTransactions((current) =>
        current.map((transaction) =>
          transaction.id === editingTransactionId
            ? {
                ...transaction,
                ...payload,
              }
            : transaction,
        ),
      )
      clearEditor()
      return
    }

    setTransactions((current) => [
      {
        ...payload,
        id: `txn-${Date.now()}`,
      },
      ...current,
    ])
    clearEditor()
  }

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
          <div className="transactions-header-row">
            <h2>Transactions</h2>
            {selectedRole === 'admin' ? (
              <button className="action-btn" type="button" onClick={openAddEditor}>
                + Add transaction
              </button>
            ) : (
              <p className="viewer-note">Viewer mode: read-only access</p>
            )}
          </div>
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
                    {selectedRole === 'admin' && <th className="num">Actions</th>}
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
                      {selectedRole === 'admin' && (
                        <td className="num">
                          <button
                            className="table-action"
                            type="button"
                            onClick={() => openEditEditor(transaction)}
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedRole === 'admin' && editorMode !== null && (
            <form className="editor-form" onSubmit={saveTransaction}>
              <h3>{editorMode === 'add' ? 'Add new transaction' : 'Edit transaction'}</h3>
              <div className="editor-grid">
                <label>
                  Date
                  <input
                    type="date"
                    value={formState.date}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, date: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  Amount
                  <input
                    type="number"
                    min="1"
                    value={formState.amount}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="0"
                    required
                  />
                </label>

                <label className="description-field">
                  Description
                  <input
                    type="text"
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Transaction description"
                    required
                  />
                </label>

                <label>
                  Category
                  <select
                    value={formState.category}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  >
                    {transactionCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Type
                  <select
                    value={formState.type}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        type: event.target.value as Transaction['type'],
                      }))
                    }
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </label>
              </div>

              <div className="editor-actions">
                <button className="action-btn" type="submit">
                  {editorMode === 'add' ? 'Save transaction' : 'Update transaction'}
                </button>
                <button className="secondary-btn" type="button" onClick={clearEditor}>
                  Cancel
                </button>
              </div>
            </form>
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
