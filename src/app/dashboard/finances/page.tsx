import MaintenanceList from '@/components/finance/MaintenanceList'

export default function FinancesPage() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Financial Management</h2>
                <p className="text-muted-foreground">Manage maintenance fees, expenses, and invoices</p>
            </div>

            <MaintenanceList />
        </div>
    )
}
