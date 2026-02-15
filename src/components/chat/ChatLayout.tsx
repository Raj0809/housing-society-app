"use client"

import { useState, useEffect } from 'react'
import ChatWindow from './ChatWindow'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Hash, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { ChatChannel } from '@/types'

export default function ChatLayout() {
    const { profile } = useAuth()
    const [activeRoom, setActiveRoom] = useState<{ id: string, name: string } | null>(null)
    const [channels, setChannels] = useState<ChatChannel[]>([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newChannelName, setNewChannelName] = useState('')
    const [creating, setCreating] = useState(false)

    // Check if user is admin/management
    const isAdmin = profile?.role === 'app_admin' || profile?.role === 'management'

    useEffect(() => {
        fetchChannels()
    }, [])

    const fetchChannels = async () => {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const localChannels = JSON.parse(localStorage.getItem('mock_channels') || '[]')
            const defaultChannels = [
                { id: 'lobby', name: 'Community Lobby', type: 'public' },
                { id: 'announcements', name: 'Announcements', type: 'public' }
            ]
            const all = [...defaultChannels, ...localChannels.filter((c: any) => !defaultChannels.find(d => d.id === c.id))]
            setChannels(all as any)
            if (!activeRoom) setActiveRoom({ id: 'lobby', name: 'Community Lobby' })
            return
        }

        try {
            const { data } = await supabase.from('chat_channels').select('*').order('created_at')
            if (data && data.length > 0) {
                setChannels(data)
                // Auto-select the first channel (lobby) if nothing is selected
                if (!activeRoom) {
                    const lobby = data.find(c => c.type === 'society_wide') || data[0]
                    setActiveRoom({ id: lobby.id, name: lobby.name })
                }
            } else {
                setChannels([])
            }
        } catch (e) {
            console.error(e)
            setChannels([])
        }
    }

    const handleCreateChannel = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newChannelName.trim()) return
        setCreating(true)

        const newChannel = {
            name: newChannelName.trim(),
            type: 'public',
            created_by: profile?.id
        }

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            setTimeout(() => {
                const channelWithId = { ...newChannel, id: 'channel-' + Date.now(), created_at: new Date().toISOString() }
                const localChannels = JSON.parse(localStorage.getItem('mock_channels') || '[]')
                localStorage.setItem('mock_channels', JSON.stringify([...localChannels, channelWithId]))
                setChannels(prev => [...prev, channelWithId as any])
                setNewChannelName('')
                setShowCreateModal(false)
                setCreating(false)
            }, 500)
            return
        }

        const { data, error } = await supabase.from('chat_channels').insert(newChannel).select().single()
        if (!error && data) {
            setChannels(prev => [...prev, data])
            setNewChannelName('')
            setShowCreateModal(false)
        } else {
            alert('Failed to create channel')
        }
        setCreating(false)
    }

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-13rem)] gap-4">
            {/* Sidebar (Room/User List) */}
            <Card className="w-full md:w-64 flex flex-col border-r h-full">
                <div className="p-4 border-b font-semibold flex items-center justify-between bg-muted/20">
                    <span>Channels</span>
                    {isAdmin && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowCreateModal(true)}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <div className="p-2 space-y-1 overflow-y-auto flex-1">
                    {channels.map(channel => (
                        <Button
                            key={channel.id}
                            variant={activeRoom?.id === channel.id ? 'secondary' : 'ghost'}
                            className={cn("w-full justify-start", activeRoom?.id === channel.id && "bg-primary/10 text-primary")}
                            onClick={() => setActiveRoom({ id: channel.id, name: channel.name })}
                        >
                            <Hash className="mr-2 h-4 w-4 opacity-50" />
                            <span className="truncate">{channel.name}</span>
                        </Button>
                    ))}
                </div>
            </Card>

            {/* Main Chat Area */}
            <div className="flex-1 min-w-0 h-full">
                {activeRoom ? (
                    <ChatWindow roomId={activeRoom.id} title={activeRoom.name} />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        Select a channel to start chatting
                    </div>
                )}
            </div>

            {/* Create Channel Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-sm bg-background rounded-lg shadow-lg border p-6">
                        <h3 className="text-lg font-semibold mb-4">Create New Channel</h3>
                        <form onSubmit={handleCreateChannel} className="space-y-4">
                            <input
                                autoFocus
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                placeholder="Channel Name (e.g. Block A Discussion)"
                                value={newChannelName}
                                onChange={e => setNewChannelName(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                                <Button type="submit" disabled={creating || !newChannelName.trim()}>
                                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
