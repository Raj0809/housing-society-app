'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { format, addHours, parseISO, isSameDay, addDays, getDaysInMonth, differenceInDays } from 'date-fns'
import { Search, MapPin, Clock, IndianRupee, Calendar as CalIcon, User, Plus, Pencil, X, FileText, AlertTriangle } from 'lucide-react'
import { Facility, Booking, BookingCancellation, BookingModification } from '@/types'
import { cn } from '@/lib/utils'
import { DateRange } from 'react-day-picker'

// Mock Data for Facilities
const MOCK_FACILITIES: Facility[] = [
    {
        id: '1',
        name: 'Clubhouse Hall',
        description: 'Spacious hall for parties and events. AC included.',
        hourly_rate: 500,
        open_time: '08:00',
        close_time: '23:00',
        capacity: 100,
        is_active: true,
        status: 'Available',
        pricing_type: 'per_slot',
        slots: [
            { id: 'ch_m', name: 'Morning', start_time: '09:00', end_time: '14:00', price: 5000 },
            { id: 'ch_e', name: 'Evening', start_time: '17:00', end_time: '23:00', price: 7000 }
        ],
        image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205'
    },
    {
        id: '2',
        name: 'Tennis Court',
        description: 'Synthetic hard court with floodlights.',
        hourly_rate: 200,
        open_time: '06:00',
        close_time: '22:00',
        capacity: 4,
        is_active: true,
        status: 'Maintenance',
        pricing_type: 'hourly',
        image_url: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6'
    },
    {
        id: '3',
        name: 'Swimming Pool',
        description: 'Temperature controlled usage per slot.',
        hourly_rate: 100,
        open_time: '06:00',
        close_time: '20:00',
        capacity: 20,
        is_active: true,
        status: 'Closed',
        pricing_type: 'per_slot',
        slots: [{ id: 's1', name: 'Morning', start_time: '06:00', end_time: '10:00', price: 100 }],
        image_url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7'
    }
]

