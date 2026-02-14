"use client"

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Unit } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, Search, Filter, Home, Edit2, Trash2, Upload, X } from 'lucide-react'
import UnitForm from './UnitForm'
import Papa from 'papaparse'

export default function UnitList() {
    const [units, setUnits] = useState<Unit[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<'all' | 'flat' | 'villa'>('all')
    const [showForm, setShowForm] = useState(false)
    const [editingUnit, setEditingUnit] = useState<Unit | undefined>(undefined)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetchUnits()
    }, [])

    const fetchUnits = async () => {
        setLoading(true)
        // Mock Data for Preview
        const MOCK_UNITS: Unit[] = [
            { id: '1', society_id: 'soc-1', unit_number: 'A-101', block_name: 'Block A', floor_number: 1, unit_type: 'flat', area_sqft: 1200, owner_id: 'user-1', created_at: new Date().toISOString() },
            { id: '2', society_id: 'soc-1', unit_number: 'A-102', block_name: 'Block A', floor_number: 1, unit_type: 'flat', area_sqft: 1200, owner_id: '', created_at: new Date().toISOString() },
            { id: '3', society_id: 'soc-1', unit_number: 'V-001', unit_type: 'villa', area_sqft: 3500, owner_id: 'user-2', created_at: new Date().toISOString() },
            { id: '4', society_id: 'soc-1', unit_number: 'B-205', block_name: 'Block B', floor_number: 2, unit_type: 'flat', area_sqft: 1500, owner_id: 'user-3', created_at: new Date().toISOString() },
        ]

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setTimeout(() => {
                setUnits(MOCK_UNITS)
                setLoading(false)
            }, 600)
            return
        }

        try {
            const { data, error } = await supabase
                .from('units')
                .select('*')
                .order('unit_number')

            if (error) throw error
            if (data) setUnits(data as Unit[])
        } catch (error) {
            console.warn('Error fetching units:', error)
            setUnits(MOCK_UNITS)
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (unit: Unit) => {
        setEditingUnit(unit)
        setShowForm(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this unit?')) return

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setUnits(units.filter(u => u.id !== id))
            return
        }

        const { error } = await supabase.from('units').delete().eq('id', id)
        if (!error) fetchUnits()
    }

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                const newUnits = results.data.map((row: any, index) => ({
                    id: `temp-${Date.now()}-${index}`,
                    unit_number: row.unit_number,
                    unit_type: row.unit_type || 'flat',
                    block_name: row.block_name,
                    floor_number: row.floor_number ? parseInt(row.floor_number) : null,
                    area_sqft: row.area_sqft ? parseFloat(row.area_sqft) : 0,
                    society_id: 'soc-1',
                    created_at: new Date().toISOString()
                })).filter(u => u.unit_number) // Filter empty rows

                if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                    setUnits([...units, ...newUnits as Unit[]])
                } else {
                    // Actual insert
                    // await supabase.from('units').insert(newUnits)
                    // fetchUnits()
                }
            }
        })
    }

    const filteredUnits = units.filter(unit => {
        const matchesSearch = unit.unit_number.toLowerCase().includes(search.toLowerCase())
        const matchesType = typeFilter === 'all' || unit.unit_type === typeFilter
        return matchesSearch && matchesType
    })

    return (
        <Card className="border-none shadow-none glass bg-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 px-0">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Search units..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 w-[200px] rounded-md border border-input bg-background pl-8 pr-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as any)}
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="all">All Types</option>
                            <option value="flat">Flats</option>
                            <option value="villa">Villas</option>
                        </select>
                    </div>
                </div>
                <div className="flex gap-2">
                    <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" /> Bulk Upload
                    </Button>
                    <Button onClick={() => { setEditingUnit(undefined); setShowForm(true) }}>
                        <Plus className="mr-2 h-4 w-4" /> Add Unit
                    </Button>
                </div>
            </CardHeader>

            {/* Unit Form Modal (Dialog) */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
                    </DialogHeader>
                    <UnitForm
                        initialData={editingUnit}
                        onSuccess={() => {
                            setShowForm(false)
                            fetchUnits()
                        }}
                        onCancel={() => setShowForm(false)}
                    />
                </DialogContent>
            </Dialog>

            <CardContent className="px-0">
                <div className="rounded-md border bg-card">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Unit No</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Block/Floor</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Area (SqFt)</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="border-b transition-colors hover:bg-muted/50">
                                            <td className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-muted"></div></td>
                                            <td className="p-4"><div className="h-4 w-12 animate-pulse rounded bg-muted"></div></td>
                                            <td className="p-4"><div className="h-4 w-24 animate-pulse rounded bg-muted"></div></td>
                                            <td className="p-4"><div className="h-4 w-16 animate-pulse rounded bg-muted"></div></td>
                                            <td className="p-4"><div className="h-4 w-20 animate-pulse rounded bg-muted"></div></td>
                                            <td className="p-4"><div className="h-4 w-8 animate-pulse rounded bg-muted ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : filteredUnits.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-4 text-center text-muted-foreground">No units found</td>
                                    </tr>
                                ) : (
                                    filteredUnits.map((unit) => (
                                        <tr key={unit.id} className="border-b transition-colors hover:bg-muted/50">
                                            <td className="p-4 align-middle font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Home className="h-4 w-4 text-muted-foreground" />
                                                    {unit.unit_number}
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle capitalize">{unit.unit_type}</td>
                                            <td className="p-4 align-middle text-muted-foreground">
                                                {unit.block_name ? `${unit.block_name} - ${unit.floor_number ? `Floor ${unit.floor_number}` : ''}` : '-'}
                                            </td>
                                            <td className="p-4 align-middle">{unit.area_sqft}</td>
                                            <td className="p-4 align-middle">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${unit.owner_id ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'}`}>
                                                    {unit.owner_id ? 'Occupied' : 'Vacant'}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(unit)}>
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(unit.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
