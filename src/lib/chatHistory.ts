import { supabase } from './supabase'

export interface Session {
  id: string
  user_id: string | null
  mode: string
  provider: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking: string | null
  created_at: string
}

// Get or create a session ID stored in localStorage
export function getLocalSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = localStorage.getItem('codethinker_session_id')
  if (!sid) {
    sid = crypto.randomUUID()
    localStorage.setItem('codethinker_session_id', sid)
  }
  return sid
}

export function clearLocalSessionId() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('codethinker_session_id')
  }
}

// Ensure a session row exists in Supabase; creates it if not present
export async function ensureSession(
  sessionId: string,
  mode: string,
  provider: string
): Promise<boolean> {
  if (!sessionId) return false
  try {
    // Upsert — if exists, just updates updated_at; if not, creates
    const { error } = await supabase
      .from('sessions')
      .upsert(
        { id: sessionId, mode, provider, updated_at: new Date().toISOString() },
        { onConflict: 'id', ignoreDuplicates: false }
      )
    return !error
  } catch {
    return false
  }
}

// Auto-generate a title from first user message (truncate to 60 chars)
export async function setSessionTitle(sessionId: string, firstMessage: string) {
  if (!sessionId) return
  const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? '…' : '')
  try {
    await supabase.from('sessions').update({ title }).eq('id', sessionId)
  } catch { /* non-critical */ }
}

// Save a single message
export async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  thinking?: string
): Promise<void> {
  if (!sessionId || !content.trim()) return
  try {
    await supabase.from('messages').insert({
      session_id: sessionId,
      role,
      content,
      thinking: thinking || null,
    })
    // Bump session updated_at
    await supabase
      .from('sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)
  } catch { /* non-critical */ }
}

// Load recent sessions for sidebar (last 20)
export async function loadSessions(): Promise<Session[]> {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(20)
    if (error) return []
    return (data as Session[]) || []
  } catch {
    return []
  }
}

// Load all messages for a session
export async function loadMessages(sessionId: string): Promise<Message[]> {
  if (!sessionId) return []
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    if (error) return []
    return (data as Message[]) || []
  } catch {
    return []
  }
}
