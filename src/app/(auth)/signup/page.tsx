'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signup, loginWithGoogle } from '../actions'
import { AnimatedSection } from '@/components/landing/animated-section'
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    const result = await signup(formData)
    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    } else if (result?.success) {
      setSuccess(true)
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
        <AnimatedSection className="w-full max-w-md">
          <div className="flex flex-col items-center rounded-[2rem] border border-border bg-card p-10 text-center shadow-2xl backdrop-blur-xl">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="mb-2 text-2xl font-black">Check your email</h1>
            <p className="text-muted-foreground">
              We&apos;ve sent a verification link to your email address. Click the link to verify your account and continue.
            </p>
            <Link href="/login" className="mt-8 focus-ring rounded-full bg-secondary px-6 py-3 font-bold text-secondary-foreground">
              Back to login
            </Link>
          </div>
        </AnimatedSection>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <AnimatedSection className="w-full max-w-md">
        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black tracking-tight">Create account</h1>
            <p className="mt-2 text-sm text-muted-foreground">Start your fitness journey with Kynetic.</p>
          </div>

          <form action={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="mb-2 block text-sm font-bold" htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/15 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : 'Create account'}
              {!isLoading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-bold">Or continue with</span>
            </div>
          </div>

          <form action={async () => {
            const res = await loginWithGoogle()
            if (res?.error) setError(res.error)
          }}>
            <button className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-6 py-3 font-bold transition hover:bg-muted">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Google
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </AnimatedSection>
    </main>
  )
}
