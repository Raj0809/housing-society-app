"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { MaintenanceSettings } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Save, Loader2, Wand2, Trash2 } from 'lucide-react'

type ChargeItem = {
    id: number
    category: string
    description?: string
    selectedUnits: string[]
    amount: string
    unitFilter: 'all' | 'flat' | 'villa'
}

export default function MaintenanceSettingsPage() {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [settings, setSettings] = useState<MaintenanceSettings>({
        society_id: null,
        calculation_method: 'fixed_per_unit',
        default_amount: 1500,
        due_day_of_month: 5,
        custom_expense_types: ['Move-in Fee', 'Penalty', 'Club House Booking', 'Festival Fund', 'Repair Charge']
    })

    // One-time Invoice State
    const [invoiceType, setInvoiceType] = useState('monthly')

    // Multi-Charge State
    const [chargeItems, setChargeItems] = useState<ChargeItem[]>([
        { id: Date.now(), category: '', selectedUnits: [], amount: '', unitFilter: 'all' }
    ])

    const [units, setUnits] = useState<{ id: string, unit_number: string, unit_type: string, area_sqft?: number }[]>([])

    useEffect(() => {
        // Fetch settings (mock for now or from DB if table exists)
        setSettings(prev => ({
            ...prev,
            custom_expense_types: prev.custom_expense_types.includes('Others')
                ? prev.custom_expense_types
                : [...prev.custom_expense_types, 'Others']
        }))
        fetchUnits()
    }, [])

    const fetchUnits = async () => {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setUnits([
                { id: '1', unit_number: 'A-101', unit_type: 'flat', area_sqft: 1200 },
                { id: '2', unit_number: 'A-102', unit_type: 'flat', area_sqft: 1250 },
                { id: '3', unit_number: 'B-201', unit_type: 'flat', area_sqft: 1100 },
                { id: '4', unit_number: 'C-305', unit_type: 'flat', area_sqft: 1400 },
                { id: '5', unit_number: 'V-001', unit_type: 'villa', area_sqft: 2500 },
            ])
        } else {
            const { data } = await supabase.from('units').select('id, unit_number, unit_type, area_sqft').order('unit_number')
            if (data) setUnits(data as any)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            await new Promise(resolve => setTimeout(resolve, 800))
        } else {
            // await supabase.from('society_settings').upsert(...)
        }
        setSaving(false)
        alert('Settings saved!')
    }

    // --- Multi-Charge Handlers ---

    const addChargeItem = () => {
        setChargeItems([...chargeItems, { id: Date.now(), category: '', selectedUnits: [], amount: '', unitFilter: 'all' }])
    }

    const removeChargeItem = (id: number) => {
        if (chargeItems.length > 1) {
            setChargeItems(chargeItems.filter(item => item.id !== id))
        } else {
            // If only one, just reset it
            setChargeItems([{ id: Date.now(), category: '', selectedUnits: [], amount: '', unitFilter: 'all' }])
        }
    }

    const updateChargeItem = (id: number, field: keyof ChargeItem, value: any) => {
        setChargeItems(chargeItems.map(item => item.id === id ? { ...item, [field]: value } : item))
    }

    const handleSelectAllForItem = (id: number, checked: boolean) => {
        const item = chargeItems.find(i => i.id === id)
        if (!item) return

        const filteredUnits = units.filter(u => item.unitFilter === 'all' || u.unit_type === item.unitFilter)

        if (checked) {
            // Add all FILTERED units to selected for this item
            const newSelected = new Set(item.selectedUnits)
            filteredUnits.forEach(u => newSelected.add(u.id))
            updateChargeItem(id, 'selectedUnits', Array.from(newSelected))
        } else {
            // Remove all FILTERED units from selected for this item
            const filteredIds = filteredUnits.map(u => u.id)
            updateChargeItem(id, 'selectedUnits', item.selectedUnits.filter(uid => !filteredIds.includes(uid)))
        }
    }

    const handleGenerateInvoices = async () => {
        const isMonthly = invoiceType === 'monthly'

        if (!isMonthly) {
            // Validate all items
            for (const item of chargeItems) {
                if (item.selectedUnits.length === 0) {
                    alert('Please select at least one unit for all charge items.')
                    return
                }
                if (!item.category) {
                    alert('Please select a category for all charge items.')
                    return
                }
                if (!item.amount) {
                    alert('Please enter an amount for all charge items.')
                    return
                }
            }
        }

        const confirmationMessage = isMonthly
            ? 'Are you sure you want to generate maintenance invoices for ALL units for this month?'
            : `Are you sure you want to generate ${chargeItems.length} charge(s)?`

        if (!confirm(confirmationMessage)) return

        setGenerating(true)
        try {
            // Mock Logic
            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                await new Promise(resolve => setTimeout(resolve, 1500))

                let newInvoices: any[] = []

                if (isMonthly) {
                    newInvoices = units.map(unit => {
                        let calculatedAmount = settings.default_amount
                        if (settings.calculation_method === 'per_sqft' && unit.area_sqft) {
                            calculatedAmount = settings.default_amount * unit.area_sqft
                        }

                        return {
                            id: 'mock-' + Date.now() + '-' + unit.id,
                            unit_id: unit.id,
                            amount: parseFloat(calculatedAmount.toFixed(2)),
                            fee_type: 'monthly',
                            description: `Maintenance for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                            due_date: new Date(new Date().getFullYear(), new Date().getMonth(), settings.due_day_of_month).toISOString(),
                            payment_status: 'pending',
                            created_at: new Date().toISOString(),
                            units: { unit_number: unit.unit_number, unit_type: unit.unit_type }
                        }
                    })
                } else {
                    chargeItems.forEach((item, idx) => {
                        const itemInvoices = item.selectedUnits.map(unitId => {
                            const unit = units.find(u => u.id === unitId)
                            return {
                                id: 'mock-' + Date.now() + '-' + idx + '-' + unitId,
                                unit_id: unitId,
                                amount: parseFloat(item.amount),
                                fee_type: 'one_time',
                                description: item.description || item.category,
                                due_date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(),
                                payment_status: 'pending',
                                created_at: new Date().toISOString(),
                                units: { unit_number: unit?.unit_number || '?', unit_type: unit?.unit_type || '?' }
                            }
                        })
                        newInvoices = [...newInvoices, ...itemInvoices]
                    })
                }

                // Save to localStorage
                const existing = JSON.parse(localStorage.getItem('mock_maintenance_fees') || '[]')
                localStorage.setItem('mock_maintenance_fees', JSON.stringify([...newInvoices, ...existing]))

            } else {
                let invoices: any[] = []

                if (isMonthly) {
                    // Monthly Logic
                    invoices = units.map(unit => {
                        let amount = settings.default_amount

                        if (settings.calculation_method === 'per_sqft') {
                            if (unit.area_sqft) {
                                amount = settings.default_amount * unit.area_sqft
                            } else {
                                console.warn(`Unit ${unit.unit_number} missing area_sqft for calculation`)
                            }
                        }

                        return {
                            unit_id: unit.id,
                            amount: parseFloat(amount.toFixed(2)),
                            fee_type: 'monthly',
                            description: `Maintenance for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                            due_date: new Date(new Date().getFullYear(), new Date().getMonth(), settings.due_day_of_month).toISOString(),
                            payment_status: 'pending'
                        }
                    })
                } else {
                    // Custom Multi-Charge Logic
                    chargeItems.forEach(item => {
                        const itemInvoices = item.selectedUnits.map(unitId => {
                            return {
                                unit_id: unitId,
                                amount: parseFloat(item.amount),
                                fee_type: 'one_time',
                                description: item.description || item.category,
                                due_date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(), // Due in 7 days
                                payment_status: 'pending'
                            }
                        })
                        invoices = [...invoices, ...itemInvoices]
                    })
                }

                const { error } = await supabase.from('maintenance_fees').insert(invoices)
                if (error) throw error
            }
            alert('Invoices generated successfully!')

            // Reset form for custom only
            if (!isMonthly) {
                setChargeItems([{ id: Date.now(), category: '', selectedUnits: [], amount: '', unitFilter: 'all' }])
            }
        } catch (e: any) {
            console.error(e)
            alert('Failed to generate invoices: ' + e.message)
        } finally {
            setGenerating(false)
        }
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Maintenance Settings</h2>
                <p className="text-muted-foreground">Configure how maintenance fees are calculated and automated.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Monthly Calculation</CardTitle>
                        <CardDescription>Define how monthly maintenance is calculated for units.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Calculation Method</label>
                            <select
                                value={settings.calculation_method}
                                onChange={(e) => setSettings({ ...settings, calculation_method: e.target.value as any })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                            >
                                <option value="fixed_per_unit">Fixed Amount per Unit</option>
                                <option value="per_sqft">Rate per Sq. Ft.</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                {settings.calculation_method === 'fixed_per_unit' ? 'Amount (₹)' : 'Rate per Sq. Ft. (₹)'}
                            </label>
                            <input
                                type="number"
                                value={settings.default_amount}
                                onChange={(e) => setSettings({ ...settings, default_amount: parseFloat(e.target.value) })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm border-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Due Day of Month</label>
                            <input
                                type="number"
                                min="1" max="28"
                                value={settings.due_day_of_month}
                                onChange={(e) => setSettings({ ...settings, due_day_of_month: parseInt(e.target.value) })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm border-input"
                            />
                        </div>

                        <div className="space-y-2 pt-4 border-t">
                            <label className="text-sm font-medium">Custom Expense Categories</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {settings.custom_expense_types.map((type, i) => (
                                    <span key={i} className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                                        {type}
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    placeholder="Add new category..."
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = e.currentTarget.value.trim()
                                            if (val && !settings.custom_expense_types.includes(val)) {
                                                setSettings({ ...settings, custom_expense_types: [...settings.custom_expense_types, val] })
                                                e.currentTarget.value = ''
                                            }
                                        }
                                    }}
                                />
                                <Button variant="outline" size="sm" onClick={() => alert('Use Enter to add')}>Add</Button>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-between border-t p-4">
                        <Button variant="ghost" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Settings
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wand2 className="h-5 w-5 text-primary" />
                            Automation
                        </CardTitle>
                        <CardDescription>Run automated invoices for the society.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Invoice Type</label>
                            <div className="flex gap-2">
                                <Button
                                    variant={invoiceType === 'monthly' ? 'default' : 'outline'}
                                    onClick={() => setInvoiceType('monthly')}
                                    className="flex-1"
                                >
                                    Monthly Run
                                </Button>
                                <Button
                                    variant={invoiceType === 'custom' ? 'default' : 'outline'}
                                    onClick={() => setInvoiceType('custom')}
                                    className="flex-1"
                                >
                                    One-Time Charge
                                </Button>
                            </div>
                        </div>

                        {invoiceType === 'monthly' ? (
                            <div className="rounded-md border bg-background p-3 space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    Generates "Pending" maintenance record for **ALL {units.length} units** based on monthly settings.
                                </p>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Current Month:</span>
                                    <span className="font-medium">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                {chargeItems.map((item, index) => {
                                    const filteredUnits = units.filter(u => item.unitFilter === 'all' || u.unit_type === item.unitFilter)
                                    return (
                                        <div key={item.id} className="relative rounded-lg border p-3 bg-background space-y-3">
                                            <div className="flex justify-between items-center bg-muted/40 p-2 rounded -mx-3 -mt-3 mb-2 border-b">
                                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Charge #{index + 1}</h4>
                                                {chargeItems.length > 1 && (
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => removeChargeItem(item.id)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="grid gap-2">
                                                <label className="text-xs font-medium">Category</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={item.category}
                                                        onChange={(e) => updateChargeItem(item.id, 'category', e.target.value)}
                                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                                    >
                                                        <option value="">Select Category</option>
                                                        {settings.custom_expense_types.map(t => (
                                                            <option key={t} value={t}>{t}</option>
                                                        ))}
                                                    </select>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        title="Add New Category"
                                                        onClick={() => {
                                                            const newCat = prompt("Enter new expense category:")
                                                            if (newCat && !settings.custom_expense_types.includes(newCat)) {
                                                                setSettings(prev => ({
                                                                    ...prev,
                                                                    custom_expense_types: [...prev.custom_expense_types, newCat]
                                                                }))
                                                                updateChargeItem(item.id, 'category', newCat)
                                                            }
                                                        }}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="grid gap-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-medium">Target Units</label>
                                                    <div className="flex bg-muted rounded-md p-0.5">
                                                        {['all', 'flat', 'villa'].map(type => (
                                                            <button
                                                                key={type}
                                                                onClick={() => updateChargeItem(item.id, 'unitFilter', type)}
                                                                className={`px-2 py-0.5 text-[10px] font-medium rounded-sm transition-all ${item.unitFilter === type ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                                            >
                                                                {type.charAt(0).toUpperCase() + type.slice(1)}s
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="rounded-md border bg-background p-2 max-h-40 overflow-y-auto space-y-1">
                                                    <div className="flex items-center space-x-2 pb-2 border-b sticky top-0 bg-background z-10">
                                                        <input
                                                            type="checkbox"
                                                            id={`select-all-${item.id}`}
                                                            checked={filteredUnits.length > 0 && filteredUnits.every(u => item.selectedUnits.includes(u.id))}
                                                            onChange={(e) => handleSelectAllForItem(item.id, e.target.checked)}
                                                            className="h-3 w-3 rounded border-primary"
                                                        />
                                                        <label htmlFor={`select-all-${item.id}`} className="text-xs font-medium">Select All {filteredUnits.length}</label>
                                                    </div>
                                                    {filteredUnits.length === 0 ? (
                                                        <p className="text-xs text-muted-foreground text-center py-2">No units found.</p>
                                                    ) : (
                                                        filteredUnits.map(u => (
                                                            <div key={u.id} className="flex items-center space-x-2">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`unit-${item.id}-${u.id}`}
                                                                    checked={item.selectedUnits.includes(u.id)}
                                                                    onChange={(e) => {
                                                                        const selected = item.selectedUnits
                                                                        if (e.target.checked) {
                                                                            updateChargeItem(item.id, 'selectedUnits', [...selected, u.id])
                                                                        } else {
                                                                            updateChargeItem(item.id, 'selectedUnits', selected.filter(id => id !== u.id))
                                                                        }
                                                                    }}
                                                                    className="h-3 w-3 rounded border-primary"
                                                                />
                                                                <label htmlFor={`unit-${item.id}-${u.id}`} className="text-xs">
                                                                    {u.unit_number} <span className="text-[10px] text-muted-foreground">({u.unit_type})</span>
                                                                </label>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">{item.selectedUnits.length} units selected</p>
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-xs font-medium">Description (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={item.description || ''}
                                                    onChange={(e) => updateChargeItem(item.id, 'description', e.target.value)}
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                                    placeholder="e.g. Broken window repair"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-xs font-medium">Amount (₹)</label>
                                                <input
                                                    type="number"
                                                    value={item.amount}
                                                    onChange={(e) => updateChargeItem(item.id, 'amount', e.target.value)}
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    )
                                })}

                                <Button variant="outline" className="w-full border-dashed" onClick={addChargeItem}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Another Expense
                                </Button>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="border-t p-4">
                        <Button className="w-full" onClick={handleGenerateInvoices} disabled={generating}>
                            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (invoiceType === 'monthly' ? 'Generate Monthly Invoices' : `Generate ${chargeItems.length} Expenses`)}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
