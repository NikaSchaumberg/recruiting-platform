import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, id, className = '', ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={`block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
        } disabled:bg-gray-50 ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
)

Select.displayName = 'Select'
