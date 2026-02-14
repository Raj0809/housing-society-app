export type UserRole = 'app_admin' | 'management' | 'administration' | 'resident' | 'security' | 'other'

export interface User {
    id: string
    email: string
    full_name: string
    phone?: string
    unit_number?: string
    unit_id?: string
    role: UserRole
    profile_image_url?: string
    is_active: boolean
    approval_status?: 'pending' | 'approved' | 'rejected'
    created_at: string
    updated_at: string
}

export interface SocietyProfile {
    id: string
    name: string
    type: 'villa' | 'single_block' | 'multi_block'
    address: string
    total_units: number
    established_date?: string
    registration_number?: string
    logo_url?: string
    settings: Record<string, any>
    is_gst_registered?: boolean
    gstin?: string
    default_gst_rate?: number
    created_at: string
    updated_at: string
}

export interface Unit {
    id: string
    society_id: string
    unit_number: string
    block_name?: string
    floor_number?: number
    unit_type: 'villa' | 'flat'
    area_sqft: number
    owner_id: string
    created_at: string
}

export interface MaintenanceSettings {
    society_id: string
    calculation_method: 'fixed_per_unit' | 'per_sqft'
    default_amount: number // Fixed amount or Rate per sqft
    penalty_rate?: number
    due_day_of_month: number
    custom_expense_types: string[]
}

export interface MaintenanceFee {
    id: string
    unit_id: string
    amount: number // Base Amount
    taxable_amount?: number
    cgst_amount?: number
    sgst_amount?: number
    igst_amount?: number
    tax_amount?: number
    total_amount?: number // Inclusive of Tax
    amount_paid?: number
    fee_type: 'monthly' | 'one_time' | 'penalty' | string
    description?: string
    due_date: string
    payment_status: 'pending' | 'paid' | 'overdue' | 'partial'
    payment_date?: string
    payment_method?: string
    transaction_id?: string
    created_at: string
}

export interface Complaint {
    id: string
    raised_by: string
    category?: string
    subject: string
    description?: string
    status: 'open' | 'in_progress' | 'resolved' | 'closed'
    priority: 'low' | 'medium' | 'high'
    assigned_to?: string
    resolution_notes?: string
    attachment_url?: string
    created_at: string
    resolved_at?: string
    user?: { full_name: string, unit_number?: string }
}

export interface Visitor {
    id: string
    visitor_name: string
    visitor_phone?: string
    visiting_unit_id?: string
    check_in?: string
    check_out?: string
    purpose?: string
    entry_code?: string
    status: 'pending' | 'approved' | 'checked_in' | 'checked_out' | 'denied'
    registered_by?: string
    approved_by?: string
    valid_from?: string
    valid_until?: string
    vehicle_number?: string
    created_at: string
    unit?: { unit_number: string }
}

export interface Vehicle {
    id: string
    user_id: string
    type: 'Car' | 'Bike' | 'Other'
    vehicle_number: string
    model: string
    sticker_status: 'pending' | 'approved' | 'rejected' | 'blocked'
    sticker_number?: string
    created_at: string
    user?: { full_name: string, unit_number: string }
}



export interface FacilitySlot {
    id: string
    name: string
    start_time: string
    end_time: string
    price: number
}

export interface Facility {
    id: string
    name: string
    description: string
    image_url?: string
    hourly_rate: number // Default rate (or hourly fallback)
    pricing_type?: 'hourly' | 'per_slot' | 'day' // Updated Field
    slots?: FacilitySlot[]
    capacity?: number
    open_time: string // "06:00"
    close_time: string // "22:00"
    booking_rules?: {
        min_hours?: number
        max_hours?: number
        schedule_type?: 'continuous' | 'split'
        morning_start?: string
        morning_end?: string
        evening_start?: string
        evening_end?: string
    }
    is_active: boolean
    status?: 'Available' | 'Maintenance' | 'Closed'
    gst_applicable?: boolean
    sac_code?: string
    gst_rate?: number
    per_person_applicable?: boolean
}

export interface Booking {
    id: string
    facility_id: string
    user_id: string
    group_id?: string
    date: string // ISO Date string
    start_time: string // "10:00"
    end_time: string // "11:00"
    status: 'confirmed' | 'cancelled' | 'pending' | 'cancellation_requested' | 'modification_requested'
    total_amount: number
    created_at: string
    facility?: Facility
    user?: { full_name: string, unit_number: string }
    number_of_persons?: number
    invoice_id?: string // New field for direct linking
}

export interface BookingModification {
    id: string
    booking_id: string
    new_date: string
    new_start_time: string
    new_end_time: string
    status: 'pending' | 'approved' | 'rejected'
    request_reason?: string
    admin_response?: string
    reviewed_by?: string
    created_at: string
    updated_at: string
    booking?: Booking
}

export interface BookingCancellation {
    id: string
    booking_id: string
    request_reason: string
    requested_by: string
    status: 'pending' | 'approved' | 'rejected'
    admin_response?: string
    cancellation_charges?: number
    reviewed_by?: string
    created_at: string
    updated_at: string
    booking?: Booking
}

export interface Expense {
    id: string
    title: string
    amount: number
    taxable_amount?: number
    cgst_amount?: number
    sgst_amount?: number
    igst_amount?: number
    // TDS Fields
    tds_applicable?: boolean
    tds_percentage?: number
    tds_amount?: number
    date: string
    category: string // keeping string for now, but ideally ID linkage
    category_id?: string
    payee?: string
    payment_method?: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque'
    bank_particulars?: string
    notes?: string
    receipt_url?: string
    created_by?: string
    created_at: string
}

export interface ExpenditureCategory {
    id: string
    name: string
    classification: 'Revenue' | 'Capital'
    type: 'Operational' | 'Capital' | 'Utility' | 'Administrative' | 'Other'
    nature: 'Fixed' | 'Variable' | 'Recurring' | 'One-time'
    is_active: boolean
    created_at: string
}

export interface Notice {
    id: string
    title: string
    content: string
    audience_type: 'All' | 'Owners' | 'Tenants' | 'Committee'
    expiration_date?: string
    is_pinned: boolean
    attachment_url?: string
    created_by: string
    created_at: string
}

export interface ChatMessage {
    id: string
    sender_id: string
    receiver_id?: string // null for public/group
    content: string
    is_read: boolean
    created_at: string
    sender?: { full_name: string, profile_image_url?: string }
}

export interface ChatChannel {
    id: string
    name: string
    type: 'public' | 'private' | 'restricted'
    created_by: string
    created_at: string
}

export interface ComplaintReply {
    id: string
    complaint_id: string
    user_id: string
    content: string
    created_at: string
    user?: { full_name: string, role?: string }
}

export interface NoticeComment {
    id: string
    notice_id: string
    user_id: string
    content: string
    created_at: string
    user?: { full_name: string, profile_image_url?: string }
}

export interface NoticeReaction {
    id: string
    notice_id: string
    user_id: string
    type: 'like' | 'acknowledge'
    created_at: string
}

export interface TaxPayment {
    id: string
    period_month: number
    period_year: number
    tax_type: 'TDS' | 'GST'
    amount_paid: number
    payment_date: string
    reference_number?: string
    remarks?: string
    created_at: string
}
