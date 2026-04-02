import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
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
import { fetchMockTransactions } from './api/mockFinanceApi'
import type { Transaction, UserRole } from './types/finance'
import {
  calculateSummary,
  getCategoryBreakdown,
  getMonthlyTrendData,
} from './utils/finance'
import './App.css'

type ThemeMode = 'light' | 'dark'
type GroupBy = 'none' | 'month' | 'category' | 'type'

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const storedTheme = localStorage.getItem('zorvyn.theme')
    return storedTheme === 'dark' ? 'dark' : 'light'
  })
  const [selectedRole, setSelectedRole] = useState<UserRole>('viewer')
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const stored = localStorage.getItem('zorvyn.transactions')
    if (!stored) {
      return mockTransactions
    }

    try {
      const parsed = JSON.parse(stored) as Transaction[]
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : mockTransactions
    } catch {
      return mockTransactions
    }
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | Transaction['type']>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [editorMode, setEditorMode] = useState<'add' | 'edit' | null>(null)
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(
    null,
  )
  const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  )
  const [apiLastSynced, setApiLastSynced] = useState<string>('Not synced yet')
  const [formState, setFormState] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    amount: '',
    category: baseCategories[0],
    type: 'expense' as Transaction['type'],
  })
  const transactionsHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const editorFormRef = useRef<HTMLFormElement | null>(null)
  const editorDateInputRef = useRef<HTMLInputElement | null>(null)
  const trendData = useMemo(() => getMonthlyTrendData(transactions), [transactions])
  const categoryData = useMemo(
    () => getCategoryBreakdown(transactions),
    [transactions],
  )

  const chartColors = ['#0d7f66', '#eaa640', '#ca5f52', '#7296d1', '#5f7d46']
  const monthGroupFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: 'numeric',
      }),
    [],
  )
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

  const monthlyComparison = useMemo(() => {
    if (trendData.length < 2) {
      return null
    }

    const previous = trendData[trendData.length - 2]
    const current = trendData[trendData.length - 1]
    return {
      currentMonth: current.month,
      previousMonth: previous.month,
      delta: current.balance - previous.balance,
    }
  }, [trendData])

  const savingsRate = useMemo(() => {
    if (quickStats.income <= 0) {
      return 0
    }

    return (quickStats.balance / quickStats.income) * 100
  }, [quickStats])

  useEffect(() => {
    localStorage.setItem('zorvyn.transactions', JSON.stringify(transactions))
  }, [transactions])

  useEffect(() => {
    localStorage.setItem('zorvyn.theme', theme)
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

  const syncFromMockApi = useCallback(
    async (applyData: boolean) => {
      setApiStatus('loading')

      try {
        const apiTransactions = await fetchMockTransactions()
        if (applyData) {
          setTransactions(apiTransactions)
        }
        setApiStatus('ready')
        setApiLastSynced(
          new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
            day: 'numeric',
          }).format(new Date()),
        )
      } catch {
        setApiStatus('error')
      }
    },
    [],
  )

  useEffect(() => {
    const hasStoredTransactions = Boolean(localStorage.getItem('zorvyn.transactions'))
    const timer = window.setTimeout(() => {
      void syncFromMockApi(!hasStoredTransactions)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [syncFromMockApi])

  const groupedTransactions = useMemo(() => {
    if (groupBy === 'none') {
      return []
    }

    const groupMap = new Map<string, Transaction[]>()

    filteredTransactions.forEach((transaction) => {
      let key = ''

      if (groupBy === 'month') {
        key = transaction.date.slice(0, 7)
      } else if (groupBy === 'category') {
        key = transaction.category
      } else {
        key = transaction.type
      }

      const existing = groupMap.get(key) ?? []
      groupMap.set(key, [...existing, transaction])
    })

    return Array.from(groupMap.entries())
      .map(([key, rows]) => {
        const total = rows.reduce((sum, transaction) => sum + transaction.amount, 0)
        const label =
          groupBy === 'month'
            ? monthGroupFormatter.format(new Date(`${key}-01`))
            : groupBy === 'type'
              ? key === 'income'
                ? 'Income'
                : 'Expense'
              : key

        return {
          key,
          label,
          rows,
          total,
        }
      })
      .sort((left, right) => {
        if (groupBy === 'month') {
          return right.key.localeCompare(left.key)
        }

        if (groupBy === 'type') {
          return left.key === 'income' ? -1 : 1
        }

        return right.total - left.total
      })
  }, [filteredTransactions, groupBy, monthGroupFormatter])

  const exportTransactions = useCallback(
    (format: 'csv' | 'json') => {
      const payload = filteredTransactions.map((transaction) => ({
        date: transaction.date,
        description: transaction.description,
        category: transaction.category,
        type: transaction.type,
        amount: transaction.amount,
      }))

      const fileContent =
        format === 'json'
          ? JSON.stringify(payload, null, 2)
          : [
              'Date,Description,Category,Type,Amount',
              ...payload.map((transaction) =>
                [
                  transaction.date,
                  transaction.description,
                  transaction.category,
                  transaction.type,
                  transaction.amount,
                ]
                  .map((value) => `"${String(value).replace(/"/g, '""')}"`)
                  .join(','),
              ),
            ].join('\n')

      const blob = new Blob([fileContent], {
        type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8',
      })
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `zorvyn-transactions.${format}`
      link.click()
      URL.revokeObjectURL(downloadUrl)
    },
    [filteredTransactions],
  )

  const focusTransactionsOutput = () => {
    const heading = transactionsHeadingRef.current
    if (!heading) {
      return
    }

    heading.scrollIntoView({ behavior: 'smooth', block: 'start' })
    heading.focus({ preventScroll: true })
  }

  useEffect(() => {
    if (editorMode === null) {
      return
    }

    window.requestAnimationFrame(() => {
      editorFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      editorDateInputRef.current?.focus()
    })
  }, [editorMode])

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
    window.requestAnimationFrame(() => {
      focusTransactionsOutput()
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
        <div className="topbar-actions">
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
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
        </div>
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
          {trendData.length === 0 ? (
            <p className="muted-copy">No trend data yet.</p>
          ) : (
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
          )}
        </article>
        <article className="panel">
          <h2>Spending Breakdown</h2>
          {categoryData.length === 0 ? (
            <p className="muted-copy">No expense categories to chart.</p>
          ) : (
            <>
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
                      style={{
                        backgroundColor: chartColors[index % chartColors.length],
                      }}
                    />
                    {row.category}
                  </span>
                ))}
              </div>
            </>
          )}
        </article>
      </section>

      <section className="grid-section">
        <article className="panel">
          <div className="transactions-header-row">
            <h2 ref={transactionsHeadingRef} tabIndex={-1} className="section-focus-target">
              Transactions
            </h2>
            <div className="transactions-header-actions">
              <button className="secondary-btn" type="button" onClick={() => exportTransactions('csv')}>
                Export CSV
              </button>
              <button className="secondary-btn" type="button" onClick={() => exportTransactions('json')}>
                Export JSON
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={() => void syncFromMockApi(true)}
                disabled={apiStatus === 'loading'}
              >
                {apiStatus === 'loading' ? 'Syncing…' : 'Sync mock API'}
              </button>
              {selectedRole === 'admin' ? (
                <button className="action-btn" type="button" onClick={openAddEditor}>
                  + Add transaction
                </button>
              ) : (
                <p className="viewer-note">Viewer mode: read-only access</p>
              )}
            </div>
          </div>
          <p className="api-status">
            API: {apiStatus === 'loading' ? 'Loading mock data' : apiStatus === 'error' ? 'Sync failed' : 'Connected'}
            {' '}
            | Last sync: {apiLastSynced}
          </p>
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

            <select
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value as GroupBy)}
              aria-label="Group transactions"
            >
              <option value="none">No grouping</option>
              <option value="month">Group by month</option>
              <option value="category">Group by category</option>
              <option value="type">Group by type</option>
            </select>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <h3>No transactions match this filter set.</h3>
              <p>Try clearing the search or changing filters.</p>
            </div>
          ) : groupBy === 'none' ? (
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
          ) : (
            <div className="grouped-list">
              {groupedTransactions.map((group) => (
                <article className="group-panel" key={group.key}>
                  <div className="group-header">
                    <div>
                      <h3>{group.label}</h3>
                      <p>
                        {group.rows.length} transaction{group.rows.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <strong>{formatCurrency(group.total)}</strong>
                  </div>

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
                        {group.rows.map((transaction) => (
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
                </article>
              ))}
            </div>
          )}

          {selectedRole === 'admin' && editorMode !== null && (
            <form ref={editorFormRef} className="editor-form" onSubmit={saveTransaction}>
              <h3>{editorMode === 'add' ? 'Add new transaction' : 'Edit transaction'}</h3>
              <div className="editor-grid">
                <label>
                  Date
                  <input
                    ref={editorDateInputRef}
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
        <article className="panel insights-grid">
          <h2>Insights</h2>
          <div className="insight-cards">
            <div>
              <span>Highest spending category</span>
              <strong>
                {categoryData[0]
                  ? `${categoryData[0].category} (${formatCurrency(categoryData[0].amount)})`
                  : 'No spending data'}
              </strong>
            </div>
            <div>
              <span>Monthly comparison</span>
              <strong>
                {monthlyComparison
                  ? `${monthlyComparison.currentMonth} vs ${monthlyComparison.previousMonth}: ${monthlyComparison.delta >= 0 ? '+' : ''}${formatCurrency(monthlyComparison.delta)}`
                  : 'Need at least two months of data'}
              </strong>
            </div>
            <div>
              <span>Savings rate</span>
              <strong>{Number.isFinite(savingsRate) ? `${savingsRate.toFixed(1)}%` : 'N/A'}</strong>
            </div>
          </div>
        </article>
      </section>

      <footer className="panel footer-note">
        <p>
          Active role: <strong>{selectedRole}</strong>. Theme: <strong>{theme}</strong>. Data is persisted in local storage.
        </p>
      </footer>
    </main>
  )
}

export default App
