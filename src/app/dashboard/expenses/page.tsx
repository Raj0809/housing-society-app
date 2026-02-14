"use client"

import ExpenseList from '@/components/finance/ExpenseList'

export default function ExpensesPage() {
    return (
        <div className="flex-1 space-y-6 p-8 pt-6 animate-fade-in">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Expense Tracking</h2>
                    <p className="text-muted-foreground">Manage and track society expenditures.</p>
                </div>
            </div>
            <ExpenseList />
        </div>
    )
}
