"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { UserRole, Unit } from '@/types'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface UserFormProps {
    onSuccess: () => void
    onCancel: () => void
    initialData?: any
}

export default function UserForm({ onSuccess, onCancel, initialData }: UserFormProps) {
    const [loading, setLoading] = useState(false)
    const [units, setUnits] = useState<Unit[]>([])
    const [formData, setFormData] = useState({
        fullName: initialData?.full_name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        unitNumber: initialData?.unit_number || '',
        unitId: initialData?.unit_id || '',
        role: initialData?.role || 'resident' as UserRole,
        isActive: initialData?.is_active ?? true
    })
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchUnits = async () => {
            // Mock Units if placeholder
            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                setUnits([
                    { id: '1', unit_number: 'A-101', society_id: '1', unit_type: 'flat', area_sqft: 1200, owner_id: '', created_at: '' },
                    { id: '2', unit_number: 'A-102', society_id: '1', unit_type: 'flat', area_sqft: 1200, owner_id: '', created_at: '' },
                    { id: '3', unit_number: 'B-201', society_id: '1', unit_type: 'flat', area_sqft: 1400, owner_id: '', created_at: '' },
                    { id: '4', unit_number: 'V-001', society_id: '1', unit_type: 'villa', area_sqft: 3500, owner_id: '', created_at: '' },
                ])
                return
            }

            const { data } = await supabase.from('units').select('*').order('unit_number')
            if (data) setUnits(data as Unit[])
        }
        fetchUnits()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (initialData?.id) {
                // Update existing user
                const { error } = await supabase
                    .from('users')
                    .update({
                        full_name: formData.fullName,
                        phone: formData.phone,
                        unit_number: formData.unitNumber,
                        unit_id: formData.unitId,
                        role: formData.role,
                        is_active: formData.isActive
                    })
                    .eq('id', initialData.id)

                if (error) throw error

            } else {
                // Create Logic
                if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                    const newUser = {
                        id: 'u-' + Date.now(),
                        full_name: formData.fullName,
                        email: formData.email,
                        phone: formData.phone,
                        unit_number: formData.unitNumber,
                        unit_id: formData.unitId,
                        role: formData.role,
                        is_active: formData.isActive,
                        must_change_password: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                    const local = JSON.parse(localStorage.getItem('mock_users') || '[]')

                    // If local is empty, we might need to seed it first to avoid losing defaults if FetchUsers hasn't run yet?
                    // UserList handles seeding on fetch, so we should be okay appending to whatever is there.
                    // But if it's empty, we might want to ensure we don't just have 1 user.
                    // Let's just append.
                    localStorage.setItem('mock_users', JSON.stringify([newUser, ...local]))

                } else {
                    // Real implementation requires Admin API or invitation flow
                    // For now, we warn.
                    setError("User creation requires backend admin functions. Admin API integration pending.")
                    setLoading(false)
                    return
                }
            }

            onSuccess()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <label htmlFor="name" className="text-sm font-medium">Full Name</label>
                    <input
                        id="name"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        required
                    />
                </div>

                <div className="grid gap-2">
                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                    <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                        required
                        disabled={!!initialData}
                    />
                </div>

                <div className="grid gap-2">
                    <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
                    <input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="+1 234 567 890"
                    />
                </div>

                <div className="grid gap-2">
                    <label htmlFor="unit" className="text-sm font-medium">Unit/Villa Number</label>
                    <select
                        id="unit"
                        value={formData.unitNumber} // We store unit_number for display, but ideally should rely on unitId
                        onChange={(e) => {
                            const selectedValue = e.target.value
                            const selectedUnit = units.find(u => u.unit_number === selectedValue)
                            console.log('Selected Unit:', selectedUnit)
                            setFormData({
                                ...formData,
                                unitNumber: selectedValue,
                                unitId: selectedUnit?.id || ''
                            })
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="">Select Unit</option>
                        {units.map(unit => (
                            <option key={unit.id} value={unit.unit_number}>
                                {unit.unit_number} ({unit.unit_type === 'flat' ? 'Flat' : 'Villa'})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid gap-2">
                    <label htmlFor="role" className="text-sm font-medium">Role</label>
                    <select
                        id="role"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="resident">Resident</option>
                        <option value="management">Management</option>
                        <option value="app_admin">App Admin</option>
                        <option value="security">Security</option>
                        <option value="administration">Administration</option>
                    </select>
                </div>

                <div className="grid gap-2">
                    <label htmlFor="status" className="text-sm font-medium">Status</label>
                    <select
                        id="status"
                        value={formData.isActive ? 'active' : 'inactive'}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? 'Update User' : 'Add User'}
                </Button>
            </div>
        </form>
    )
}
