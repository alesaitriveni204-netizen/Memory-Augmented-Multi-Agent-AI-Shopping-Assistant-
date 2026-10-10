import { AuthForm } from '@/components/auth/auth-form'

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams
  return <AuthForm mode="reset-password" token={token} />
}