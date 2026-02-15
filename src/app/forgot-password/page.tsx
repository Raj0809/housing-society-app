"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Mail, Phone, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const loginIdentifier = email.trim()
        const isPhone = /^\d{10}$/.test(loginIdentifier)

        if (isPhone) {
            setLoading(false)
            setMessage({
                type: 'error',
                text: 'For security reasons, phone-based accounts must contact the Society Admin to reset passwords.'
            })
            return
        }

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(loginIdentifier, {
                // Ensure this URL is whitelisted in Supabase Authentication -> URL Configuration -> Redirect URLs
                redirectTo: `${window.location.protocol}//${window.location.host}/dashboard/profile`,
            })

            if (error) throw error

            setMessage({
                type: 'success',
                text: 'If an account exists for this email, you will receive a password reset link shortly.'
            })
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.message
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
                    <CardDescription>
                        Enter your email address to receive a reset link.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleReset}>
                    <CardContent className="space-y-4">
                        {message && (
                            <div className={`rounded-lg p-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="text"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            <div className="flex items-start gap-3">
                                <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                                <div>
                                    <p className="font-semibold">Registered with Mobile?</p>
                                    <p className="mt-1 text-xs opacity-90">
                                        If you registered with a mobile number (e.g., 9876543210), you must contact your <strong>Society Admin</strong> to reset your password.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Reset Link
                        </Button>
                        <Link
                            href="/login"
                            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Login
                        </Link>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
