'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { CandidateMessage } from '@/types/database'

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

const C = { caramel: '#C4A882', border: '#E8E2D8' }

interface CommunicationLogProps {
  applicationId: string
  currentUserId: string
  currentUserName: string
  initialMessages: CandidateMessage[]
}

export function CommunicationLog({
  applicationId,
  currentUserId,
  currentUserName,
  initialMessages,
}: CommunicationLogProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<CandidateMessage[]>(initialMessages)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setError(null)

    // Optimistic
    const optimistic: CandidateMessage = {
      id: `optimistic-${Date.now()}`,
      application_id: applicationId,
      sender_id: currentUserId,
      sender_name: currentUserName,
      text: trimmed,
      sent_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setText('')

    try {
      const res = await fetch(`/api/applications/${applicationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send')

      // Replace optimistic with real
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? data.message : m))
      )
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-6 py-4 border-b border-stone-100"
        style={{ background: 'linear-gradient(to right, #fdf9f4, #ffffff)' }}
      >
        <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-gray-900">Communication Log</h2>
        {messages.length > 0 && (
          <span className="ml-auto text-xs text-stone-400">{messages.length} notes</span>
        )}
      </div>

      {/* Messages */}
      <div className="px-6 py-4 space-y-3 max-h-72 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-4">No notes yet.</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ backgroundColor: isMe ? '#C4A882' : '#E8E2D8', color: isMe ? '#fff' : '#78716C' }}
                >
                  {msg.sender_name.charAt(0).toUpperCase()}
                </div>
                <div className={`flex-1 max-w-xs ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div
                    className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                    style={{
                      backgroundColor: isMe ? '#FDF6EC' : '#F5F0E8',
                      color: '#1C1917',
                      borderBottomRightRadius: isMe ? '4px' : undefined,
                      borderBottomLeftRadius: !isMe ? '4px' : undefined,
                    }}
                  >
                    {msg.text}
                  </div>
                  <p className="text-xs text-stone-400 mt-1 px-1">
                    {msg.sender_name} · {formatTime(msg.sent_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="px-6 pb-4 border-t border-stone-100 pt-3">
        <div className="flex gap-2 items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a note... (Cmd+Enter to send)"
            rows={2}
            className="flex-1 text-sm border border-stone-200 rounded-xl px-3 py-2.5 text-gray-700 focus:outline-none resize-none"
            style={{ minHeight: '60px', fontFamily: 'inherit', lineHeight: 1.5 }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50 flex-shrink-0"
            style={{ backgroundColor: !text.trim() || sending ? C.border : C.caramel }}
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
      </div>
    </div>
  )
}
