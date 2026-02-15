'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { revalidatePath } from 'next/cache'

export async function resetUserPassword(userId: string, newPassword: string) {
    const supabase = await createClient()

    // 1. Verify the current user is an admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Unauthorized: Not logged in' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'app_admin' && profile.role !== 'management')) {
        return { error: 'Unauthorized: Insufficient permissions' }
    }

    // 2. Use Admin Client to update password
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
    )

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard/users')
    return { success: true }
}

export async function createUser(userData: {
    fullName: string
    email?: string
    phone: string
    role: string
    unitNumber?: string
    unitId?: string
    isActive: boolean
}) {
    const supabase = await createClient()

    // 1. Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!adminProfile || (adminProfile.role !== 'app_admin' && adminProfile.role !== 'management')) {
        return { error: 'Unauthorized' }
    }

    const supabaseAdmin = createAdminClient()

    // 2. Create Auth User
    // If no email, generate a placeholder: [phone]@society.local
    // Password default: Phone Number (User should change it later)
    const emailToUse = userData.email || `${userData.phone}@society.local`
    const passwordToUse = userData.phone // Default password is phone number

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: emailToUse,
        password: passwordToUse,
        email_confirm: true,
        user_metadata: {
            full_name: userData.fullName,
            phone: userData.phone
        }
    })

    if (createError) {
        return { error: createError.message }
    }

    if (!newUser.user) {
        return { error: 'Failed to create user' }
    }

    // 3. Update Profile (Trigger might handle simple creation, but we have extra fields like unit & phone/role)
    // The trigger 'handle_new_user' inserts basic profile. We need to update it with full details.
    // Wait for trigger or just upsert? Upsert is safer.

    // Note: The trigger inserts with default 'resident' role and null phone if not in metadata.
    // We included phone in metadata, so let's update immediately.

    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
            full_name: userData.fullName,
            phone: userData.phone,
            role: userData.role as any,
            is_active: userData.isActive,
            // We might need to handle Unit mapping here if Profiles has a unit_id or just relying on Units table owner_id?
            // Schema shows 'units' table has 'owner_id'. Profiles doesn't have 'unit_id'.
            // So we need to update the Unit table separately if a unit is selected.
        })
        .eq('id', newUser.user.id)

    if (profileError) {
        // Cleanup?
        return { error: 'User created but profile update failed: ' + profileError.message }
    }

    // 4. Assign Unit if provided
    if (userData.unitId) {
        const { error: unitError } = await supabaseAdmin
            .from('units')
            .update({ owner_id: newUser.user.id })
            .eq('id', userData.unitId)

        if (unitError) console.error('Failed to assign unit:', unitError)
    }

    revalidatePath('/dashboard/users')
    return { success: true }
}
