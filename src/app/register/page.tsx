"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Mail, Phone } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function RegisterPage() {
    const router = useRouter()
    const [regMethod, setRegMethod] = useState<'email' | 'mobile'>('email')
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        unitNumber: '',
        password: '',
        confirmPassword: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value })
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match")
            setLoading(false)
            return
        }

        try {
            let emailToRegister = formData.email
            let phoneToSave = formData.phone

            if (regMethod === 'mobile') {
                // Validate phone
                if (!/^\d{10}$/.test(formData.phone)) {
                    throw new Error("Please enter a valid 10-digit mobile number")
                }
                // Generate internal email
                emailToRegister = `${formData.phone}@society.local`
                phoneToSave = formData.phone
            } else {
                if (!formData.email) throw new Error("Please enter a valid email")
            }

            // Mock Signup for Preview
            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
                await new Promise(resolve => setTimeout(resolve, 800))
                router.push('/dashboard')
                router.refresh()
                return
            }

            const { data, error } = await supabase.auth.signUp({
                email: emailToRegister,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        phone: phoneToSave, // Save phone in metadata
                        unit_number: formData.unitNumber,
                        approval_status: 'pending',
                        role: 'resident' // Explicitly set role
                    },
                },
            })

            if (error) throw error

            router.push('/dashboard')
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-500/20 via-background to-primary/20 p-4">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

            <Card className="w-full max-w-md border-border/50 shadow-2xl backdrop-blur-xl animate-fade-in relative z-10">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-gradient-to-br from-purple-600 to-primary shadow-lg" />
                    <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
                    <CardDescription>
                        Enter your details below to create your account
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleRegister}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <Tabs defaultValue="email" value={regMethod} onValueChange={(v) => setRegMethod(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="email">Email</TabsTrigger>
                                <TabsTrigger value="mobile">Mobile Number</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="space-y-2">
                            <label htmlFor="fullName" className="text-sm font-medium leading-none">Full Name</label>
                            <input
                                id="fullName"
                                type="text"
                                placeholder="John Doe"
                                value={formData.fullName}
                                onChange={handleChange}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            />
                        </div>

                        {regMethod === 'email' ? (
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium leading-none">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    required={regMethod === 'email'}
                                />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label htmlFor="phone" className="text-sm font-medium leading-none">Mobile Number</label>
                                <input
                                    id="phone"
                                    type="tel"
                                    placeholder="9876543210"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    required={regMethod === 'mobile'}
                                />
                            </div>
                        )}

                        {regMethod === 'email' && (
                            <div className="space-y-2">
                                <label htmlFor="phone" className="text-sm font-medium leading-none">Phone Number (Optional)</label>
                                <input
                                    id="phone"
                                    type="tel"
                                    placeholder="+1 234 567 890"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="unitNumber" className="text-sm font-medium leading-none">Unit/Villa Number</label>
                            <input
                                id="unitNumber"
                                type="text"
                                placeholder="A-101"
                                value={formData.unitNumber}
                                onChange={handleChange}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium leading-none">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">Confirm Password</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button className="w-full bg-gradient-to-r from-purple-600 to-primary hover:from-purple-600/90 hover:to-primary/90" type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Account
                        </Button>
                        <p className="text-center text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
