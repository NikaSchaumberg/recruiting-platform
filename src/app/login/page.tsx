import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#faf6ef' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/Exxir_6Logo.svg" alt="Exxir" style={{ height: '40px', width: 'auto', display: 'block' }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1.5">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
          <Suspense fallback={<div className="h-40" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Looking for open positions?{' '}
          <a href="/careers" className="text-brand-600 hover:text-brand-700 font-medium">
            View careers page
          </a>
        </p>
      </div>
    </div>
  )
}
