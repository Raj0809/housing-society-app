"use client"

import { useState } from 'react'
import MaintenanceSettingsPage from '@/components/finance/MaintenanceSettingsPage'
import ExpenditureCategorySettings from '@/components/finance/ExpenditureCategorySettings'

export default function FinanceSettingsLayout() {
    const [activeTab, setActiveTab] = useState<'maintenance' | 'expenditures'>('maintenance')

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 animate-fade-in">
            <div className="flex flex-col space-y-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Financial Settings</h2>
                    <p className="text-muted-foreground">Configure maintenance logic and expenditure categories.</p>
                </div>

                <div className="flex space-x-2 border-b">
                    <button
                        onClick={() => setActiveTab('maintenance')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'maintenance'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Maintenance Fees
                    </button>
                    <button
                        onClick={() => setActiveTab('expenditures')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'expenditures'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Expenditure Categories
                    </button>
                </div>

                <div className="mt-4">
                    {activeTab === 'maintenance' ? (
                        <MaintenanceSettingsPage />
                    ) : (
                        <ExpenditureCategorySettings />
                    )}
                </div>
            </div>
        </div>
    )
}
