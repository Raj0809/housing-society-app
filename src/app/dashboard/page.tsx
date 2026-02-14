"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, CreditCard, MessageSquare, AlertCircle, FileText, Megaphone, Calendar, ArrowRight, Plus, UserPlus } from "lucide-react"
import { format } from 'date-fns'
import Link from "next/link"
import { useAuth } from '@/contexts/AuthContext'

interface DashboardStats {
    totalResidents: number
    outstandingDues: number
    activeComplaints: number
    pendingApprovals: number
}

interface ActivityItem {
    id: string
    type: 'notice' | 'complaint' | 'booking'
    title: string
    subtitle: string
    timestamp: string
    link: string
}

export default function DashboardPage() {
    const { profile } = useAuth()
    const [stats, setStats] = useState<DashboardStats>({
        totalResidents: 0,
        outstandingDues: 0,
        activeComplaints: 0,
        pendingApprovals: 0
    })
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        setLoading(true)
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            // Mock Data Logic
            const localUsers = JSON.parse(localStorage.getItem('mock_users') || '[]')
            const localFees = JSON.parse(localStorage.getItem('mock_maintenance_fees') || '[]')
            const localComplaints = JSON.parse(localStorage.getItem('mock_complaints') || '[]')
            const localBookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]')
            const localNotices = JSON.parse(localStorage.getItem('mock_notices') || '[]')

            // Calculate Stats
            const outstanding = localFees
                .filter((f: any) => f.payment_status === 'pending')
                .reduce((sum: number, f: any) => sum + (Number(f.amount) || 0), 0)

            const activeComplaintsCount = localComplaints.filter((c: any) => c.status !== 'resolved' && c.status !== 'closed').length
            const pendingApprovalsCount = localBookings.filter((b: any) => b.status === 'pending').length // + visitors...

            setStats({
                totalResidents: localUsers.length + 120, // Base mock count
                outstandingDues: outstanding + 45000, // Base mock dues
                activeComplaints: activeComplaintsCount + 2,
                pendingApprovals: pendingApprovalsCount
            })

            // Compile Activity
            const activities: ActivityItem[] = []

            localNotices.slice(0, 3).forEach((n: any) => {
                activities.push({
                    id: n.id,
                    type: 'notice',
                    title: n.title,
                    subtitle: n.content.substring(0, 40) + '...',
                    timestamp: n.created_at,
                    link: '/dashboard/notices' // Assuming route exists or will be added
                })
            })

            localComplaints.slice(0, 3).forEach((c: any) => {
                activities.push({
                    id: c.id,
                    type: 'complaint',
                    title: `Complaint: ${c.subject}`,
                    subtitle: c.status,
                    timestamp: c.created_at,
                    link: '/dashboard/complaints'
                })
            })

            localBookings.slice(0, 3).forEach((b: any) => {
                activities.push({
                    id: b.id,
                    type: 'booking',
                    title: `Facility Booking`,
                    subtitle: `${format(new Date(b.date), 'MMM d')} - ${b.status}`,
                    timestamp: b.created_at,
                    link: '/dashboard/facilities'
                })
            })

            // Sort and take top 5
            activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            setRecentActivity(activities.slice(0, 5))
            setLoading(false)
            return
        }

        try {
            // Real Data Fetching (Parallel)
            const [
                usersCount,
                feesSum,
                complaintsCount,
                bookingsCount,
                recentNotices,
                recentComplaints,
                recentBookings
            ] = await Promise.all([
                supabase.from('users').select('*', { count: 'exact', head: true }),
                supabase.from('maintenance_fees').select('amount').eq('payment_status', 'pending'),
                supabase.from('complaints').select('*', { count: 'exact', head: true }).neq('status', 'resolved').neq('status', 'closed'),
                supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(3),
                supabase.from('complaints').select('*').order('created_at', { ascending: false }).limit(3),
                supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(3)
            ])

            // Calculate Stats
            const totalDues = (feesSum.data || []).reduce((sum, f) => sum + (f.amount || 0), 0)

            setStats({
                totalResidents: usersCount.count || 0,
                outstandingDues: totalDues,
                activeComplaints: complaintsCount.count || 0,
                pendingApprovals: bookingsCount.count || 0
            })

            // Compile Activity
            const activities: ActivityItem[] = []

            recentNotices.data?.forEach((n: any) => {
                activities.push({
                    id: n.id,
                    type: 'notice',
                    title: n.title,
                    subtitle: 'Notice',
                    timestamp: n.created_at,
                    link: '/dashboard/notices'
                })
            })

            recentComplaints.data?.forEach((c: any) => {
                activities.push({
                    id: c.id,
                    type: 'complaint',
                    title: c.subject,
                    subtitle: `Complaint - ${c.status}`,
                    timestamp: c.created_at,
                    link: '/dashboard/complaints'
                })
            })

            recentBookings.data?.forEach((b: any) => {
                activities.push({
                    id: b.id,
                    type: 'booking',
                    title: 'Facility Booking',
                    subtitle: `${format(new Date(b.date), 'MMM d')} - ${b.status}`,
                    timestamp: b.created_at,
                    link: '/dashboard/facilities'
                })
            })

            activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            setRecentActivity(activities.slice(0, 5))

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const statCards = [
        {
            title: "Total Residents",
            value: stats.totalResidents.toString(),
            description: "Registered Users",
            icon: Users,
            color: "text-blue-500",
            bg: "bg-blue-50 dark:bg-blue-900/20"
        },
        {
            title: "Outstanding Dues",
            value: `₹${stats.outstandingDues.toLocaleString()}`,
            description: "Pending Collection",
            icon: CreditCard,
            color: "text-red-500",
            bg: "bg-red-50 dark:bg-red-900/20"
        },
        {
            title: "Active Complaints",
            value: stats.activeComplaints.toString(),
            description: "Open Issues",
            icon: AlertCircle,
            color: "text-orange-500",
            bg: "bg-orange-50 dark:bg-orange-900/20"
        },
        {
            title: "Pending Approvals",
            value: stats.pendingApprovals.toString(),
            description: "facility/visitor requests",
            icon: Calendar,
            color: "text-purple-500",
            bg: "bg-purple-50 dark:bg-purple-900/20"
        },
    ]

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">Overview of society activities and alerts.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <Card key={stat.title} className="border-none shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {stat.title}
                                </CardTitle>
                                <div className={`p-2 rounded-full ${stat.bg}`}>
                                    <Icon className={`h-4 w-4 ${stat.color}`} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {stat.description}
                                </p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <div className="grid gap-6 md:grid-cols-7">
                {/* Main Content Area - Quick Actions & Charts (Placeholder) */}
                <Card className="col-span-4 border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Common tasks you might want to perform.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <Link href="/dashboard/visitors" className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-muted/50 transition-colors group">
                                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <UserPlus className="h-5 w-5 text-green-600" />
                                </div>
                                <span className="font-medium">Add Visitor</span>
                            </Link>
                            <Link href="/dashboard/complaints" className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-muted/50 transition-colors group">
                                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <AlertCircle className="h-5 w-5 text-orange-600" />
                                </div>
                                <span className="font-medium">Raise Complaint</span>
                            </Link>
                            <Link href="/dashboard/facilities" className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-muted/50 transition-colors group">
                                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Calendar className="h-5 w-5 text-purple-600" />
                                </div>
                                <span className="font-medium">Book Facility</span>
                            </Link>
                            <Link href="/dashboard/finances" className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-muted/50 transition-colors group">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <CreditCard className="h-5 w-5 text-blue-600" />
                                </div>
                                <span className="font-medium">Pay Dues</span>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity Feed */}
                <Card className="col-span-3 border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest updates from the community.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {recentActivity.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No recent activity.</p>
                            ) : (
                                recentActivity.map((item) => (
                                    <div key={item.id + item.type} className="flex items-start gap-3 group">
                                        <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${item.type === 'notice' ? 'bg-blue-500' :
                                                item.type === 'complaint' ? 'bg-orange-500' : 'bg-purple-500'
                                            }`} />
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
                                                {item.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                {item.subtitle}
                                            </p>
                                        </div>
                                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                                            {format(new Date(item.timestamp), 'MMM d')}
                                        </div>
                                    </div>
                                ))
                            )}

                            <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground" asChild>
                                <Link href="/dashboard/notices">View All Activity <ArrowRight className="ml-1 h-3 w-3" /></Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
