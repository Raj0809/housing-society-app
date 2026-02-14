import VehicleList from "@/components/vehicles/VehicleList"

export default function VehiclesPage() {
    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Vehicle Management</h1>
                <p className="text-muted-foreground">Register vehicles and manage parking stickers.</p>
            </div>

            <VehicleList />
        </div>
    )
}
