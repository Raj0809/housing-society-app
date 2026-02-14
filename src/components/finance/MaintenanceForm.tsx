"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { Unit } from '@/types'

interface MaintenanceFormProps {
    onSuccess: () => void
    onCancel: () => void
}

export default function MaintenanceForm({ onSuccess, onCancel }: MaintenanceFormProps) {
    const [loading, setLoading] = useState(false)
    const [units, setUnits] = useState<Unit[]>([])
    const [formData, setFormData] = useState({
        unitId: '',
        calculationMethod: 'fixed' as 'fixed' | 'sqft',
        rate: '',
        amount: '',
        dueDate: '',
        period: new Date().toISOString().substring(0, 7), // YYYY-MM
        isIgst: false
    })
    const [error, setError] = useState<string | null>(null)
    const [societyProfile, setSocietyProfile] = useState<any>(null)

    useEffect(() => {
        fetchUnits()
        fetchSocietyProfile()
    }, [])

    const fetchSocietyProfile = async () => {
        const { data } = await supabase.from('society_profile').select('*').single()
        if (data) setSocietyProfile(data)
    }

    useEffect(() => {
        if (formData.unitId && formData.calculationMethod === 'sqft' && formData.rate) {
            const selectedUnit = units.find(u => u.id === formData.unitId)
            if (selectedUnit && selectedUnit.area_sqft) {
                const calculated = (parseFloat(formData.rate) * selectedUnit.area_sqft).toFixed(2)
                setFormData(prev => ({ ...prev, amount: calculated }))
            }
        }
    }, [formData.unitId, formData.calculationMethod, formData.rate, units])

    const fetchUnits = async () => {
        setLoading(true)
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const MOCK_UNITS: Unit[] = [
                { id: 'u101', unit_number: 'A-101', society_id: 's1', unit_type: 'flat', area_sqft: 1200, owner_id: 'o1', created_at: '' },
                { id: 'u102', unit_number: 'B-202', society_id: 's1', unit_type: 'flat', area_sqft: 1400, owner_id: 'o2', created_at: '' },
                { id: 'u103', unit_number: 'C-303', society_id: 's1', unit_type: 'villa', area_sqft: 2500, owner_id: 'o3', created_at: '' },
            ]
            setTimeout(() => {
                setUnits(MOCK_UNITS)
                setLoading(false)
            }, 500)
            return
        }

        try {
            const { data, error } = await supabase.from('units').select('*').order('unit_number')
            if (error) throw error
            if (data) setUnits(data as Unit[])
        } catch (err) {
            console.error('Error fetching units:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (!formData.unitId || !formData.amount || !formData.dueDate) {
                throw new Error("Please fill all required fields")
            }

            const selectedUnit = units.find(u => u.id === formData.unitId)

            const baseAmount = parseFloat(formData.amount)
            let taxAmount = 0
            let cgst = 0
            let sgst = 0
            let igst = 0
            let totalAmount = baseAmount

            if (societyProfile?.is_gst_registered) {
                const rate = societyProfile.default_gst_rate || 18
                taxAmount = (baseAmount * rate) / 100

                if (formData.isIgst) {
                    igst = taxAmount
                } else {
                    cgst = taxAmount / 2
                    sgst = taxAmount / 2
                }
                totalAmount = baseAmount + taxAmount
            }

            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                // Mock Success
                const mockInvoice = {
                    id: 'mf-' + Math.random().toString(36).substr(2, 9),
                    unit_id: formData.unitId,
                    amount: parseFloat(formData.amount),
                    due_date: formData.dueDate,
                    payment_status: 'pending',
                    created_at: new Date().toISOString(),
                    description: formData.calculationMethod === 'sqft'
                        ? `Maintenance (${formData.rate}/sqft for ${selectedUnit?.area_sqft} sqft)`
                        : 'Monthly Maintenance (Fixed)',
                    fee_type: 'monthly',
                    units: { unit_number: selectedUnit?.unit_number || 'Unknown', unit_type: selectedUnit?.unit_type }
                }
                const localFees = JSON.parse(localStorage.getItem('mock_maintenance_fees') || '[]')
                localStorage.setItem('mock_maintenance_fees', JSON.stringify([mockInvoice, ...localFees]))

                await new Promise(resolve => setTimeout(resolve, 800))
                onSuccess()
                return
            }

            const { error } = await supabase
                .from('maintenance_fees')
                .insert({
                    unit_id: formData.unitId,
                    amount: parseFloat(formData.amount),
                    due_date: formData.dueDate,
                    payment_status: 'pending',
                    description: formData.calculationMethod === 'sqft'
                        ? `Maintenance (${formData.rate}/sqft)`
                        : 'Monthly Maintenance (Fixed)',
                    taxable_amount: baseAmount,
                    cgst_amount: cgst,
                    sgst_amount: sgst,
                    igst_amount: igst,
                    tax_amount: taxAmount,
                    total_amount: totalAmount
                })

            if (error) throw error
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
                    <label className="text-sm font-medium">Select Unit</label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        value={formData.unitId}
                        onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                        required
                    >
                        <option value="">Choose Unit...</option>
                        {units.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.unit_number} ({u.area_sqft} sqft)
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Calculation Method</label>
                        <select
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                            value={formData.calculationMethod}
                            onChange={(e) => setFormData({ ...formData, calculationMethod: e.target.value as any })}
                        >
                            <option value="fixed">Fixed Amount</option>
                            <option value="sqft">Rate per Sqft</option>
                        </select>
                    </div>
                    {formData.calculationMethod === 'sqft' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Rate (₹/sqft)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                value={formData.rate}
                                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                                placeholder="2.50"
                            />
                        </div>
                    )}
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium">Total Amount (₹)</label>
                    <input
                        type="number"
                        step="0.01"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        required
                        readOnly={formData.calculationMethod === 'sqft'} // Auto-calculated
                    />
                    {formData.calculationMethod === 'sqft' && formData.unitId && (
                        <p className="text-xs text-muted-foreground">
                            Calculated based on {units.find(u => u.id === formData.unitId)?.area_sqft} sqft area.
                        </p>
                    )}
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium">Due Date</label>
                    <input
                        type="date"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        required
                    />
                </div>

                {societyProfile?.is_gst_registered && (
                    <div className="flex items-center space-x-2 pt-2">
                        <input
                            type="checkbox"
                            id="isIgst"
                            checked={formData.isIgst}
                            onChange={(e) => setFormData({ ...formData, isIgst: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300"
                        />
                        <label htmlFor="isIgst" className="text-sm font-medium">Inter-state (IGST Applicable)</label>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Invoice
                </Button>
            </div>
        </form>
    )
}
