import ComplaintList from "@/components/complaints/ComplaintList"

export default function ComplaintsPage() {
    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Complaints & Helpdesk</h1>
                <p className="text-muted-foreground">Raise and track maintenance issues.</p>
            </div>
            <ComplaintList />
        </div>
    )
}
