"use client"

import { useState, useEffect } from 'react'
import { Plus, Search, Phone, User, Briefcase, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'

interface ServiceContact {
    id: string
    name: string
    role: string
    phone_number: string
    category: 'Emergency' | 'Management' | 'Service'
}

export default function ContactsPage() {
    const { profile } = useAuth()
    const { toast } = useToast()
    const [contacts, setContacts] = useState<ServiceContact[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)

    // Form State
    const [formData, setFormData] = useState<Partial<ServiceContact>>({
        category: 'Service'
    })

    const isAdmin = profile?.role === 'app_admin' || profile?.role === 'management'

    useEffect(() => {
        fetchContacts()
    }, [])

    const fetchContacts = async () => {
        setLoading(true)
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setTimeout(() => {
                const localContacts = JSON.parse(localStorage.getItem('mock_service_contacts') || '[]')
                setContacts(localContacts.filter((c: any) => c.is_active !== false))
                setLoading(false)
            }, 500)
            return
        }

        const { data, error } = await supabase
            .from('service_contacts')
            .select('*')
            .eq('is_active', true)
            .order('category', { ascending: true })
            .order('name', { ascending: true })

        if (error) {
            console.error('Error fetching contacts:', error)
            toast({ title: "Error", description: "Failed to load contacts", variant: "destructive" })
        } else {
            setContacts(data || [])
        }
        setLoading(false)
    }

    const handleSubmit = async () => {
        if (!formData.name || !formData.phone_number || !formData.role) {
            toast({ title: "Validation Error", description: "Please fill all required fields", variant: "destructive" })
            return
        }

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const localContacts = JSON.parse(localStorage.getItem('mock_service_contacts') || '[]')

            if (isEditMode && formData.id) {
                const updatedContacts = localContacts.map((c: any) =>
                    c.id === formData.id ? { ...c, ...formData } : c
                )
                localStorage.setItem('mock_service_contacts', JSON.stringify(updatedContacts))
                toast({ title: "Success", description: "Contact updated successfully" })
            } else {
                const newContact = {
                    ...formData,
                    id: 'mock-contact-' + Date.now(),
                    category: formData.category || 'Service',
                    is_active: true
                }
                localStorage.setItem('mock_service_contacts', JSON.stringify([...localContacts, newContact]))
                toast({ title: "Success", description: "Contact added successfully" })
            }

            setIsAddOpen(false)
            setFormData({ category: 'Service' })
            setIsEditMode(false)
            fetchContacts()
            return
        }

        try {
            if (isEditMode && formData.id) {
                const { error } = await supabase
                    .from('service_contacts')
                    .update({
                        name: formData.name,
                        role: formData.role,
                        phone_number: formData.phone_number,
                        category: formData.category
                    })
                    .eq('id', formData.id)

                if (error) throw error
                toast({ title: "Success", description: "Contact updated successfully" })
            } else {
                const { error } = await supabase
                    .from('service_contacts')
                    .insert([{
                        name: formData.name,
                        role: formData.role,
                        phone_number: formData.phone_number,
                        category: formData.category || 'Service'
                    }])

                if (error) throw error
                toast({ title: "Success", description: "Contact added successfully" })
            }

            setIsAddOpen(false)
            setFormData({ category: 'Service' })
            setIsEditMode(false)
            fetchContacts()
        } catch (error) {
            console.error('Error saving contact:', error)
            toast({ title: "Error", description: "Failed to save contact", variant: "destructive" })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this contact?')) return

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const localContacts = JSON.parse(localStorage.getItem('mock_service_contacts') || '[]')
            const updatedContacts = localContacts.map((c: any) =>
                c.id === id ? { ...c, is_active: false } : c
            )
            localStorage.setItem('mock_service_contacts', JSON.stringify(updatedContacts))
            toast({ title: "Success", description: "Contact deleted" })
            fetchContacts()
            return
        }

        const { error } = await supabase
            .from('service_contacts')
            .update({ is_active: false }) // Soft delete
            .eq('id', id)

        if (error) {
            toast({ title: "Error", description: "Failed to delete contact", variant: "destructive" })
        } else {
            toast({ title: "Success", description: "Contact deleted" })
            fetchContacts()
        }
    }

    const openEdit = (contact: ServiceContact) => {
        setFormData(contact)
        setIsEditMode(true)
        setIsAddOpen(true)
    }

    const openAdd = () => {
        setFormData({ category: 'Service' })
        setIsEditMode(false)
        setIsAddOpen(true)
    }

    const filteredContacts = contacts.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.role.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const groupedContacts = {
        Emergency: filteredContacts.filter(c => c.category === 'Emergency'),
        Management: filteredContacts.filter(c => c.category === 'Management'),
        Service: filteredContacts.filter(c => c.category === 'Service'),
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Helpline Numbers</h1>
                    <p className="text-muted-foreground">Important contacts for emergency and services.</p>
                </div>
                {isAdmin && (
                    <Button onClick={openAdd} className="bg-primary hover:bg-primary/90">
                        <Plus className="mr-2 h-4 w-4" /> Add Contact
                    </Button>
                )}
            </div>

            <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-[300px]"
                />
            </div>

            {loading ? (
                <div>Loading contacts...</div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedContacts).map(([category, items]) => (
                        items.length > 0 && (
                            <div key={category} className="space-y-4">
                                <h2 className={`text-xl font-semibold flex items-center gap-2 ${category === 'Emergency' ? 'text-red-500' :
                                    category === 'Management' ? 'text-blue-500' : 'text-green-500'
                                    }`}>
                                    {category === 'Emergency' && <Phone className="h-5 w-5" />}
                                    {category === 'Management' && <User className="h-5 w-5" />}
                                    {category === 'Service' && <Briefcase className="h-5 w-5" />}
                                    {category}
                                </h2>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {items.map((contact) => (
                                        <div key={contact.id} className="group relative flex items-center justify-between space-x-4 rounded-lg border p-4 hover:bg-accent/50 transition-colors bg-card">
                                            <div className="min-w-0 flex-1 flex flex-col gap-1">
                                                <p className="text-lg font-bold text-foreground">{contact.role}</p>
                                                <p className="text-sm font-medium text-muted-foreground">{contact.name}</p>
                                                <a href={`tel:${contact.phone_number}`} className="flex items-center text-xs text-muted-foreground hover:text-primary transition-colors">
                                                    <Phone className="mr-2 h-3 w-3" />
                                                    {contact.phone_number}
                                                </a>
                                            </div>
                                            {isAdmin && (
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(contact)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(contact.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    ))}
                    {filteredContacts.length === 0 && (
                        <div className="text-center text-muted-foreground py-10">
                            No contacts found.
                        </div>
                    )}
                </div>
            )}

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Category</label>
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                            >
                                <option value="Service">Service</option>
                                <option value="Management">Management</option>
                                <option value="Emergency">Emergency</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Name</label>
                            <Input
                                placeholder="e.g. Ramesh Kumar"
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Role/Designation</label>
                            <Input
                                placeholder="e.g. Plumber"
                                value={formData.role || ''}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Phone Number</label>
                            <Input
                                placeholder="e.g. +91 9876543210"
                                value={formData.phone_number || ''}
                                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                            />
                        </div>
                        <Button className="w-full mt-4" onClick={handleSubmit}>
                            {isEditMode ? 'Update Contact' : 'Save Contact'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
