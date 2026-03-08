import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const PRESENCE_KEY = 'breath-presence'

export function usePresence(): number | null {
  const [othersOnline, setOthersOnline] = useState<number | null>(null)

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    let sessionId = sessionStorage.getItem(PRESENCE_KEY)
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem(PRESENCE_KEY, sessionId)
    }
    const channel = supabase.channel('breath-users', {
      config: { presence: { key: sessionId } },
    })
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const total = Object.keys(state).length
        setOthersOnline(Math.max(0, total - 1))
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ breathing: true })
        }
      })
    return () => {
      channel.unsubscribe()
    }
  }, [])

  return othersOnline
}
