"use client"

import { useAuth } from '@/contexts/AuthContext'
import { usePathname } from 'next/navigation'

const Header = () => {
    const { profile } = useAuth()
    const pathname = usePathname()

    const getTitle = () => {
        const segments = pathname.split('/')
        const lastSegment = segments[segments.length - 1]
        return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1) || 'Dashboard'
    }

    return (
        <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b bg-card/50 px-6 glass backdrop-blur-xl">
            <h1 className="text-xl font-semibold text-foreground">{getTitle()}</h1>

            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-foreground">{profile?.full_name || 'User'}</span>
                    <span className="text-xs text-muted-foreground capitalize">{profile?.role?.replace('_', ' ') || 'Guest'}</span>
                </div>
                <div className="h-10 w-10 overflow-hidden rounded-full bg-muted border border-border">
                    {profile?.profile_image_url ? (
                        <img src={profile.profile_image_url} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary font-bold">
                            {profile?.full_name?.charAt(0) || 'U'}
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

export default Header
