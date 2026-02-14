"use client"

import SocietyProfileForm from '@/components/society/SocietyForm'
import CommitteeList from '@/components/society/CommitteeList'

export default function SocietyPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Society Profile</h2>
                <p className="text-muted-foreground">Manage society details and committee members</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <SocietyProfileForm />
                </div>
                <div>
                    <CommitteeList />
                </div>
            </div>
        </div>
    )
}