export default function FacilityList() {

    const { profile } = useAuth()
    const [facilities, setFacilities] = useState<Facility[]>(MOCK_FACILITIES)
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null)
    const [bookingDate, setBookingDate] = useState<Date | undefined>(new Date())
    const [dateRange, setDateRange] = useState<DateRange | undefined>()
    const [bookingSlot, setBookingSlot] = useState<string | null>(null)
    const [selectedDuration, setSelectedDuration] = useState(1) // Duration in hours
    const [isBookingOpen, setIsBookingOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'browse' | 'my_bookings'>('browse')
    const [editingBookingId, setEditingBookingId] = useState<string | null>(null)

    // Add/Edit Facility State
    const [isAddFacilityOpen, setIsAddFacilityOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [scheduleType, setScheduleType] = useState<'continuous' | 'split'>('continuous')
    const [morningStart, setMorningStart] = useState('08:00')
    const [morningEnd, setMorningEnd] = useState('12:00')
    const [eveningStart, setEveningStart] = useState('16:00')
    const [eveningEnd, setEveningEnd] = useState('22:00')

    // New State for Slot-based pricing
    const [pricingType, setPricingType] = useState<'hourly' | 'per_slot' | 'day'>('hourly')
    const [status, setStatus] = useState<'Available' | 'Maintenance' | 'Closed'>('Available')
    const [facilitySlots, setFacilitySlots] = useState<{ name: string, start: string, end: string, price: number }[]>([])
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [newSlot, setNewSlot] = useState({ name: '', start: '', end: '', price: 0 })

    const [newFacility, setNewFacility] = useState<Partial<Facility>>({
        name: '',
        description: '',
        hourly_rate: 100,
        open_time: '06:00',
        close_time: '22:00',
        capacity: 10,
        is_active: true,
        status: 'Available',
        image_url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7',
        gst_applicable: false,
        sac_code: '',
        gst_rate: 18
    })

    // Cancellation State
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
    const [cancelReason, setCancelReason] = useState('')
    const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null)
    const [cancellationRequests, setCancellationRequests] = useState<BookingCancellation[]>([])
    const [modificationRequests, setModificationRequests] = useState<BookingModification[]>([])
    const [showRequests, setShowRequests] = useState(false)
    const [numberOfPersons, setNumberOfPersons] = useState(1) // New state for multi-person booking

    const isAdmin = profile?.role === 'app_admin' || profile?.role === 'management' || profile?.role === 'administration'

    // Reset form helper
    const resetForm = () => {
        setNewFacility({ name: '', description: '', hourly_rate: 100, open_time: '06:00', close_time: '22:00', capacity: 10, is_active: true, status: 'Available', image_url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7', per_person_applicable: false })
        setScheduleType('continuous')
        setPricingType('hourly')
        setStatus('Available')
        setFacilitySlots([])
        setSelectedImage(null)
        setMorningStart('08:00')
        setMorningEnd('12:00')
        setEveningStart('16:00')
        setEveningEnd('22:00')
        setIsEditMode(false)
    }

    const openEditDialog = (facility: Facility) => {
        setNewFacility(facility)
        setPricingType(facility.pricing_type || 'hourly')
        setStatus(facility.status || 'Available')
        if (facility.slots) {
            setFacilitySlots(facility.slots.map(s => ({ name: s.name, start: s.start_time, end: s.end_time, price: s.price })))
        } else {
            setFacilitySlots([])
        }

        if (facility.booking_rules?.schedule_type === 'split') {
            setScheduleType('split')
            setMorningStart(facility.booking_rules.morning_start || '08:00')
            setMorningEnd(facility.booking_rules.morning_end || '12:00')
            setEveningStart(facility.booking_rules.evening_start || '16:00')
            setEveningEnd(facility.booking_rules.evening_end || '22:00')
        } else {
            setScheduleType('continuous')
        }
        setIsEditMode(true)
        setIsAddFacilityOpen(true)
    }

    const handleEditBooking = (booking: Booking) => {
        if (!booking.facility) return
        setSelectedFacility(booking.facility)
        setBookingDate(new Date(booking.date))
        setBookingSlot(booking.start_time)
        setEditingBookingId(booking.id)
        setIsBookingOpen(true)
    }

    useEffect(() => {
        const init = async () => {
            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                const local = JSON.parse(localStorage.getItem('mock_facilities') || '[]')
                if (local.length > 0) setFacilities(local)
                else {
                    // Ensure MOCK_FACILITIES is used if local is empty
                    setFacilities(MOCK_FACILITIES)
                    localStorage.setItem('mock_facilities', JSON.stringify(MOCK_FACILITIES))
                }
            } else {
                const { data } = await supabase.from('facilities').select('*').eq('is_active', true)
                if (data) setFacilities(data)
            }
            fetchBookings()
            setLoading(false)
        }
        init()
    }, [])

    const fetchBookings = async () => {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const local = JSON.parse(localStorage.getItem('mock_bookings') || '[]')
            setBookings(local)

            if (isAdmin) {
                const localCancels = JSON.parse(localStorage.getItem('mock_cancellations') || '[]')
                setCancellationRequests(localCancels.filter((c: any) => c.status === 'pending'))

                const localMods = JSON.parse(localStorage.getItem('mock_modifications') || '[]')
                setModificationRequests(localMods.filter((m: any) => m.status === 'pending'))
            }
        } else {
            // Fetch bookings with User and reversed Units (User -> Units)
            // Note: users table doesn't have unit_id. We fetch units where owner_id = user.id.
            const { data, error } = await supabase.from('bookings')
                .select('*, facility:facilities(*), user:profiles(full_name, units(id, unit_number))')
                .order('date', { ascending: false })

            if (error) console.error('Error fetching bookings:', error)
            setBookings(data || [])

            // Also fetch cancellations and modifications if admin
            if (isAdmin) {
                const { data: cancels, error: fetchError } = await supabase.from('booking_cancellations')
                    .select('*, booking:bookings(id, invoice_id, date, start_time, end_time, status, total_amount, facility:facilities(*), user:profiles(full_name, units(id, unit_number)))')
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false })

                if (fetchError) console.error('DEBUG: Error fetching cancellations:', fetchError)
                else console.log('DEBUG: Fetched cancellations:', cancels)

                setCancellationRequests(cancels || [])

                // Fetch modifications (real logic would need a join similar to above)
                // For now, in real mode assuming table 'booking_modifications'
                const { data: mods } = await supabase.from('booking_modifications')
                    .select('*, booking:bookings(*, facility:facilities(*), user:profiles(full_name, units(id, unit_number)))')
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false })

                setModificationRequests(mods || [])
            }
        }
    }

    // Admin Appove/Reject State
    const [selectedRequest, setSelectedRequest] = useState<BookingCancellation | null>(null)
    const [adminCharges, setAdminCharges] = useState(0)
    const [isAdminActionOpen, setIsAdminActionOpen] = useState(false)
    const [cancelOriginalInvoice, setCancelOriginalInvoice] = useState(true)
    const [invoiceDetails, setInvoiceDetails] = useState<{ number: string, amount: number } | null>(null)
    const [applyPenaltyGst, setApplyPenaltyGst] = useState(true)

    // Fetch Invoice Details when Request Selected
    useEffect(() => {
        const fetchInvoice = async () => {
            console.log('DEBUG: Selected Request for Review:', selectedRequest)
            if (selectedRequest?.booking?.invoice_id) {
                console.log('DEBUG: Fetching invoice:', selectedRequest.booking.invoice_id)
                const { data, error } = await supabase.from('maintenance_fees').select('id, amount').eq('id', selectedRequest.booking.invoice_id).single()
                if (data) {
                    console.log('DEBUG: Found invoice:', data)
                    setInvoiceDetails({ number: data.id.substring(0, 8), amount: data.amount })
                } else {
                    console.error('DEBUG: Invoice fetch failed or empty:', error)
                }
            } else {
                console.log('DEBUG: No invoice_id in selected booking')
                setInvoiceDetails(null)
            }
        }
        fetchInvoice()
    }, [selectedRequest])

    const handleProcessModification = async (req: BookingModification, status: 'approved' | 'rejected') => {
        if (status === 'rejected') {
            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                const local = JSON.parse(localStorage.getItem('mock_modifications') || '[]')
                const updated = local.map((r: any) => r.id === req.id ? { ...r, status: 'rejected', reviewed_by: profile?.id } : r)
                localStorage.setItem('mock_modifications', JSON.stringify(updated))

                // Revert booking status to confirmed from modification_requested
                const bookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]')
                const updatedBookings = bookings.map((b: any) => b.id === req.booking_id ? { ...b, status: 'confirmed' } : b)
                localStorage.setItem('mock_bookings', JSON.stringify(updatedBookings))
            } else {
                await supabase.from('booking_modifications').update({ status: 'rejected', reviewed_by: profile?.id }).eq('id', req.id)
                await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', req.booking_id)
            }
        } else {
            // Approved
            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                const local = JSON.parse(localStorage.getItem('mock_modifications') || '[]')
                const updated = local.map((r: any) => r.id === req.id ? { ...r, status: 'approved', reviewed_by: profile?.id, updated_at: new Date().toISOString() } : r)
                localStorage.setItem('mock_modifications', JSON.stringify(updated))

                // Update booking with new values
                const bookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]')
                const updatedBookings = bookings.map((b: any) => b.id === req.booking_id ? {
                    ...b,
                    date: req.new_date,
                    start_time: req.new_start_time,
                    end_time: req.new_end_time,
                    status: 'confirmed'
                } : b)
                localStorage.setItem('mock_bookings', JSON.stringify(updatedBookings))

            } else {
                await supabase.from('booking_modifications').update({ status: 'approved', reviewed_by: profile?.id, updated_at: new Date().toISOString() }).eq('id', req.id)
                await supabase.from('bookings').update({
                    date: req.new_date,
                    start_time: req.new_start_time,
                    end_time: req.new_end_time,
                    status: 'confirmed'
                }).eq('id', req.booking_id)
            }
        }
        fetchBookings()
        alert(`Modification Request ${status === 'approved' ? 'Approved' : 'Rejected'}`)
    }

    const handleProcessCancellation = async (status: 'approved' | 'rejected') => {
        if (!selectedRequest) return

        // Identify Group
        const groupId = selectedRequest.booking?.group_id
        const groupRequests = groupId
            ? cancellationRequests.filter(r => r.booking?.group_id === groupId)
            : [selectedRequest]

        // Calculate Total Group Amount for Invoice Matching
        const totalGroupAmount = groupRequests.reduce((sum, r) => sum + (r.booking?.total_amount || 0), 0)

        // Batch Update Logic
        if (status === 'rejected') {
            // Mock Update
            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                const local = JSON.parse(localStorage.getItem('mock_cancellations') || '[]')
                const updated = local.map((r: any) => groupRequests.some(gr => gr.id === r.id) ? { ...r, status: 'rejected', reviewed_by: profile?.id } : r)
                localStorage.setItem('mock_cancellations', JSON.stringify(updated))

                // Revert bookings
                const bookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]')
                const updatedBookings = bookings.map((b: any) => groupRequests.some(gr => gr.booking_id === b.id) ? { ...b, status: 'confirmed' } : b)
                localStorage.setItem('mock_bookings', JSON.stringify(updatedBookings))
            } else {
                const ids = groupRequests.map(g => g.id)
                const bookingIds = groupRequests.map(g => g.booking_id)
                await supabase.from('booking_cancellations').update({ status: 'rejected', reviewed_by: profile?.id }).in('id', ids)
                await supabase.from('bookings').update({ status: 'confirmed' }).in('id', bookingIds)
            }
        } else {
            // Approved
            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                const local = JSON.parse(localStorage.getItem('mock_cancellations') || '[]')
                // Charge applies once to the group, store it on the first one or split?
                // Let's store on first for record, others 0. Or just same on all?
                // Ideally, storing on all might imply multiple charges. Let's store on first.
                const updated = local.map((r: any) => {
                    if (groupRequests.some(gr => gr.id === r.id)) {
                        return {
                            ...r,
                            status: 'approved',
                            cancellation_charges: (r.id === selectedRequest.id) ? adminCharges : 0,
                            reviewed_by: profile?.id,
                            updated_at: new Date().toISOString()
                        }
                    }
                    return r
                })
                localStorage.setItem('mock_cancellations', JSON.stringify(updated))

                // Cancel Original Invoice
                // Enhanced matching using totalGroupAmount
                const fees = JSON.parse(localStorage.getItem('mock_maintenance_fees') || '[]')
                const facilityName = (selectedRequest.booking?.facility?.name)

                const updatedFees = fees.map((f: any) => {
                    const isMatch = f.description?.includes(facilityName) &&
                        f.unit_id === (selectedRequest.booking as any)?.user?.unit_id &&
                        f.amount === totalGroupAmount && // Match Group Total
                        f.payment_status === 'pending';

                    if (isMatch) {
                        return { ...f, payment_status: 'cancelled', description: f.description + ' (Cancelled)' }
                    }
                    return f
                })

                // Create One Penalty Invoice for the Group
                if (adminCharges > 0) {
                    const gstRate = selectedRequest.booking?.facility?.gst_rate || 18
                    const isGst = selectedRequest.booking?.facility?.gst_applicable

                    const baseAmount = adminCharges
                    const taxAmount = isGst ? (baseAmount * gstRate / 100) : 0
                    const totalAmount = baseAmount + taxAmount

                    const bookingUser = (selectedRequest.booking as any)?.user
                    const unitId = bookingUser?.unit_id || 'mock-unit-id'

                    const mockInvoice = {
                        id: 'mf-c-' + Math.random().toString(36).substr(2, 9),
                        unit_id: unitId,
                        amount: baseAmount,
                        tax_amount: taxAmount,
                        total_amount: totalAmount,
                        fee_type: 'cancellation_charge',
                        description: `Cancellation Penalty for ${selectedRequest.booking?.facility?.name} (${groupRequests.length} bookings)`,
                        due_date: new Date().toISOString(),
                        payment_status: 'pending',
                        created_at: new Date().toISOString(),
                        units: { unit_number: bookingUser?.unit_number || 'Mock Unit', unit_type: 'flat' }
                    }
                    updatedFees.unshift(mockInvoice)
                }
                localStorage.setItem('mock_maintenance_fees', JSON.stringify(updatedFees))

                // Update booking status
                const bookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]')
                const updatedBookings = bookings.map((b: any) => groupRequests.some(gr => gr.booking_id === b.id) ? { ...b, status: 'cancelled' } : b)
                localStorage.setItem('mock_bookings', JSON.stringify(updatedBookings))

            } else {
                const ids = groupRequests.map(g => g.id)
                const bookingIds = groupRequests.map(g => g.booking_id)

                await supabase.from('bookings').update({ status: 'cancelled' }).in('id', bookingIds)

                // Approve all, apply charge to one?
                await supabase.from('booking_cancellations').update({
                    status: 'approved',
                    cancellation_charges: adminCharges,
                    reviewed_by: profile?.id,
                    updated_at: new Date().toISOString()
                }).eq('id', selectedRequest.id)

                const bookingUser = (selectedRequest.booking as any)?.user

                if (cancelOriginalInvoice) {
                    // DIRECT MATCH via invoice_id (Preferred) or FALLBACK to heuristic
                    const userUnit = bookingUser?.units?.[0] || bookingUser?.units
                    const invoiceId = selectedRequest.booking?.invoice_id

                    if (invoiceId) {
                        // 100% RELIABLE: Cancel invoice by ID
                        const { data: inv } = await supabase.from('maintenance_fees').select('description').eq('id', invoiceId).single()

                        await supabase.from('maintenance_fees')
                            .update({
                                payment_status: 'cancelled',
                                description: inv ? (inv.description?.includes('(Cancelled)') ? inv.description : (inv.description + ' (Cancelled)')) : 'Booking Cancelled'
                            })
                            .eq('id', invoiceId)

                        console.log('Cancelled invoice via ID:', invoiceId)
                    } else if (userUnit?.id) {
                        // FALLBACK: Heuristic match for old bookings
                        const facilityName = selectedRequest.booking?.facility?.name
                        const totalAmountToCheck = totalGroupAmount;

                        const { data: invoices } = await supabase.from('maintenance_fees')
                            .select('id, description, amount, fee_type')
                            .eq('unit_id', userUnit.id)
                            .eq('payment_status', 'pending')

                        if (invoices && invoices.length > 0) {
                            const bestMatch = invoices.find(inv =>
                                inv.description?.toLowerCase().includes(facilityName?.toLowerCase() || '') &&
                                (Math.abs(inv.amount - totalAmountToCheck) < 5.0 || inv.amount === totalAmountToCheck)
                            );

                            if (bestMatch) {
                                await supabase.from('maintenance_fees')
                                    .update({ payment_status: 'cancelled', description: bestMatch.description + ' (Cancelled)' })
                                    .eq('id', bestMatch.id)
                                console.log('Cancelled invoice via fuzzy match:', bestMatch.id)
                            }
                        }
                    }
                }

                // Create Charge Invoice (Real DB)
                if (adminCharges > 0) {
                    // user.units is likely an array due to one-to-many potential, or object if one-to-one mapped in Supabase client types.
                    // We'll assume list and take first.
                    const bookingUser = (selectedRequest.booking as any)?.user
                    const userUnit = bookingUser?.units?.[0] || bookingUser?.units

                    if (userUnit?.id) {
                        const taxAmount = applyPenaltyGst ? (adminCharges * 0.18) : 0
                        const totalAmount = adminCharges + taxAmount

                        const { error: invoiceError } = await supabase.from('maintenance_fees').insert({
                            unit_id: userUnit.id,
                            amount: adminCharges,
                            tax_amount: taxAmount,
                            total_amount: totalAmount,
                            fee_type: 'cancellation_charge',
                            description: `Cancellation Charge for ${selectedRequest.booking?.facility?.name} ${applyPenaltyGst ? '(+ GST)' : ''}`,
                            due_date: new Date().toISOString(),
                            payment_status: 'pending'
                        })
                        if (invoiceError) console.error('Error creating cancellation invoice:', invoiceError)
                    } else {
                        alert('Notice: Could not generate invoice (User has no unit assigned).')
                    }
                }
            }

        }


        setIsAdminActionOpen(false)
        fetchBookings()
        alert(`Cancellation Request ${status === 'approved' ? 'Approved' : 'Rejected'}`)
    }

    const handleRequestCancellation = async () => {
        if (!selectedBookingForCancel || !cancelReason) return

        // Find all bookings in this group
        const groupBookings = selectedBookingForCancel.group_id
            ? bookings.filter(b => b.group_id === selectedBookingForCancel.group_id && b.status === 'confirmed')
            : [selectedBookingForCancel]

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
            const newCancellations = groupBookings.map(booking => ({
                id: 'bc-' + Math.random().toString(36).substr(2, 9),
                booking_id: booking.id,
                request_reason: cancelReason,
                requested_by: 'current-user',
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                booking: { ...booking, facility: booking.facility, user: { full_name: profile?.full_name || 'You', unit_number: profile?.unit_number || 'My Unit' } } // Mock join
            }))

            const local = JSON.parse(localStorage.getItem('mock_cancellations') || '[]')
            localStorage.setItem('mock_cancellations', JSON.stringify([...newCancellations, ...local]))

            // Update booking status
            const currentBookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]')
            const updatedBookings = currentBookings.map((b: any) =>
                groupBookings.some(gb => gb.id === b.id) ? { ...b, status: 'cancellation_requested' } : b
            )
            localStorage.setItem('mock_bookings', JSON.stringify(updatedBookings))

            alert('Cancellation Requested. Admin approval required.')
            setIsCancelDialogOpen(false)
            setCancelReason('')
            fetchBookings()
            return
        }

        // Real DB Insert
        const cancellationsToAdd = groupBookings.map(b => ({
            booking_id: b.id,
            request_reason: cancelReason,
            requested_by: profile?.id,
            status: 'pending'
        }))

        const { error } = await supabase.from('booking_cancellations').insert(cancellationsToAdd)

        if (!error) {
            await supabase.from('bookings').update({ status: 'cancellation_requested' })
                .in('id', groupBookings.map(b => b.id))

            alert('Cancellation Requested. Admin approval required.')
            setIsCancelDialogOpen(false)
            setCancelReason('')
            fetchBookings()
        } else {
            console.error('Error requesting cancellation:', error)
            alert('Failed to submit cancellation request.')
        }
    }

    const handleBookSlot = async () => {
        if (!selectedFacility) return

        // Handle Day Range Booking
        if (selectedFacility.pricing_type === 'day') {
            if (!dateRange?.from || !dateRange?.to) {
                if (dateRange?.from) {
                    // Single day selection in range mode
                    // Treat as single day logic below but using dateRange.from
                } else {
                    return
                }
            }

            const startDate = dateRange?.from || new Date()
            const endDate = dateRange?.to || startDate
            const days = differenceInDays(endDate, startDate) + 1
            const bookingsToCreate: Booking[] = []

            // Single Group ID for all related bookings
            const groupId = 'g-' + Math.random().toString(36).substr(2, 9);

            for (let i = 0; i < days; i++) {
                const currentDay = addDays(startDate, i)
                bookingsToCreate.push({
                    id: (editingBookingId && i === 0) ? editingBookingId : 'b-' + Math.random().toString(36).substr(2, 9),
                    facility_id: selectedFacility.id,
                    user_id: 'current-user',
                    group_id: groupId, // Link them together
                    date: format(currentDay, 'yyyy-MM-dd'),
                    start_time: '12:00', // Default check-in time for day
                    end_time: '11:00', // Default check-out time for day
                    status: 'confirmed',
                    total_amount: (selectedFacility.hourly_rate * (selectedFacility.per_person_applicable ? numberOfPersons : 1)), // Day rate * Persons
                    number_of_persons: selectedFacility.per_person_applicable ? numberOfPersons : 1,
                    created_at: new Date().toISOString(),
                    facility: selectedFacility,
                    user: { full_name: profile?.full_name || 'You', unit_number: profile?.unit_number || 'My Unit' }
                })
            }

            // Batch create logic (mock vs real)
            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                let matches = JSON.parse(localStorage.getItem('mock_bookings') || '[]')
                matches = [...bookingsToCreate, ...matches]
                localStorage.setItem('mock_bookings', JSON.stringify(matches))

                // Generate invoice for total
                // Generate invoice for total
                if (profile?.unit_id) {
                    const baseAmount = bookingsToCreate.reduce((sum, b) => sum + b.total_amount, 0)
                    const taxAmount = selectedFacility.gst_applicable ? (baseAmount * (selectedFacility.gst_rate || 18) / 100) : 0
                    const finalAmount = baseAmount + taxAmount

                    const mockInvoice = {
                        id: 'mf-' + Math.random().toString(36).substr(2, 9),
                        unit_id: profile.unit_id,
                        amount: baseAmount,
                        tax_amount: taxAmount,
                        total_amount: finalAmount,
                        fee_type: 'facility_booking',
                        description: `Booking for ${selectedFacility.name} from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`,
                        due_date: new Date().toISOString(),
                        payment_status: 'pending',
                        created_at: new Date().toISOString(),
                        units: { unit_number: profile.unit_number || 'Mock Unit', unit_type: 'flat' }
                    }
                    const localFees = JSON.parse(localStorage.getItem('mock_maintenance_fees') || '[]')
                    localStorage.setItem('mock_maintenance_fees', JSON.stringify([mockInvoice, ...localFees]))
                }

                fetchBookings()
                setIsBookingOpen(false)
                setDateRange(undefined)
                return
            }

            // Real DB Insert - REFACTORED TO LINK INVOICE
            // 1. Create Invoice First
            let invoiceId = null;
            if (profile?.unit_id) {
                const baseAmount = bookingsToCreate.reduce((sum, b) => sum + b.total_amount, 0)
                const taxAmount = selectedFacility.gst_applicable ? (baseAmount * (selectedFacility.gst_rate || 18) / 100) : 0
                const finalAmount = baseAmount + taxAmount

                const { data: invoiceData, error: invoiceError } = await supabase.from('maintenance_fees').insert({
                    unit_id: profile.unit_id,
                    amount: baseAmount,
                    tax_amount: taxAmount,
                    total_amount: finalAmount,
                    fee_type: 'facility_booking',
                    description: `Booking for ${selectedFacility.name} from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`,
                    due_date: new Date().toISOString(),
                    payment_status: 'pending'
                }).select().single()

                if (invoiceError) {
                    console.error('Error creating invoice:', invoiceError)
                    alert('Error creating booking invoice')
                    return
                }
                invoiceId = invoiceData.id
                console.log('DEBUG: Created Invoice with ID:', invoiceId)
            } else {
                console.warn('DEBUG: No unit_id for user, skipping invoice creation. Profile:', profile)
            }

            // 2. Create Bookings with Invoice ID
            const bookingsWithInvoice = bookingsToCreate.map(b => ({
                ...b,
                invoice_id: invoiceId
            }))

            console.log('DEBUG: Creating bookings with payload:', bookingsWithInvoice)

            const { error, data: createdBookings } = await supabase.from('bookings').insert(bookingsWithInvoice).select()

            if (error) {
                console.error('DEBUG: Error creating bookings:', error)
            } else {
                console.log('DEBUG: Created bookings successfully:', createdBookings)
            }

            if (!error) {
                fetchBookings()
                setIsBookingOpen(false)
                setDateRange(undefined)
            } else {
                console.error(error)
                alert('Error creating booking')
                // Ideally rollback invoice here, but let's keep it simple for now
            }
            return
        }

        if (!bookingDate || !bookingSlot) return

        let endTime = ''
        let totalAmount = selectedFacility.hourly_rate

        if (selectedFacility.pricing_type === 'per_slot' && selectedFacility.slots) {
            const slot = selectedFacility.slots.find(s => s.start_time === bookingSlot)
            if (slot) {
                endTime = slot.end_time
                totalAmount = slot.price
            }
        } else {
            // Hourly Booking with Duration
            endTime = format(addHours(parseISO(`2000-01-01T${bookingSlot}`), selectedDuration), 'HH:mm')
            totalAmount = selectedFacility.hourly_rate * selectedDuration
        }

        // Apply Per Person Multiplier
        if (selectedFacility.per_person_applicable) {
            totalAmount = totalAmount * numberOfPersons
        }

        const newBooking: Booking = {
            id: editingBookingId || 'b-' + Math.random().toString(36).substr(2, 9),
            facility_id: selectedFacility.id,
            user_id: 'current-user', // Mock
            group_id: 'g-' + Math.random().toString(36).substr(2, 9), // Individual booking is its own group effectively
            date: format(bookingDate, 'yyyy-MM-dd'),
            start_time: bookingSlot,
            end_time: endTime,
            status: 'confirmed',
            total_amount: totalAmount,
            number_of_persons: selectedFacility.per_person_applicable ? numberOfPersons : 1,
            created_at: new Date().toISOString(),
            facility: selectedFacility,
            user: { full_name: profile?.full_name || 'You', unit_number: profile?.unit_number || 'My Unit' }
        }

        // Mock Booking Notification
        if (editingBookingId) {
            alert(`Edit Request Submitted! Waiting for Admin Approval.`)
        } else {
            alert(`Booking Confirmed! Notification sent to ${profile?.email || 'user'}.`)
        }

        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {

            if (editingBookingId) {
                // Create Mock Modification Request
                const modRequest: BookingModification = {
                    id: 'bm-' + Math.random().toString(36).substr(2, 9),
                    booking_id: editingBookingId,
                    new_date: newBooking.date,
                    new_start_time: newBooking.start_time,
                    new_end_time: newBooking.end_time,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    booking: { ...newBooking, facility: selectedFacility, user: { full_name: profile?.full_name || 'You', unit_number: profile?.unit_number || 'My Unit' } } // Mock join
                }
                const localMods = JSON.parse(localStorage.getItem('mock_modifications') || '[]')
                localStorage.setItem('mock_modifications', JSON.stringify([modRequest, ...localMods]))

                // Update status of invalid booking to modification_requested? Or just leave it as confirmed and show pending request?
                // Let's mark it modification_requested for clarity
                let matches = JSON.parse(localStorage.getItem('mock_bookings') || '[]')
                matches = matches.map((b: any) => b.id === editingBookingId ? { ...b, status: 'modification_requested' } : b)
                localStorage.setItem('mock_bookings', JSON.stringify(matches))

            } else {
                let matches = JSON.parse(localStorage.getItem('mock_bookings') || '[]')
                matches = [newBooking, ...matches]
                localStorage.setItem('mock_bookings', JSON.stringify(matches))

                // Create Mock Invoice for New Booking
                if (newBooking.status === 'confirmed' && profile?.unit_id) {
                    const baseAmount = newBooking.total_amount
                    const taxAmount = selectedFacility.gst_applicable ? (baseAmount * (selectedFacility.gst_rate || 18) / 100) : 0
                    const finalAmount = baseAmount + taxAmount

                    const mockInvoice = {
                        id: 'mf-' + Math.random().toString(36).substr(2, 9),
                        unit_id: profile.unit_id,
                        amount: baseAmount,
                        tax_amount: taxAmount,
                        total_amount: finalAmount,
                        fee_type: 'facility_booking',
                        description: `Booking for ${selectedFacility.name} on ${newBooking.date} (${newBooking.start_time})`,
                        due_date: new Date().toISOString(),
                        payment_status: 'pending',
                        created_at: new Date().toISOString(),
                        units: { unit_number: profile.unit_number || 'Mock Unit', unit_type: 'flat' }
                    }
                    const localFees = JSON.parse(localStorage.getItem('mock_maintenance_fees') || '[]')
                    localStorage.setItem('mock_maintenance_fees', JSON.stringify([mockInvoice, ...localFees]))
                }
            }

            fetchBookings()
            setIsBookingOpen(false)
            setBookingSlot(null)
            setEditingBookingId(null)
            return
        }

        // Real booking logic
        let error;
        if (editingBookingId) {
            // Create Modification Request
            const { error: modError } = await supabase.from('booking_modifications').insert({
                booking_id: editingBookingId,
                new_date: newBooking.date,
                new_start_time: newBooking.start_time,
                new_end_time: newBooking.end_time,
                status: 'pending'
            })
            if (!modError) {
                await supabase.from('bookings').update({ status: 'modification_requested' }).eq('id', editingBookingId)
            }
            error = modError
        } else {
            const { error: insertError } = await supabase.from('bookings').insert(newBooking)
            error = insertError
        }

        if (!error) {
            // Auto-Invoice Generation
            if (newBooking.status === 'confirmed' && !editingBookingId) {
                if (profile?.unit_id) {
                    const baseAmount = newBooking.total_amount
                    const taxAmount = selectedFacility.gst_applicable ? (baseAmount * (selectedFacility.gst_rate || 18) / 100) : 0
                    const finalAmount = baseAmount + taxAmount

                    const { error: invoiceError } = await supabase.from('maintenance_fees').insert({
                        unit_id: profile.unit_id,
                        amount: baseAmount,
                        tax_amount: taxAmount,
                        total_amount: finalAmount,
                        fee_type: 'facility_booking',
                        description: `Booking for ${selectedFacility.name} on ${newBooking.date} (${newBooking.start_time})`,
                        due_date: new Date().toISOString(),
                        payment_status: 'pending'
                    })
                    if (invoiceError) {
                        console.error('Invoice generation failed:', invoiceError)
                    }
                }
            }

            fetchBookings()
            setIsBookingOpen(false)
            setBookingSlot(null)
            setEditingBookingId(null)
        } else {
            alert('Error processing booking')
        }
    }

    // Helper to generate slots
    const generateSlots = (facility: Facility) => {
        const slots: { time: string, isBooked: boolean, label?: string, price?: number }[] = []

        if (facility.pricing_type === 'day') {
            const isBooked = bookings.some(b =>
                b.facility_id === facility.id &&
                b.date === format(bookingDate || new Date(), 'yyyy-MM-dd') &&
                b.status !== 'cancelled' && b.status !== 'cancellation_requested' &&
                b.id !== editingBookingId
            )
            return [{ time: 'Full Day', isBooked, label: 'Full Day Booking', price: facility.hourly_rate }]
        }

        if (facility.pricing_type === 'per_slot' && facility.slots) {
            facility.slots.forEach(slot => {
                if (!slot.start_time) return
                const isBooked = bookings.some(b =>
                    b.facility_id === facility.id &&
                    b.date === format(bookingDate || new Date(), 'yyyy-MM-dd') &&
                    b.start_time === slot.start_time &&
                    b.status !== 'cancelled' && b.status !== 'cancellation_requested' &&
                    b.id !== editingBookingId // Allow self-edit
                )
                slots.push({ time: slot.start_time, isBooked, label: `${slot.name} (${slot.start_time} - ${slot.end_time})`, price: slot.price })
            })
            // Sort by time
            return slots.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
        }

        // Continuous/Split (Hourly) Logic
        const addSlots = (startStr: string, endStr: string) => {
            // Default fallback
            if (!startStr) startStr = '06:00'
            if (!endStr) endStr = '22:00'

            const startStrParts = startStr.split(':')
            const endStrParts = endStr.split(':')

            let start = parseInt(startStrParts[0])
            let end = parseInt(endStrParts[0])

            // Robust fallback if parsing fails
            if (isNaN(start)) start = 6
            if (isNaN(end)) end = 22

            for (let i = start; i < end; i++) {
                const time = `${i.toString().padStart(2, '0')}:00`
                const isBooked = bookings.some(b => {
                    if (b.facility_id !== facility.id ||
                        b.date !== format(bookingDate || new Date(), 'yyyy-MM-dd') ||
                        b.status === 'cancelled' || b.status === 'cancellation_requested' ||
                        b.id === editingBookingId) return false

                    // Overlap Check
                    return b.start_time <= time && time < b.end_time
                })
                slots.push({ time, isBooked })
            }
        }
        // Handle 'split' schedule or default to standard open/close
        if (facility.booking_rules?.schedule_type === 'split') {
            if (facility.booking_rules.morning_start && facility.booking_rules.morning_end) {
                addSlots(facility.booking_rules.morning_start, facility.booking_rules.morning_end)
            }
            if (facility.booking_rules.evening_start && facility.booking_rules.evening_end) {
                addSlots(facility.booking_rules.evening_start, facility.booking_rules.evening_end)
            }
        } else {
            // Default to facility times, or fallback to 06-22 if missing (e.g. for new facilities or data issues)
            addSlots(facility.open_time || '06:00', facility.close_time || '22:00')
        }

        return slots.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    }

    const handleAddFacility = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newFacility.name || !newFacility.hourly_rate) return

        let finalImageUrl = newFacility.image_url || ''

        if (selectedImage) {
            try {
                finalImageUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader()
                    reader.readAsDataURL(selectedImage)
                    reader.onload = () => resolve(reader.result as string)
                    reader.onerror = error => reject(error)
                })
            } catch (err) {
                console.error('Error reading file:', err)
                alert('Failed to read image file')
                return
            }
        }

        const facilityPayload: any = {
            ...newFacility,
            image_url: finalImageUrl,
            status: status,
            pricing_type: pricingType,
            per_person_applicable: newFacility.per_person_applicable,
            slots: pricingType === 'per_slot' ? facilitySlots.map(s => ({
                id: Math.random().toString(36).substr(2, 9),
                name: s.name,
                start_time: s.start,
                end_time: s.end,
                price: s.price
            })) : undefined,
            booking_rules: {
                schedule_type: scheduleType,
                morning_start: scheduleType === 'split' ? morningStart : undefined,
                morning_end: scheduleType === 'split' ? morningEnd : undefined,
                evening_start: scheduleType === 'split' ? eveningStart : undefined,
                evening_end: scheduleType === 'split' ? eveningEnd : undefined
            }
        }

        if (isEditMode && newFacility.id) {
            // Update
            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                const updated = facilities.map(f => f.id === newFacility.id ? { ...f, ...facilityPayload } : f)
                setFacilities(updated as Facility[])
                localStorage.setItem('mock_facilities', JSON.stringify(updated))
            } else {
                await supabase.from('facilities').update(facilityPayload).eq('id', newFacility.id)
                const { data } = await supabase.from('facilities').select('*').eq('is_active', true)
                if (data) setFacilities(data)
            }
            alert('Facility Updated!')
        } else {
            // Create
            const facility: Facility = {
                id: 'f-' + Date.now(),
                ...facilityPayload
            }

            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                const updated = [...facilities, facility]
                setFacilities(updated)
                localStorage.setItem('mock_facilities', JSON.stringify(updated))
            } else {
                await supabase.from('facilities').insert(facility)
                const { data } = await supabase.from('facilities').select('*').eq('is_active', true)
                if (data) setFacilities(data)
            }
            alert('Facility Created!')
        }
        setIsAddFacilityOpen(false)
        resetForm()
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Facilities</h2>
                <div className="flex gap-2">
                    {isAdmin && (
                        <Button
                            variant={(cancellationRequests.length > 0 || modificationRequests.length > 0) ? (showRequests ? "secondary" : "destructive") : "outline"}
                            onClick={() => setShowRequests(!showRequests)}
                            className={cn("relative", (cancellationRequests.length > 0 || modificationRequests.length > 0) && !showRequests && "animate-pulse")}
                        >
                            <FileText className="mr-2 h-4 w-4" />
                            {showRequests ? 'Hide Requests' : 'Requests'}
                            {(cancellationRequests.length > 0 || modificationRequests.length > 0) && (
                                <Badge variant="destructive" className="ml-2 px-1.5 h-5 min-w-5 flex items-center justify-center rounded-full">
                                    {cancellationRequests.length + modificationRequests.length}
                                </Badge>
                            )}
                        </Button>
                    )}
                    {isAdmin && (
                        <Button onClick={() => setIsAddFacilityOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Add Facility
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => {
                        if (confirm('This will reset all facility and booking data to defaults. Are you sure?')) {
                            localStorage.removeItem('mock_facilities')
                            localStorage.removeItem('mock_bookings')
                            localStorage.removeItem('mock_maintenance_fees')
                            localStorage.removeItem('mock_modifications')
                            localStorage.removeItem('mock_cancellations')
                            window.location.reload()
                        }
                    }}>
                        Reset Data
                    </Button>
                </div>
            </div>

            {/* Admin Alert Banner */}
            {isAdmin && (cancellationRequests.length > 0 || modificationRequests.length > 0) && !showRequests && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded shadow-sm flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                        <div>
                            <p className="text-sm font-medium text-red-800">
                                Action Required
                            </p>
                            <p className="text-sm text-red-700">
                                You have {cancellationRequests.length + modificationRequests.length} pending request(s) waiting for approval.
                            </p>
                        </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => setShowRequests(true)}>View Requests</Button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b">
                <button
                    className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", activeTab === 'browse' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                    onClick={() => setActiveTab('browse')}
                >
                    Browse Facilities
                </button>
                <button
                    className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", activeTab === 'my_bookings' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                    onClick={() => setActiveTab('my_bookings')}
                >
                    My Bookings
                </button>
            </div>

            {/* Admin Cancellation & Modification Requests View */}
            {
                isAdmin && showRequests && (
                    <div className="space-y-6">
                        {cancellationRequests.length > 0 && (
                            <Card className="bg-destructive/10 border-destructive">
                                <CardHeader>
                                    <CardTitle className="text-lg text-destructive">Cancellation Requests</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {Object.values(cancellationRequests.reduce((acc, req) => {
                                        const key = req.booking?.group_id || req.booking_id
                                        if (!acc[key]) acc[key] = []
                                        acc[key].push(req)
                                        return acc
                                    }, {} as Record<string, BookingCancellation[]>)).map(group => {
                                        const req = group[0]
                                        const isRange = group.length > 1

                                        return (
                                            <div key={req.id} className="flex justify-between items-center bg-background p-3 rounded shadow-sm">
                                                <div>
                                                    <div className="font-semibold">{req.booking?.facility?.name} {isRange ? `(${group.length} bookings)` : ''}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        User: {req.booking?.user && (req.booking.user as any).full_name} | Date: {req.booking?.date} {isRange ? '(and series)' : ''}
                                                    </div>
                                                    <div className="text-sm italic">Reason: "{req.request_reason}"</div>
                                                </div>
                                                <Button size="sm" onClick={() => { setSelectedRequest(req); setIsAdminActionOpen(true) }}>Review</Button>
                                            </div>
                                        )
                                    })}
                                </CardContent>
                            </Card>
                        )}

                        {modificationRequests.length > 0 && (
                            <Card className="bg-blue-50 border-blue-200">
                                <CardHeader>
                                    <CardTitle className="text-lg text-blue-800">Modification Requests</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {modificationRequests.map(req => (
                                        <div key={req.id} className="flex justify-between items-center bg-background p-3 rounded shadow-sm">
                                            <div>
                                                <div className="font-semibold">{req.booking?.facility?.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    User: {req.booking?.user && (req.booking.user as any).full_name}
                                                </div>
                                                <div className="text-sm">
                                                    <span className="text-red-500 line-through mr-2">{req.booking?.date} {req.booking?.start_time}</span>
                                                    <span className="text-green-600 font-bold">&rarr; {req.new_date} {req.new_start_time}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => handleProcessModification(req, 'rejected')}>Reject</Button>
                                                <Button size="sm" onClick={() => handleProcessModification(req, 'approved')}>Approve</Button>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )
            }

            {/* Facilities List Tab */}
            {
                activeTab === 'browse' && (
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1 grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                            {facilities.map(facility => (
                                <Card key={facility.id} className="overflow-hidden flex flex-col">
                                    <div className="h-48 w-full relative">
                                        <img src={facility.image_url} alt={facility.name} className="w-full h-full object-cover" />
                                        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                                            <div className="bg-background/80 backdrop-blur px-2 py-1 rounded text-xs font-semibold flex items-center shadow-sm">
                                                <IndianRupee className="w-3 h-3 mr-1" />
                                                {facility.pricing_type === 'per_slot'
                                                    ? 'Per Slot'
                                                    : facility.pricing_type === 'day' ? 'Per Day'
                                                        : `${facility.hourly_rate}/hr`
                                                }
                                            </div>
                                            <div className={cn("px-2 py-1 rounded text-xs font-semibold text-white shadow-sm",
                                                facility.status === 'Available' ? 'bg-green-600' :
                                                    facility.status === 'Maintenance' ? 'bg-orange-600' : 'bg-red-600'
                                            )}>
                                                {facility.status || 'Available'}
                                            </div>
                                        </div>
                                    </div >
                                    <CardHeader className="p-4 relative">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-lg">{facility.name}</CardTitle>
                                            {isAdmin && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2" onClick={() => openEditDialog(facility)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <CardDescription className="line-clamp-2">{facility.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 mt-auto">
                                        <div className="flex items-center text-xs text-muted-foreground mb-4 gap-4">
                                            <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {facility.open_time} - {facility.close_time}</span>
                                            <span className="flex items-center"><User className="w-3 h-3 mr-1" /> Cap: {facility.capacity}</span>
                                        </div>
                                        <Button className="w-full" onClick={() => { setSelectedFacility(facility); setIsBookingOpen(true) }}>
                                            Book Now
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* My Bookings Tab */}
            {
                activeTab === 'my_bookings' && (
                    <div className="border-t pt-2">
                        {bookings.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg">No bookings found.</div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {Object.values(bookings.reduce((acc, booking) => {
                                    // Group by group_id if present, else by id
                                    const key = booking.group_id || booking.id
                                    if (!acc[key]) acc[key] = []
                                    acc[key].push(booking)
                                    return acc
                                }, {} as Record<string, Booking[]>)).map(group => {
                                    const booking = group[0] // Representative booking
                                    // Sort group by date
                                    const sortedGroup = group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                    const startDate = sortedGroup[0].date
                                    const endDate = sortedGroup[sortedGroup.length - 1].date
                                    const isRange = group.length > 1

                                    // Check if ANY in group are confirmed/cancelled to determine status display?
                                    // Usually they align, but let's take the first one's status.

                                    return (
                                        <Card key={booking.id} className="border-l-4 border-l-primary">
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-semibold">{booking.facility?.name}</h3>
                                                    <Badge variant={booking.status === 'confirmed' ? 'default' : 'destructive'}>{booking.status}</Badge>
                                                </div>
                                                <div className="space-y-1 text-sm text-muted-foreground">
                                                    <div className="flex items-center">
                                                        <CalIcon className="w-3 h-3 mr-2" />
                                                        {isRange
                                                            ? `${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d, yyyy')}`
                                                            : format(new Date(booking.date), 'MMM d, yyyy')
                                                        }
                                                    </div>
                                                    <div className="flex items-center">
                                                        <Clock className="w-3 h-3 mr-2" />
                                                        {isRange ? `Daily (${group.length} Days)` : `${booking.start_time} - ${booking.end_time}`}
                                                    </div>
                                                    {profile?.role !== 'resident' && booking.user && (
                                                        <div className="flex items-center pt-2 border-t mt-2 text-foreground">
                                                            <User className="w-3 h-3 mr-2" /> {booking.user.full_name} ({booking.user.unit_number})
                                                        </div>
                                                    )}
                                                    {booking.status === 'confirmed' && (
                                                        <div className="flex gap-2 mt-2">
                                                            {!isRange && (
                                                                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditBooking(booking)}>
                                                                    Edit
                                                                </Button>
                                                            )}
                                                            <Button variant="outline" size="sm" className="flex-1 border-destructive text-destructive hover:bg-destructive/10" onClick={() => {
                                                                setSelectedBookingForCancel(booking) // Will use group_id from this booking to find others
                                                                setIsCancelDialogOpen(true)
                                                            }}>
                                                                Cancel {isRange ? 'Series' : ''}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            }

            {/* Booking Dialog */}
            <Dialog open={isBookingOpen} onOpenChange={(open) => { setIsBookingOpen(open); if (!open) { setEditingBookingId(null); setSelectedDuration(1); } }}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editingBookingId ? 'Edit Booking' : 'Book'} {selectedFacility?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="bg-muted/20 p-4 rounded-lg flex justify-center">
                            {selectedFacility?.pricing_type === 'day' ? (
                                <Calendar
                                    mode="range"
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    className="rounded-md border bg-background"
                                    numberOfMonths={2}
                                    disabled={(date) => {
                                        // Disable past dates
                                        if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;

                                        // Disable booked dates
                                        const dateStr = format(date, 'yyyy-MM-dd')
                                        return bookings.some(b =>
                                            b.facility_id === selectedFacility.id &&
                                            b.status === 'confirmed' &&
                                            b.date === dateStr
                                        )
                                    }}
                                />
                            ) : (
                                <Calendar
                                    mode="single"
                                    selected={bookingDate}
                                    onSelect={setBookingDate}
                                    className="rounded-md border bg-background"
                                    disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                                />
                            )}
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm">Available Slots for {bookingDate ? format(bookingDate, 'MMM d, yyyy') : ''}</h3>

                            {/* Duration Selection (Always Visible for Hourly or Default) */}
                            {selectedFacility?.pricing_type !== 'day' && selectedFacility?.pricing_type !== 'per_slot' && (
                                <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium w-24">Duration:</span>
                                    <select
                                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={selectedDuration}
                                        onChange={(e) => setSelectedDuration(parseInt(e.target.value))}
                                    >
                                        {[1, 2, 3, 4, 5, 6].map(h => (
                                            <option key={h} value={h}>{h} Hour{h > 1 ? 's' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2">
                                {selectedFacility && (
                                    (() => {
                                        const slots = generateSlots(selectedFacility);
                                        if (slots.length === 0) {
                                            return <div className="col-span-3 text-center text-muted-foreground py-8">No slots available for this date.</div>
                                        }

                                        if (selectedFacility.pricing_type === 'day' && dateRange?.from) {
                                            // Show range summary instead of slots
                                            const days = dateRange.to ? (differenceInDays(dateRange.to, dateRange.from) + 1) : 1
                                            return (
                                                <div className="col-span-3 bg-muted p-4 rounded-lg text-center space-y-2">
                                                    <div className="font-semibold">Selected Dates</div>
                                                    <div>{format(dateRange.from, 'MMM d')} {dateRange.to ? `- ${format(dateRange.to, 'MMM d, yyyy')}` : ''}</div>
                                                    <div className="text-sm text-muted-foreground">{days} Day{days > 1 ? 's' : ''}</div>
                                                    <div className="font-bold text-primary mt-2">Total: ₹{selectedFacility.hourly_rate * days}</div>
                                                </div>
                                            )
                                        }

                                        return slots.map(({ time, isBooked, label, price }) => (
                                            <Button
                                                key={time}
                                                variant={bookingSlot === time ? "default" : isBooked ? "secondary" : "outline"}
                                                disabled={isBooked}
                                                onClick={() => setBookingSlot(time)}
                                                className={cn(isBooked && "opacity-50 dashed border-muted-foreground/30", "h-auto py-2 flex flex-col items-center")}
                                            >
                                                <span>{label || time}</span>
                                                {price !== undefined && <span className="text-xs opacity-80">₹{price}</span>}
                                            </Button>
                                        ))
                                    })()
                                )}
                            </div>

                            {(bookingSlot || (selectedFacility?.pricing_type === 'day' && dateRange?.from)) && (
                                <div className="bg-muted p-3 rounded-md text-sm space-y-2 mt-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center">
                                        <span>Selected Time:</span>
                                        <span className="font-semibold text-base">{bookingSlot}</span>
                                    </div>

                                    {selectedFacility?.pricing_type === 'hourly' && (
                                        <div className="flex justify-between items-center text-muted-foreground text-xs">
                                            <span>End Time:</span>
                                            <span>{format(addHours(parseISO(`2000-01-01T${bookingSlot}`), selectedDuration), 'HH:mm')}</span>
                                        </div>
                                    )}

                                    {selectedFacility?.per_person_applicable && (
                                        <div className="space-y-2 mt-4 pt-4 border-t">
                                            <label className="text-sm font-medium">Number of Persons</label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={numberOfPersons}
                                                onChange={(e) => setNumberOfPersons(Math.max(1, parseInt(e.target.value) || 1))}
                                            />
                                        </div>
                                    )}

                                    <div className="flex justify-between pt-2 border-t mt-4">
                                        <span>Total Amount:</span>
                                        <span className="font-bold flex items-center text-primary text-lg">
                                            <IndianRupee className="w-4 h-4" />
                                            {(() => {
                                                let base = selectedFacility?.pricing_type === 'per_slot'
                                                    ? (selectedFacility.slots?.find(s => s.start_time === bookingSlot)?.price || 0)
                                                    : (selectedFacility?.pricing_type === 'day' && dateRange?.from
                                                        ? (selectedFacility.hourly_rate * (dateRange.to ? (differenceInDays(dateRange.to, dateRange.from) + 1) : 1))
                                                        : ((selectedFacility?.hourly_rate || 0) * selectedDuration));

                                                if (selectedFacility?.per_person_applicable) {
                                                    base = base * numberOfPersons;
                                                }
                                                return base.toFixed(2);
                                            })()}
                                        </span>
                                    </div>
                                    {selectedFacility?.gst_applicable && (
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>GST ({selectedFacility.gst_rate || 18}%):</span>
                                            <span>
                                                ₹{(() => {
                                                    let base = selectedFacility?.pricing_type === 'per_slot'
                                                        ? (selectedFacility.slots?.find(s => s.start_time === bookingSlot)?.price || 0)
                                                        : (selectedFacility?.pricing_type === 'day' && dateRange?.from
                                                            ? (selectedFacility.hourly_rate * (dateRange.to ? (differenceInDays(dateRange.to, dateRange.from) + 1) : 1))
                                                            : ((selectedFacility.hourly_rate || 0) * selectedDuration));

                                                    if (selectedFacility?.per_person_applicable) {
                                                        base = base * numberOfPersons;
                                                    }
                                                    return (base * (selectedFacility.gst_rate || 18) / 100).toFixed(2)
                                                })()}
                                            </span>
                                        </div>
                                    )}
                                    {selectedFacility?.gst_applicable && (
                                        <div className="flex justify-between font-bold border-t pt-1">
                                            <span>Grand Total:</span>
                                            <span>
                                                ₹{(() => {
                                                    let base = selectedFacility?.pricing_type === 'per_slot'
                                                        ? (selectedFacility.slots?.find(s => s.start_time === bookingSlot)?.price || 0)
                                                        : (selectedFacility?.pricing_type === 'day' && dateRange?.from
                                                            ? (selectedFacility.hourly_rate * (dateRange.to ? (differenceInDays(dateRange.to, dateRange.from) + 1) : 1))
                                                            : ((selectedFacility.hourly_rate || 0) * selectedDuration));

                                                    if (selectedFacility?.per_person_applicable) {
                                                        base = base * numberOfPersons;
                                                    }
                                                    return (base * (1 + (selectedFacility.gst_rate || 18) / 100)).toFixed(2)
                                                })()}
                                            </span>
                                        </div>
                                    )}
                                    <Button className="w-full mt-2" onClick={handleBookSlot}>{editingBookingId ? 'Update Booking' : 'Confirm Booking'}</Button>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Cancellation Dialog Box */}
            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Booking</DialogTitle>
                        <CardDescription>Are you sure you want to cancel this booking? This requires admin approval.</CardDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reason for Cancellation</label>
                            <Input
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="e.g. Change of plans"
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsCancelDialogOpen(false)}>Close</Button>
                            <Button variant="destructive" onClick={handleRequestCancellation} disabled={!cancelReason}>Confirm Cancellation</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Admin Action Dialog for Requests */}
            <Dialog open={isAdminActionOpen} onOpenChange={setIsAdminActionOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Review Request</DialogTitle>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-4">
                            <div className="bg-muted p-3 rounded text-sm">
                                <div className="font-semibold">{selectedRequest.booking?.facility?.name}</div>
                                <div>User: {selectedRequest.booking?.user && (selectedRequest.booking.user as any).full_name}</div>
                                <div>Date: {selectedRequest.booking?.date}</div>
                                {/* Debug: {JSON.stringify(selectedRequest.booking)} */}
                                <div className="mt-2 text-muted-foreground">Reason: "{selectedRequest.request_reason}"</div>
                                {invoiceDetails && (
                                    <div className="mt-2 pt-2 border-t border-border/50 flex justify-between">
                                        <span>Invoice: #{invoiceDetails.number}</span>
                                        <span>₹{invoiceDetails.amount}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Cancellation/Modification Penalty (₹)</label>
                                <Input
                                    type="number"
                                    value={adminCharges}
                                    onChange={(e) => setAdminCharges(Number(e.target.value))}
                                    placeholder="0.00"
                                />
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="apply_gst"
                                        checked={applyPenaltyGst}
                                        onChange={e => setApplyPenaltyGst(e.target.checked)}
                                        className="h-4 w-4 accent-primary"
                                    />
                                    <label htmlFor="apply_gst" className="text-sm cursor-pointer">
                                        Apply GST (18%)?
                                    </label>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="cancel_invoice"
                                        checked={cancelOriginalInvoice}
                                        onChange={e => setCancelOriginalInvoice(e.target.checked)}
                                        className="h-4 w-4 accent-primary"
                                    />
                                    <label htmlFor="cancel_invoice" className="text-sm cursor-pointer">
                                        Cancel linked invoice? (Uncheck if invoice should remain valid)
                                    </label>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">If checked, original invoice will be cancelled. New invoice will be raised for penalty.</p>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => handleProcessCancellation('rejected')}>Reject Request</Button>
                                <Button onClick={() => handleProcessCancellation('approved')}>Approve & Process</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Add/Edit Facility Dialog */}
            <Dialog open={isAddFacilityOpen} onOpenChange={(open) => { setIsAddFacilityOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Edit Facility' : 'Add New Facility'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddFacility} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input required value={newFacility.name} onChange={e => setNewFacility({ ...newFacility, name: e.target.value })} placeholder="e.g. Badminton Court" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input required value={newFacility.description} onChange={e => setNewFacility({ ...newFacility, description: e.target.value })} placeholder="Facility details..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    {pricingType === 'day' ? 'Daily Rate' : pricingType === 'per_slot' ? 'Base Rate (Optional)' : 'Hourly Rate'}
                                </label>
                                <Input type="number" required={pricingType !== 'per_slot'} value={newFacility.hourly_rate} onChange={e => setNewFacility({ ...newFacility, hourly_rate: parseInt(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Capacity</label>
                                <Input type="number" required value={newFacility.capacity} onChange={e => setNewFacility({ ...newFacility, capacity: parseInt(e.target.value) })} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 border p-3 rounded-md">
                            <input
                                type="checkbox"
                                id="per_person"
                                className="accent-primary h-4 w-4"
                                checked={newFacility.per_person_applicable || false}
                                onChange={e => setNewFacility({ ...newFacility, per_person_applicable: e.target.checked })}
                            />
                            <label htmlFor="per_person" className="text-sm font-medium cursor-pointer">Per Person Pricing? (Rate will be multiplied by persons)</label>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                            >
                                <option value="Available">Available</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Closed">Closed</option>
                            </select>
                        </div>

                        {/* Pricing Type Selection */}
                        <div className="space-y-3 border p-3 rounded-md">
                            <label className="text-sm font-medium">Pricing Model</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="radio" className="accent-primary" checked={pricingType === 'hourly'} onChange={() => setPricingType('hourly')} />
                                    Hourly
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="radio" className="accent-primary" checked={pricingType === 'per_slot'} onChange={() => setPricingType('per_slot')} />
                                    Per Slot (Shifts)
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="radio" className="accent-primary" checked={pricingType === 'day'} onChange={() => setPricingType('day')} />
                                    Per Day
                                </label>
                            </div>

                            {/* Slot Configuration */}
                            {pricingType === 'per_slot' && (
                                <div className="space-y-2 mt-2">
                                    <div className="text-xs font-semibold">Defined Slots</div>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {facilitySlots.map((slot, idx) => (
                                            <div key={idx} className="flex gap-2 items-center bg-muted p-2 rounded text-xs">
                                                <div className="flex-1">
                                                    <div>{slot.name}</div>
                                                    <div className="text-muted-foreground">{slot.start} - {slot.end}</div>
                                                </div>
                                                <div className="font-semibold">₹{slot.price}</div>
                                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFacilitySlots(facilitySlots.filter((_, i) => i !== idx))}>
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input placeholder="Name (e.g. Morning)" value={newSlot.name} onChange={e => setNewSlot({ ...newSlot, name: e.target.value })} className="h-8 text-xs col-span-2" />
                                        <Input type="time" value={newSlot.start} onChange={e => setNewSlot({ ...newSlot, start: e.target.value })} className="h-8 text-xs" />
                                        <Input type="time" value={newSlot.end} onChange={e => setNewSlot({ ...newSlot, end: e.target.value })} className="h-8 text-xs" />
                                        <Input type="number" placeholder="Price" value={newSlot.price || ''} onChange={e => setNewSlot({ ...newSlot, price: parseInt(e.target.value) })} className="h-8 text-xs" />
                                        <Button type="button" size="sm" className="h-8 text-xs"
                                            onClick={() => {
                                                if (newSlot.name && newSlot.start && newSlot.end && newSlot.price) {
                                                    setFacilitySlots([...facilitySlots, newSlot])
                                                    setNewSlot({ name: '', start: '', end: '', price: 0 })
                                                }
                                            }}>
                                            Add Slot
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {pricingType === 'hourly' && (
                            <div className="space-y-3 border p-3 rounded-md">
                                <label className="text-sm font-medium">Schedule Type</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input type="radio" className="accent-primary" checked={scheduleType === 'continuous'} onChange={() => setScheduleType('continuous')} />
                                        Continuous
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input type="radio" className="accent-primary" checked={scheduleType === 'split'} onChange={() => setScheduleType('split')} />
                                        Split (Morning/Evening)
                                    </label>
                                </div>

                                {scheduleType === 'continuous' ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Open Time</label>
                                            <Input type="time" required value={newFacility.open_time} onChange={e => setNewFacility({ ...newFacility, open_time: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Close Time</label>
                                            <Input type="time" required value={newFacility.close_time} onChange={e => setNewFacility({ ...newFacility, close_time: e.target.value })} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium">Morning Start</label>
                                                <Input type="time" value={morningStart} onChange={e => setMorningStart(e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium">Morning End</label>
                                                <Input type="time" value={morningEnd} onChange={e => setMorningEnd(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium">Evening Start</label>
                                                <Input type="time" value={eveningStart} onChange={e => setEveningStart(e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium">Evening End</label>
                                                <Input type="time" value={eveningEnd} onChange={e => setEveningEnd(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Image</label>
                            <div className="flex gap-2">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    className="cursor-pointer"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) setSelectedImage(file)
                                    }}
                                />
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Or assume default URL:</div>
                            <Input value={newFacility.image_url} readOnly className="text-muted-foreground bg-muted cursor-not-allowed" />
                            <div className="text-xs text-muted-foreground mt-1">Or assume default URL:</div>
                            <Input value={newFacility.image_url} readOnly className="text-muted-foreground bg-muted cursor-not-allowed" />
                        </div>

                        {/* GST Configuration */}
                        <div className="space-y-3 border p-3 rounded-md">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="gst_app"
                                    className="accent-primary h-4 w-4"
                                    checked={newFacility.gst_applicable || false}
                                    onChange={e => setNewFacility({ ...newFacility, gst_applicable: e.target.checked })}
                                />
                                <label htmlFor="gst_app" className="text-sm font-medium cursor-pointer">GST Applicable?</label>
                            </div>

                            {newFacility.gst_applicable && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">GST Rate (%)</label>
                                        <Input
                                            type="number"
                                            value={newFacility.gst_rate || 18}
                                            onChange={e => setNewFacility({ ...newFacility, gst_rate: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">SAC/HSN Code</label>
                                        <Input
                                            value={newFacility.sac_code || ''}
                                            onChange={e => setNewFacility({ ...newFacility, sac_code: e.target.value })}
                                            placeholder="e.g. 9963"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <Button type="submit" className="w-full">{isEditMode ? 'Update Facility' : 'Create Facility'}</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div >
    )
}
