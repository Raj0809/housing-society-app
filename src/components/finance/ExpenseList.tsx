"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Expense, ExpenditureCategory } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, Search, Filter, Download, Calendar, Loader2, DollarSign, TrendingUp, TrendingDown, Receipt } from 'lucide-react'
import { format } from 'date-fns'
import { VoucherTemplate } from './VoucherTemplate'
import { FileText, Printer } from 'lucide-react'

export default function ExpenseList() {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [viewData, setViewData] = useState<Expense | null>(null)
    const [societyProfile, setSocietyProfile] = useState<any>(null)

    // Form State
    const [formData, setFormData] = useState<Partial<Expense> & {
        // tax fields for manual entry
        taxable_amount?: number
        cgst_amount?: number
        sgst_amount?: number
        igst_amount?: number
        // TDS
        tds_applicable?: boolean
        tds_percentage?: number
        tds_amount?: number
    }>({
        date: '',
        payment_method: 'Bank Transfer'
    })

    const [categories, setCategories] = useState<ExpenditureCategory[]>([])
    const [dateRange, setDateRange] = useState<{ from: string, to: string }>({ from: '', to: '' })

    useEffect(() => {
        setFormData(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }))
        fetchSocietyProfile()
    }, [])

    const fetchSocietyProfile = async () => {
        const { data } = await supabase.from('society_profile').select('*').single()
        if (data) setSocietyProfile(data)
    }

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            // Mock Data
            const MOCK_EXPENSES: Expense[] = [
                { id: '1', title: 'Security Guard Salary', amount: 15000, date: '2024-03-01', category: 'Salary', payee: 'SecureGuard Agency', payment_method: 'Bank Transfer', created_at: new Date().toISOString() },
                { id: '2', title: 'Garden Maintenance', amount: 2500, date: '2024-03-02', category: 'Gardening', payee: 'Green Thumb Services', payment_method: 'UPI', created_at: new Date().toISOString() },
            ]

            // Mock Categories (ensure we have some)
            const defaultCats: ExpenditureCategory[] = [
                { id: 'c1', name: 'Maintenance', classification: 'Revenue', type: 'Operational', nature: 'Recurring', is_active: true, created_at: '' },
                { id: 'c2', name: 'Utilities', classification: 'Revenue', type: 'Utility', nature: 'Variable', is_active: true, created_at: '' },
                { id: 'c3', name: 'Assets', classification: 'Capital', type: 'Capital', nature: 'One-time', is_active: true, created_at: '' }
            ]

            const localExpenses = JSON.parse(localStorage.getItem('mock_expenses') || '[]')
            const localCategories = JSON.parse(localStorage.getItem('mock_expenditure_categories') || '[]')

            const finalCats = localCategories.length > 0 ? localCategories : defaultCats

            setTimeout(() => {
                setExpenses([...localExpenses, ...MOCK_EXPENSES])
                setCategories(finalCats)
                setLoading(false)
            }, 600)
            return
        }

        try {
            const [expensesRes, categoriesRes] = await Promise.all([
                supabase.from('expenses').select('*').order('date', { ascending: false }),
                supabase.from('expenditure_categories').select('*').eq('is_active', true).order('name')
            ])

            if (expensesRes.error) throw expensesRes.error
            if (categoriesRes.error) throw categoriesRes.error

            if (expensesRes.data) setExpenses(expensesRes.data as Expense[])
            if (categoriesRes.data) setCategories(categoriesRes.data as ExpenditureCategory[])
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this expense?')) return

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const localExpenses = JSON.parse(localStorage.getItem('mock_expenses') || '[]')
            const newExpenses = localExpenses.filter((e: any) => e.id !== id)
            localStorage.setItem('mock_expenses', JSON.stringify(newExpenses))
            // Refresh data effectively
            setExpenses(prev => prev.filter(e => e.id !== id))
            return
        }

        try {
            const { error } = await supabase.from('expenses').delete().eq('id', id)
            if (error) throw error
            setExpenses(prev => prev.filter(e => e.id !== id))
        } catch (error) {
            console.error('Error deleting expense:', error)
            alert('Failed to delete expense')
        }
    }

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title || !formData.amount || !formData.date || !formData.category) {
            alert('Please fill in all required fields')
            return
        }
        setSubmitting(true)

        let expenseData: any = {
            ...formData,
            amount: Number(formData.amount),
        }

        // Manual Tax Entry Logic
        const taxable = Number(formData.taxable_amount) || 0
        const cgst = Number(formData.cgst_amount) || 0
        const sgst = Number(formData.sgst_amount) || 0
        const igst = Number(formData.igst_amount) || 0

        // TDS Logic
        const tdsApplicable = formData.tds_applicable || false
        const tdsRate = Number(formData.tds_percentage) || 0
        const tdsAmount = Number(formData.tds_amount) || 0

        // If taxable amount is provided, use it and sum up taxes for total
        if (taxable > 0 || cgst > 0 || sgst > 0 || igst > 0) {
            expenseData.taxable_amount = taxable
            expenseData.cgst_amount = cgst
            expenseData.sgst_amount = sgst
            expenseData.igst_amount = igst
            expenseData.amount = taxable + cgst + sgst + igst // Total Bill Amount
        } else {
            expenseData.taxable_amount = null
            expenseData.cgst_amount = 0
            expenseData.sgst_amount = 0
            expenseData.igst_amount = 0
            // expenseData.amount is already set from formData.amount
        }

        expenseData.tds_applicable = tdsApplicable
        expenseData.tds_percentage = tdsRate
        expenseData.tds_amount = tdsAmount

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setTimeout(() => {
                const localExpenses = JSON.parse(localStorage.getItem('mock_expenses') || '[]')
                let updated
                if (formData.id) {
                    updated = localExpenses.map((e: any) => e.id === formData.id ? { ...e, ...expenseData } : e)
                } else {
                    const newId = 'mock-' + Date.now()
                    updated = [{ ...expenseData, id: newId, created_at: new Date().toISOString() }, ...localExpenses]
                }

                localStorage.setItem('mock_expenses', JSON.stringify(updated))

                if (formData.id) {
                    setExpenses(prev => prev.map(e => e.id === formData.id ? { ...e, ...expenseData } : e))
                } else {
                    setExpenses(prev => [{ ...expenseData, id: 'mock-' + Date.now(), created_at: new Date().toISOString() }, ...prev])
                }

                setSubmitting(false)
                setShowForm(false)
                setSubmitting(false)
                setShowForm(false)
                setFormData({ date: new Date().toISOString().split('T')[0], payment_method: 'Bank Transfer' })
            }, 800)
            return
        }

        try {
            if (formData.id) {
                const { error } = await supabase.from('expenses').update(expenseData).eq('id', formData.id)
                if (error) throw error
            } else {
                const { error } = await supabase.from('expenses').insert(expenseData)
                if (error) throw error
            }

            fetchData()
            setShowForm(false)
            fetchData()
            setShowForm(false)
            setFormData({ date: new Date().toISOString().split('T')[0], payment_method: 'Bank Transfer' })
        } catch (error) {
            console.error('Error saving expense:', error)
            alert('Failed to save expense')
        } finally {
            setSubmitting(false)
        }
    }

    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const currentMonth = new Date().getMonth()
    const thisMonthSpent = expenses
        .filter(e => new Date(e.date).getMonth() === currentMonth)
        .reduce((sum, e) => sum + e.amount, 0)

    const filteredExpenses = expenses.filter(e => {
        const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
            e.category.toLowerCase().includes(search.toLowerCase())

        let matchesDate = true
        if (dateRange.from && dateRange.to) {
            const expDate = new Date(e.date)
            const fromDate = new Date(dateRange.from)
            const toDate = new Date(dateRange.to)
            // Adjust toDate to end of day
            toDate.setHours(23, 59, 59, 999)
            matchesDate = expDate >= fromDate && expDate <= toDate
        }

        return matchesSearch && matchesDate
    })

    const handleExportCSV = () => {
        const headers = ['Date', 'Title', 'Category', 'Payee', 'Payment Method', 'Amount', 'Reference']
        const rows = filteredExpenses.map(e => [
            e.date,
            `"${e.title.replace(/"/g, '""')}"`, // Escape quotes
            e.category,
            e.payee || '',
            e.payment_method,
            e.amount,
            e.bank_particulars || ''
        ])

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(e => e.join(','))].join("\n")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `expenses_export_${format(new Date(), 'yyyy-MM-dd')}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Spent (All Time)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalSpent.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Month</CardTitle>
                        <TrendingUp className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{thisMonthSpent.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {new Date().toLocaleString('default', { month: 'long' })} Spending
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{expenses.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Card className="border-none shadow-none glass bg-transparent">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-4 px-0">
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Search expenses..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 w-full sm:w-[250px] rounded-md border border-input bg-background pl-8 pr-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                    <Button onClick={() => {
                        setFormData({ date: new Date().toISOString().split('T')[0], payment_method: 'Bank Transfer' })
                        setShowForm(true)
                    }}>
                        <Plus className="mr-2 h-4 w-4" /> Record Expense
                    </Button>
                </CardHeader>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-2 mb-4 p-1">
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Date Filter:</span>
                    <input
                        type="date"
                        className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={dateRange.from}
                        onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    />
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">to</span>
                    <input
                        type="date"
                        className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={dateRange.to}
                        onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    />
                    <div className="ml-auto">
                        <Button variant="outline" size="sm" onClick={handleExportCSV}>
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                    </div>
                </div>

                {/* Expense Form Modal (Dialog) */}
                <Dialog open={showForm} onOpenChange={setShowForm}>
                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{formData.id ? 'Edit Expense' : 'Record New Expense'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddExpense} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Title / Description</label>
                                <input
                                    required
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                    value={formData.title || ''}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Broken Pipe Repair"
                                />
                            </div>


                            <div className="space-y-4 rounded-md border p-3 bg-muted/20">
                                <h4 className="text-sm font-medium">Taxation Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Taxable Amount</label>
                                        <input
                                            type="number"
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                            value={formData.taxable_amount || ''}
                                            onChange={e => {
                                                const val = Number(e.target.value)
                                                setFormData(prev => {
                                                    const total = val + (prev.cgst_amount || 0) + (prev.sgst_amount || 0) + (prev.igst_amount || 0)
                                                    return { ...prev, taxable_amount: val, amount: total }
                                                })
                                            }}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">IGST</label>
                                        <input
                                            type="number"
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                            value={formData.igst_amount || ''}
                                            onChange={e => {
                                                const val = Number(e.target.value)
                                                setFormData(prev => {
                                                    const total = (prev.taxable_amount || 0) + (prev.cgst_amount || 0) + (prev.sgst_amount || 0) + val
                                                    return { ...prev, igst_amount: val, amount: total }
                                                })
                                            }}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">CGST</label>
                                        <input
                                            type="number"
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                            value={formData.cgst_amount || ''}
                                            onChange={e => {
                                                const val = Number(e.target.value)
                                                setFormData(prev => {
                                                    const total = (prev.taxable_amount || 0) + val + (prev.sgst_amount || 0) + (prev.igst_amount || 0)
                                                    return { ...prev, cgst_amount: val, amount: total }
                                                })
                                            }}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">SGST</label>
                                        <input
                                            type="number"
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                            value={formData.sgst_amount || ''}
                                            onChange={e => {
                                                const val = Number(e.target.value)
                                                setFormData(prev => {
                                                    const total = (prev.taxable_amount || 0) + (prev.cgst_amount || 0) + val + (prev.igst_amount || 0)
                                                    return { ...prev, sgst_amount: val, amount: total }
                                                })
                                            }}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>



                            {/* TDS Section */}
                            <div className="space-y-4 rounded-md border p-3 bg-blue-50/50">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="tds_applicable"
                                        className="h-4 w-4 rounded border-gray-300"
                                        checked={formData.tds_applicable || false}
                                        onChange={e => {
                                            const applicable = e.target.checked
                                            setFormData(prev => {
                                                if (!applicable) {
                                                    return { ...prev, tds_applicable: false, tds_percentage: 0, tds_amount: 0 }
                                                }
                                                return { ...prev, tds_applicable: true }
                                            })
                                        }}
                                    />
                                    <label htmlFor="tds_applicable" className="text-sm font-medium text-gray-700">Deduct TDS?</label>
                                </div>

                                {formData.tds_applicable && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">TDS Rate (%)</label>
                                            <input
                                                type="number"
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                                value={formData.tds_percentage || ''}
                                                onChange={e => {
                                                    const rate = Number(e.target.value)
                                                    const taxable = formData.taxable_amount || 0
                                                    // TDS is typically calculated on Taxable Amount or Total Amount depending on section.
                                                    // Usually on Taxable Amount (base) for professional fees, contractors etc.
                                                    // Let's assume Taxable Amount if present, otherwise on Total Amount (which might include tax? No, TDS is on income).
                                                    // If manual tax entry is used, we have 'taxable_amount'.
                                                    // If not (legacy flow), we might just have 'amount'.
                                                    // Let's use taxable_amount if > 0, else amount.
                                                    const base = taxable > 0 ? taxable : (formData.amount || 0)
                                                    const tdsAmt = (base * rate) / 100
                                                    setFormData(prev => ({ ...prev, tds_percentage: rate, tds_amount: tdsAmt }))
                                                }}
                                                placeholder="e.g. 1, 2, 10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">TDS Amount</label>
                                            <input
                                                type="number"
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-semibold text-red-600"
                                                value={formData.tds_amount || ''}
                                                readOnly
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>


                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Total Bill Amount (Expense)</label>
                                    <input
                                        type="number"
                                        required
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-bold bg-muted"
                                        value={formData.amount || ''}
                                        readOnly={true}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Net Payable to Vendor</label>
                                    <div className="flex h-9 w-full items-center rounded-md border border-green-200 bg-green-50 px-3 py-1 text-sm font-bold text-green-700">
                                        ₹ {((formData.amount || 0) - (formData.tds_amount || 0)).toFixed(2)}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Expense Head & Classification</label>
                                    <select
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                        value={formData.category || ''}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Expense Head...</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.name}>
                                                {c.name} — {c.classification}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Payee</label>
                                    <input
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                        value={formData.payee || ''}
                                        onChange={e => setFormData({ ...formData, payee: e.target.value })}
                                        placeholder="Vendor Name"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Payment Mode</label>
                                    <select
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                        value={formData.payment_method || 'Cash'}
                                        onChange={e => setFormData({ ...formData, payment_method: e.target.value as any })}
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Cheque">Cheque</option>
                                    </select>
                                </div>
                                {formData.payment_method !== 'Cash' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Bank Particulars</label>
                                        <input
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                            value={formData.bank_particulars || ''}
                                            onChange={e => setFormData({ ...formData, bank_particulars: e.target.value })}
                                            placeholder="Txn ID / Cheque No"
                                        />
                                    </div>
                                )}
                            </div>
                            <Button className="w-full" type="submit" disabled={submitting}>
                                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                {formData.id ? 'Update Expense' : 'Save Expense'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Voucher Modal */}
                <Dialog open={!!viewData} onOpenChange={(open) => !open && setViewData(null)}>
                    <DialogContent className="max-w-[800px] w-full max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="flex flex-row items-center justify-between">
                            <DialogTitle>Expense Voucher</DialogTitle>
                            <Button size="sm" variant="outline" onClick={handlePrint}>
                                <Printer className="mr-2 h-4 w-4" /> Print
                            </Button>
                        </DialogHeader>
                        {viewData && (
                            <div className="print-container">
                                <VoucherTemplate
                                    data={viewData}
                                    societyName={societyProfile?.name}
                                />
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <CardContent className="px-0">
                    <div className="rounded-md border bg-card">
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Description</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Expense Head</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Payment</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="border-b transition-colors hover:bg-muted/50">
                                                <td className="p-4"><div className="h-4 w-24 animate-pulse rounded bg-muted"></div></td>
                                                <td className="p-4"><div className="h-4 w-32 animate-pulse rounded bg-muted"></div></td>
                                                <td className="p-4"><div className="h-4 w-24 animate-pulse rounded bg-muted"></div></td>
                                                <td className="p-4"><div className="h-4 w-24 animate-pulse rounded bg-muted"></div></td>
                                                <td className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-muted ml-auto"></div></td>
                                                <td className="p-4"><div className="h-4 w-8 animate-pulse rounded bg-muted ml-auto"></div></td>
                                            </tr>
                                        ))
                                    ) : filteredExpenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                No expenses recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredExpenses.map((expense) => (
                                            <tr key={expense.id} className="border-b transition-colors hover:bg-muted/50 group">
                                                <td className="p-4 align-middle">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                                        {format(new Date(expense.date), 'MMM d, yyyy')}
                                                    </div>
                                                </td>
                                                <td className="p-4 align-middle font-medium">
                                                    <div>{expense.title}</div>
                                                    <div className="text-xs text-muted-foreground">{expense.payee}</div>
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-foreground transition-colors">
                                                        {expense.category}
                                                    </span>
                                                </td>
                                                <td className="p-4 align-middle text-muted-foreground">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-medium text-foreground">{expense.payment_method}</span>
                                                        {expense.bank_particulars && (
                                                            <span className="text-[10px]">{expense.bank_particulars}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 align-middle text-right font-medium">₹ {expense.amount.toLocaleString()}</td>
                                                <td className="p-4 align-middle text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 hover:bg-muted"
                                                            onClick={() => {
                                                                setFormData(expense)
                                                                setShowForm(true)
                                                            }}
                                                        >
                                                            <span className="sr-only">Edit</span>
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                                <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                                                                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                                                            </svg>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleDelete(expense.id)}
                                                        >
                                                            <span className="sr-only">Delete</span>
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                                            </svg>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-gray-600 hover:bg-gray-100"
                                                            title="Print Voucher"
                                                            onClick={() => setViewData(expense)}
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </CardContent>
            </Card >
        </div >
    )
}
