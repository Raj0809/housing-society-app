"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { SocietyProfile } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save } from 'lucide-react'

export default function SocietyProfileForm() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [profile, setProfile] = useState<Partial<SocietyProfile>>({
        name: '',
        type: 'multi_block',
        address: '',
        registration_number: '',
        total_units: 0,
        gstin: '',
        is_gst_registered: false,
        default_gst_rate: 18.0
    })
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('society_profile')
                .select('*')
                .single()

            if (error && error.code !== 'PGRST116') throw error // PGRST116 is 'Row not found'

            if (data) {
                setProfile(data)
            }
        } catch (error) {
            console.error('Error fetching society profile:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage(null)

        try {
            const { error } = await supabase
                .from('society_profile')
                .upsert({
                    id: profile.id, // If id exists update, else insert (but we need to handle ID creation if not exists, standard upsert works if we omit ID for new or provide fixed ID for singleton)
                    // Ideally society_profile should be a singleton or linked to user context. 
                    // For this app, assuming single society instance.
                    ...profile,
                    updated_at: new Date().toISOString()
                })

            if (error) throw error

            setMessage({ type: 'success', text: 'Society profile updated successfully' })
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message })
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader>
                    <CardTitle>Society Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {message && (
                        <div className={`rounded-md p-3 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Society Name</label>
                            <input
                                value={profile.name}
                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Registration Number</label>
                            <input
                                value={profile.registration_number || ''}
                                onChange={(e) => setProfile({ ...profile, registration_number: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <select
                                value={profile.type}
                                onChange={(e) => setProfile({ ...profile, type: e.target.value as any })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="multi_block">Multi-Block Apartment</option>
                                <option value="single_block">Single-Block Apartment</option>
                                <option value="villa">Villa Community</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Total Units</label>
                            <input
                                type="number"
                                value={profile.total_units}
                                onChange={(e) => setProfile({ ...profile, total_units: parseInt(e.target.value) || 0 })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>

                        <div className="col-span-full border-t pt-4 mt-2">
                            <h3 className="text-lg font-medium mb-4">Tax Settings</h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="is_gst_registered"
                                            checked={profile.is_gst_registered || false}
                                            onChange={(e) => setProfile({ ...profile, is_gst_registered: e.target.checked })}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <label htmlFor="is_gst_registered" className="text-sm font-medium">GST Registered?</label>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Enable if the society collects GST on maintenance/facilities.</p>
                                </div>

                                {profile.is_gst_registered && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">GSTIN</label>
                                            <input
                                                value={profile.gstin || ''}
                                                onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                                                placeholder="e.g. 29AAAAA0000A1Z5"
                                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Default GST Rate (%)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={profile.default_gst_rate || 18}
                                                onChange={(e) => setProfile({ ...profile, default_gst_rate: parseFloat(e.target.value) || 0 })}
                                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Address</label>
                            <textarea
                                value={profile.address || ''}
                                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" /> Save Changes
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    )
}
