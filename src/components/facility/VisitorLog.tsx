"use client"

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Visitor } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, LogIn, LogOut, CheckCircle, Shield, XCircle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export default function VisitorLog() {
    const { profile } = useAuth()
    const [visitors, setVisitors] = useState<Visitor[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'active' | 'log' | 'pending' | 'approved'>('active')
    const [showForm, setShowForm] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [units, setUnits] = useState<{ id: string, unit_number: string }[]>([])

    // Form State
    const [formData, setFormData] = useState<Partial<Visitor>>({
        purpose: 'Guest'
    })

    // Security Action State
    const [actionLoading, setActionLoading] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const isSecurity = profile?.role === 'security' || profile?.role === 'app_admin' || profile?.role === 'administration'
    // For resident, check if they are the target of a notification
    const myUnitId = profile?.unit_id

    useEffect(() => {
        // Initialize Audio
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3') // Simple notify beep

        fetchVisitors()
        fetchUnits()

        // Subscribe to real-time updates ONLY if not mock
        let channel: any = null
        const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (sbUrl && !sbUrl.includes('placeholder')) {
            channel = supabase
                .channel('public:visitors')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, (payload) => {
                    handleRealtimeEvent(payload)
                    fetchVisitors() // Refresh list
                })
                .subscribe()
        }

        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [activeTab, profile])

    const handleRealtimeEvent = (payload: any) => {
        const newRecord = payload.new as Visitor
        const oldRecord = payload.old

        if (!newRecord) return

        // Case 1: Resident Buzzer - New Visitor for My Unit (Pending)
        if (!isSecurity && newRecord.visiting_unit_id === myUnitId && newRecord.status === 'pending' && (!oldRecord || oldRecord.status !== 'pending')) {
            playBuzzer()
            alert(`New Visitor Request: ${newRecord.visitor_name}`)
        }

        // Case 2: Security Buzzer - Visitor Approved/Rejected
        if (isSecurity && (newRecord.status === 'approved' || newRecord.status === 'denied') && oldRecord?.status === 'pending') {
            playBuzzer()
        }
    }

    const playBuzzer = () => {
        if (audioRef.current) {
            audioRef.current.play().catch(e => console.log('Audio play blocked', e))
        }
    }

    const fetchUnits = async () => {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setUnits([{ id: 'u1', unit_number: 'A-101' }, { id: 'u2', unit_number: 'B-205' }, { id: 'u3', unit_number: 'C-303' }])
            return
        }
        const { data } = await supabase.from('units').select('id, unit_number').order('unit_number')
        if (data) setUnits(data)
    }

    const fetchVisitors = async () => {
        setLoading(true)
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            // Mock Data
            const MOCK_VISITORS: Visitor[] = [
                { id: '1', visitor_name: 'John Doe', visitor_phone: '9876543210', visiting_unit_id: 'u1', unit: { unit_number: 'A-101' }, purpose: 'Delivery', status: 'checked_in', check_in: new Date(Date.now() - 3600000).toISOString(), created_at: new Date().toISOString() },
                { id: '2', visitor_name: 'Jane Smith', visitor_phone: '8765432109', visiting_unit_id: 'u2', unit: { unit_number: 'B-205' }, purpose: 'Family', status: 'pending', entry_code: '123456', created_at: new Date().toISOString() },
                { id: '3', visitor_name: 'Bob Wilson', visitor_phone: '7654321098', visiting_unit_id: 'u1', unit: { unit_number: 'A-101' }, purpose: 'Maid', status: 'checked_out', check_in: new Date(Date.now() - 86400000).toISOString(), check_out: new Date(Date.now() - 82800000).toISOString(), created_at: new Date().toISOString() }
            ]

            setTimeout(() => {
                let data = MOCK_VISITORS
                const local = JSON.parse(localStorage.getItem('mock_visitors') || '[]')
                data = [...local, ...data]

                if (activeTab === 'active') {
                    data = data.filter(v => v.status === 'checked_in')
                } else if (activeTab === 'pending') {
                    data = data.filter(v => v.status === 'pending')
                    // Filter residents?
                } else if (activeTab === 'approved') {
                    data = data.filter(v => v.status === 'approved')
                } else {
                    data = data.filter(v => ['checked_out', 'denied'].includes(v.status))
                }

                setVisitors(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
                setLoading(false)
            }, 500)
            return
        }

        try {
            let query = supabase
                .from('visitors')
                .select('*, unit:units(unit_number)')
                .order('created_at', { ascending: false })

            if (activeTab === 'active') {
                query = query.eq('status', 'checked_in')
            } else if (activeTab === 'pending') {
                query = query.eq('status', 'pending')
            } else if (activeTab === 'approved') {
                query = query.eq('status', 'approved')
            } else {
                query = query.in('status', ['checked_out', 'denied'])
            }

            // Filter for resident view
            // if (!isSecurity && profile?.unit_id) query = query.eq('visiting_unit_id', profile.unit_id)

            const { data, error } = await query
            if (error) throw error
            setVisitors(data as any)
        } catch (error) {
            console.error('Error fetching visitors:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredVisitors = visitors.filter(v => {
        if (!searchTerm) return true
        const searchLower = searchTerm.toLowerCase()
        return (
            v.visitor_name.toLowerCase().includes(searchLower) ||
            v.unit?.unit_number.toLowerCase().includes(searchLower) ||
            v.entry_code?.includes(searchLower)
        )
    })

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        setActionLoading(true)

        // Generate simple code
        const code = Math.floor(100000 + Math.random() * 900000).toString()

        // Security Walk-in status is NOW 'pending', NOT 'checked_in'
        // Unless it's a pre-approved code scenario, but here we are creating new.

        const newVisitor = {
            ...formData,
            status: !isSecurity ? 'approved' : 'pending', // Resident = Approved immediately. Security = Pending.
            entry_code: code,
            check_in: undefined,
            approved_by: !isSecurity ? profile?.id : undefined, // Auto-approve if resident
            created_at: new Date().toISOString(),
            registered_by: profile?.id,
            visiting_unit_id: isSecurity ? formData.visiting_unit_id : (profile?.unit_id || 'u1')
        }

        const unitNum = units.find(u => u.id === newVisitor.visiting_unit_id)?.unit_number || 'N/A'

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setTimeout(() => {
                const visitorWithId = { ...newVisitor, id: 'mock-' + Date.now(), unit: { unit_number: unitNum } }
                const local = JSON.parse(localStorage.getItem('mock_visitors') || '[]')
                localStorage.setItem('mock_visitors', JSON.stringify([...local, visitorWithId]))

                const targetTab = newVisitor.status === 'pending' ? 'pending' : 'approved'
                if (activeTab === targetTab) setVisitors(prev => [visitorWithId as any, ...prev])
                else {
                    setActiveTab(targetTab)
                    fetchVisitors()
                }

                setShowForm(false)
                setFormData({ purpose: 'Guest' })
                setActionLoading(false)
                alert(`Entry Code Generated: ${code}. Waiting for Resident Approval.`)
            }, 500)
            return
        }

        const { error } = await supabase.from('visitors').insert(newVisitor)
        if (!error) {
            fetchVisitors()
            setShowForm(false)
            setFormData({ purpose: 'Guest' })
            alert(`Entry Code Generated: ${code}. Waiting for Resident Approval.`)
        }
        setActionLoading(false)
    }

    const handleCheckIn = async (id: string, currentStatus: string, visitor?: Visitor) => {
        if (!confirm('Allow entry for this visitor?')) return
        if (currentStatus !== 'approved') {
            alert('Visitor must be APPROVED by resident before Check-In.')
            return
        }

        // Date Validity Check
        if (visitor?.valid_from && new Date() < new Date(visitor.valid_from)) {
            alert(`Entry not allowed yet. Valid from: ${format(new Date(visitor.valid_from), 'MMM d, yyyy')}`)
            return
        }
        if (visitor?.valid_until) {
            const until = new Date(visitor.valid_until)
            until.setHours(23, 59, 59, 999) // End of day
            if (new Date() > until) {
                alert(`Entry Code Expired. Valid until: ${format(until, 'MMM d, yyyy')}`)
                return
            }
        }

        // Multi-entry / Validity Logic
        if (visitor?.valid_until) {
            // 1. Check if already inside (Active Check)
            // Ideally we query DB, but checking local list for speed (might miss if pagination, but ok for now)
            const isAlreadyInside = visitors.some(v => v.entry_code === visitor.entry_code && v.status === 'checked_in')
            if (isAlreadyInside) {
                alert('Visitor with this code is already Checked In!')
                return
            }

            // 2. Clone for Entry Log
            const newLogEntry = {
                visitor_name: visitor.visitor_name,
                visitor_phone: visitor.visitor_phone,
                visiting_unit_id: visitor.visiting_unit_id,
                purpose: visitor.purpose,
                bg_check_status: 'cleared', // assuming cleared if pre-approved
                entry_code: visitor.entry_code, // Keep code for linking
                status: 'checked_in',
                check_in: new Date().toISOString(),
                registered_by: profile?.id,
                created_at: new Date().toISOString(),
                // We DON'T set valid_until on the log entry itself, to treat it as a single instance
                // But we might want to know it's part of a pass? Not strictly needed for Log.
            }

            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                const logWithId = { ...newLogEntry, id: 'log-' + Date.now(), unit: visitor.unit, valid_until: undefined }
                const local = JSON.parse(localStorage.getItem('mock_visitors') || '[]')
                localStorage.setItem('mock_visitors', JSON.stringify([logWithId, ...local]))
                fetchVisitors()
                alert('Entry Logged (Multi-entry Pass)')
                return
            }

            const { error } = await supabase.from('visitors').insert(newLogEntry)
            if (error) {
                console.error(error)
                alert('Error logging entry')
            } else {
                fetchVisitors()
                alert('Entry Logged')
            }

        } else {
            // Single Entry - Standard Behavior (Consume the record)
            updateStatus(id, 'checked_in', { check_in: new Date().toISOString() })
        }
    }

    const handleCheckOut = async (id: string) => {
        updateStatus(id, 'checked_out', { check_out: new Date().toISOString() })
    }

    const handleApprove = async (id: string) => {
        updateStatus(id, 'approved', { approved_by: profile?.id })
    }

    const handleDeny = async (id: string) => {
        updateStatus(id, 'denied', { approved_by: profile?.id })
    }

    const updateStatus = async (id: string, status: string, extraData: any = {}) => {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const local = JSON.parse(localStorage.getItem('mock_visitors') || '[]')
            const updatedLocal = local.map((v: any) => v.id === id ? { ...v, status, ...extraData } : v)
            localStorage.setItem('mock_visitors', JSON.stringify(updatedLocal))

            // Refetch to update list/tabs correctly
            fetchVisitors()
            return
        }

        await supabase.from('visitors').update({ status, ...extraData }).eq('id', id)
        fetchVisitors()
    }

    return (
        <div className="space-y-6">
            {/* Header / Tabs */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex bg-muted p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
                        <button onClick={() => setActiveTab('active')} className={cn("px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap", activeTab === 'active' ? "bg-background shadow-sm" : "text-muted-foreground")}>
                            Active
                        </button>
                        <button onClick={() => setActiveTab('pending')} className={cn("px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap", activeTab === 'pending' ? "bg-background shadow-sm" : "text-muted-foreground")}>
                            Pending {visitors.some(v => v.status === 'pending') && <span className="ml-1 text-amber-600">●</span>}
                        </button>
                        <button onClick={() => setActiveTab('approved')} className={cn("px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap", activeTab === 'approved' ? "bg-background shadow-sm" : "text-muted-foreground")}>
                            Pre-approved
                        </button>
                        <button onClick={() => setActiveTab('log')} className={cn("px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap", activeTab === 'log' ? "bg-background shadow-sm" : "text-muted-foreground")}>
                            History
                        </button>
                    </div>
                    <Button onClick={() => setShowForm(true)}>
                        <Plus className="mr-2 h-4 w-4" /> {isSecurity ? 'Log Walk-In' : 'Pre-approve Guest'}
                    </Button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by Visitor Name, Unit Number (e.g. A-101), or Entry Code..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredVisitors.length === 0 && !loading && (
                    <div className="col-span-full text-center py-12 text-muted-foreground opacity-50 flex flex-col items-center">
                        <Shield className="h-12 w-12 mb-2" />
                        No visitors found in this view.
                    </div>
                )}

                {filteredVisitors.map((visitor) => (
                    <Card key={visitor.id} className="overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-muted/20 flex flex-row items-center justify-between space-y-0">
                            <span className="font-semibold text-sm">{visitor.visitor_name}</span>
                            <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                                visitor.status === 'checked_in' ? "bg-green-100 text-green-700 border-green-200" :
                                    visitor.status === 'approved' ? "bg-blue-100 text-blue-700 border-blue-200" :
                                        visitor.status === 'pending' ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                            "bg-gray-100 text-gray-700 border-gray-200"
                            )}>
                                {visitor.status.replace('_', ' ')}
                            </span>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start text-sm">
                                <div className="space-y-1">
                                    <div className="text-muted-foreground flex flex-col gap-1">
                                        <p>
                                            Unit: <span className="text-foreground font-medium">{visitor.unit?.unit_number}</span>
                                        </p>
                                        <p>
                                            <span className="font-medium text-foreground">Purpose:</span> {visitor.purpose}
                                        </p>
                                        {visitor.visitor_phone && (
                                            <p>Ph: {visitor.visitor_phone}</p>
                                        )}
                                        {visitor.vehicle_number && (
                                            <p>
                                                Vehicle: <span className="text-foreground font-medium">{visitor.vehicle_number}</span>
                                            </p>
                                        )}
                                        {visitor.valid_until && (
                                            <p className="text-xs text-blue-600 mt-1">
                                                Valid: {format(new Date(visitor.valid_from!), 'MMM d')} - {format(new Date(visitor.valid_until), 'MMM d')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {visitor.entry_code && (
                                    <div className="text-center bg-slate-100 dark:bg-slate-800 p-2 rounded">
                                        <p className="text-[10px] text-muted-foreground uppercase">Code</p>
                                        <p className="font-mono font-bold text-lg tracking-widest">{visitor.entry_code}</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 border-t flex items-center justify-between gap-2">
                                <div className="text-xs text-muted-foreground">
                                    {visitor.status === 'checked_in' && `In: ${format(new Date(visitor.check_in || visitor.created_at), 'h:mm a')} `}
                                    {visitor.status === 'pending' && `Req: ${format(new Date(visitor.created_at), 'MMM d, h:mm a')} `}
                                    {visitor.status === 'approved' && `Appr: ${format(new Date(visitor.created_at), 'MMM d, h:mm a')} `}
                                    {visitor.status === 'checked_out' && `Out: ${format(new Date(visitor.check_out || visitor.created_at), 'MMM d, h:mm a')} `}
                                </div>

                                <div className="flex gap-2">
                                    {/* Security Actions */}
                                    {isSecurity && (visitor.status === 'pending' || visitor.status === 'approved') && (
                                        <Button
                                            size="sm"
                                            className={cn("h-8", visitor.status === 'approved' ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed")}
                                            onClick={() => handleCheckIn(visitor.id, visitor.status, visitor)}
                                            disabled={visitor.status !== 'approved'}
                                        >
                                            <LogIn className="h-3 w-3 mr-1" /> {visitor.status === 'approved' ? 'Entry' : 'Wait'}
                                        </Button>
                                    )}
                                    {isSecurity && visitor.status === 'checked_in' && (
                                        <Button size="sm" variant="outline" className="h-8 border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleCheckOut(visitor.id)}>
                                            <LogOut className="h-3 w-3 mr-1" /> Exit
                                        </Button>
                                    )}

                                    {/* Resident Actions */}
                                    {(!isSecurity || isSecurity) && visitor.status === 'pending' && (
                                        // Allow Security to also approve if they are calling resident? No, strictly Resident.
                                        // Actually, if it's 'pending', resident must approve. 
                                        // Show actions only to Resident OR if Admin wants to override.
                                        (!isSecurity || profile?.role === 'app_admin') && (
                                            <>
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600" onClick={() => handleApprove(visitor.id)}><CheckCircle className="h-4 w-4" /></Button>
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => handleDeny(visitor.id)}><XCircle className="h-4 w-4" /></Button>
                                            </>
                                        )
                                    )}

                                    {/* Visual Cue for Security when Pending */}
                                    {isSecurity && visitor.status === 'pending' && (
                                        <div className="flex items-center text-xs text-amber-600 font-medium animate-pulse">
                                            <AlertCircle className="h-3 w-3 mr-1" /> Approval Req.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Pre-approve / Walk-in Form */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-md bg-background rounded-lg shadow-lg border p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">{isSecurity ? 'Log Check-In Request' : 'Pre-approve Visitor'}</h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>✕</Button>
                        </div>
                        <form onSubmit={handleCreateRequest} className="space-y-4">
                            {/* Security selects Unit */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Visiting Unit</label>
                                {isSecurity ? (
                                    <select
                                        required
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={formData.visiting_unit_id || ''}
                                        onChange={e => setFormData({ ...formData, visiting_unit_id: e.target.value })}
                                    >
                                        <option value="">Select Unit</option>
                                        {units.map(u => (
                                            <option key={u.id} value={u.id}>{u.unit_number}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                                        {profile?.unit_number || 'My Unit'}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Visitor Name</label>
                                <Input required value={formData.visitor_name || ''} onChange={e => setFormData({ ...formData, visitor_name: e.target.value })} placeholder="John Doe" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Phone (Optional)</label>
                                <Input value={formData.visitor_phone || ''} onChange={e => setFormData({ ...formData, visitor_phone: e.target.value })} placeholder="9876543210" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Vehicle Number (Optional)</label>
                                <Input
                                    placeholder="e.g. KA-01-AB-1234"
                                    value={formData.vehicle_number || ''}
                                    onChange={e => setFormData({ ...formData, vehicle_number: e.target.value.toUpperCase() })}
                                />
                            </div>

                            {/* Validity Section */}
                            {!isSecurity && (
                                <div className="space-y-3 p-3 bg-muted/30 rounded-md border">
                                    <label className="text-sm font-medium">Validity Period</label>
                                    <div className="flex gap-2 text-xs overflow-x-auto pb-1">
                                        {['Single Entry', 'Whole Day', '1 Week', '1 Month'].map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => {
                                                    const now = new Date()
                                                    let until = new Date()
                                                    if (type === 'Whole Day') until.setHours(23, 59, 59, 999)
                                                    if (type === '1 Week') until.setDate(now.getDate() + 7)
                                                    if (type === '1 Month') until.setMonth(now.getMonth() + 1)

                                                    setFormData({
                                                        ...formData,
                                                        valid_from: now.toISOString().split('T')[0],
                                                        valid_until: type === 'Single Entry' ? undefined : until.toISOString().split('T')[0]
                                                    })
                                                }}
                                                className={cn(
                                                    "px-3 py-1 rounded-full border transition-colors whitespace-nowrap",
                                                    (formData.valid_until && type !== 'Single Entry') || (!formData.valid_until && type === 'Single Entry')
                                                        ? "bg-primary text-primary-foreground border-primary"
                                                        : "bg-background hover:bg-muted"
                                                )}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground">Valid From</label>
                                            <Input
                                                type="date"
                                                required
                                                value={formData.valid_from ? formData.valid_from.split('T')[0] : new Date().toISOString().split('T')[0]}
                                                onChange={e => setFormData({ ...formData, valid_from: e.target.value })}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground">Valid Until</label>
                                            <Input
                                                type="date"
                                                value={formData.valid_until ? formData.valid_until.split('T')[0] : ''}
                                                onChange={e => setFormData({ ...formData, valid_until: e.target.value })}
                                                className="h-8 text-sm"
                                                min={formData.valid_from ? formData.valid_from.split('T')[0] : undefined}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Purpose</label>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.purpose} onChange={e => setFormData({ ...formData, purpose: e.target.value })}>
                                    <option value="Guest">Guest</option>
                                    <option value="Delivery">Delivery</option>
                                    <option value="Cab">Cab/Taxi</option>
                                    <option value="Service">Service/Repair</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <Button className="w-full" type="submit" disabled={actionLoading}>
                                {actionLoading ? 'Processing...' : (isSecurity ? 'Request Approval' : 'Generate Entry Code')}
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
