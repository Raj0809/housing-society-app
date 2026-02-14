import UnitList from '@/components/units/UnitList'

export default function UnitsPage() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Unit Management</h2>
                <p className="text-muted-foreground">Manage flats, villas, and occupancy status</p>
            </div>

            <UnitList />
        </div>
    )
}
