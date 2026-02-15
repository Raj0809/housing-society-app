"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { User, UserRole } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, MoreVertical, Upload, Ban, CheckCircle, XCircle, UserCheck, Loader2, Key } from 'lucide-react'
import Papa from 'papaparse'
import { resetUserPassword } from '@/app/actions/auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface UserListProps {
    onEdit?: (user: User) => void
}

export default function UserList({ onEdit }: UserListProps) {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active')
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    // Password Reset State
    const [resetDialogOpen, setResetDialogOpen] = useState(false)
    const [userToReset, setUserToReset] = useState<User | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [resetLoading, setResetLoading] = useState(false)

    const handleOpenReset = (user: User) => {
        setUserToReset(user)
        setNewPassword('')
        setResetDialogOpen(true)
    }

    const handleResetSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!userToReset || !newPassword) return

        setResetLoading(true)
        try {
            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                // Mock
                await new Promise(r => setTimeout(r, 1000))
                alert(`Password for ${userToReset.full_name} would be reset to: ${newPassword}`)
                setResetDialogOpen(false)
                return
            }

            const result = await resetUserPassword(userToReset.id, newPassword)
            if (result.error) {
                alert('Error: ' + result.error)
            } else {
                alert('Password reset successfully')
                setResetDialogOpen(false)
            }
        } catch (err) {
            console.error(err)
            alert('Failed to reset password')
        } finally {
            setResetLoading(false)
        }
    }

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                const parsedUsers = results.data as any[]
                console.log('Parsed users:', parsedUsers)

                // Mock Bulk Upload Logic
                const newUsers: User[] = parsedUsers.map((u, index) => ({
                    id: `bulk-${Date.now()}-${index}`,
                    email: u.email || `user${index}@example.com`,
                    full_name: u.full_name || u.name || 'Unknown User',
                    phone: u.phone || '',
                    role: (u.role as UserRole) || 'resident',
                    is_active: true,
                    approval_status: 'approved' as const,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })).filter(u => u.email) // Simple validation

                if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                    // In a real app we would call an API or Supabase insert here
                    // For preview, we just append to local state
                    alert(`Simulating upload of ${newUsers.length} users.`)
                    setUsers(prev => [...newUsers, ...prev])
                } else {
                    // Real Upload Logic (Placeholder)
                    try {
                        const { error } = await supabase.from('profiles').insert(newUsers)
                        if (error) throw error
                        fetchUsers()
                    } catch (error) {
                        console.error('Bulk upload error:', error)
                        alert('Failed to upload users')
                    }
                }
            },
            error: (error) => {
                console.error('CSV Parse Error:', error)
                alert('Error parsing CSV file')
            }
        })

        // Reset input
        event.target.value = ''
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers(search)
        }, 500)
        return () => clearTimeout(timer)
    }, [search])

    const fetchUsers = async (searchTerm: string = '') => {
        setLoading(true)
        // Mock Data for Preview
        const MOCK_USERS: User[] = [
            { id: '1', email: 'john.doe@example.com', full_name: 'John Doe', phone: '+1 234 567 890', unit_number: 'A-101', role: 'resident', is_active: true, approval_status: 'approved', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '2', email: 'admin@society.com', full_name: 'Admin User', phone: '+1 987 654 321', unit_number: 'Office', role: 'app_admin', is_active: true, approval_status: 'approved', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '3', email: 'guard@gate.com', full_name: 'Security Guard', phone: '+1 555 666 777', unit_number: 'Gate 1', role: 'security', is_active: true, approval_status: 'approved', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '4', email: 'jane.smith@example.com', full_name: 'Jane Smith', phone: '+1 444 333 222', unit_number: 'B-205', role: 'management', is_active: false, approval_status: 'approved', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            // Pending Users
            { id: '5', email: 'new.resident@example.com', full_name: 'New Resident', phone: '+1 111 222 333', unit_number: 'C-305', role: 'resident', is_active: true, approval_status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '6', email: 'tenant@example.com', full_name: 'Tenant Request', phone: '+1 999 888 777', unit_number: 'A-101', role: 'resident', is_active: true, approval_status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ]

        try {
            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                const local = JSON.parse(localStorage.getItem('mock_users') || '[]')
                const usersToUse = local.length > 0 ? local : MOCK_USERS

                if (local.length === 0) {
                    localStorage.setItem('mock_users', JSON.stringify(MOCK_USERS))
                }

                let filtered = usersToUse
                if (searchTerm) {
                    const lower = searchTerm.toLowerCase()
                    filtered = filtered.filter((u: User) =>
                        u.full_name?.toLowerCase().includes(lower) ||
                        u.email?.toLowerCase().includes(lower) ||
                        u.unit_number?.toLowerCase().includes(lower)
                    )
                }
                setUsers(filtered)
                setLoading(false)
                return
            }

            let query = supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })

            if (searchTerm) {
                query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
            }

            const { data, error } = await query

            if (error) throw error
            if (data) setUsers(data as User[])
        } catch (error) {
            console.warn('Error fetching users (using mock data):', error)
            setUsers(MOCK_USERS)
        } finally {
            setLoading(false)
        }
    }

    const handleToggleStatus = async (user: User) => {
        const isActive = !user.is_active
        if (!confirm(`Are you sure you want to ${isActive ? 'activate' : 'deactivate'} ${user.full_name}?`)) return
        setActionLoading(user.id)

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setUsers(users.map(u => u.id === user.id ? { ...u, is_active: isActive } : u))

            // Auto Block Vehicles if Deactivating
            if (!isActive) {
                const localVehicles = JSON.parse(localStorage.getItem('mock_vehicles') || '[]')
                let blockedCount = 0
                const updatedVehicles = localVehicles.map((v: any) => {
                    if (v.user_id === user.id) {
                        blockedCount++
                        return { ...v, sticker_status: 'blocked' }
                    }
                    return v
                })
                localStorage.setItem('mock_vehicles', JSON.stringify(updatedVehicles))
                if (blockedCount > 0) alert(`User deactivated. ${blockedCount} associated vehicles were blocked.`)
            }

            setActionLoading(null)
            return
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_active: isActive })
                .eq('id', user.id)

            if (error) throw error

            if (!isActive) {
                const { error: vehicleError } = await supabase.from('vehicles').update({ sticker_status: 'blocked' }).eq('user_id', user.id)
                if (vehicleError) console.error('Error blocking vehicles:', vehicleError)
            }

            fetchUsers(search)
        } catch (error) {
            console.error('Error updating user status:', error)
            alert('Failed to update user status')
        } finally {
            setActionLoading(null)
        }
    }

    const handleApproval = async (user: User, status: 'approved' | 'rejected') => {
        if (!confirm(`Are you sure you want to ${status.toUpperCase()} this request from ${user.full_name}?`)) return
        setActionLoading(user.id)

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setTimeout(() => {
                setUsers(users.map(u => u.id === user.id ? { ...u, approval_status: status } : u))
                setActionLoading(null)
            }, 600)
            return
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ approval_status: status })
                .eq('id', user.id)

            if (error) throw error
            fetchUsers(search)
        } catch (error) {
            console.error('Error updating approval status:', error)
            alert('Failed to update status')
        } finally {
            setActionLoading(null)
        }
    }

    const getRoleBadgeColor = (role: UserRole) => {
        switch (role) {
            case 'app_admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
            case 'management': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
            case 'security': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
            case 'resident': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
        }
    }

    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')

    // Filter users based on active tab
    const filteredUsers = users.filter(u => {
        if (activeTab === 'pending') {
            return u.approval_status === 'pending'
        }

        let matches = u.approval_status === 'approved' || !u.approval_status

        if (roleFilter !== 'all') {
            matches = matches && u.role === roleFilter
        }

        return matches
    })

    const pendingCount = users.filter(u => u.approval_status === 'pending').length

    return (
        <Card className="border-none shadow-none glass bg-transparent">
            <CardHeader className="flex flex-col space-y-4 pb-4 px-0">
                <div className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Tabs */}
                        <div className="flex rounded-lg bg-muted p-1">
                            <button
                                onClick={() => setActiveTab('active')}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'active' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Active Users
                            </button>
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'pending' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Pending Requests
                                {pendingCount > 0 && (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="hidden">
                            <input
                                type="file"
                                id="bulk-upload"
                                accept=".csv"
                                onChange={handleFileUpload}
                            />
                        </div>
                        <Button variant="outline" onClick={() => document.getElementById('bulk-upload')?.click()}>
                            <Upload className="mr-2 h-4 w-4" /> Bulk Upload
                        </Button>
                        <Button onClick={() => onEdit?.(null as unknown as User)}>
                            <Plus className="mr-2 h-4 w-4" /> Add User
                        </Button>
                    </div>
                </div>

            </CardHeader>
            <CardContent className="px-0">
                <div className="flex justify-between items-center mb-4 px-1">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 w-[250px] rounded-md border border-input bg-background pl-8 pr-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                        className="h-9 w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="all">All Roles</option>
                        <option value="resident">Resident</option>
                        <option value="management">Management</option>
                        <option value="app_admin">Admin</option>
                        <option value="security">Security</option>
                        <option value="administration">Administration</option>
                    </select>
                </div>
                <div className="rounded-md border bg-card">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Phone</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Unit</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Role</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
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
                                            <td className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-muted"></div></td>
                                            <td className="p-4"><div className="h-4 w-12 animate-pulse rounded bg-muted"></div></td>
                                            <td className="p-4"><div className="h-4 w-8 animate-pulse rounded bg-muted ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                            {activeTab === 'pending' ? 'No pending requests found.' : 'No active users found.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                                            <td className="p-4 align-middle font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                        {user.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                    {user.full_name}
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle">{user.email}</td>
                                            <td className="p-4 align-middle text-muted-foreground">{user.phone || '-'}</td>
                                            <td className="p-4 align-middle font-medium">{user.unit_number || '-'}</td>
                                            <td className="p-4 align-middle">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${getRoleBadgeColor(user.role)} pb-1`}>
                                                    {user.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle">
                                                {activeTab === 'active' ? (
                                                    <div className="flex items-center">
                                                        <span className={`inline-flex items-center rounded-full h-2 w-2 ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                                        <span className="ml-2">{user.is_active ? 'Active' : 'Inactive'}</span>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 align-middle text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {activeTab === 'pending' ? (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                title="Approve"
                                                                onClick={() => handleApproval(user, 'approved')}
                                                                disabled={actionLoading === user.id}
                                                            >
                                                                {actionLoading === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                title="Reject"
                                                                onClick={() => handleApproval(user, 'rejected')}
                                                                disabled={actionLoading === user.id}
                                                            >
                                                                {actionLoading === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                title="Reset Password"
                                                                onClick={() => handleOpenReset(user)}
                                                            >
                                                                <Key className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                title={user.is_active ? "Deactivate User" : "Activate User"}
                                                                onClick={() => handleToggleStatus(user)}
                                                            >
                                                                {user.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                title="Edit User"
                                                                onClick={() => onEdit?.(user)}
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table >
                    </div >
                </div >
            </CardContent >

            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Enter a new password for {userToReset?.full_name}.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleResetSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                                id="new-password"
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                minLength={6}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={resetLoading}>
                                {resetLoading ? 'Resetting...' : 'Reset Password'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card >
    )
}
