'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster as SonnerToaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  React.useEffect(() => {
    const savedPreference = window.localStorage.getItem('shopditto-reduce-motion')
    const systemPreference = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const shouldReduceMotion = savedPreference === null
      ? systemPreference
      : savedPreference === 'true'

    if (shouldReduceMotion) {
      document.documentElement.dataset.reduceMotion = 'true'
      return
    }

    delete document.documentElement.dataset.reduceMotion
    if (window.sessionStorage.getItem('shopditto-intro-played')) return

    window.sessionStorage.setItem('shopditto-intro-played', 'true')
    document.documentElement.dataset.shopdittoIntro = 'true'
    const introTimeout = window.setTimeout(() => {
      delete document.documentElement.dataset.shopdittoIntro
    }, 7000)

    return () => window.clearTimeout(introTimeout)
  }, [])

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <SonnerToaster
          position="top-right"
          richColors
          closeButton
          theme="system"
        />
      </QueryClientProvider>
    </NextThemesProvider>
  )
}
