import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { User } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, User as UserIcon } from 'lucide-react'
import Link from 'next/link'

export default function CommitteeList() {
    const [members, setMembers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                // Mock Data request for preview
                if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                    setMembers([
                        { id: '2', email: 'admin@society.com', full_name: 'Admin User', role: 'app_admin', is_active: true, created_at: '', updated_at: '' },
                        { id: '4', email: 'jane.smith@example.com', full_name: 'Jane Smith', role: 'management', is_active: true, created_at: '', updated_at: '' },
                    ])
                    setLoading(false)
                    return
                }

                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('role', ['app_admin', 'management'])
                    .order('full_name')

                if (error) throw error
                if (data) setMembers(data as User[])
            } catch (error) {
                console.error('Error fetching committee:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchMembers()
    }, [])

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Management Committee</CardTitle>
                <Link href="/dashboard/users">
                    <Button variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" /> Manage
                    </Button>
                </Link>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center text-sm text-muted-foreground">Loading members...</div>
                    ) : members.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No committee members found.
                        </div>
                    ) : (
                        members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <UserIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{member.full_name}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{member.role.replace('_', ' ')}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
