"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { MaintenanceFee } from '@/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, Search, Filter, Download, CheckCircle, Trash2, Loader2, AlertCircle, IndianRupee } from 'lucide-react'
import { format } from 'date-fns'
import MaintenanceForm from './MaintenanceForm'
import { InvoiceTemplate } from './InvoiceTemplate'
import { FileText, Printer } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

// Extended interface to include joined unit data
interface MaintenanceFeeWithUnit extends MaintenanceFee {
    units?: {
        unit_number: string
        unit_type: string
        block_name?: string
        owner_id?: string
        owner?: {
            full_name: string
            email: string
            phone: string
        }
    }
}

export default function MaintenanceList() {
    const { profile } = useAuth()
    const isAdmin = profile?.role === 'app_admin' || profile?.role === 'management' || profile?.role === 'administration'
    const [fees, setFees] = useState<MaintenanceFeeWithUnit[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue' | 'partial'>('all')
    const [showForm, setShowForm] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [societyProfile, setSocietyProfile] = useState<any>(null)
    const [dateRange, setDateRange] = useState<{ from: string, to: string }>({ from: '', to: '' })

    // View/Print Modal State
    const [viewData, setViewData] = useState<{ type: 'invoice' | 'receipt' | 'voucher', data: MaintenanceFeeWithUnit } | null>(null)

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [selectedFee, setSelectedFee] = useState<MaintenanceFeeWithUnit | null>(null)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentProcessing, setPaymentProcessing] = useState(false)

    useEffect(() => {
        fetchFees()
        fetchSocietyProfile()
    }, [])

    const fetchSocietyProfile = async () => {
        const { data } = await supabase.from('society_profile').select('*').single()
        if (data) setSocietyProfile(data)
    }

    const fetchFees = async () => {
        setLoading(true)
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            // Simulate mock data with unit numbers for preview
            const STATIC_FEES: any[] = [
                { id: '1', unit_id: '101', amount: 1500, amount_paid: 1500, due_date: '2024-03-01', payment_status: 'paid', payment_date: '2024-02-28', payment_method: 'UPI', created_at: new Date().toISOString(), units: { unit_number: 'A-101', unit_type: 'flat' }, description: 'Monthly Maintenance' },
                { id: '2', unit_id: '102', amount: 1500, amount_paid: 0, due_date: '2024-03-01', payment_status: 'pending', created_at: new Date().toISOString(), units: { unit_number: 'A-102', unit_type: 'flat' }, description: 'Monthly Maintenance' },
                { id: '3', unit_id: '205', amount: 2000, amount_paid: 0, due_date: '2024-02-01', payment_status: 'overdue', created_at: new Date().toISOString(), units: { unit_number: 'B-201', unit_type: 'flat' }, description: 'Penalty' },
            ]

            // Merge with localStorage mock data
            // Check for window to avoid SSR issues
            const localFees = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mock_maintenance_fees') || '[]') : []

            setTimeout(() => {
                const allFees = [...localFees, ...STATIC_FEES]
                // Deduplicate by ID
                const uniqueFees = Array.from(new Map(allFees.map(item => [item.id, item])).values())
                setFees(uniqueFees)
                setLoading(false)
            }, 600)
            return
        }

        try {
            // First, if non-admin, find the user's unit(s)
            let unitIds: string[] = []
            if (!isAdmin && profile?.id) {
                const { data: userUnits } = await supabase
                    .from('units')
                    .select('id')
                    .eq('owner_id', profile.id)
                unitIds = (userUnits || []).map(u => u.id)
            }

            let query = supabase
                .from('maintenance_fees')
                .select('*, units(unit_number, unit_type, block_name, owner_id, owner:owner_id(full_name, email, phone))')
                .order('due_date', { ascending: false })

            // Non-admin users only see their own unit's fees
            if (!isAdmin && unitIds.length > 0) {
                query = query.in('unit_id', unitIds)
            } else if (!isAdmin && unitIds.length === 0) {
                // User has no units assigned, show nothing
                setFees([])
                setLoading(false)
                return
            }

            const { data, error } = await query
            if (error) throw error
            if (data) setFees(data as unknown as MaintenanceFeeWithUnit[])
        } catch (error) {
            console.error('Error fetching fees:', error)
            setFees([])
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this invoice? This cannot be undone.')) return
        setActionLoading(id)

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            // Mock delete
            setTimeout(() => {
                const localFees = JSON.parse(localStorage.getItem('mock_maintenance_fees') || '[]')
                const newFees = localFees.filter((f: any) => f.id !== id)
                localStorage.setItem('mock_maintenance_fees', JSON.stringify(newFees))
                fetchFees() // reload
                setActionLoading(null)
            }, 500)
            return
        }

        try {
            const { error } = await supabase.from('maintenance_fees').delete().eq('id', id)
            if (error) throw error
            setFees(prev => prev.filter(f => f.id !== id))
        } catch (error) {
            console.error('Error deleting fee:', error)
            alert('Failed to delete invoice')
        } finally {
            setActionLoading(null)
        }
    }

    const openPaymentModal = (fee: MaintenanceFeeWithUnit) => {
        setSelectedFee(fee)
        const due = fee.amount - (fee.amount_paid || 0)
        setPaymentAmount(due.toString())
        setShowPaymentModal(true)
    }

    const handleRecordPayment = async () => {
        if (!selectedFee || !paymentAmount) return

        const amountPaying = parseFloat(paymentAmount)
        if (isNaN(amountPaying) || amountPaying <= 0) {
            alert('Please enter a valid amount')
            return
        }

        const currentPaid = selectedFee.amount_paid || 0
        const totalPaid = currentPaid + amountPaying
        const balance = selectedFee.amount - totalPaid

        if (balance < 0) {
            alert('Amount cannot exceed total due amount')
            return
        }

        const newStatus = balance === 0 ? 'paid' : 'partial'
        setPaymentProcessing(true)

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            // Mock update
            setTimeout(() => {
                const localFees = JSON.parse(localStorage.getItem('mock_maintenance_fees') || '[]')
                // We also need to update static fees which aren't in local storage, but for this session we can just update localFees if present
                // Since static fees are re-declared on fetch, we can't persist changes to them easily in this mock setup without complex logic.
                // WE WILL ONLY UPDATE if it's in local fees, otherwise we just update state for now.

                const updatedFees = localFees.map((f: any) => f.id === selectedFee.id ? {
                    ...f,
                    payment_status: newStatus,
                    amount_paid: totalPaid,
                    payment_date: new Date().toISOString()
                } : f)

                localStorage.setItem('mock_maintenance_fees', JSON.stringify(updatedFees))

                // Manually update local state to reflect changes on static items too
                setFees(prev => prev.map(f => f.id === selectedFee.id ? {
                    ...f,
                    payment_status: newStatus as any,
                    amount_paid: totalPaid,
                    payment_date: new Date().toISOString()
                } : f))

                setShowPaymentModal(false)
                setPaymentProcessing(false)
                setSelectedFee(null)
            }, 500)
            return
        }

        try {
            const { error } = await supabase.from('maintenance_fees').update({
                payment_status: newStatus,
                amount_paid: totalPaid,
                payment_date: new Date().toISOString()
            }).eq('id', selectedFee.id)

            if (error) throw error

            setFees(prev => prev.map(f => f.id === selectedFee.id ? {
                ...f,
                payment_status: newStatus as any,
                amount_paid: totalPaid,
                payment_date: new Date().toISOString()
            } : f))
            setShowPaymentModal(false)
        } catch (error) {
            console.error('Error recording payment:', error)
            alert('Failed to record payment')
        } finally {
            setPaymentProcessing(false)
            setSelectedFee(null)
        }
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredFees.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(filteredFees.map(f => f.id))
        }
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const handleBulkAction = async (action: 'delete') => {
        if (action === 'delete') {
            if (!confirm(`Are you sure you want to delete ${selectedIds.length} invoices?`)) return
            setActionLoading('bulk_delete')

            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                // Mock delete
                setTimeout(() => {
                    const localFees = JSON.parse(localStorage.getItem('mock_maintenance_fees') || '[]')
                    const newFees = localFees.filter((f: any) => !selectedIds.includes(f.id))
                    localStorage.setItem('mock_maintenance_fees', JSON.stringify(newFees))
                    fetchFees()
                    setSelectedIds([])
                    setActionLoading(null)
                }, 500)
                return
            }

            try {
                const { error } = await supabase.from('maintenance_fees').delete().in('id', selectedIds)
                if (error) throw error
                setFees(prev => prev.filter(f => !selectedIds.includes(f.id)))
                setSelectedIds([])
            } catch (error) {
                console.error('Error deleting fees:', error)
                alert('Failed to delete invoices')
            } finally {
                setActionLoading(null)
            }
        }
    }

    const filteredFees = fees.filter(fee => {
        const unitNo = fee.units?.unit_number || fee.unit_id
        const matchesSearch = unitNo.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'all' || fee.payment_status === statusFilter

        let matchesDate = true
        if (dateRange.from && dateRange.to) {
            const feeDate = new Date(fee.due_date)
            const fromDate = new Date(dateRange.from)
            const toDate = new Date(dateRange.to)
            // Adjust toDate to end of day
            toDate.setHours(23, 59, 59, 999)
            matchesDate = feeDate >= fromDate && feeDate <= toDate
        }

        return matchesSearch && matchesStatus && matchesDate
    })

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
            case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
            case 'partial': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const handlePrint = () => {
        window.print()
    }

    const handleExportCSV = () => {
        const headers = ['ID', 'Unit', 'Description', 'Amount', 'Paid', 'Status', 'Due Date', 'Payment Date']
        const rows = filteredFees.map(f => [
            f.id,
            f.units?.unit_number || 'N/A',
            f.description || '',
            f.amount,
            f.amount_paid || 0,
            f.payment_status,
            f.due_date || '',
            f.payment_date || ''
        ])

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(e => e.join(','))].join("\n")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `maintenance_export_${format(new Date(), 'yyyy-MM-dd')}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <Card className="border-none shadow-none glass bg-transparent">
            {/* Header / Actions */}
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-4 px-0">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {isAdmin && selectedIds.length > 0 ? (
                        <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-md">
                            <span className="text-sm font-medium px-2">{selectedIds.length} selected</span>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleBulkAction('delete')}
                                disabled={!!actionLoading}
                            >
                                {actionLoading === 'bulk_delete' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Delete Selected
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedIds([])}
                            >
                                Cancel
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="relative flex-1 sm:flex-none">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="search"
                                    placeholder="Search Unit (e.g. A-101)..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-9 w-full sm:w-[200px] rounded-md border border-input bg-background pl-8 pr-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap hidden sm:inline-block">From:</span>
                                <input
                                    type="date"
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={dateRange.from}
                                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                                />
                                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap hidden sm:inline-block">To:</span>
                                <input
                                    type="date"
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={dateRange.to}
                                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    <option value="all">All Status</option>
                                    <option value="paid">Paid</option>
                                    <option value="pending">Pending</option>
                                    <option value="partial">Partial</option>
                                    <option value="overdue">Overdue</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    {isAdmin && (
                        <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleExportCSV}>
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                    )}
                    {isAdmin && (
                        <Button onClick={() => setShowForm(true)} className="flex-1 sm:flex-none">
                            <Plus className="mr-2 h-4 w-4" /> New Invoice
                        </Button>
                    )}
                </div>
            </CardHeader>

            {/* Modal Form (Dialog) */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Generate Invoice</DialogTitle>
                    </DialogHeader>
                    <MaintenanceForm
                        onSuccess={() => {
                            setShowForm(false)
                            fetchFees()
                        }}
                        onCancel={() => setShowForm(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Payment Modal (Dialog) */}
            <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                    </DialogHeader>
                    {selectedFee && (
                        <div className="space-y-4">
                            <div className="p-3 bg-muted rounded-md space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Amount:</span>
                                    <span className="font-medium">₹{selectedFee.amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Already Paid:</span>
                                    <span className="font-medium text-green-600">₹{(selectedFee.amount_paid || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm border-t pt-1 mt-1">
                                    <span className="font-medium">Balance Due:</span>
                                    <span className="font-bold text-destructive">₹{((selectedFee.amount) - (selectedFee.amount_paid || 0)).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Payment Amount (₹)</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Enter amount..."
                                />
                            </div>

                            <Button className="w-full" onClick={handleRecordPayment} disabled={paymentProcessing}>
                                {paymentProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <IndianRupee className="mr-2 h-4 w-4" />}
                                Record Payment
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* View/Print Modal */}
            <Dialog open={!!viewData} onOpenChange={(open) => !open && setViewData(null)}>
                <DialogContent className="max-w-[800px] w-full max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <DialogTitle>View {viewData?.type === 'receipt' ? 'Receipt' : 'Invoice'}</DialogTitle>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={handlePrint}>
                                Print
                            </Button>
                        </div>
                    </DialogHeader>
                    {viewData && societyProfile && (
                        <div className="print-container">
                            <InvoiceTemplate
                                type={viewData.type}
                                data={{
                                    ...viewData.data,
                                    user: (viewData.data.units as any)?.owner || { full_name: 'Resident', email: '', phone: '' }
                                }}
                                society={societyProfile}
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Data Table */}
            <CardContent className="px-0">
                <div className="rounded-md border bg-card">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    {isAdmin && (
                                        <th className="h-12 px-4 text-left align-middle w-[40px]">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300"
                                                checked={filteredFees.length > 0 && selectedIds.length === filteredFees.length}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                    )}
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[150px]">Unit</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Description</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Amount</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Due Date</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[120px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="border-b transition-colors hover:bg-muted/50">
                                            <td className="p-4"><div className="h-4 w-4 animate-pulse rounded bg-muted"></div></td>
                                            <td className="p-4"><div className="h-4 w-12 animate-pulse rounded bg-muted"></div></td>
                                            <td className="p-4"><div className="h-4 w-24 animate-pulse rounded bg-muted"></div></td>
                                            <td className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-muted"></div></td>
                                            <td className="p-4"><div className="h-4 w-20 animate-pulse rounded bg-muted"></div></td>
                                            <td className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-muted"></div></td>
                                            <td className="p-4"><div className="h-4 w-8 animate-pulse rounded bg-muted ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : filteredFees.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                            {isAdmin ? 'No maintenance records found. Generate some invoices to get started.' : 'No invoices found for your unit.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredFees.map((fee) => (
                                        <tr key={fee.id} className={`border-b transition-colors hover:bg-muted/50 group ${selectedIds.includes(fee.id) ? 'bg-muted/50' : ''}`}>
                                            {isAdmin && (
                                                <td className="p-4 align-middle">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-gray-300"
                                                        checked={selectedIds.includes(fee.id)}
                                                        onChange={() => toggleSelect(fee.id)}
                                                    />
                                                </td>
                                            )}
                                            <td className="p-4 align-middle font-medium">
                                                {fee.units?.unit_number || fee.unit_id}
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{fee.units?.unit_type}</div>
                                            </td>
                                            <td className="p-4 align-middle text-muted-foreground max-w-[200px] truncate" title={fee.description}>
                                                {fee.description || '-'}
                                                <div className="text-[10px] uppercase font-medium text-primary/70">{fee.fee_type === 'one_time' ? 'One Time' : 'Monthly'}</div>
                                            </td>
                                            <td className="p-4 align-middle font-medium">
                                                <div className="flex flex-col">
                                                    <span>₹ {fee.amount.toLocaleString()}</span>
                                                    {(fee.amount_paid && fee.amount_paid > 0) ? (
                                                        <span className="text-[10px] text-green-600 font-normal">
                                                            Paid: {fee.amount_paid.toLocaleString()}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle">
                                                {format(new Date(fee.due_date), 'MMM d, yyyy')}
                                            </td>
                                            <td className="p-4 align-middle">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(fee.payment_status)}`}>
                                                    {fee.payment_status.charAt(0).toUpperCase() + fee.payment_status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        title="Download Invoice"
                                                        onClick={() => alert(`Downloading invoice for ${fee.units?.unit_number} - ${fee.description}`)}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    {isAdmin && fee.payment_status !== 'paid' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                            title="Record Payment"
                                                            onClick={() => openPaymentModal(fee)}
                                                        >
                                                            <IndianRupee className="h-4 w-4" />
                                                        </Button>
                                                    )}


                                                    {/* View Invoice */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                                        title="View/Print Invoice"
                                                        onClick={() => setViewData({ type: 'invoice', data: fee })}
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                    </Button>

                                                    {/* Print Receipt (if paid/partial) */}
                                                    {(fee.payment_status === 'paid' || fee.payment_status === 'partial') && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-green-600 hover:text-green-900 hover:bg-green-50"
                                                            title="Print Receipt"
                                                            onClick={() => setViewData({ type: 'receipt', data: fee })}
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                        </Button>
                                                    )}

                                                    {isAdmin && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            title="Delete Invoice"
                                                            onClick={() => handleDelete(fee.id)}
                                                            disabled={actionLoading === fee.id}
                                                        >
                                                            {actionLoading === fee.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                        </Button>
                                                    )}
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
    )
}
