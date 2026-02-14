"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { Loader2, Plus, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { TaxPayment } from '@/types'

export default function TaxComplianceReport() {
    const [loading, setLoading] = useState(true)
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'))
    const [payments, setPayments] = useState<TaxPayment[]>([])

    // Liability State
    const [tdsLiability, setTdsLiability] = useState(0)
    const [gstOutputLiability, setGstOutputLiability] = useState(0)
    const [gstInputCredit, setGstInputCredit] = useState(0)

    // Payment Modal
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentForm, setPaymentForm] = useState<Partial<TaxPayment>>({
        tax_type: 'TDS',
        payment_date: format(new Date(), 'yyyy-MM-dd')
    })
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchData()
    }, [selectedMonth])

    const fetchData = async () => {
        setLoading(true)
        const [year, month] = selectedMonth.split('-').map(Number)

        // Date Range for the selected month
        const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd 00:00:00')
        const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd 23:59:59')

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setTimeout(() => {
                // 1. Fetch Tax Payments (Mock)
                const localPayments = JSON.parse(localStorage.getItem('mock_tax_payments') || '[]')
                const filteredPayments = localPayments.filter((p: TaxPayment) =>
                    p.period_month === month && p.period_year === year
                )
                setPayments(filteredPayments)

                // 2. Calculate TDS Liability (Mock Expenses)
                const localExpenses = JSON.parse(localStorage.getItem('mock_expenses') || '[]')
                const currentMonthExpenses = localExpenses.filter((e: any) =>
                    e.date >= startDate.split(' ')[0] && e.date <= endDate.split(' ')[0] // Simple string compare for YYYY-MM-DD
                )

                const totalTds = currentMonthExpenses.reduce((sum: number, e: any) => sum + (Number(e.tds_amount) || 0), 0)
                setTdsLiability(totalTds)

                const totalInput = currentMonthExpenses.reduce((sum: number, e: any) =>
                    sum + (Number(e.cgst_amount) || 0) + (Number(e.sgst_amount) || 0) + (Number(e.igst_amount) || 0), 0)
                setGstInputCredit(totalInput)

                // 3. Calculate GST Liability (Mock Maintenance)
                const localMaintenance = JSON.parse(localStorage.getItem('mock_maintenance_fees') || '[]')
                // Assuming maintenance fee 'created_at' or 'due_date' falls in month? 
                // Let's use 'created_at' if available, or just filter by due_date for simplicity in mock
                const currentMonthIncome = localMaintenance.filter((m: any) => {
                    const date = m.created_at || m.payment_date || m.due_date
                    return date >= startDate && date <= endDate
                })

                const totalOutput = currentMonthIncome.reduce((sum: number, i: any) =>
                    sum + (Number(i.cgst_amount) || 0) + (Number(i.sgst_amount) || 0) + (Number(i.igst_amount) || 0), 0)
                setGstOutputLiability(totalOutput)

                setLoading(false)
            }, 500)
            return
        }

        try {
            // 1. Fetch Tax Payments
            const { data: taxPayments } = await supabase
                .from('tax_payments')
                .select('*')
                .eq('period_month', month)
                .eq('period_year', year)

            setPayments(taxPayments as TaxPayment[] || [])

            // 2. Calculate TDS Liability (Sum of tds_amount from expenses in this month)
            const { data: expenses } = await supabase
                .from('expenses')
                .select('tds_amount')
                .gte('date', startDate)
                .lte('date', endDate)
                .gt('tds_amount', 0)

            const totalTds = expenses?.reduce((sum, e) => sum + (e.tds_amount || 0), 0) || 0
            setTdsLiability(totalTds)

            // 3. Calculate GST Liability
            // Output GST (Maintenance Fees)
            const { data: income } = await supabase
                .from('maintenance_fees')
                .select('cgst_amount, sgst_amount, igst_amount')
                .or(`payment_date.gte.${startDate},created_at.gte.${startDate}`)
                .gte('created_at', startDate)
                .lte('created_at', endDate)

            const totalOutput = income?.reduce((sum, i) => sum + (i.cgst_amount || 0) + (i.sgst_amount || 0) + (i.igst_amount || 0), 0) || 0
            setGstOutputLiability(totalOutput)

            // Input GST (Expenses)
            const { data: expGst } = await supabase
                .from('expenses')
                .select('cgst_amount, sgst_amount, igst_amount')
                .gte('date', startDate)
                .lte('date', endDate)

            const totalInput = expGst?.reduce((sum, e) => sum + (e.cgst_amount || 0) + (e.sgst_amount || 0) + (e.igst_amount || 0), 0) || 0
            setGstInputCredit(totalInput)

        } catch (error) {
            console.error('Error fetching tax data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleRecordPayment = async () => {
        setSubmitting(true)
        const [year, month] = selectedMonth.split('-').map(Number)

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setTimeout(() => {
                const newPayment = {
                    ...paymentForm,
                    id: 'mock-pay-' + Date.now(),
                    period_month: month,
                    period_year: year,
                    amount_paid: Number(paymentForm.amount_paid),
                    created_at: new Date().toISOString()
                }
                const localPayments = JSON.parse(localStorage.getItem('mock_tax_payments') || '[]')
                localStorage.setItem('mock_tax_payments', JSON.stringify([...localPayments, newPayment]))

                setShowPaymentModal(false)
                setPaymentForm({ tax_type: 'TDS', payment_date: format(new Date(), 'yyyy-MM-dd') })
                fetchData()
                setSubmitting(false)
            }, 500)
            return
        }

        try {
            const { error } = await supabase.from('tax_payments').insert({
                ...paymentForm,
                period_month: month,
                period_year: year,
                amount_paid: Number(paymentForm.amount_paid)
            })

            if (error) throw error

            setShowPaymentModal(false)
            setPaymentForm({ tax_type: 'TDS', payment_date: format(new Date(), 'yyyy-MM-dd') })
            fetchData()
        } catch (error) {
            alert('Failed to record payment')
            console.error(error)
        } finally {
            setSubmitting(false)
        }
    }

    const tdsPaid = payments.filter(p => p.tax_type === 'TDS').reduce((sum, p) => sum + p.amount_paid, 0)
    const gstPaid = payments.filter(p => p.tax_type === 'GST').reduce((sum, p) => sum + p.amount_paid, 0)

    const tdsBalance = tdsLiability - tdsPaid
    const gstNetLiability = Math.max(0, gstOutputLiability - gstInputCredit)
    const gstBalance = gstNetLiability - gstPaid

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Compliance Period</h3>
                    <p className="text-sm text-muted-foreground">{format(new Date(selectedMonth), 'MMMM yyyy')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    />
                    <Button onClick={() => setShowPaymentModal(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Record Payment
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* TDS Card */}
                <Card className={tdsBalance > 0 ? "border-red-200 bg-red-50/50" : "border-green-200 bg-green-50/50"}>
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center justify-between">
                            TDS Compliance
                            {tdsBalance <= 0 && <CheckCircle className="h-5 w-5 text-green-600" />}
                        </CardTitle>
                        <CardDescription>Tax Deducted at Source</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Total Deducted (Liability):</span>
                            <span className="font-semibold">₹{tdsLiability.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Amount Paid:</span>
                            <span className="font-semibold text-green-600">₹{tdsPaid.toFixed(2)}</span>
                        </div>
                        <div className="pt-2 border-t flex justify-between items-center font-bold">
                            <span>Balance Due:</span>
                            <span className={tdsBalance > 0 ? "text-red-600" : "text-green-600"}>
                                ₹{Math.max(0, tdsBalance).toFixed(2)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* GST Card */}
                <Card className={gstBalance > 0 ? "border-orange-200 bg-orange-50/50" : "border-green-200 bg-green-50/50"}>
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center justify-between">
                            GST Compliance
                            {gstBalance <= 0 && <CheckCircle className="h-5 w-5 text-green-600" />}
                        </CardTitle>
                        <CardDescription>Goods & Services Tax</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Output Liability (Sales):</span>
                            <span className="font-semibold">₹{gstOutputLiability.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Input Credit (Purchases):</span>
                            <span className="font-semibold text-blue-600">- ₹{gstInputCredit.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-t border-dashed pt-1">
                            <span className="text-muted-foreground">Net Tax Payable:</span>
                            <span className="font-semibold">₹{gstNetLiability.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Amount Paid:</span>
                            <span className="font-semibold text-green-600">₹{gstPaid.toFixed(2)}</span>
                        </div>
                        <div className="pt-2 border-t flex justify-between items-center font-bold">
                            <span>Balance Due:</span>
                            <span className={gstBalance > 0 ? "text-red-600" : "text-green-600"}>
                                ₹{Math.max(0, gstBalance).toFixed(2)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-md border bg-card">
                <div className="p-4 border-b">
                    <h4 className="font-semibold">Payment History ({format(new Date(selectedMonth), 'MMMM yyyy')})</h4>
                </div>
                {payments.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No tax payments recorded for this month.</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="p-3 text-left">Date</th>
                                <th className="p-3 text-left">Type</th>
                                <th className="p-3 text-left">Reference</th>
                                <th className="p-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(p => (
                                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                                    <td className="p-3">{format(new Date(p.payment_date), 'dd MMM yyyy')}</td>
                                    <td className="p-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${p.tax_type === 'TDS' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                                            {p.tax_type}
                                        </span>
                                    </td>
                                    <td className="p-3 text-muted-foreground">{p.remarks ? `${p.remarks} (${p.reference_number})` : p.reference_number || '-'}</td>
                                    <td className="p-3 text-right font-medium">₹{p.amount_paid.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Payment Modal */}
            <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record Tax Payment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tax Type</label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                value={paymentForm.tax_type}
                                onChange={(e) => setPaymentForm({ ...paymentForm, tax_type: e.target.value as any })}
                            >
                                <option value="TDS">TDS Payment</option>
                                <option value="GST">GST Payment</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Payment Date</label>
                            <input
                                type="date"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                value={paymentForm.payment_date}
                                onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Amount Paid (₹)</label>
                            <input
                                type="number"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                value={paymentForm.amount_paid || ''}
                                onChange={e => setPaymentForm({ ...paymentForm, amount_paid: Number(e.target.value) })}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reference / Challan No</label>
                            <input
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                value={paymentForm.reference_number || ''}
                                onChange={e => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Remarks</label>
                            <input
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                value={paymentForm.remarks || ''}
                                onChange={e => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                            />
                        </div>
                        <Button className="w-full" onClick={handleRecordPayment} disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Record Payment
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
