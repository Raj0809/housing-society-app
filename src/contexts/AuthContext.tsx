"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { User as UserProfile } from '@/types'

interface AuthContextType {
    user: User | null
    profile: UserProfile | null
    session: Session | null
    isLoading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Mock Auth for Preview if using placeholder keys OR missing keys
        const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!sbUrl || sbUrl.includes('placeholder')) {
            const mockUser: User = {
                id: 'mock-user-id',
                app_metadata: {},
                user_metadata: { full_name: 'Preview User' },
                aud: 'authenticated',
                created_at: new Date().toISOString()
            } as User

            setUser(mockUser)
            setSession({ user: mockUser, access_token: 'mock-token' } as Session)
            setProfile({
                id: 'mock-user-id',
                email: 'preview@example.com',
                full_name: 'Preview User',
                role: 'app_admin',
                is_active: true,
                unit_id: 'mock-unit-id',
                unit_number: 'A-101',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            setIsLoading(false)
            return
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchProfile(session.user.id)
            } else {
                setIsLoading(false)
            }
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchProfile(session.user.id)
            } else {
                setProfile(null)
                setIsLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchProfile = async (userId: string) => {
        try {
            const { data: userConfig, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                console.error('Error fetching profile:', error)
            } else {
                // Fetch Unit ID
                const { data: unitData } = await supabase
                    .from('units')
                    .select('id, unit_number')
                    .eq('owner_id', userId)
                    .single()

                const fullProfile = {
                    ...userConfig,
                    unit_id: unitData?.id,
                    unit_number: unitData?.unit_number
                }

                setProfile(fullProfile as UserProfile)
            }
        } catch (error) {
            console.error('Error in fetchProfile:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setProfile(null)
    }

    return (
        <AuthContext.Provider value={{ user, session, profile, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
