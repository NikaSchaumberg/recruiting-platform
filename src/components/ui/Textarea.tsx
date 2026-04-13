import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      {hint && <p className="text-xs text-gray-500 mb-1">{hint}</p>}
      <textarea
        ref={ref}
        id={id}
        className={`block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition resize-y ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
        } disabled:bg-gray-50 ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
)

Textarea.displayName = 'Textarea'
