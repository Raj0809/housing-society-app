import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <main className="flex flex-col items-center gap-8 text-center p-8 max-w-2xl">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl gradient-text">
            Housing Society Manager
          </h1>
          <p className="text-lg text-muted-foreground">
            A modern platform to manage your housing society operations, residents, and finances efficiently.
          </p>
        </div>

        <div className="flex gap-4">
          <Link href="/dashboard">
            <Button size="lg" className="animate-fade-in">
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              Login
            </Button>
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3 text-sm text-left">
          <div className="p-4 rounded-lg border bg-card">
            <h3 className="font-semibold mb-2">User Management</h3>
            <p className="text-muted-foreground">Manage residents, staff, and roles with ease.</p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <h3 className="font-semibold mb-2">Notice Board</h3>
            <p className="text-muted-foreground">Keep everyone informed with digital notices.</p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <h3 className="font-semibold mb-2">Payments</h3>
            <p className="text-muted-foreground">Track maintenance and utility payments effortlessly.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
