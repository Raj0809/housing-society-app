"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ExpenditureCategory } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Loader2, Pencil, Trash2, Check, X } from 'lucide-react'

export default function ExpenditureMetadataSettings() {
    const [categories, setCategories] = useState<ExpenditureCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<Partial<ExpenditureCategory>>({})
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        setLoading(true)
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            // Mock Data
            const MOCK_CATEGORIES: ExpenditureCategory[] = [
                { id: '1', name: 'Security Services', classification: 'Revenue', type: 'Operational', nature: 'Recurring', is_active: true, created_at: new Date().toISOString() },
                { id: '2', name: 'Plumbing Repairs', classification: 'Revenue', type: 'Operational', nature: 'Variable', is_active: true, created_at: new Date().toISOString() },
                { id: '3', name: 'Diesel for Generator', classification: 'Revenue', type: 'Utility', nature: 'Variable', is_active: true, created_at: new Date().toISOString() },
                { id: '4', name: 'Gym Equipment', classification: 'Capital', type: 'Capital', nature: 'One-time', is_active: true, created_at: new Date().toISOString() },
                { id: '5', name: 'Office Stationery', classification: 'Revenue', type: 'Administrative', nature: 'Variable', is_active: true, created_at: new Date().toISOString() },
            ]
            const stored = JSON.parse(localStorage.getItem('mock_expenditure_categories') || '[]')

            setTimeout(() => {
                // Merge mock data with stored data, avoiding duplicates if any
                const allCats = [...stored, ...MOCK_CATEGORIES]
                const uniqueCats = Array.from(new Map(allCats.map(item => [item.id, item])).values())
                setCategories(uniqueCats)
                setLoading(false)
            }, 600)
            return
        }

        try {
            const { data, error } = await supabase
                .from('expenditure_categories')
                .select('*')
                .order('name')

            if (error) throw error
            if (data) setCategories(data as ExpenditureCategory[])
        } catch (error) {
            console.error('Error fetching categories:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!formData.name || !formData.type || !formData.nature) {
            alert('Please fill all fields')
            return
        }
        setSaving(true)

        const newCategory = {
            ...formData,
            is_active: true,
            created_at: new Date().toISOString()
        }

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setTimeout(() => {
                const stored = JSON.parse(localStorage.getItem('mock_expenditure_categories') || '[]')
                if (editingId) {
                    const updated = categories.map(c => c.id === editingId ? { ...c, ...formData } : c)
                    setCategories(updated)
                    // Update storage for edited items is tricky without full ID match on mock vs stored, 
                    // but for simplicity we'll just update state for now in this session or append new ones.
                    // A proper mock implementation would need better ID management.
                    // For now let's just update the list in memory for the session.
                } else {
                    const withId = { ...newCategory, id: 'cat-' + Date.now() } as ExpenditureCategory
                    setCategories([withId, ...categories])
                    localStorage.setItem('mock_expenditure_categories', JSON.stringify([withId, ...stored]))
                }

                setSaving(false)
                setEditingId(null)
                setFormData({})
            }, 600)
            return
        }

        try {
            if (editingId) {
                const { error } = await supabase
                    .from('expenditure_categories')
                    .update(formData)
                    .eq('id', editingId)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('expenditure_categories')
                    .insert(newCategory)
                if (error) throw error
            }
            fetchCategories()
            setEditingId(null)
            setFormData({})
        } catch (error) {
            console.error('Error saving category:', error)
            alert('Failed to save category')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this category?')) return

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setCategories(categories.filter(c => c.id !== id))
            return
        }

        try {
            const { error } = await supabase.from('expenditure_categories').delete().eq('id', id)
            if (error) throw error
            setCategories(categories.filter(c => c.id !== id))
        } catch (error) {
            console.error('Error deleting category:', error)
            alert('Failed to delete category')
        }
    }

    const startEdit = (category: ExpenditureCategory) => {
        setEditingId(category.id)
        setFormData(category)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setFormData({})
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Expenditure Categories</CardTitle>
                    <CardDescription>Classify your expenses for better reporting.</CardDescription>
                </div>
                {!editingId && (
                    <Button onClick={() => { setEditingId('new'); setFormData({}) }}>
                        <Plus className="mr-2 h-4 w-4" /> Add Category
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {editingId === 'new' && (
                    <div className="mb-6 p-4 border rounded-md bg-muted/30 space-y-4 animate-in fade-in slide-in-from-top-2">
                        <h4 className="font-medium text-sm">New Category</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input
                                placeholder="Category Name"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                value={formData.type || ''}
                                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                            >
                                <option value="">Select Type</option>
                                <option value="Operational">Operational</option>
                                <option value="Capital">Capital</option>
                                <option value="Utility">Utility</option>
                                <option value="Administrative">Administrative</option>
                                <option value="Other">Other</option>
                            </select>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                value={formData.nature || ''}
                                onChange={e => setFormData({ ...formData, nature: e.target.value as any })}
                            >
                                <option value="">Select Nature</option>
                                <option value="Fixed">Fixed</option>
                                <option value="Variable">Variable</option>
                                <option value="Recurring">Recurring</option>
                                <option value="One-time">One-time</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={cancelEdit} disabled={saving}>Cancel</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                            </Button>
                        </div>
                    </div>
                )}

                <div className="rounded-md border">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b bg-muted/50 transition-colors">
                                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Nature</th>
                                <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {loading ? (
                                <tr><td colSpan={4} className="p-4 text-center">Loading...</td></tr>
                            ) : categories.length === 0 ? (
                                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No categories defined.</td></tr>
                            ) : (
                                categories.map((cat) => (
                                    <tr key={cat.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle font-medium">
                                            {editingId === cat.id ? (
                                                <input
                                                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                                                    value={formData.name || ''}
                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                />
                                            ) : cat.name}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {editingId === cat.id ? (
                                                <select
                                                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                                                    value={formData.type || ''}
                                                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                                >
                                                    <option value="Operational">Operational</option>
                                                    <option value="Capital">Capital</option>
                                                    <option value="Utility">Utility</option>
                                                    <option value="Administrative">Administrative</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary/50">
                                                    {cat.type}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {editingId === cat.id ? (
                                                <select
                                                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                                                    value={formData.nature || ''}
                                                    onChange={e => setFormData({ ...formData, nature: e.target.value as any })}
                                                >
                                                    <option value="Fixed">Fixed</option>
                                                    <option value="Variable">Variable</option>
                                                    <option value="Recurring">Recurring</option>
                                                    <option value="One-time">One-time</option>
                                                </select>
                                            ) : cat.nature}
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {editingId === cat.id ? (
                                                    <>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={handleSave} disabled={saving}>
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={cancelEdit}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(cat)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(cat.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
