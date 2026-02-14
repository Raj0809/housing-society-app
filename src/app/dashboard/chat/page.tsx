import ChatLayout from "@/components/chat/ChatLayout"

export default function ChatPage() {
    return (
        <div className="container mx-auto py-6">
            <h2 className="text-2xl font-bold tracking-tight mb-4">Internal Chat</h2>
            <ChatLayout />
        </div>
    )
}
