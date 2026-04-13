import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Exxir Recruiting Platform',
  description: 'AI-powered talent acquisition',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-cream-100 text-gray-900">{children}</body>
    </html>
  )
}
