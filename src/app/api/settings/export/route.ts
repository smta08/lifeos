import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  // Verify auth — use getUser(), not getSession()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch only this user's facts — RLS enforces the tenancy boundary
  const { data: facts, error } = await supabase
    .from('facts')
    .select('id, type, title, category, amount, currency, due_date, recurrence, status, source, metadata, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    userId: user.id,
    facts: facts ?? [],
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type':        'application/json',
      'Content-Disposition': `attachment; filename="lifeos-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
