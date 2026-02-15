import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verify the caller is an admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: callerProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!callerProfile || !['app_admin', 'management', 'administration'].includes(callerProfile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { userId, password, resetRequestId } = await request.json()

    if (!userId || !password) {
      return NextResponse.json({ error: 'userId and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Set the user's password using admin API
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      password: password,
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Mark user as must_change_password
    const { error: dbError } = await adminClient
      .from('users')
      .update({ must_change_password: true })
      .eq('id', userId)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // If there's a reset request, mark it as approved
    if (resetRequestId) {
      await adminClient
        .from('password_reset_requests')
        .update({
          status: 'approved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', resetRequestId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
