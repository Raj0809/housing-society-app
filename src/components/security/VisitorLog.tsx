"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Visitor, Unit } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, LogIn, LogOut, CheckCircle, XCircle, Clock, UserPlus, Phone } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export default function VisitorLog() {
    const { profile } = useAuth()
    const [visitors, setVisitors] = useState<Visitor[]>([])
    const [units, setUnits] = useState<Unit[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'checked_in' | 'pending'>('all')
    const [search, setSearch] = useState('')

    // Form State
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [formData, setFormData] = useState<Partial<Visitor>>({
        status: 'pending' // pending = pre-approval or waiting at gate
    })

    const isSecurity = profile?.role === 'security' || profile?.role === 'app_admin' || profile?.role === 'management'

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            // Mock Data
            const MOCK_VISITORS: Visitor[] = [
                { id: 'v1', visitor_name: 'Mahesh Delivery', visitor_phone: '9876543210', visiting_unit_id: 'u101', purpose: 'Package Delivery', status: 'checked_in', check_in: new Date(Date.now() - 3600000).toISOString(), created_at: new Date().toISOString(), unit: { unit_number: 'A-101' } },
                { id: 'v2', visitor_name: 'Suresh Electrician', visitor_phone: '9123456780', visiting_unit_id: 'u102', purpose: 'Maintenance', status: 'checked_out', check_in: new Date(Date.now() - 7200000).toISOString(), check_out: new Date(Date.now() - 1800000).toISOString(), created_at: new Date(Date.now() - 7200000).toISOString(), unit: { unit_number: 'B-202' } },
                { id: 'v3', visitor_name: 'Guest: Rahul', visitor_phone: '9988776655', visiting_unit_id: 'u101', purpose: 'Personal Visit', status: 'pending', created_at: new Date().toISOString(), unit: { unit_number: 'A-101' } },
            ]
            const MOCK_UNITS: Unit[] = [
                { id: 'u101', unit_number: 'A-101', society_id: 's1', unit_type: 'flat', area_sqft: 1200, owner_id: 'o1', created_at: '' },
                { id: 'u102', unit_number: 'B-202', society_id: 's1', unit_type: 'flat', area_sqft: 1400, owner_id: 'o2', created_at: '' },
            ]

            const localVisitors = JSON.parse(localStorage.getItem('mock_visitors') || '[]')
            setTimeout(() => {
                setVisitors([...localVisitors, ...MOCK_VISITORS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
                setUnits(MOCK_UNITS)
                setLoading(false)
            }, 500)
            return
        }

        try {
            const [visitorsRes, unitsRes] = await Promise.all([
                supabase.from('visitors').select('*, unit:units(unit_number)').order('created_at', { ascending: false }),
                supabase.from('units').select('*')
            ])

            if (visitorsRes.data) setVisitors(visitorsRes.data as any)
            if (unitsRes.data) setUnits(unitsRes.data as any)
        } catch (error) {
            console.error('Error fetching visitor data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddVisitor = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.visitor_name || !formData.visiting_unit_id) return
        setSubmitting(true)

        const selectedUnit = units.find(u => u.id === formData.visiting_unit_id)

        const newVisitor = {
            ...formData,
            created_at: new Date().toISOString(),
            registered_by: profile?.id
        }

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setTimeout(() => {
                const visitorWithId = { ...newVisitor, id: 'mock-' + Date.now(), unit: { unit_number: selectedUnit?.unit_number } }
                const local = JSON.parse(localStorage.getItem('mock_visitors') || '[]')
                localStorage.setItem('mock_visitors', JSON.stringify([visitorWithId, ...local]))

                setVisitors(prev => [visitorWithId as any, ...prev])
                setSubmitting(false)
                setShowForm(false)
                setFormData({ status: 'pending' })
            }, 500)
            return
        }

        try {
            const { error } = await supabase.from('visitors').insert(newVisitor)
            if (error) throw error
            fetchData()
            setShowForm(false)
            setFormData({ status: 'pending' })
        } catch (error) {
            alert('Failed to add visitor')
        } finally {
            setSubmitting(false)
        }
    }

    const handleAction = async (id: string, action: 'check_in' | 'check_out' | 'approve' | 'deny') => {
        let updates: any = {}
        const now = new Date().toISOString()

        switch (action) {
            case 'check_in':
                updates = { status: 'checked_in', check_in: now }
                break
            case 'check_out':
                updates = { status: 'checked_out', check_out: now }
                break
            case 'approve':
                updates = { status: 'approved', approved_by: profile?.id }
                break
            case 'deny':
                updates = { status: 'denied', approved_by: profile?.id }
                break
        }

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const local = JSON.parse(localStorage.getItem('mock_visitors') || '[]')
            const updatedLocal = local.map((v: any) => v.id === id ? { ...v, ...updates } : v)
            localStorage.setItem('mock_visitors', JSON.stringify(updatedLocal))

            setVisitors(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))
            return
        }

        try {
            const { error } = await supabase.from('visitors').update(updates).eq('id', id)
            if (error) throw error
            setVisitors(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))
        } catch (error) {
            console.error('Error updating visitor:', error)
        }
    }

    const filteredVisitors = visitors.filter(v => {
        if (filter === 'checked_in' && v.status !== 'checked_in') return false
        if (filter === 'pending' && v.status !== 'pending' && v.status !== 'approved') return false
        if (search && !v.visitor_name.toLowerCase().includes(search.toLowerCase()) && !v.unit?.unit_number?.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Security & Visitors</h2>
                    <p className="text-muted-foreground">Manage gate entries and visitor logs.</p>
                </div>
                {isSecurity && (
                    <Button onClick={() => setShowForm(true)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Add Visitor
                    </Button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                    <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
                    <Button variant={filter === 'checked_in' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('checked_in')} className="bg-green-600 hover:bg-green-700 text-white border-none">On Campus</Button>
                    <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('pending')} className="bg-yellow-600 hover:bg-yellow-700 text-white border-none">Expecting</Button>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search name or unit..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {/* Visitor List */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredVisitors.map((visitor) => (
                    <Card key={visitor.id} className={cn("relative transition-all hover:shadow-md border-l-4",
                        visitor.status === 'checked_in' ? "border-l-green-500" :
                            visitor.status === 'pending' ? "border-l-yellow-500" :
                                visitor.status === 'denied' ? "border-l-red-500" : "border-l-gray-300"
                    )}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-base font-semibold">{visitor.visitor_name}</CardTitle>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                        <Phone className="h-3 w-3" /> {visitor.visitor_phone}
                                    </div>
                                </div>
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-muted uppercase tracking-wider">{visitor.unit?.unit_number}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="pb-3 text-sm">
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                    <p className="text-xs text-muted-foreground">Purpose</p>
                                    <p className="font-medium">{visitor.purpose}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Status</p>
                                    <p className="font-medium capitalize flex items-center gap-1">
                                        {visitor.status === 'checked_in' && <CheckCircle className="h-3 w-3 text-green-500" />}
                                        {visitor.status.replace('_', ' ')}
                                    </p>
                                </div>
                                {visitor.check_in && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Check In</p>
                                        <p className="font-medium">{format(new Date(visitor.check_in), 'h:mm a')}</p>
                                    </div>
                                )}
                                {visitor.check_out && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Check Out</p>
                                        <p className="font-medium">{format(new Date(visitor.check_out), 'h:mm a')}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        {isSecurity && (
                            <CardFooter className="pt-0 flex gap-2 justify-end">
                                {visitor.status === 'pending' || visitor.status === 'approved' ? (
                                    <>
                                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleAction(visitor.id, 'deny')}>Deny</Button>
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(visitor.id, 'check_in')}>
                                            <LogIn className="mr-1 h-3 w-3" /> Check In
                                        </Button>
                                    </>
                                ) : visitor.status === 'checked_in' ? (
                                    <Button size="sm" variant="secondary" onClick={() => handleAction(visitor.id, 'check_out')}>
                                        <LogOut className="mr-1 h-3 w-3" /> Check Out
                                    </Button>
                                ) : null}
                            </CardFooter>
                        )}
                    </Card>
                ))}
            </div>

            {/* Add Visitor Modal (Dialog) */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>New Visitor</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddVisitor} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <Input required value={formData.visitor_name || ''} onChange={e => setFormData({ ...formData, visitor_name: e.target.value })} placeholder="Visitor Name" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Phone</label>
                                <Input required value={formData.visitor_phone || ''} onChange={e => setFormData({ ...formData, visitor_phone: e.target.value })} placeholder="98765..." />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Visiting Unit</label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                value={formData.visiting_unit_id || ''}
                                onChange={e => setFormData({ ...formData, visiting_unit_id: e.target.value })}
                                required
                            >
                                <option value="">Select Unit...</option>
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.unit_number} (Owner: {u.owner_id})</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Purpose</label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                value={formData.purpose || 'Personal'}
                                onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                            >
                                <option value="Personal">Personal Visit</option>
                                <option value="Delivery">Delivery</option>
                                <option value="Maintenance">Maintenance / Service</option>
                                <option value="Cab">Cab / Taxi</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <Button className="w-full" type="submit" disabled={submitting}>
                            {submitting ? 'Registering...' : 'Register Visitor'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
