"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Unit } from '@/types'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface UnitFormProps {
    onSuccess: () => void
    onCancel: () => void
    initialData?: Unit
}

export default function UnitForm({ onSuccess, onCancel, initialData }: UnitFormProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        unitNumber: initialData?.unit_number || '',
        unitType: initialData?.unit_type || 'flat',
        blockName: initialData?.block_name || '',
        floorNumber: initialData?.floor_number || '',
        areaSqft: initialData?.area_sqft || '',
    })
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (!formData.unitNumber || !formData.areaSqft) {
                throw new Error("Unit Number and Area are required")
            }

            // In a real app we would check for duplicates here
            // const { data: existing } = await supabase.from('units').select('id').eq('unit_number', formData.unitNumber).single()
            // if (existing && !initialData) throw new Error("Unit already exists")

            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                await new Promise(resolve => setTimeout(resolve, 800))
                onSuccess()
                return
            }

            const payload = {
                unit_number: formData.unitNumber,
                unit_type: formData.unitType,
                block_name: formData.blockName,
                floor_number: formData.floorNumber ? parseInt(String(formData.floorNumber)) : null,
                area_sqft: parseFloat(String(formData.areaSqft)),
                society_id: null
            }

            if (initialData?.id) {
                const { error } = await supabase
                    .from('units')
                    .update(payload)
                    .eq('id', initialData.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('units')
                    .insert(payload)
                if (error) throw error
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
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <label htmlFor="unitNumber" className="text-sm font-medium">Unit Number</label>
                        <input
                            id="unitNumber"
                            value={formData.unitNumber}
                            onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder="A-101"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="unitType" className="text-sm font-medium">Type</label>
                        <select
                            id="unitType"
                            value={formData.unitType}
                            onChange={(e) => setFormData({ ...formData, unitType: e.target.value as any })}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="flat">Flat</option>
                            <option value="villa">Villa</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <label htmlFor="blockName" className="text-sm font-medium">Block Name</label>
                        <input
                            id="blockName"
                            value={formData.blockName}
                            onChange={(e) => setFormData({ ...formData, blockName: e.target.value })}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder="Block A"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="floorNumber" className="text-sm font-medium">Floor Number</label>
                        <input
                            id="floorNumber"
                            type="number"
                            value={formData.floorNumber}
                            onChange={(e) => setFormData({ ...formData, floorNumber: e.target.value })}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder="1"
                        />
                    </div>
                </div>

                <div className="grid gap-2">
                    <label htmlFor="areaSqft" className="text-sm font-medium">Area (Sq. Ft)</label>
                    <input
                        id="areaSqft"
                        type="number"
                        value={formData.areaSqft}
                        onChange={(e) => setFormData({ ...formData, areaSqft: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="1200"
                        required
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? 'Update Unit' : 'Add Unit'}
                </Button>
            </div>
        </form>
    )
}
