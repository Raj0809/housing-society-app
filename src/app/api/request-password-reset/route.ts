import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Look up the user by email
    const { data: user, error: lookupError } = await adminClient
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (lookupError || !user) {
      return NextResponse.json({ error: 'No account found with this email' }, { status: 404 })
    }

    // Check if there's already a pending request
    const { data: existingRequest } = await adminClient
      .from('password_reset_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single()

    if (existingRequest) {
      return NextResponse.json({
        success: true,
        message: 'A reset request is already pending. Please contact your admin.',
      })
    }

    // Create a new password reset request
    const { error: insertError } = await adminClient
      .from('password_reset_requests')
      .insert({
        user_id: user.id,
        status: 'pending',
      })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset request submitted successfully.',
    })
  } catch (error) {
    console.error('Error requesting password reset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
