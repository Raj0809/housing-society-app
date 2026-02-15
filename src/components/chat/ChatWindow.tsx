"use client"

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ChatMessage } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Send, User as UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface ChatWindowProps {
    roomId?: string // 'lobby' or userId for DM
    title: string
}

export default function ChatWindow({ roomId = 'lobby', title }: ChatWindowProps) {
    const { profile } = useAuth()
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchMessages()

        // Real-time subscription
        const channel = supabase
            .channel('public:chat_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
                const newMsg = payload.new as ChatMessage
                // Filter for current room
                if ((roomId === 'lobby' && !newMsg.receiver_id) ||
                    (newMsg.sender_id === roomId || newMsg.receiver_id === roomId)) {

                    // Fetch sender details if needed, or optimistically display
                    fetchMessages() // Simplest for now to get relations
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [roomId])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const fetchMessages = async () => {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            // Mock Data
            const MOCK_MESSAGES: ChatMessage[] = [
                { id: '1', sender_id: 'other1', content: 'Has anyone seen the notice about water tank cleaning?', is_read: true, created_at: new Date(Date.now() - 10000000).toISOString(), sender: { full_name: 'Rahul Sharma' } },
                { id: '2', sender_id: 'other2', content: 'Yes, it is on Tuesday.', is_read: true, created_at: new Date(Date.now() - 9000000).toISOString(), sender: { full_name: 'Priya Singh' } },
                { id: '3', sender_id: profile?.id || 'me', content: 'Thanks for the update!', is_read: true, created_at: new Date(Date.now() - 8000000).toISOString(), sender: { full_name: profile?.full_name || 'Me' } },
            ]
            setMessages(MOCK_MESSAGES)
            return
        }

        let query = supabase
            .from('chat_messages')
            .select('*, sender:profiles(full_name, profile_image_url)')
            .order('created_at', { ascending: true })

        if (roomId === 'lobby') {
            query = query.is('receiver_id', null)
        } else {
            // DM logic
            query = query.or(`and(sender_id.eq.${profile?.id},receiver_id.eq.${roomId}),and(sender_id.eq.${roomId},receiver_id.eq.${profile?.id})`)
        }

        const { data, error } = await query
        if (data) setMessages(data as any)
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        setSending(true)
        const msg = {
            sender_id: profile?.id,
            receiver_id: roomId === 'lobby' ? null : roomId,
            content: newMessage.trim(),
            is_read: false
        }

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const mockMsg = { ...msg, id: Date.now().toString(), created_at: new Date().toISOString(), sender: { full_name: profile?.full_name || 'Me' } }
            setMessages(prev => [...prev, mockMsg as any])
            setNewMessage('')
            setSending(false)
            return
        }

        await supabase.from('chat_messages').insert(msg)
        setNewMessage('')
        fetchMessages() // Refresh to get sender info properly populated if needed
        setSending(false)
    }

    return (
        <div className="flex flex-col h-[calc(100vh-12rem)] border rounded-lg bg-background shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b bg-muted/30">
                <h3 className="font-semibold flex items-center gap-2">
                    {roomId === 'lobby' ? <UsersIcon className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                    {title}
                </h3>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                    const isMe = msg.sender_id === profile?.id
                    return (
                        <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                            <div className={cn(
                                "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                                isMe ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted text-foreground rounded-bl-none"
                            )}>
                                {!isMe && <p className="text-[10px] opacity-70 mb-0.5 font-semibold text-primary">{msg.sender?.full_name || 'Unknown'}</p>}
                                <p>{msg.content}</p>
                                <p className={cn("text-[10px] mt-1 text-right opacity-70", isMe ? "text-primary-foreground" : "text-muted-foreground")}>
                                    {format(new Date(msg.created_at), 'h:mm a')}
                                </p>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 border-t bg-background flex gap-2">
                <input
                    className="flex-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder={`Message ${title}...`}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    disabled={sending}
                />
                <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    )
}

function UsersIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}
