"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Vehicle } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Car, CheckCircle, XCircle, Shield, Sticker } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export default function VehicleList() {
    const { profile } = useAuth()
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Form State
    const [formData, setFormData] = useState<Partial<Vehicle>>({
        type: 'Car'
    })

    const isSecurityOrAdmin = profile?.role === 'security' || profile?.role === 'app_admin' || profile?.role === 'administration'

    useEffect(() => {
        fetchVehicles()

        const channel = supabase
            .channel('public:vehicles')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
                fetchVehicles()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [profile])


    const fetchVehicles = async () => {
        setLoading(true)
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            // Mock Data
            const MOCK_VEHICLES: Vehicle[] = [
                { id: '1', user_id: 'u1', type: 'Car', vehicle_number: 'KA-01-AB-1234', model: 'Honda City', sticker_status: 'approved', sticker_number: 'S-101', created_at: new Date().toISOString(), user: { full_name: 'John Doe', unit_number: 'A-101' } },
                { id: '2', user_id: 'u2', type: 'Bike', vehicle_number: 'KA-05-XY-9876', model: 'Royal Enfield', sticker_status: 'pending', created_at: new Date(Date.now() - 86400000).toISOString(), user: { full_name: 'Jane Smith', unit_number: 'B-205' } }
            ]

            setTimeout(() => {
                let data = MOCK_VEHICLES
                const local = JSON.parse(localStorage.getItem('mock_vehicles') || '[]')
                data = [...local, ...data]

                setVehicles(data)
                setLoading(false)
            }, 500)
            return
        }

        try {
            let query = supabase
                .from('vehicles')
                .select('*, user:users(full_name, unit_number)')
                .order('created_at', { ascending: false })

            if (!isSecurityOrAdmin && profile?.id) {
                query = query.eq('user_id', profile.id)
            }

            const { data, error } = await query
            if (error) throw error
            setVehicles(data as any)
        } catch (error) {
            console.error('Error fetching vehicles:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredVehicles = vehicles.filter(v => {
        if (!searchTerm) return true
        const searchLower = searchTerm.toLowerCase()
        return (
            v.vehicle_number.toLowerCase().includes(searchLower) ||
            v.user?.unit_number?.toLowerCase().includes(searchLower) ||
            v.user?.full_name?.toLowerCase().includes(searchLower) ||
            v.sticker_number?.toLowerCase().includes(searchLower)
        )
    })

    const [users, setUsers] = useState<{ id: string, full_name: string, unit_number: string }[]>([])

    useEffect(() => {
        const fetchUsers = async () => {
            if (isSecurityOrAdmin) {
                if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                    setUsers([
                        { id: 'u1', full_name: 'John Doe', unit_number: 'A-101' },
                        { id: 'u2', full_name: 'Jane Smith', unit_number: 'B-205' },
                        { id: 'u3', full_name: 'Mike Johnson', unit_number: 'A-102' }
                    ])
                } else {
                    const { data } = await supabase.from('users').select('id, full_name, unit_number').order('unit_number')
                    if (data) setUsers(data as any)
                }
            }
        }
        fetchUsers()
    }, [isSecurityOrAdmin])

    const handleAddVehicle = async (e: React.FormEvent) => {
        e.preventDefault()

        const newVehicle: any = {
            ...formData,
            user_id: isSecurityOrAdmin ? (formData.user_id || profile?.id) : profile?.id,
            vehicle_number: formData.vehicle_number?.toUpperCase(),
            sticker_status: 'pending',
            created_at: new Date().toISOString()
        }

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const local = JSON.parse(localStorage.getItem('mock_vehicles') || '[]')
            // Add mock user details
            newVehicle.id = 'v-' + Date.now()

            let userDetails = { full_name: profile?.full_name || 'Me', unit_number: profile?.unit_number || 'My Unit' }
            if (isSecurityOrAdmin && formData.user_id) {
                const selected = users.find(u => u.id === formData.user_id)
                if (selected) userDetails = selected
            }

            newVehicle.user = userDetails

            localStorage.setItem('mock_vehicles', JSON.stringify([newVehicle, ...local]))
            fetchVehicles()
            setShowForm(false)
            setFormData({ type: 'Car' })
            alert('Vehicle Registration Submitted')
            return
        }

        const { error } = await supabase.from('vehicles').insert(newVehicle)
        if (!error) {
            fetchVehicles()
            setShowForm(false)
            setFormData({ type: 'Car' })
            alert('Vehicle Registration Submitted')
        }
    }

    const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
        let sticker_number = undefined
        if (status === 'approved') {
            sticker_number = prompt('Enter Sticker Number (Optional):', `S-${Math.floor(100 + Math.random() * 900)}`)
        }

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const local = JSON.parse(localStorage.getItem('mock_vehicles') || '[]')
            const updated = local.map((v: any) => v.id === id ? { ...v, sticker_status: status, sticker_number } : v)
            localStorage.setItem('mock_vehicles', JSON.stringify(updated))
            fetchVehicles()
            setVehicles(prev => prev.map(v => v.id === id ? { ...v, sticker_status: status, sticker_number: sticker_number || undefined } : v))
            return
        }

        const { error } = await supabase.from('vehicles').update({ sticker_status: status, sticker_number }).eq('id', id)
        if (!error) fetchVehicles()
    }

    // Bulk Upload State
    const [showBulkUpload, setShowBulkUpload] = useState(false)
    const [bulkData, setBulkData] = useState('')

    const handleBulkUpload = async () => {
        const rows = bulkData.split('\n').filter(r => r.trim())
        const newVehicles: any[] = []

        for (const row of rows) {
            const [num, type, model, unit, sticker] = row.split(',').map(s => s.trim())
            if (num && type) {
                newVehicles.push({
                    vehicle_number: num.toUpperCase(),
                    type: (type === 'Car' || type === 'Bike') ? type : 'Car',
                    model: model || 'Unknown',
                    sticker_status: sticker ? 'approved' : 'pending',
                    sticker_number: sticker || undefined,
                    created_at: new Date().toISOString(),
                    user_id: 'bulk-imported', // In real app, we need to lookup User ID by Unit Number
                    // For UI display in mock, we can fake the user object
                    user: { unit_number: unit || 'N/A', full_name: 'Resident ' + (unit || '') },
                    id: 'v-' + Math.random().toString(36).substr(2, 9)
                })
            }
        }

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const local = JSON.parse(localStorage.getItem('mock_vehicles') || '[]')
            localStorage.setItem('mock_vehicles', JSON.stringify([...newVehicles, ...local]))
            fetchVehicles()
            setShowBulkUpload(false)
            setBulkData('')
            alert(`Processed ${newVehicles.length} vehicles.`)
            return
        }

        // Real implementation would batch insert. 
        // Note: Linking to real users by Unit Number requires a lookup. 
        // For now, logging capability.
        console.log('Bulk upload data ready:', newVehicles)
        alert('Bulk upload parsed. (Database insert not fully wired for Unit lookup in this demo).')
        setShowBulkUpload(false)
    }


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h2 className="text-xl font-semibold tracking-tight">
                    {isSecurityOrAdmin ? 'Vehicle Registry' : 'My Vehicles'}
                </h2>

                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search Number, Unit, Sticker..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {!isSecurityOrAdmin && (
                        <Dialog open={showForm} onOpenChange={setShowForm}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" /> Add Vehicle
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Register Vehicle</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleAddVehicle} className="space-y-4">
                                    {isSecurityOrAdmin && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Select Resident</label>
                                            <select
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={formData.user_id || ''}
                                                onChange={e => setFormData({ ...formData, user_id: e.target.value })}
                                                required={isSecurityOrAdmin}
                                            >
                                                <option value="">-- Select Resident --</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>
                                                        {u.unit_number} - {u.full_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Vehicle Type</label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                        >
                                            <option value="Car">Car</option>
                                            <option value="Bike">Bike</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Vehicle Number</label>
                                        <Input
                                            required
                                            placeholder="KA-01-AB-1234"
                                            value={formData.vehicle_number || ''}
                                            onChange={e => setFormData({ ...formData, vehicle_number: e.target.value })}
                                            className="uppercase"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Model / Make</label>
                                        <Input
                                            required
                                            placeholder="e.g. Honda City, Swift"
                                            value={formData.model || ''}
                                            onChange={e => setFormData({ ...formData, model: e.target.value })}
                                        />
                                    </div>
                                    <Button className="w-full" type="submit">Submit Request</Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                    {isSecurityOrAdmin && (
                        <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <Plus className="mr-2 h-4 w-4" /> Bulk Upload
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Bulk Upload Vehicles</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="bg-muted p-3 rounded text-xs">
                                        <p className="font-semibold mb-1">Format (CSV):</p>
                                        <code>Vehicle Number, Type (Car/Bike), Model, Unit Number, Sticker Number (Optional)</code>
                                        <p className="mt-1 text-muted-foreground">Example: <code>KA01AB1234, Car, Honda City, A-101, S-100</code></p>
                                    </div>
                                    <textarea
                                        className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        placeholder="Paste CSV data here..."
                                        value={bulkData}
                                        onChange={e => setBulkData(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" onClick={() => setShowBulkUpload(false)}>Cancel</Button>
                                        <Button onClick={handleBulkUpload} disabled={!bulkData.trim()}>Upload Process</Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredVehicles.length === 0 && !loading && (
                    <div className="col-span-full text-center py-12 text-muted-foreground opacity-50 flex flex-col items-center">
                        <Car className="h-12 w-12 mb-2" />
                        No vehicles found.
                    </div>
                )}

                {filteredVehicles.map((vehicle) => (
                    <Card key={vehicle.id} className="overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-muted/20 flex flex-row items-center justify-between space-y-0">
                            <span className="font-bold font-mono tracking-wider text-base">{vehicle.vehicle_number}</span>
                            <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                                vehicle.sticker_status === 'approved' ? "bg-green-100 text-green-700 border-green-200" :
                                    vehicle.sticker_status === 'pending' ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                        "bg-red-100 text-red-700 border-red-200"
                            )}>
                                {vehicle.sticker_status}
                            </span>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1 text-sm">
                                    <p className="text-muted-foreground flex items-center gap-2">
                                        <Car className="h-3 w-3" /> {vehicle.model} ({vehicle.type})
                                    </p>
                                    <p className="text-muted-foreground">
                                        Owner: <span className="text-foreground font-medium">{vehicle.user?.full_name}</span>
                                    </p>
                                    <p className="text-muted-foreground">
                                        Unit: <span className="text-foreground font-medium">{vehicle.user?.unit_number}</span>
                                    </p>
                                </div>
                                {vehicle.sticker_number && (
                                    <div className="text-center bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-2 rounded">
                                        <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-semibold flex items-center justify-center gap-1">
                                            <Sticker className="h-3 w-3" /> Sticker
                                        </p>
                                        <p className="font-bold text-lg text-blue-700 dark:text-blue-300">{vehicle.sticker_number}</p>
                                    </div>
                                )}
                            </div>

                            {/* Admin Actions */}
                            {isSecurityOrAdmin && vehicle.sticker_status === 'pending' && (
                                <div className="pt-3 flex gap-2 border-t mt-1">
                                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 h-8" onClick={() => handleUpdateStatus(vehicle.id, 'approved')}>
                                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                                    </Button>
                                    <Button size="sm" variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-8" onClick={() => handleUpdateStatus(vehicle.id, 'rejected')}>
                                        <XCircle className="h-3 w-3 mr-1" /> Reject
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
