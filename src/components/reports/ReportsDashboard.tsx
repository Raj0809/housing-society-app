"use client"

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, FileText, PieChart as PieChartIcon, TrendingUp, Users, AlertCircle, Calendar as CalendarIcon, Filter, Car } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { format, subMonths } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import GSTReport from "./GSTReport"
import TaxComplianceReport from "./TaxComplianceReport"

const MOCK_FINANCIAL_DATA = [
    { name: 'Sep 25', date: '2025-09-01', income: 45000, expense: 32000 },
    { name: 'Oct 25', date: '2025-10-01', income: 52000, expense: 41000 },
    { name: 'Nov 25', date: '2025-11-01', income: 48000, expense: 38000 },
    { name: 'Dec 25', date: '2025-12-01', income: 51000, expense: 45000 },
    { name: 'Jan 26', date: '2026-01-01', income: 53000, expense: 39000 },
    { name: 'Feb 26', date: '2026-02-01', income: 55000, expense: 42000 },
]

const MOCK_FACILITIES_AVAILABILITY = [
    { id: 1, name: 'Clubhouse', status: 'Available', next_booking: 'Tomorrow 10:00 AM' },
    { id: 2, name: 'Swimming Pool', status: 'Maintenance', next_booking: '-' },
    { id: 3, name: 'Tennis Court', status: 'Booked', next_booking: 'Today 5:00 PM' },
    { id: 4, name: 'Community Hall', status: 'Available', next_booking: 'Sat 6:00 PM' },
]

const MOCK_VISITOR_STATS = [
    { name: 'Mon', visitors: 45 },
    { name: 'Tue', visitors: 52 },
    { name: 'Wed', visitors: 38 },
    { name: 'Thu', visitors: 65 },
    { name: 'Fri', visitors: 55 },
    { name: 'Sat', visitors: 89 },
    { name: 'Sun', visitors: 76 },
]

const MOCK_COMPLAINT_DISTRIBUTION = [
    { name: 'Plumbing', value: 30, fill: '#8884d8' },
    { name: 'Electrical', value: 25, fill: '#82ca9d' },
    { name: 'Security', value: 15, fill: '#ffc658' },
    { name: 'Noise', value: 10, fill: '#ff8042' },
    { name: 'Other', value: 20, fill: '#a4de6c' },
]

const MOCK_VEHICLE_LOGS = [
    { id: 1, date: '2025-12-10', vehicle: 'KA-01-HH-1234', action: 'Added', user: 'Flat 101' },
    { id: 2, date: '2026-01-12', vehicle: 'MH-02-AB-9999', action: 'Blocked', user: 'Flat 202' },
    { id: 3, date: '2026-02-05', vehicle: 'TN-09-XX-5678', action: 'Added', user: 'Flat 305' },
    { id: 4, date: '2026-02-12', vehicle: 'KA-51-ZZ-0000', action: 'Blocked', user: 'Flat 108' },
]

const MOCK_DEFAULTERS = [
    { unit: '101', name: 'Rahul Sharma', amount: 5000, due_date: '2026-01-05' },
    { unit: '205', name: 'Priya Patel', amount: 2500, due_date: '2026-02-01' },
    { unit: '302', name: 'Amit Singh', amount: 12000, due_date: '2025-12-15' },
]

const MOCK_EXPENSES_LIST = [
    { id: 1, date: '2026-02-01', category: 'Utilities', description: 'Electricity Bill', amount: 25000 },
    { id: 2, date: '2026-02-05', category: 'Staff', description: 'Security Salary', amount: 45000 },
    { id: 3, date: '2026-01-20', category: 'Repairs', description: 'Lift Maintenance', amount: 8500 },
]

