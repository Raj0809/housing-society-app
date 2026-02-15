"use client"

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Complaint, ComplaintReply, UserRole } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, CheckCircle, Clock, AlertTriangle, XCircle, Filter, Search, MessageSquare, UserPlus, ChevronRight, Send, Paperclip, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export default function ComplaintList() {
    const { profile } = useAuth()
    const [complaints, setComplaints] = useState<Complaint[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [filter, setFilter] = useState<'all' | 'my'>('all')

    // Detail View State
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
    const [replies, setReplies] = useState<ComplaintReply[]>([])
    const [newReply, setNewReply] = useState('')
    const [replying, setReplying] = useState(false)
    const replyEndRef = useRef<HTMLDivElement>(null)

    // Form State
    const [formData, setFormData] = useState<Partial<Complaint>>({
        priority: 'medium',
        category: 'Maintenance'
    })
    const [mockFile, setMockFile] = useState<File | null>(null) // For mock simulation

    const isAdmin = profile?.role === 'app_admin' || profile?.role === 'management' || profile?.role === 'administration'

    // Admin Actions State
    const [assignee, setAssignee] = useState('')

    useEffect(() => {
        fetchComplaints()
    }, [filter])

    useEffect(() => {
        if (selectedComplaint) {
            fetchReplies(selectedComplaint.id)
            setAssignee(selectedComplaint.assigned_to || '')
        }
    }, [selectedComplaint])

    useEffect(() => {
        replyEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [replies])

    const fetchComplaints = async () => {
        setLoading(true)
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            // Mock Data
            const MOCK_COMPLAINTS: Complaint[] = [
                { id: '1', raised_by: 'me', subject: 'Leaking pipe in master bathroom', category: 'Plumbing', priority: 'high', status: 'open', created_at: new Date().toISOString(), user: { full_name: 'Me', unit_number: 'A-101' } },
                { id: '2', raised_by: 'other', subject: 'Street light flickering', category: 'Electrical', priority: 'medium', status: 'in_progress', created_at: new Date(Date.now() - 86400000).toISOString(), user: { full_name: 'Rahul', unit_number: 'B-202' } },
                { id: '3', raised_by: 'other2', subject: 'Gym AC not working', category: 'Facility', priority: 'low', status: 'resolved', resolution_notes: 'Technician visited and fixed gas leak.', resolved_at: new Date().toISOString(), created_at: new Date(Date.now() - 172800000).toISOString(), user: { full_name: 'Priya', unit_number: 'C-303' } },
            ]
            setTimeout(() => {
                let data = MOCK_COMPLAINTS
                if (filter === 'my') {
                    data = data.filter(c => c.raised_by === (profile?.id || 'me'))
                }
                const local = JSON.parse(localStorage.getItem('mock_complaints') || '[]')

                // Merge without duplicates primarily for mock
                const all = [...data, ...local]
                const unique = Array.from(new Map(all.map(item => [item.id, item])).values())

                setComplaints(unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
                setLoading(false)
            }, 500)
            return
        }

        try {
            let query = supabase
                .from('complaints')
                .select('*, user:profiles!complaints_raised_by_fkey(full_name)')
                .order('created_at', { ascending: false })

            if (filter === 'my' && profile) {
                query = query.eq('raised_by', profile.id)
            }

            const { data, error } = await query
            if (error) throw error
            setComplaints(data as any)
        } catch (error) {
            console.error('Error fetching complaints:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchReplies = async (complaintId: string) => {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const MOCK_REPLIES: ComplaintReply[] = [
                { id: 'r1', complaint_id: complaintId, user_id: 'admin', content: 'We have assigned a technician.', created_at: new Date(Date.now() - 3600000).toISOString(), user: { full_name: 'Admin', role: 'management' } }
            ]
            const localReplies = JSON.parse(localStorage.getItem('mock_replies') || '[]').filter((r: any) => r.complaint_id === complaintId)
            setReplies([...MOCK_REPLIES, ...localReplies])
            return
        }

        const { data } = await supabase
            .from('complaint_replies')
            .select('*, user:profiles(full_name, role)')
            .eq('complaint_id', complaintId)
            .order('created_at', { ascending: true })

        if (data) setReplies(data as any)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.subject || !formData.description) return
        setSubmitting(true)

        const newComplaint: any = {
            subject: formData.subject,
            description: formData.description,
            category: formData.category,
            priority: formData.priority,
            raised_by: profile?.id,
            status: 'open',
        }

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setTimeout(() => {
                const complaintWithId = { ...newComplaint, id: 'mock-' + Date.now(), user: { full_name: profile?.full_name || 'Me', unit_number: profile?.unit_number } }
                const local = JSON.parse(localStorage.getItem('mock_complaints') || '[]')
                localStorage.setItem('mock_complaints', JSON.stringify([...local, complaintWithId]))

                setComplaints(prev => [complaintWithId as any, ...prev])
                setSubmitting(false)
                setShowForm(false)
                setFormData({ priority: 'medium', category: 'Maintenance' })
                setMockFile(null)
            }, 500)
            return
        }

        try {
            const { data: inserted, error } = await supabase.from('complaints').insert(newComplaint).select().single()
            if (error) throw error

            // Upload attachment to Supabase Storage if a file was selected
            if (mockFile && inserted) {
                const fileExt = mockFile.name.split('.').pop()
                const filePath = `complaints/${inserted.id}/${Date.now()}.${fileExt}`
                await supabase.storage.from('society_documents').upload(filePath, mockFile)
            }

            fetchComplaints()
            setShowForm(false)
            setFormData({ priority: 'medium', category: 'Maintenance' })
            setMockFile(null)
        } catch (error) {
            console.error('Failed to submit complaint:', error)
            alert('Failed to submit complaint')
        } finally {
            setSubmitting(false)
        }
    }

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newReply.trim() || !selectedComplaint) return
        setReplying(true)

        const reply = {
            complaint_id: selectedComplaint.id,
            user_id: profile?.id,
            content: newReply.trim(),
            created_at: new Date().toISOString()
        }

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const mockReply = { ...reply, id: 'rep-' + Date.now(), user: { full_name: profile?.full_name || 'Me', role: profile?.role } }
            const local = JSON.parse(localStorage.getItem('mock_replies') || '[]')
            localStorage.setItem('mock_replies', JSON.stringify([...local, mockReply]))
            setReplies(prev => [...prev, mockReply as any])
            setNewReply('')
            setReplying(false)
            return
        }

        const { data, error } = await supabase.from('complaint_replies').insert(reply).select('*, user:profiles(full_name, role)').single()
        if (data) setReplies(prev => [...prev, data as any])
        setNewReply('')
        setReplying(false)
    }

    const handleStatusUpdate = async (status: string, notes?: string) => {
        if (!selectedComplaint) return

        const updates: any = { status }
        if (notes) updates.resolution_notes = notes
        if (status === 'resolved') updates.resolved_at = new Date().toISOString()

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const updated = { ...selectedComplaint, ...updates }
            setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? updated : c))
            setSelectedComplaint(updated as any)
            // Update local storage too for persistence in mock mode
            const local = JSON.parse(localStorage.getItem('mock_complaints') || '[]')
            const updatedLocal = local.map((c: any) => c.id === selectedComplaint.id ? { ...c, ...updates } : c)
            localStorage.setItem('mock_complaints', JSON.stringify(updatedLocal))
            return
        }

        await supabase.from('complaints').update(updates).eq('id', selectedComplaint.id)
        fetchComplaints()
        setSelectedComplaint(prev => prev ? ({ ...prev, ...updates }) : null)
    }

    const handleAssign = async () => {
        if (!selectedComplaint || !assignee) return

        const updates = { assigned_to: assignee }

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const updated = { ...selectedComplaint, ...updates }
            setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? updated : c))
            setSelectedComplaint(updated as any)

            const local = JSON.parse(localStorage.getItem('mock_complaints') || '[]')
            const updatedLocal = local.map((c: any) => c.id === selectedComplaint.id ? { ...c, ...updates } : c)
            localStorage.setItem('mock_complaints', JSON.stringify(updatedLocal))
            alert(`Assigned to ${assignee}`)
            return
        }

        await supabase.from('complaints').update(updates).eq('id', selectedComplaint.id)
        fetchComplaints()
        setSelectedComplaint(prev => prev ? ({ ...prev, ...updates }) : null)
        alert('Staff assigned successfully')
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-red-100 text-red-700 border-red-200'
            case 'in_progress': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
            case 'resolved': return 'bg-green-100 text-green-700 border-green-200'
            case 'closed': return 'bg-gray-100 text-gray-700 border-gray-200'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />
            case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />
            case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />
            default: return null
        }
    }

    // Main View
    if (!selectedComplaint) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex bg-muted p-1 rounded-lg">
                        <button
                            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all", filter === 'all' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                            onClick={() => setFilter('all')}
                        >
                            All Complaints
                        </button>
                        <button
                            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all", filter === 'my' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                            onClick={() => setFilter('my')}
                        >
                            My Complaints
                        </button>
                    </div>
                    <Button onClick={() => setShowForm(true)}>
                        <Plus className="mr-2 h-4 w-4" /> File Complaint
                    </Button>
                </div>

                <div className="grid gap-4">
                    {complaints.length === 0 && !loading && (
                        <div className="text-center py-12 text-muted-foreground">No complaints found.</div>
                    )}

                    {complaints.map((complaint) => (
                        <Card key={complaint.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedComplaint(complaint)}>
                            <CardHeader className="py-4 bg-muted/20 flex flex-row items-start justify-between space-y-0">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold border uppercase", getStatusColor(complaint.status))}>
                                            {complaint.status.replace('_', ' ')}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase border px-2 py-0.5 rounded-full">
                                            {getPriorityIcon(complaint.priority)} {complaint.priority}
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-2">
                                            #{complaint.id.slice(0, 6)} • {format(new Date(complaint.created_at), 'MMM d')}
                                        </span>
                                    </div>
                                    <CardTitle className="text-base">{complaint.subject}</CardTitle>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-muted-foreground"><ChevronRight className="h-5 w-5" /></p>
                                </div>
                            </CardHeader>
                            <CardContent className="py-4">
                                <p className="text-sm text-foreground/80 line-clamp-2">{complaint.description}</p>
                                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Category: {complaint.category}</span>
                                    <span>From: {complaint.user?.full_name}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* File Complaint Modal (Dialog) */}
                <Dialog open={showForm} onOpenChange={setShowForm}>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>File a Complaint</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Subject</label>
                                <input required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={formData.subject || ''} onChange={e => setFormData({ ...formData, subject: e.target.value })} placeholder="e.g. Water leakage" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Category</label>
                                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Electrical">Electrical</option>
                                        <option value="Plumbing">Plumbing</option>
                                        <option value="Security">Security</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Priority</label>
                                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value as any })}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <textarea required className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm min-h-[100px]" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Attachment (Optional)</label>
                                <div className="border border-dashed rounded-md p-4 text-center hover:bg-muted/50 transition-colors">
                                    <input
                                        type="file"
                                        className="hidden"
                                        id="file-upload"
                                        onChange={e => setMockFile(e.target.files?.[0] || null)}
                                    />
                                    <label htmlFor="file-upload" className="cursor-pointer text-sm text-primary flex flex-col items-center gap-2">
                                        <Paperclip className="h-5 w-5" />
                                        {mockFile ? mockFile.name : 'Click to upload photo or document'}
                                    </label>
                                </div>
                            </div>
                            <Button className="w-full" type="submit" disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Submit Complaint'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        )
    }

    // Detail View
    return (
        <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-10rem)]">
            <div className="md:col-span-2 flex flex-col border rounded-lg overflow-hidden bg-background shadow-sm">
                <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedComplaint(null)}>
                            <ChevronRight className="h-5 w-5 rotate-180" />
                        </Button>
                        <div>
                            <h3 className="font-semibold text-lg leading-none">{selectedComplaint.subject}</h3>
                            <span className="text-xs text-muted-foreground">ID: #{selectedComplaint.id.slice(0, 8)}</span>
                        </div>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold border uppercase", getStatusColor(selectedComplaint.status))}>
                        {selectedComplaint.status.replace('_', ' ')}
                    </span>
                </div>

                {/* Scrollable Conversation */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 dark:bg-slate-950/20">
                    {/* Original Complaint */}
                    <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            {selectedComplaint.user?.full_name?.[0] || 'U'}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{selectedComplaint.user?.full_name}</span>
                                <span className="text-xs text-muted-foreground">{format(new Date(selectedComplaint.created_at), 'MMM d, h:mm a')}</span>
                            </div>
                            <div className="px-4 py-3 bg-white dark:bg-slate-900 border rounded-lg shadow-sm text-sm whitespace-pre-wrap">
                                {selectedComplaint.description}
                                {selectedComplaint.attachment_url && (
                                    <div className="mt-3 pt-3 border-t">
                                        <a
                                            href={selectedComplaint.attachment_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-2 text-primary hover:underline bg-muted/30 p-2 rounded-md border w-fit"
                                        >
                                            <FileText className="h-4 w-4" />
                                            <span className="text-xs">View Attachment</span>
                                        </a>
                                    </div>
                                )}
                                {selectedComplaint.resolution_notes && (
                                    <div className="mt-3 pt-3 border-t">
                                        <p className="text-xs font-semibold text-green-600">Resolution:</p>
                                        <p className="text-sm">{selectedComplaint.resolution_notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Replies */}
                    {replies.map(reply => (
                        <div key={reply.id} className={cn("flex gap-3", reply.user_id === profile?.id && "flex-row-reverse")}>
                            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold", reply.user_id === profile?.id ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-700")}>
                                {reply.user?.full_name?.[0] || 'U'}
                            </div>
                            <div className={cn("flex-1 space-y-1", reply.user_id === profile?.id && "text-right")}>
                                <div className={cn("flex items-center gap-2", reply.user_id === profile?.id && "flex-row-reverse")}>
                                    <span className="text-sm font-semibold">{reply.user?.full_name}</span>
                                    <span className="text-xs text-muted-foreground">{format(new Date(reply.created_at), 'h:mm a')}</span>
                                </div>
                                <div className={cn("inline-block px-4 py-2 rounded-lg text-sm max-w-[80%] text-left whitespace-pre-wrap",
                                    reply.user_id === profile?.id ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-800 border")}>
                                    {reply.content}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={replyEndRef} />
                </div>

                {/* Reply Input */}
                <form onSubmit={handleSendReply} className="p-4 bg-background border-t">
                    <div className="flex gap-2">
                        <input
                            className="flex-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                            placeholder="Type a reply..."
                            value={newReply}
                            onChange={e => setNewReply(e.target.value)}
                        />
                        <Button type="submit" size="icon" disabled={replying || !newReply.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </form>
            </div>

            {/* Sidebar Details (Status/Assign) */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground mb-1">Priority</p>
                                <div className="flex items-center gap-1 font-medium">{getPriorityIcon(selectedComplaint.priority)} {selectedComplaint.priority}</div>
                            </div>
                            <div>
                                <p className="text-muted-foreground mb-1">Category</p>
                                <div className="font-medium">{selectedComplaint.category}</div>
                            </div>
                            <div>
                                <p className="text-muted-foreground mb-1">Unit</p>
                                <div className="font-medium">{selectedComplaint.user?.unit_number || 'N/A'}</div>
                            </div>
                            <div>
                                <p className="text-muted-foreground mb-1">Raised</p>
                                <div className="font-medium">{format(new Date(selectedComplaint.created_at), 'MMM d')}</div>
                            </div>
                            <div>
                                <p className="text-muted-foreground mb-1">Assigned To</p>
                                <div className="font-medium">{selectedComplaint.assigned_to || 'Unassigned'}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {isAdmin && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground">Change Status</label>
                                <div className="flex gap-2 flex-wrap">
                                    <Button variant="outline" size="sm" onClick={() => handleStatusUpdate('open')} disabled={selectedComplaint.status === 'open'}>Open</Button>
                                    <Button variant="outline" size="sm" onClick={() => handleStatusUpdate('in_progress')} disabled={selectedComplaint.status === 'in_progress'}>In Progress</Button>
                                    <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700 border-green-200 bg-green-50" onClick={() => handleStatusUpdate('resolved', 'Marked resolved by admin')} disabled={selectedComplaint.status === 'resolved'}>Resolve</Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground">Assign Staff</label>
                                <div className="flex gap-2">
                                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={assignee} onChange={e => setAssignee(e.target.value)}>
                                        <option value="">Select Staff...</option>
                                        <option value="Maintenance Team">Maintenance Team</option>
                                        <option value="Security Lead">Security Lead</option>
                                        <option value="Plumber (External)">Plumber (External)</option>
                                    </select>
                                    <Button size="sm" variant="secondary" onClick={handleAssign} disabled={!assignee || assignee === selectedComplaint.assigned_to}>
                                        <UserPlus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
