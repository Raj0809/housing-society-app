"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import {
    Users, Home, CreditCard, FileText, MessageSquare,
    Calendar, Shield, Activity, Settings, LogOut,
    LayoutDashboard, Megaphone, Receipt, Bell,
    HelpCircle, UserCheck, Menu, Car, Phone
} from 'lucide-react'

const Sidebar = () => {
    const pathname = usePathname()
    const { profile, signOut } = useAuth()

    const role = profile?.role || 'resident'

    const links = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['all'] },
        { href: '/dashboard/users', label: 'Users', icon: Users, roles: ['app_admin', 'management', 'administration'] },
        { href: '/dashboard/society', label: 'Society Profile', icon: Home, roles: ['app_admin', 'management'] },
        { href: '/dashboard/finances', label: 'Finances', icon: CreditCard, roles: ['app_admin', 'management', 'resident'] },
        { href: '/dashboard/expenses', label: 'Expenses', icon: Receipt, roles: ['app_admin', 'management'] },
        { href: '/dashboard/finances/settings', label: 'Settings', icon: Settings, roles: ['app_admin', 'management'] },
        { href: '/dashboard/units', label: 'Units', icon: Home, roles: ['app_admin', 'management'] },
        { href: '/dashboard/chat', label: 'Chat', icon: MessageSquare, roles: ['all'] },
        { href: '/dashboard/complaints', label: 'Complaints', icon: FileText, roles: ['all'] },
        { href: '/dashboard/notices', label: 'Notices', icon: Megaphone, roles: ['all'] },
        { href: '/dashboard/facilities', label: 'Facilities', icon: Calendar, roles: ['all'] },
        { href: '/dashboard/visitors', label: 'Visitors', icon: UserCheck, roles: ['resident', 'security', 'app_admin', 'management'] },
        { href: '/dashboard/vehicles', label: 'Vehicles', icon: Car, roles: ['app_admin', 'management', 'security', 'resident'] },
        { href: '/dashboard/contacts', label: 'Helpline Numbers', icon: Phone, roles: ['all'] },
        { href: '/dashboard/reports', label: 'Reports', icon: Activity, roles: ['app_admin', 'management'] },
    ]

    const filteredLinks = links.filter(link =>
        link.roles.includes('all') || link.roles.includes(role)
    )

    return (
        <div className="flex h-screen w-64 flex-col justify-between border-r bg-card/50 px-3 py-4 glass backdrop-blur-xl">
            <div className="space-y-4">
                <div className="flex items-center px-4 py-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-600" />
                    <span className="ml-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                        HousingSoc
                    </span>
                </div>

                <nav className="space-y-1">
                    {filteredLinks.map((link) => {
                        const Icon = link.icon
                        const isActive = pathname === link.href

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "flex items-center rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary/10 text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                                {link.label}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            <div className="space-y-2">
                <button
                    onClick={() => signOut()}
                    className="flex w-full items-center rounded-lg px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    Sign Out
                </button>
            </div>
        </div>
    )
}

export default Sidebar