export default function ReportsDashboard() {
    const [generating, setGenerating] = useState<string | null>(null)
    const [viewingReport, setViewingReport] = useState<string | null>(null)
    const [dateRange, setDateRange] = useState({
        start: format(subMonths(new Date(), 5), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    })
    const [defaulterDate, setDefaulterDate] = useState(format(new Date(), 'yyyy-MM-dd'))

    const handleDownload = (reportType: string) => {
        setGenerating(reportType)
        setTimeout(() => {
            alert(`Downloading ${reportType} Report (${dateRange.start} to ${dateRange.end})...`)
            setGenerating(null)
        }, 1500)
    }

    const filteredFinancialData = useMemo(() => {
        return MOCK_FINANCIAL_DATA.filter(item =>
            item.date >= dateRange.start && item.date <= dateRange.end
        )
    }, [dateRange])

    const filteredExpenses = useMemo(() => {
        return MOCK_EXPENSES_LIST.filter(item =>
            item.date >= dateRange.start && item.date <= dateRange.end
        )
    }, [dateRange])

    const filteredVehicleLogs = useMemo(() => {
        return MOCK_VEHICLE_LOGS.filter(item =>
            item.date >= dateRange.start && item.date <= dateRange.end
        )
    }, [dateRange])

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
                    <p className="text-muted-foreground">Graphical insights and detailed exports.</p>
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

            <Tabs defaultValue="financial" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="financial">Financial</TabsTrigger>
                    <TabsTrigger value="operational">Operational</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="gst">GST Report</TabsTrigger>
                    <TabsTrigger value="compliance">Tax Compliance</TabsTrigger>
                </TabsList>

                <TabsContent value="financial" className="space-y-4">
                    {/* Charts Section */}
                    <div className="grid gap-4 md:grid-cols-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Income vs Expense Trends</CardTitle>
                                <CardDescription>Monthly financial performance visualization.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={filteredFinancialData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                                        <RechartsTooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="income" name="Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="expense" name="Expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
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
                                <p className="text-xs text-muted-foreground mb-4">Detailed breakdown of revenue sources.</p>
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
                                    <div className="text-2xl font-bold">Overdue</div>
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-xs text-muted-foreground">As on:</span>
                                    <input
                                        type="date"
                                        value={defaulterDate}
                                        onChange={(e) => setDefaulterDate(e.target.value)}
                                        className="h-6 w-28 text-xs border rounded px-1 bg-background"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button className="flex-1" variant="outline" onClick={() => setViewingReport('defaulters_list')}>
                                        <FileText className="mr-2 h-4 w-4" /> View
                                    </Button>
                                    <Button className="flex-1" variant="destructive" onClick={() => handleDownload(`Defaulters_enc_ason_${defaulterDate}`)} disabled={generating?.includes('Defaulters')}>
                                        <Download className="mr-2 h-4 w-4" />
                                        {generating?.includes('Defaulters') ? '...' : 'PDF'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Expense Report</CardTitle>
                                <PieChart className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="text-2xl font-bold">Category Wise</div>
                                <p className="text-xs text-muted-foreground mb-4">Utilities, Repairs, Staff Salary.</p>
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
                        {/* Facilities Available Report */}
                        <Card className="col-span-2 md:col-span-1 lg:col-span-4">
                            <CardHeader className="pb-3">
                                <CardTitle>Facilities Status</CardTitle>
                                <CardDescription>Real-time booking and availability snapshot.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {MOCK_FACILITIES_AVAILABILITY.map(fac => (
                                        <div key={fac.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-medium">{fac.name}</p>
                                                <p className="text-xs text-muted-foreground">Next: {fac.next_booking}</p>
                                            </div>
                                            <div className={`px-2 py-0.5 rounded text-xs font-medium 
                                                ${fac.status === 'Available' ? 'bg-green-100 text-green-700' :
                                                    fac.status === 'Booked' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
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
                                            <Pie
                                                data={MOCK_COMPLAINT_DISTRIBUTION}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {MOCK_COMPLAINT_DISTRIBUTION.map((entry, index) => (
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
                                <CardDescription>Weekly visitor entry trends</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={MOCK_VISITOR_STATS}>
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
                                <CardDescription>Blocked/Added Log ({dateRange.start} - {dateRange.end})</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[100px]">Date</TableHead>
                                                    <TableHead>Vehicle</TableHead>
                                                    <TableHead>Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredVehicleLogs.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center h-24">No logs found in this period.</TableCell></TableRow> : filteredVehicleLogs.map((log) => (
                                                    <TableRow key={log.id}>
                                                        <TableCell className="font-medium">{log.date}</TableCell>
                                                        <TableCell>{log.vehicle}</TableCell>
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
                                    {filteredFinancialData.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center">No data in this period.</TableCell></TableRow> : filteredFinancialData.map((row) => (
                                        <TableRow key={row.name}>
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell className="text-green-600">₹{row.income}</TableCell>
                                            <TableCell className="text-red-600">₹{row.expense}</TableCell>
                                            <TableCell className="font-bold">₹{row.income - row.expense}</TableCell>
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
                                    {MOCK_DEFAULTERS.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{row.unit}</TableCell>
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell>{row.due_date}</TableCell>
                                            <TableCell className="text-red-600 font-bold">₹{row.amount}</TableCell>
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
                                    {filteredExpenses.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center">No expenses in this period.</TableCell></TableRow> : filteredExpenses.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{row.date}</TableCell>
                                            <TableCell>{row.category}</TableCell>
                                            <TableCell>{row.description}</TableCell>
                                            <TableCell className="font-bold">₹{row.amount}</TableCell>
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
                                        <TableHead>Status</TableHead>
                                        <TableHead>Next Booking</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {MOCK_FACILITIES_AVAILABILITY.map((fac) => (
                                        <TableRow key={fac.id}>
                                            <TableCell>{fac.name}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded text-xs font-medium 
                                                    ${fac.status === 'Available' ? 'bg-green-100 text-green-700' :
                                                        fac.status === 'Booked' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {fac.status}
                                                </span>
                                            </TableCell>
                                            <TableCell>{fac.next_booking}</TableCell>
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
                                    {MOCK_COMPLAINT_DISTRIBUTION.map((row) => (
                                        <TableRow key={row.name}>
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell>{row.value}</TableCell>
                                            <TableCell>{row.value}%</TableCell>
                                        </TableRow>
                                    ))}
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
                                    {MOCK_VISITOR_STATS.map((row) => (
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
                                            <TableHead>Action</TableHead>
                                            <TableHead>User / Unit</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredVehicleLogs.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center">No logs found.</TableCell></TableRow> : filteredVehicleLogs.map((log) => (
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
                                        {/* Add more rows to simulate full report */}

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
