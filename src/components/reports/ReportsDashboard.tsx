"use client"

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, FileText, PieChart as PieChartIcon, TrendingUp, Users, AlertCircle, Calendar as CalendarIcon, Filter, Car, Loader2 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import GSTReport from "./GSTReport"
import TaxComplianceReport from "./TaxComplianceReport"

const CHART_COLORS = ['hsl(var(--primary))', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#8dd1e1', '#d084d0']

export default function ReportsDashboard() {
    const [generating, setGenerating] = useState<string | null>(null)
    const [viewingReport, setViewingReport] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({
        start: format(subMonths(new Date(), 5), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    })
    const [defaulterDate, setDefaulterDate] = useState(format(new Date(), 'yyyy-MM-dd'))

    // Real data states
    const [financialData, setFinancialData] = useState<{ name: string; date: string; income: number; expense: number }[]>([])
    const [facilities, setFacilities] = useState<any[]>([])
    const [complaintDist, setComplaintDist] = useState<{ name: string; value: number; fill: string }[]>([])
    const [visitorStats, setVisitorStats] = useState<{ name: string; visitors: number }[]>([])
    const [vehicleLogs, setVehicleLogs] = useState<any[]>([])
    const [defaulters, setDefaulters] = useState<any[]>([])
    const [expenses, setExpenses] = useState<any[]>([])

    useEffect(() => {
        fetchAllData()
    }, [dateRange])

    const fetchAllData = async () => {
        setLoading(true)
        await Promise.all([
            fetchFinancialData(),
            fetchFacilities(),
            fetchComplaintDistribution(),
            fetchVisitorStats(),
            fetchVehicleLogs(),
            fetchDefaulters(),
            fetchExpenses()
        ])
        setLoading(false)
    }

    const fetchFinancialData = async () => {
        try {
            // Fetch maintenance invoices grouped by month
            const { data: invoices } = await supabase
                .from('maintenance_invoices')
                .select('amount, status, due_date, created_at')
                .gte('created_at', dateRange.start)
                .lte('created_at', dateRange.end + 'T23:59:59')

            // Fetch expenditures
            const { data: expenditures } = await supabase
                .from('expenditures')
                .select('amount, expense_date')
                .gte('expense_date', dateRange.start)
                .lte('expense_date', dateRange.end)

            // Group by month
            const monthMap: Record<string, { income: number; expense: number }> = {}

            if (invoices) {
                invoices.forEach((inv: any) => {
                    const month = format(parseISO(inv.created_at), 'MMM yy')
                    const monthKey = format(parseISO(inv.created_at), 'yyyy-MM-01')
                    if (!monthMap[monthKey]) monthMap[monthKey] = { income: 0, expense: 0 }
                    if (inv.status === 'paid') {
                        monthMap[monthKey].income += Number(inv.amount) || 0
                    }
                })
            }

            if (expenditures) {
                expenditures.forEach((exp: any) => {
                    const monthKey = format(parseISO(exp.expense_date), 'yyyy-MM-01')
                    if (!monthMap[monthKey]) monthMap[monthKey] = { income: 0, expense: 0 }
                    monthMap[monthKey].expense += Number(exp.amount) || 0
                })
            }

            const result = Object.entries(monthMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, vals]) => ({
                    name: format(parseISO(date), 'MMM yy'),
                    date,
                    income: vals.income,
                    expense: vals.expense
                }))

            setFinancialData(result.length > 0 ? result : [
                { name: format(new Date(), 'MMM yy'), date: format(new Date(), 'yyyy-MM-01'), income: 0, expense: 0 }
            ])
        } catch (e) {
            console.error('Error fetching financial data:', e)
        }
    }

    const fetchFacilities = async () => {
        try {
            const { data } = await supabase.from('facilities').select('*').eq('is_active', true)
            if (data) {
                setFacilities(data.map(f => ({
                    id: f.id,
                    name: f.name,
                    status: f.is_active ? 'Available' : 'Maintenance',
                    type: f.type
                })))
            }
        } catch (e) {
            console.error('Error fetching facilities:', e)
        }
    }

    const fetchComplaintDistribution = async () => {
        try {
            const { data } = await supabase
                .from('complaints')
                .select('category')
                .gte('created_at', dateRange.start)
                .lte('created_at', dateRange.end + 'T23:59:59')

            if (data && data.length > 0) {
                const catMap: Record<string, number> = {}
                data.forEach((c: any) => {
                    const cat = c.category || 'Other'
                    catMap[cat] = (catMap[cat] || 0) + 1
                })
                const result = Object.entries(catMap).map(([name, value], i) => ({
                    name,
                    value,
                    fill: CHART_COLORS[i % CHART_COLORS.length]
                }))
                setComplaintDist(result)
            } else {
                setComplaintDist([{ name: 'No Data', value: 1, fill: '#ccc' }])
            }
        } catch (e) {
            console.error('Error fetching complaints:', e)
        }
    }

    const fetchVisitorStats = async () => {
        try {
            const { data } = await supabase
                .from('visitor_logs')
                .select('check_in_time')
                .gte('check_in_time', dateRange.start)
                .lte('check_in_time', dateRange.end + 'T23:59:59')

            if (data && data.length > 0) {
                const dayMap: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                data.forEach((v: any) => {
                    const day = dayNames[new Date(v.check_in_time).getDay()]
                    dayMap[day] = (dayMap[day] || 0) + 1
                })
                setVisitorStats(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(name => ({
                    name,
                    visitors: dayMap[name] || 0
                })))
            } else {
                setVisitorStats(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(name => ({ name, visitors: 0 })))
            }
        } catch (e) {
            console.error('Error fetching visitors:', e)
            setVisitorStats(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(name => ({ name, visitors: 0 })))
        }
    }

    const fetchVehicleLogs = async () => {
        try {
            const { data } = await supabase
                .from('vehicles')
                .select('*, owner:profiles!vehicles_user_id_fkey(full_name)')
                .gte('created_at', dateRange.start)
                .lte('created_at', dateRange.end + 'T23:59:59')
                .order('created_at', { ascending: false })

            if (data) {
                setVehicleLogs(data.map((v: any, i: number) => ({
                    id: i + 1,
                    date: format(parseISO(v.created_at), 'yyyy-MM-dd'),
                    vehicle: v.vehicle_number || v.license_plate || 'N/A',
                    action: v.sticker_status === 'blocked' ? 'Blocked' : 'Active',
                    user: v.owner?.full_name || 'Unknown'
                })))
            }
        } catch (e) {
            console.error('Error fetching vehicles:', e)
        }
    }

    const fetchDefaulters = async () => {
        try {
            const { data } = await supabase
                .from('maintenance_invoices')
                .select('*, unit:units!maintenance_invoices_unit_id_fkey(unit_number, owner:profiles!units_owner_id_fkey(full_name))')
                .eq('status', 'pending')
                .lte('due_date', defaulterDate)
                .order('due_date', { ascending: true })

            if (data) {
                setDefaulters(data.map((inv: any) => ({
                    unit: inv.unit?.unit_number || 'N/A',
                    name: inv.unit?.owner?.full_name || 'Unknown',
                    amount: inv.amount,
                    due_date: inv.due_date
                })))
            }
        } catch (e) {
            console.error('Error fetching defaulters:', e)
        }
    }

    const fetchExpenses = async () => {
        try {
            const { data } = await supabase
                .from('expenditures')
                .select('*')
                .gte('expense_date', dateRange.start)
                .lte('expense_date', dateRange.end)
                .order('expense_date', { ascending: false })

            if (data) {
                setExpenses(data.map((exp: any, i: number) => ({
                    id: i + 1,
                    date: exp.expense_date,
                    category: exp.category || 'General',
                    description: exp.description || exp.title || '-',
                    amount: exp.amount
                })))
            }
        } catch (e) {
            console.error('Error fetching expenses:', e)
        }
    }

    const handleDownload = (reportType: string) => {
        setGenerating(reportType)
        setTimeout(() => {
            alert(`Downloading ${reportType} Report (${dateRange.start} to ${dateRange.end})...`)
            setGenerating(null)
        }, 1500)
    }

    const filteredVehicleLogs = useMemo(() => {
        return vehicleLogs.filter(item =>
            item.date >= dateRange.start && item.date <= dateRange.end
        )
    }, [vehicleLogs, dateRange])

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
                    <p className="text-muted-foreground">Insights from real society data.</p>
                </div>
                <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg border">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Period:</span>
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="bg-transparent border-none text-sm focus:ring-0 px-1 w-32"
                    />
                    <span className="text-muted-foreground">-</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="bg-transparent border-none text-sm focus:ring-0 px-1 w-32"
                    />
                </div>
            </div>

            {loading && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading reports...
                </div>
            )}

            <Tabs defaultValue="financial" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="financial">Financial</TabsTrigger>
                    <TabsTrigger value="operational">Operational</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="gst">GST Report</TabsTrigger>
                    <TabsTrigger value="compliance">Tax Compliance</TabsTrigger>
                </TabsList>

                <TabsContent value="financial" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Income vs Expense Trends</CardTitle>
                                <CardDescription>Monthly financial performance from real data.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px] w-full">
                                {financialData.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">No financial data for this period.</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={financialData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                                            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                                            <Legend />
                                            <Bar dataKey="income" name="Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="expense" name="Expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Income Statement</CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="text-2xl font-bold">Monthly Summary</div>
                                <p className="text-xs text-muted-foreground mb-4">Revenue vs expenditure breakdown.</p>
                                <div className="flex gap-2">
                                    <Button className="flex-1" variant="outline" onClick={() => setViewingReport('financial_summary')}>
                                        <FileText className="mr-2 h-4 w-4" /> View
                                    </Button>
                                    <Button className="flex-1" onClick={() => handleDownload('Income_Statement')} disabled={generating === 'Income_Statement'}>
                                        <Download className="mr-2 h-4 w-4" />
                                        {generating === 'Income_Statement' ? '...' : 'PDF'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Defaulters List</CardTitle>
                                <AlertCircle className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-2xl font-bold">{defaulters.length} Overdue</div>
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-xs text-muted-foreground">As on:</span>
                                    <input
                                        type="date"
                                        value={defaulterDate}
                                        onChange={(e) => { setDefaulterDate(e.target.value); fetchDefaulters() }}
                                        className="h-6 w-28 text-xs border rounded px-1 bg-background"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button className="flex-1" variant="outline" onClick={() => setViewingReport('defaulters_list')}>
                                        <FileText className="mr-2 h-4 w-4" /> View
                                    </Button>
                                    <Button className="flex-1" variant="destructive" onClick={() => handleDownload(`Defaulters_${defaulterDate}`)} disabled={generating?.includes('Defaulters')}>
                                        <Download className="mr-2 h-4 w-4" />
                                        {generating?.includes('Defaulters') ? '...' : 'PDF'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Expense Report</CardTitle>
                                <PieChartIcon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="text-2xl font-bold">{expenses.length} Entries</div>
                                <p className="text-xs text-muted-foreground mb-4">Category-wise expenses in this period.</p>
                                <div className="flex gap-2">
                                    <Button className="flex-1" variant="outline" onClick={() => setViewingReport('expense_breakdown')}>
                                        <FileText className="mr-2 h-4 w-4" /> View
                                    </Button>
                                    <Button className="flex-1" onClick={() => handleDownload('Expense_Report')} disabled={generating === 'Expense_Report'}>
                                        <Download className="mr-2 h-4 w-4" />
                                        {generating === 'Expense_Report' ? '...' : 'CSV'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="operational" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-2 md:col-span-1 lg:col-span-4">
                            <CardHeader className="pb-3">
                                <CardTitle>Facilities Status</CardTitle>
                                <CardDescription>Active facilities in the society.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {facilities.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">No facilities configured yet.</p>
                                    ) : facilities.map(fac => (
                                        <div key={fac.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-medium">{fac.name}</p>
                                                <p className="text-xs text-muted-foreground capitalize">{fac.type}</p>
                                            </div>
                                            <div className={`px-2 py-0.5 rounded text-xs font-medium ${fac.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {fac.status}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <Button className="flex-1" variant="outline" onClick={() => setViewingReport('facility_availability')}>
                                        <FileText className="mr-2 h-4 w-4" /> View Full
                                    </Button>
                                    <Button className="flex-1" onClick={() => handleDownload('Facility_Availability')}>
                                        <Download className="mr-2 h-3 w-3" /> Export
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="col-span-2 md:col-span-1 lg:col-span-3">
                            <CardHeader>
                                <CardTitle>Complaint Analysis</CardTitle>
                                <CardDescription>Distribution by category</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center">
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={complaintDist} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                {complaintDist.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <Button className="flex-1" variant="outline" onClick={() => setViewingReport('complaint_stats')}>
                                        <FileText className="mr-2 h-4 w-4" /> Table
                                    </Button>
                                    <Button className="flex-1" onClick={() => handleDownload('Complaint_Stats')} disabled={generating === 'Complaint_Stats'}>
                                        <Download className="mr-2 h-4 w-4" /> Download
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Visitor Footfall</CardTitle>
                                <CardDescription>Visitor entry trends by day of week</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={visitorStats}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))' }} />
                                        <Line type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                                <div className="flex gap-2 mt-4">
                                    <Button className="flex-1" variant="outline" onClick={() => setViewingReport('visitor_trends')}>
                                        <FileText className="mr-2 h-4 w-4" /> View Data
                                    </Button>
                                    <Button className="flex-1" onClick={() => handleDownload('Visitor_Log')} disabled={generating === 'Visitor_Log'}>
                                        <Download className="mr-2 h-4 w-4" /> Download
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Vehicle Activity</CardTitle>
                                <CardDescription>Vehicle log ({dateRange.start} - {dateRange.end})</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[100px]">Date</TableHead>
                                                    <TableHead>Vehicle</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredVehicleLogs.length === 0 ? (
                                                    <TableRow><TableCell colSpan={3} className="text-center h-24">No vehicle logs found in this period.</TableCell></TableRow>
                                                ) : filteredVehicleLogs.slice(0, 10).map((log) => (
                                                    <TableRow key={log.id}>
                                                        <TableCell className="font-medium">{log.date}</TableCell>
                                                        <TableCell className="font-mono">{log.vehicle}</TableCell>
                                                        <TableCell>
                                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${log.action === 'Blocked' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                                {log.action}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button className="flex-1" variant="outline" onClick={() => setViewingReport('vehicle_logs')}>
                                            <FileText className="mr-2 h-4 w-4" /> View All
                                        </Button>
                                        <Button className="flex-1" onClick={() => handleDownload('Vehicle_Activity_Log')}>
                                            <Download className="mr-2 h-4 w-4" /> Export
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="gst" className="space-y-4">
                    <GSTReport dateRange={dateRange} />
                </TabsContent>

                <TabsContent value="compliance" className="space-y-4">
                    <TaxComplianceReport />
                </TabsContent>

                {/* Detail Report Dialog */}
                <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Detailed Report View</DialogTitle>
                        </DialogHeader>

                        {viewingReport === 'financial_summary' && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Month</TableHead>
                                        <TableHead>Income</TableHead>
                                        <TableHead>Expense</TableHead>
                                        <TableHead>Net Saving</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {financialData.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center">No data in this period.</TableCell></TableRow>
                                    ) : financialData.map((row) => (
                                        <TableRow key={row.name}>
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell className="text-green-600">&#8377;{row.income.toLocaleString()}</TableCell>
                                            <TableCell className="text-red-600">&#8377;{row.expense.toLocaleString()}</TableCell>
                                            <TableCell className="font-bold">&#8377;{(row.income - row.expense).toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        {viewingReport === 'defaulters_list' && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Unit</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Amount Due</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {defaulters.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center">No defaulters found.</TableCell></TableRow>
                                    ) : defaulters.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{row.unit}</TableCell>
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell>{row.due_date}</TableCell>
                                            <TableCell className="text-red-600 font-bold">&#8377;{Number(row.amount).toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        {viewingReport === 'expense_breakdown' && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenses.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center">No expenses in this period.</TableCell></TableRow>
                                    ) : expenses.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>{row.date}</TableCell>
                                            <TableCell>{row.category}</TableCell>
                                            <TableCell>{row.description}</TableCell>
                                            <TableCell className="font-bold">&#8377;{Number(row.amount).toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        {viewingReport === 'facility_availability' && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Facility</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {facilities.length === 0 ? (
                                        <TableRow><TableCell colSpan={3} className="text-center">No facilities.</TableCell></TableRow>
                                    ) : facilities.map((fac) => (
                                        <TableRow key={fac.id}>
                                            <TableCell>{fac.name}</TableCell>
                                            <TableCell className="capitalize">{fac.type}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${fac.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {fac.status}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        {viewingReport === 'complaint_stats' && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Count</TableHead>
                                        <TableHead>% Share</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {complaintDist.map((row) => {
                                        const total = complaintDist.reduce((sum, r) => sum + r.value, 0)
                                        return (
                                            <TableRow key={row.name}>
                                                <TableCell>{row.name}</TableCell>
                                                <TableCell>{row.value}</TableCell>
                                                <TableCell>{total > 0 ? ((row.value / total) * 100).toFixed(1) : 0}%</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        )}

                        {viewingReport === 'visitor_trends' && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Day</TableHead>
                                        <TableHead>Visitor Count</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visitorStats.map((row) => (
                                        <TableRow key={row.name}>
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell>{row.visitors}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        {viewingReport === 'vehicle_logs' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Vehicle Activity Log</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Vehicle Number</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Owner</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredVehicleLogs.length === 0 ? (
                                            <TableRow><TableCell colSpan={4} className="text-center">No logs found.</TableCell></TableRow>
                                        ) : filteredVehicleLogs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell>{log.date}</TableCell>
                                                <TableCell className="font-mono">{log.vehicle}</TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${log.action === 'Blocked' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                        {log.action}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{log.user}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </Tabs>
        </div>
    )
}
