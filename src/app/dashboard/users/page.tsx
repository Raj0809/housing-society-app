"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { Plus, ArrowLeft } from 'lucide-react'
import UserList from '@/components/users/UserList'
import UserForm from '@/components/users/UserForm'

import { User } from '@/types'

export default function UsersPage() {
    const [isCreating, setIsCreating] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)

    const handleEdit = (user: User) => {
        setSelectedUser(user)
        setIsCreating(true)
    }

    const closeForm = () => {
        setIsCreating(false)
        setSelectedUser(null)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
                    <p className="text-muted-foreground">Manage resident access and roles</p>
                </div>
                {!isCreating && (
                    <Button onClick={() => setIsCreating(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add User
                    </Button>
                )}
            </div>

            {isCreating ? (
                <Card className="max-w-2xl">
                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                        <Button variant="ghost" size="icon" onClick={closeForm}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <CardTitle>{selectedUser ? 'Edit User' : 'Add New User'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <UserForm
                            initialData={selectedUser}
                            onSuccess={closeForm}
                            onCancel={closeForm}
                        />
                    </CardContent>
                </Card>
            ) : (
                <UserList onEdit={handleEdit} />
            )}
        </div>
    )
}
