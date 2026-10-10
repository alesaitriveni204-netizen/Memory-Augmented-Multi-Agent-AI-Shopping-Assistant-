'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LoaderCircle, Sparkles } from 'lucide-react'

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password'

const COPY: Record<AuthMode, { title: string; subtitle: string; button: string }> = {
  login: { title: 'Welcome back', subtitle: 'Your shopping intelligence is ready when you are.', button: 'Sign in' },
  signup: { title: 'Build your shopping twin', subtitle: 'Create an account, then shape an assistant around how you shop.', button: 'Create account' },
  'forgot-password': { title: 'Reset your password', subtitle: 'We’ll send a one-time reset link if an account matches.', button: 'Send reset link' },
  'reset-password': { title: 'Choose a new password', subtitle: 'Use at least 10 characters and include a number.', button: 'Update password' },
}

export function AuthForm({ mode, token = '' }: { mode: AuthMode; token?: string }) {
  const router = useRouter()
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [remember, setRemember] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState('')
  const [resetUrl, setResetUrl] = React.useState('')

  const copy = COPY[mode]
  const passwordIsValid = password.length >= 10 && /[A-Za-z]/.test(password) && /[0-9]/.test(password)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (mode === 'signup' && !passwordIsValid) {
      setError('Use at least 10 characters with at least one letter and one number.')
      return
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }
    if (mode === 'reset-password' && !passwordIsValid) {
      setError('Use at least 10 characters with at least one letter and one number.')
      return
    }

    setBusy(true)
    try {
      const action = mode
      const body = mode === 'signup'
        ? { name, email, password }
        : mode === 'login'
          ? { email, password, remember }
          : mode === 'forgot-password'
            ? { email }
            : { token, password }
      const response = await fetch(`/api/auth/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Something went wrong.')

      if (mode === 'login' || mode === 'signup') {
        const next = new URLSearchParams(window.location.search).get('next')
        router.replace(next?.startsWith('/') && !next.startsWith('//') ? next : '/')
        router.refresh()
      } else if (mode === 'forgot-password') {
        setSuccess(data.message || 'Check your inbox for a reset link.')
        setResetUrl(data.developmentResetUrl || '')
      } else {
        setSuccess('Password updated. You can now sign in.')
        window.setTimeout(() => router.replace('/login'), 900)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_18%,rgba(16,185,129,0.16),transparent_42%),radial-gradient(ellipse_at_82%_78%,rgba(14,165,233,0.12),transparent_40%)]" />
      <section className="relative w-full max-w-md rounded-2xl border border-border/70 bg-card/85 p-6 shadow-2xl shadow-emerald-950/10 backdrop-blur-xl sm:p-8">
        <a href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white"><Sparkles className="h-5 w-5" /></span>
          shopDitto
        </a>
        <h1 className="text-2xl font-bold">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.subtitle}</p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === 'signup' && <Field label="Full name" type="text" value={name} onChange={setName} autoComplete="name" required />}
          {(mode === 'login' || mode === 'signup' || mode === 'forgot-password') && <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />}
          {(mode === 'login' || mode === 'signup' || mode === 'reset-password') && (
            <div>
              <label className="mb-1.5 block text-xs font-medium" htmlFor="password">Password</label>
              <div className="relative">
                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'login' ? 1 : 10} maxLength={128} className="h-11 w-full rounded-lg border border-border bg-background/70 px-3 pr-11 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
              {(mode === 'signup' || mode === 'reset-password') && <p className="mt-1.5 text-[11px] text-muted-foreground">At least 10 characters, including a letter and a number.</p>}
            </div>
          )}
          {mode === 'signup' && <div>
            <label className="mb-1.5 block text-xs font-medium" htmlFor="confirm-password">Confirm password</label>
            <input id="confirm-password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required className="h-11 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15" />
          </div>}
          {mode === 'login' && <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="accent-emerald-600" />Remember this device</label>}
          {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">{error}</p>}
          {success && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">{success}</p>}
          {resetUrl && <a href={resetUrl} className="block break-all text-xs font-medium text-emerald-700 underline dark:text-emerald-300">Open development reset link</a>}
          <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60">
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{copy.button}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {mode === 'login' && <><a className="hover:text-foreground" href="/forgot-password">Forgot password?</a><a className="hover:text-foreground" href="/signup">Create an account</a></>}
          {mode === 'signup' && <a className="hover:text-foreground" href="/login">Already have an account? Sign in</a>}
          {mode === 'forgot-password' && <a className="hover:text-foreground" href="/login">Back to sign in</a>}
          {mode === 'reset-password' && <a className="hover:text-foreground" href="/login">Back to sign in</a>}
        </div>
      </section>
    </main>
  )
}

function Field({ label, type, value, onChange, autoComplete, required }: { label: string; type: string; value: string; onChange: (value: string) => void; autoComplete: string; required: boolean }) {
  const id = label.toLowerCase().replaceAll(' ', '-')
  return <div>
    <label className="mb-1.5 block text-xs font-medium" htmlFor={id}>{label}</label>
    <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required={required} maxLength={type === 'email' ? 254 : 80} className="h-11 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15" />
  </div>
}