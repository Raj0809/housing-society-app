"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Notice, NoticeComment, NoticeReaction } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, Pin, Megaphone, Users, Calendar, Trash2, MessageSquare, ThumbsUp, Send } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export default function NoticeBoard() {
    const { profile } = useAuth()
    const [notices, setNotices] = useState<Notice[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Interaction State
    const [comments, setComments] = useState<Record<string, NoticeComment[]>>({})
    const [reactions, setReactions] = useState<Record<string, NoticeReaction[]>>({})
    const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null)
    const [newComment, setNewComment] = useState('')
    const [commenting, setCommenting] = useState(false)

    // Form State
    const [formData, setFormData] = useState<Partial<Notice>>({
        audience_type: 'All',
        is_pinned: false
    })

    const isAdmin = profile?.role === 'app_admin' || profile?.role === 'management' || profile?.role === 'administration'

    useEffect(() => {
        fetchNotices()
    }, [])

    const fetchNotices = async () => {
        setLoading(true)
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            // Mock Data
            const MOCK_NOTICES: Notice[] = [
                { id: '1', title: 'AGM Meeting Scheduled', content: 'The Annual General Meeting will be held on 25th March at the Community Hall. Attendance is mandatory for all owners.', audience_type: 'Owners', is_pinned: true, created_by: 'Admin', created_at: new Date().toISOString() },
                { id: '2', title: 'Water Tank Cleaning', content: 'Water supply will be disrupted on Tuesday from 10 AM to 2 PM for tank cleaning.', audience_type: 'All', is_pinned: false, created_by: 'Management', created_at: new Date(Date.now() - 86400000).toISOString() },
                { id: '3', title: 'Diwali Party', content: 'Join us for the Diwali celebration this weekend! Snacks and music arranged.', audience_type: 'All', is_pinned: false, created_by: 'Committee', created_at: new Date(Date.now() - 172800000).toISOString() },
            ]

            const MOCK_COMMENTS: NoticeComment[] = [
                { id: 'c1', notice_id: '1', user_id: 'u2', content: 'Will there be a virtual option?', created_at: new Date().toISOString(), user: { full_name: 'Rahul Sharma' } }
            ]

            const MOCK_REACTIONS: NoticeReaction[] = [
                { id: 'r1', notice_id: '1', user_id: 'u2', type: 'like', created_at: new Date().toISOString() },
                { id: 'r2', notice_id: '3', user_id: 'u1', type: 'like', created_at: new Date().toISOString() }
            ]

            const localNotices = JSON.parse(localStorage.getItem('mock_notices') || '[]')
            const localComments = JSON.parse(localStorage.getItem('mock_notice_comments') || '[]')
            const localReactions = JSON.parse(localStorage.getItem('mock_notice_reactions') || '[]')

            // Merge mocks and locals
            const mergedComments = [...MOCK_COMMENTS, ...localComments]
            const mergedReactions = [...MOCK_REACTIONS, ...localReactions]

            // Group comments/reactions by notice_id
            const commentsMap: Record<string, NoticeComment[]> = {}
            const reactionsMap: Record<string, NoticeReaction[]> = {}

            const allNotices = [...localNotices, ...MOCK_NOTICES].sort((a, b) => (Number(b.is_pinned) - Number(a.is_pinned)))

            allNotices.forEach((n: Notice) => {
                commentsMap[n.id] = mergedComments.filter((c: NoticeComment) => c.notice_id === n.id)
                reactionsMap[n.id] = mergedReactions.filter((r: NoticeReaction) => r.notice_id === n.id)
            })

            setTimeout(() => {
                setNotices(allNotices)
                setComments(commentsMap)
                setReactions(reactionsMap)
                setLoading(false)
            }, 500)
            return
        }

        try {
            const [noticesRes, commentsRes, reactionsRes] = await Promise.all([
                supabase.from('notices').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
                supabase.from('notice_comments').select('*, user:users(full_name, profile_image_url)').order('created_at'),
                supabase.from('notice_reactions').select('*')
            ])

            if (noticesRes.error) throw noticesRes.error
            if (noticesRes.data) {
                setNotices(noticesRes.data as Notice[])

                // Process comments/reactions
                const cMap: Record<string, NoticeComment[]> = {}
                const rMap: Record<string, NoticeReaction[]> = {}

                noticesRes.data.forEach((n: any) => {
                    cMap[n.id] = []
                    rMap[n.id] = []
                })

                commentsRes.data?.forEach((c: any) => {
                    if (cMap[c.notice_id]) cMap[c.notice_id].push(c)
                })

                reactionsRes.data?.forEach((r: any) => {
                    if (rMap[r.notice_id]) rMap[r.notice_id].push(r)
                })

                setComments(cMap)
                setReactions(rMap)
            }
        } catch (error) {
            console.error('Error fetching notices:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddNotice = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title || !formData.content) return

        setSubmitting(true)
        const newNotice: any = {
            ...formData,
            created_at: new Date().toISOString(),
            created_by: profile?.id || 'Admin'
        }

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setTimeout(() => {
                const noticeWithId = { ...newNotice, id: 'mock-' + Date.now() }
                const localNotices = JSON.parse(localStorage.getItem('mock_notices') || '[]')
                localStorage.setItem('mock_notices', JSON.stringify([noticeWithId, ...localNotices]))

                setNotices(prev => [noticeWithId, ...prev].sort((a, b) => (Number(b.is_pinned) - Number(a.is_pinned))))
                setComments(prev => ({ ...prev, [noticeWithId.id]: [] }))
                setReactions(prev => ({ ...prev, [noticeWithId.id]: [] }))

                setSubmitting(false)
                setShowForm(false)
                setFormData({ audience_type: 'All', is_pinned: false })
            }, 600)
            return
        }

        try {
            const { error } = await supabase.from('notices').insert(newNotice)
            if (error) throw error
            fetchNotices()
            setShowForm(false)
            setFormData({ audience_type: 'All', is_pinned: false })
        } catch (error) {
            console.error('Error adding notice:', error)
            alert('Failed to post notice')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this notice?')) return

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const localNotices = JSON.parse(localStorage.getItem('mock_notices') || '[]')
            const updatedLocal = localNotices.filter((n: Notice) => n.id !== id)
            localStorage.setItem('mock_notices', JSON.stringify(updatedLocal))
            // Reload mostly affects local state here
            setNotices(prev => prev.filter(n => n.id !== id))
            return
        }

        try {
            const { error } = await supabase.from('notices').delete().eq('id', id)
            if (error) throw error
            setNotices(prev => prev.filter(n => n.id !== id))
        } catch (error) {
            console.error('Error deleting notice:', error)
        }
    }

    const handleLike = async (noticeId: string) => {
        const hasLiked = reactions[noticeId]?.some(r => r.user_id === (profile?.id || 'me')) // Mock user fallback

        if (hasLiked) {
            // Unlike logic could go here, for now just toggle "Like" mostly adds
            return
        }

        const newReaction = {
            notice_id: noticeId,
            user_id: profile?.id || 'me',
            type: 'like' as const,
            created_at: new Date().toISOString()
        }

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const reactionWithId = { ...newReaction, id: 'r-' + Date.now() }
            const localReactions = JSON.parse(localStorage.getItem('mock_notice_reactions') || '[]')
            localStorage.setItem('mock_notice_reactions', JSON.stringify([...localReactions, reactionWithId]))

            setReactions(prev => ({
                ...prev,
                [noticeId]: [...(prev[noticeId] || []), reactionWithId]
            }))
            return
        }

        try {
            const { data, error } = await supabase.from('notice_reactions').insert(newReaction).select().single()
            if (error) throw error
            if (data) {
                setReactions(prev => ({
                    ...prev,
                    [noticeId]: [...(prev[noticeId] || []), data as any]
                }))
            }
        } catch (error) {
            console.error('Error reacting:', error)
        }
    }

    const handleAddComment = async (noticeId: string) => {
        if (!newComment.trim()) return
        setCommenting(true)

        const comment = {
            notice_id: noticeId,
            user_id: profile?.id || 'me',
            content: newComment.trim(),
            created_at: new Date().toISOString()
        }

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const commentWithId = { ...comment, id: 'c-' + Date.now(), user: { full_name: profile?.full_name || 'Me' } }
            const localComments = JSON.parse(localStorage.getItem('mock_notice_comments') || '[]')
            localStorage.setItem('mock_notice_comments', JSON.stringify([...localComments, commentWithId]))

            setComments(prev => ({
                ...prev,
                [noticeId]: [...(prev[noticeId] || []), commentWithId]
            }))
            setNewComment('')
            setCommenting(false)
            return
        }

        try {
            const { data, error } = await supabase.from('notice_comments').insert(comment).select('*, user:users(full_name, profile_image_url)').single()
            if (error) throw error
            if (data) {
                setComments(prev => ({
                    ...prev,
                    [noticeId]: [...(prev[noticeId] || []), data as any]
                }))
                setNewComment('')
            }
        } catch (error) {
            console.error('Error commenting:', error)
        } finally {
            setCommenting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Notice Board</h2>
                    <p className="text-muted-foreground">Announcements and updates for the community.</p>
                </div>
                {isAdmin && (
                    <Button onClick={() => setShowForm(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Post Notice
                    </Button>
                )}
            </div>

            {/* Notice Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {notices.map((notice) => {
                    const noticeComments = comments[notice.id] || []
                    const noticeReactions = reactions[notice.id] || []
                    const isExpanded = expandedNoticeId === notice.id

                    return (
                        <Card key={notice.id} className={cn("relative flex flex-col transition-all hover:shadow-md", notice.is_pinned && "border-primary/50 bg-primary/5")}>
                            {notice.is_pinned && (
                                <div className="absolute top-3 right-3 text-primary rotate-45">
                                    <Pin className="h-5 w-5 fill-current" />
                                </div>
                            )}
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-xs font-semibold border",
                                        notice.audience_type === 'All' ? "bg-blue-100 text-blue-700 border-blue-200" :
                                            notice.audience_type === 'Owners' ? "bg-purple-100 text-purple-700 border-purple-200" :
                                                "bg-amber-100 text-amber-700 border-amber-200"
                                    )}>
                                        {notice.audience_type}
                                    </span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(notice.created_at), 'MMM d, yyyy')}
                                    </span>
                                </div>
                                <CardTitle className="text-lg leading-tight">{notice.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{notice.content}</p>

                                <div className="pt-2 border-t flex items-center justify-between">
                                    <div className="flex gap-4">
                                        <button
                                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                                            onClick={() => handleLike(notice.id)}
                                        >
                                            <ThumbsUp className={cn("h-4 w-4", noticeReactions.some(r => r.user_id === (profile?.id || 'me')) ? "fill-primary text-primary" : "")} />
                                            {noticeReactions.length > 0 && <span>{noticeReactions.length}</span>}
                                        </button>
                                        <button
                                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                                            onClick={() => setExpandedNoticeId(isExpanded ? null : notice.id)}
                                        >
                                            <MessageSquare className="h-4 w-4" />
                                            {noticeComments.length > 0 && <span>{noticeComments.length}</span>}
                                        </button>
                                    </div>
                                    {isAdmin && (
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(notice.id)} className="h-6 px-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>

                                {isExpanded && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                            {noticeComments.length === 0 ? (
                                                <p className="text-xs text-muted-foreground text-center py-2">No comments yet.</p>
                                            ) : (
                                                noticeComments.map(c => (
                                                    <div key={c.id} className="bg-muted/50 rounded-md p-2 text-xs">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="font-semibold">{c.user?.full_name}</span>
                                                            <span className="text-muted-foreground text-[10px]">{format(new Date(c.created_at), 'MMM d')}</span>
                                                        </div>
                                                        <p>{c.content}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                className="flex-1 h-8 text-xs rounded-md border bg-background px-2"
                                                placeholder="Add a comment..."
                                                value={newComment}
                                                onChange={e => setNewComment(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddComment(notice.id)}
                                            />
                                            <Button size="icon" className="h-8 w-8" onClick={() => handleAddComment(notice.id)} disabled={commenting || !newComment.trim()}>
                                                <Send className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Add Notice Modal (Dialog) */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Megaphone className="h-5 w-5 text-primary" /> Post New Notice
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddNotice} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title</label>
                            <input
                                required
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                value={formData.title || ''}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Lift Maintenance Schedule"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Content / Message</label>
                            <textarea
                                required
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm min-h-[100px]"
                                value={formData.content || ''}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                placeholder="Details about the announcement..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Audience</label>
                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                    value={formData.audience_type || 'All'}
                                    onChange={e => setFormData({ ...formData, audience_type: e.target.value as any })}
                                >
                                    <option value="All">All Residents</option>
                                    <option value="Owners">Owners Only</option>
                                    <option value="Tenants">Tenants Only</option>
                                    <option value="Committee">Committee Members</option>
                                </select>
                            </div>
                            <div className="space-y-2 flex items-end pb-1">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={formData.is_pinned || false}
                                        onChange={e => setFormData({ ...formData, is_pinned: e.target.checked })}
                                    />
                                    <span className="text-sm font-medium">Pin to Top</span>
                                </label>
                            </div>
                        </div>

                        <Button className="w-full" type="submit" disabled={submitting}>
                            {submitting ? 'Posting...' : 'Post Notice'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
