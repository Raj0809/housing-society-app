"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from 'date-fns'

interface GSTReportProps {
    dateRange: {
        start: string
        end: string
    }
}

export default function GSTReport({ dateRange }: GSTReportProps) {
    const [loading, setLoading] = useState(true)
    const [inputGst, setInputGst] = useState<any[]>([])
    const [outputGst, setOutputGst] = useState<any[]>([])

    const [gstPayments, setGstPayments] = useState<number>(0)

    useEffect(() => {
        fetchGSTData()
    }, [dateRange])

    const fetchGSTData = async () => {
        setLoading(true)
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            // Mock Data
            setTimeout(() => {
                setOutputGst([
                    { id: '1', date: '2026-02-01', unit: 'A-101', taxable: 5000, cgst: 450, sgst: 450, igst: 0, total_tax: 900 },
                    { id: '2', date: '2026-02-05', unit: 'B-202', taxable: 6000, cgst: 540, sgst: 540, igst: 0, total_tax: 1080 },
                ])
                setInputGst([
                    { id: '1', date: '2026-02-02', payee: 'SecureGuard', taxable: 15000, cgst: 1350, sgst: 1350, igst: 0, total_tax: 2700 },
                    { id: '2', date: '2026-02-04', payee: 'Tech Solutions (Delhi)', taxable: 20000, cgst: 0, sgst: 0, igst: 3600, total_tax: 3600 },
                ])

                // Fetch Mock Payments
                const localPayments = JSON.parse(localStorage.getItem('mock_tax_payments') || '[]')
                const totalPaid = localPayments
                    .filter((p: any) => p.tax_type === 'GST' && p.payment_date >= dateRange.start && p.payment_date <= dateRange.end)
                    .reduce((sum: number, p: any) => sum + (Number(p.amount_paid) || 0), 0)
                setGstPayments(totalPaid)

                setLoading(false)
            }, 800)
            return
        }

        try {
            // Fetch Output GST (Maintenance Fees)
            // We only care about records with tax_amount > 0 or where gst fields are populated
            const { data: fees, error: feeError } = await supabase
                .from('maintenance_fees')
                .select('*, units(unit_number)')
                .gte('created_at', dateRange.start)
                .lte('created_at', dateRange.end + 'T23:59:59')
                .gt('tax_amount', 0)

            if (feeError) throw feeError

            // Fetch Input GST (Expenses)
            // We only care about expenses with taxable_amount > 0
            const { data: expenses, error: expError } = await supabase
                .from('expenses')
                .select('*')
                .gte('date', dateRange.start)
                .lte('date', dateRange.end)
                .not('taxable_amount', 'is', null)

            if (expError) throw expError

            // Fetch Tax Payments
            const { data: payments, error: payError } = await supabase
                .from('tax_payments')
                .select('amount_paid')
                .eq('tax_type', 'GST')
                .gte('payment_date', dateRange.start)
                .lte('payment_date', dateRange.end)

            if (payError) throw payError

            const totalPaid = (payments || []).reduce((sum, p) => sum + (p.amount_paid || 0), 0)
            setGstPayments(totalPaid)

            const formattedOutput = (fees || []).map((f: any) => ({
                id: f.id,
                date: format(new Date(f.created_at), 'yyyy-MM-dd'),
                unit: f.units?.unit_number || 'Unknown',
                taxable: f.taxable_amount || f.amount, // Fallback if taxable not set (old records should be 0 tax anyway)
                cgst: f.cgst_amount || 0,
                sgst: f.sgst_amount || 0,
                igst: f.igst_amount || 0,
                total_tax: f.tax_amount || 0
            }))

            const formattedInput = (expenses || []).map((e: any) => ({
                id: e.id,
                date: e.date,
                payee: e.payee || e.title,
                taxable: e.taxable_amount || 0,
                cgst: e.cgst_amount || 0,
                sgst: e.sgst_amount || 0,
                igst: e.igst_amount || 0,
                total_tax: (e.cgst_amount || 0) + (e.sgst_amount || 0) + (e.igst_amount || 0)
            }))

            setOutputGst(formattedOutput)
            setInputGst(formattedInput)

        } catch (error) {
            console.error('Error fetching GST data:', error)
        } finally {
            setLoading(false)
        }
    }

    const outputTotal = outputGst.reduce((sum, item) => sum + item.total_tax, 0)
    const inputTotal = inputGst.reduce((sum, item) => sum + item.total_tax, 0)

    // Bifurcated Output
    const outputCGST = outputGst.reduce((sum, item) => sum + item.cgst, 0)
    const outputSGST = outputGst.reduce((sum, item) => sum + item.sgst, 0)
    const outputIGST = outputGst.reduce((sum, item) => sum + item.igst, 0)

    // Bifurcated Input
    const inputCGST = inputGst.reduce((sum, item) => sum + item.cgst, 0)
    const inputSGST = inputGst.reduce((sum, item) => sum + item.sgst, 0)
    const inputIGST = inputGst.reduce((sum, item) => sum + item.igst, 0)

    const netPayable = outputTotal - inputTotal - gstPayments

    const handleDownloadCSV = () => {
        // Output GST CSV
        const outputRows = [['Date', 'Unit', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax']]
        outputGst.forEach(row => {
            outputRows.push([row.date, row.unit, row.taxable, row.cgst, row.sgst, row.igst, row.total_tax])
        })

        // Input GST CSV
        const inputRows = [['Date', 'Payee/Expense', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax']]
        inputGst.forEach(row => {
            inputRows.push([row.date, row.payee, row.taxable, row.cgst, row.sgst, row.igst, row.total_tax])
        })

        const csvContent = "data:text/csv;charset=utf-8,"
            + "OUTPUT GST (Liability)\n"
            + outputRows.map(e => e.join(",")).join("\n")
            + "\n\nINPUT GST (Credit)\n"
            + inputRows.map(e => e.join(",")).join("\n")
            + `\n\nNet Payable: ${netPayable}`

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `GST_Report_${dateRange.start}_to_${dateRange.end}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Output Liability</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">₹{outputTotal.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            <div>CGST: ₹{outputCGST.toFixed(2)}</div>
                            <div>SGST: ₹{outputSGST.toFixed(2)}</div>
                            <div>IGST: ₹{outputIGST.toFixed(2)}</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Input Credit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">₹{inputTotal.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            <div>CGST: ₹{inputCGST.toFixed(2)}</div>
                            <div>SGST: ₹{inputSGST.toFixed(2)}</div>
                            <div>IGST: ₹{inputIGST.toFixed(2)}</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Net Payable</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${netPayable > 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                            ₹{Math.abs(netPayable).toFixed(2)}
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                {netPayable > 0 ? '(Pay)' : '(Credit)'}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 border-t pt-2 space-y-1">
                            <div className="flex justify-between">
                                <span>Output (Sales):</span>
                                <span>+₹{outputTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Input (Purchases):</span>
                                <span>-₹{inputTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-green-600 font-medium">
                                <span>Paid:</span>
                                <span>-₹{gstPayments.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button variant="outline" onClick={handleDownloadCSV}>
                    <Download className="mr-2 h-4 w-4" /> Export GST Report
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Output GST (Invoices)</CardTitle>
                        <CardDescription>Tax collected on Maintenance Fees</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[400px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead className="text-right">Taxable</TableHead>
                                    <TableHead className="text-right">CGST</TableHead>
                                    <TableHead className="text-right">SGST</TableHead>
                                    <TableHead className="text-right">IGST</TableHead>
                                    <TableHead className="text-right">Total Tax</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {outputGst.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center">No records</TableCell></TableRow> : outputGst.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{row.date}</TableCell>
                                        <TableCell>{row.unit}</TableCell>
                                        <TableCell className="text-right">₹{row.taxable}</TableCell>
                                        <TableCell className="text-right">₹{row.cgst}</TableCell>
                                        <TableCell className="text-right">₹{row.sgst}</TableCell>
                                        <TableCell className="text-right">₹{row.igst}</TableCell>
                                        <TableCell className="text-right font-medium">₹{row.total_tax.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Input GST (Expenses)</CardTitle>
                        <CardDescription>Tax paid on Vendor Expenses</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[400px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Payee</TableHead>
                                    <TableHead className="text-right">Taxable</TableHead>
                                    <TableHead className="text-right">CGST</TableHead>
                                    <TableHead className="text-right">SGST</TableHead>
                                    <TableHead className="text-right">IGST</TableHead>
                                    <TableHead className="text-right">Total Tax</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inputGst.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center">No records</TableCell></TableRow> : inputGst.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{row.date}</TableCell>
                                        <TableCell className="truncate max-w-[100px]" title={row.payee}>{row.payee}</TableCell>
                                        <TableCell className="text-right">₹{row.taxable}</TableCell>
                                        <TableCell className="text-right">₹{row.cgst}</TableCell>
                                        <TableCell className="text-right">₹{row.sgst}</TableCell>
                                        <TableCell className="text-right">₹{row.igst}</TableCell>
                                        <TableCell className="text-right font-medium">₹{row.total_tax.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
