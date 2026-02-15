"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { User, UserRole, PasswordResetRequest } from '@/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, MoreVertical, Upload, Ban, CheckCircle, XCircle, Loader2, Key } from 'lucide-react'
import Papa from 'papaparse'

interface UserListProps {
    onEdit?: (user: User) => void
}

export default function UserList({ onEdit }: UserListProps) {
    const [users, setUsers] = useState<User[]>([])
    const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState<'active' | 'resets'>('active')
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')

    // Password set dialog
    const [passwordDialog, setPasswordDialog] = useState<{
        open: boolean
        userId: string
        userName: string
        resetRequestId?: string
    }>({ open: false, userId: '', userName: '' })
    const [tempPassword, setTempPassword] = useState('')
    const [passwordLoading, setPasswordLoading] = useState(false)

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                const parsedUsers = results.data as any[]

                const newUsers: User[] = parsedUsers.map((u, index) => ({
                    id: `bulk-${Date.now()}-${index}`,
                    email: u.email || `user${index}@example.com`,
                    full_name: u.full_name || u.name || 'Unknown User',
                    phone: u.phone || '',
                    role: (u.role as UserRole) || 'resident',
                    is_active: true,
                    must_change_password: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })).filter(u => u.email)

                if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                    alert(`Simulating upload of ${newUsers.length} users.`)
                    setUsers(prev => [...newUsers, ...prev])
                } else {
                    try {
                        const { error } = await supabase.from('users').insert(newUsers)
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

        event.target.value = ''
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers(search)
        }, 500)
        return () => clearTimeout(timer)
    }, [search])

    useEffect(() => {
        if (activeTab === 'resets') {
            fetchResetRequests()
        }
    }, [activeTab])

    const fetchUsers = async (searchTerm: string = '') => {
        setLoading(true)
        const MOCK_USERS: User[] = [
            { id: '1', email: 'john.doe@example.com', full_name: 'John Doe', phone: '+91 98765 43210', unit_number: 'A-101', role: 'resident', is_active: true, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '2', email: 'admin@society.com', full_name: 'Admin User', phone: '+91 98765 43211', unit_number: 'Office', role: 'app_admin', is_active: true, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '3', email: 'guard@gate.com', full_name: 'Security Guard', phone: '+91 98765 43212', unit_number: 'Gate 1', role: 'security', is_active: true, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '4', email: 'jane.smith@example.com', full_name: 'Jane Smith', phone: '+91 98765 43213', unit_number: 'B-205', role: 'management', is_active: false, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
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
                .from('users')
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

    const fetchResetRequests = async () => {
        setLoading(true)

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setResetRequests([
                {
                    id: 'r1',
                    user_id: '1',
                    status: 'pending',
                    requested_at: new Date().toISOString(),
                    user: { full_name: 'John Doe', email: 'john.doe@example.com' }
                }
            ])
            setLoading(false)
            return
        }

        try {
            const { data, error } = await supabase
                .from('password_reset_requests')
                .select('*, user:users(full_name, email)')
                .eq('status', 'pending')
                .order('requested_at', { ascending: false })

            if (error) throw error
            if (data) setResetRequests(data as PasswordResetRequest[])
        } catch (error) {
            console.error('Error fetching reset requests:', error)
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
                .from('users')
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

    const handleSetPassword = async () => {
        if (!tempPassword || tempPassword.length < 6) {
            alert('Password must be at least 6 characters')
            return
        }

        setPasswordLoading(true)
        try {
            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                alert(`Temporary password set for ${passwordDialog.userName}. They will be required to change it on next login.`)
                if (passwordDialog.resetRequestId) {
                    setResetRequests(prev => prev.filter(r => r.id !== passwordDialog.resetRequestId))
                }
                setPasswordDialog({ open: false, userId: '', userName: '' })
                setTempPassword('')
                setPasswordLoading(false)
                return
            }

            const response = await fetch('/api/admin/set-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: passwordDialog.userId,
                    password: tempPassword,
                    resetRequestId: passwordDialog.resetRequestId,
                }),
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error)

            alert(`Temporary password set for ${passwordDialog.userName}. They will be required to change it on next login.`)
            setPasswordDialog({ open: false, userId: '', userName: '' })
            setTempPassword('')

            if (activeTab === 'resets') {
                fetchResetRequests()
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`)
        } finally {
            setPasswordLoading(false)
        }
    }

    const handleRejectReset = async (request: PasswordResetRequest) => {
        if (!confirm(`Reject password reset request from ${request.user?.full_name}?`)) return
        setActionLoading(request.id)

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setResetRequests(prev => prev.filter(r => r.id !== request.id))
            setActionLoading(null)
            return
        }

        try {
            const response = await fetch('/api/admin/reject-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resetRequestId: request.id }),
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error)

            fetchResetRequests()
        } catch (error: any) {
            alert(`Error: ${error.message}`)
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

    const filteredUsers = users.filter(u => {
        if (roleFilter !== 'all') {
            return u.role === roleFilter
        }
        return true
    })

    const pendingResetCount = resetRequests.length

    return (
        <>
            <Card className="border-none shadow-none glass bg-transparent">
                <CardHeader className="flex flex-col space-y-4 pb-4 px-0">
                    <div className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex rounded-lg bg-muted p-1">
                                <button
                                    onClick={() => setActiveTab('active')}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'active' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    All Users
                                </button>
                                <button
                                    onClick={() => setActiveTab('resets')}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'resets' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Password Reset Requests
                                    {pendingResetCount > 0 && (
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                                            {pendingResetCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                        {activeTab === 'active' && (
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
                        )}
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    {activeTab === 'active' && (
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
                    )}

                    <div className="rounded-md border bg-card">
                        <div className="relative w-full overflow-auto">
                            {activeTab === 'active' ? (
                                <table className="w-full caption-bottom text-sm">
                                    <thead className="[&_tr]:border-b">
                                        <tr className="border-b transition-colors hover:bg-muted/50">
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
                                                    <td className="p-4"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></td>
                                                    <td className="p-4"><div className="h-4 w-32 animate-pulse rounded bg-muted" /></td>
                                                    <td className="p-4"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></td>
                                                    <td className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-muted" /></td>
                                                    <td className="p-4"><div className="h-4 w-12 animate-pulse rounded bg-muted" /></td>
                                                    <td className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-muted" /></td>
                                                    <td className="p-4"><div className="h-4 w-8 animate-pulse rounded bg-muted ml-auto" /></td>
                                                </tr>
                                            ))
                                        ) : filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                                    No users found.
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
                                                            <div>
                                                                <div>{user.full_name}</div>
                                                                {user.must_change_password && (
                                                                    <span className="text-[10px] text-amber-600 font-medium">Temp password</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-middle">{user.email}</td>
                                                    <td className="p-4 align-middle text-muted-foreground">{user.phone || '-'}</td>
                                                    <td className="p-4 align-middle font-medium">{user.unit_number || '-'}</td>
                                                    <td className="p-4 align-middle">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRoleBadgeColor(user.role)} pb-1`}>
                                                            {user.role.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 align-middle">
                                                        <div className="flex items-center">
                                                            <span className={`inline-flex items-center rounded-full h-2 w-2 ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                                            <span className="ml-2">{user.is_active ? 'Active' : 'Inactive'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-middle text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                                title="Set Temp Password"
                                                                onClick={() => setPasswordDialog({
                                                                    open: true,
                                                                    userId: user.id,
                                                                    userName: user.full_name,
                                                                })}
                                                            >
                                                                <Key className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
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
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                /* Password Reset Requests Tab */
                                <table className="w-full caption-bottom text-sm">
                                    <thead className="[&_tr]:border-b">
                                        <tr className="border-b transition-colors hover:bg-muted/50">
                                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">User</th>
                                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Requested</th>
                                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                        {loading ? (
                                            Array.from({ length: 3 }).map((_, i) => (
                                                <tr key={i} className="border-b transition-colors hover:bg-muted/50">
                                                    <td className="p-4"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></td>
                                                    <td className="p-4"><div className="h-4 w-32 animate-pulse rounded bg-muted" /></td>
                                                    <td className="p-4"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>
                                                    <td className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-muted" /></td>
                                                    <td className="p-4"><div className="h-4 w-8 animate-pulse rounded bg-muted ml-auto" /></td>
                                                </tr>
                                            ))
                                        ) : resetRequests.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                                    No pending password reset requests.
                                                </td>
                                            </tr>
                                        ) : (
                                            resetRequests.map((req) => (
                                                <tr key={req.id} className="border-b transition-colors hover:bg-muted/50">
                                                    <td className="p-4 align-middle font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">
                                                                {req.user?.full_name?.charAt(0) || '?'}
                                                            </div>
                                                            {req.user?.full_name || 'Unknown'}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-middle">{req.user?.email || '-'}</td>
                                                    <td className="p-4 align-middle text-muted-foreground">
                                                        {new Date(req.requested_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4 align-middle">
                                                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                                                            Pending
                                                        </span>
                                                    </td>
                                                    <td className="p-4 align-middle text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                title="Set Temporary Password"
                                                                onClick={() => setPasswordDialog({
                                                                    open: true,
                                                                    userId: req.user_id,
                                                                    userName: req.user?.full_name || 'User',
                                                                    resetRequestId: req.id,
                                                                })}
                                                                disabled={actionLoading === req.id}
                                                            >
                                                                {actionLoading === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                title="Reject Request"
                                                                onClick={() => handleRejectReset(req)}
                                                                disabled={actionLoading === req.id}
                                                            >
                                                                {actionLoading === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Password Dialog */}
            {passwordDialog.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
                        <h3 className="text-lg font-semibold">Set Temporary Password</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Set a temporary password for <span className="font-medium text-foreground">{passwordDialog.userName}</span>. They will be required to change it on their next login.
                        </p>
                        <div className="mt-4 space-y-3">
                            <div className="space-y-2">
                                <label htmlFor="temp-password" className="text-sm font-medium">Temporary Password</label>
                                <input
                                    id="temp-password"
                                    type="text"
                                    placeholder="Min 6 characters"
                                    value={tempPassword}
                                    onChange={(e) => setTempPassword(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    minLength={6}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setPasswordDialog({ open: false, userId: '', userName: '' })
                                    setTempPassword('')
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSetPassword}
                                disabled={passwordLoading || tempPassword.length < 6}
                            >
                                {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Set Password
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
