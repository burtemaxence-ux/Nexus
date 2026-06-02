import { Suspense } from 'react'
import { Loader2, KeyRound } from 'lucide-react'
import SetPasswordForm from './set-password-form'

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F1117] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 dark:bg-[#1A1D27] mb-4">
          <Loader2 className="h-7 w-7 text-white animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-[#F0F2F8]">Créez votre mot de passe</h1>
        <p className="text-gray-500 dark:text-[#8B90A7] mt-2 text-sm">Vérification de votre invitation…</p>
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SetPasswordForm />
    </Suspense>
  )
}
