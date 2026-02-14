import FacilityList from '@/components/facility/FacilityList'

export default function FacilitiesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Facility Bookings</h1>
                <p className="text-muted-foreground">Book amenities and view availability.</p>
            </div>

            <FacilityList />
        </div>
    )
}
