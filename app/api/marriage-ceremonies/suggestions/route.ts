import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get ceremony suggestions ordered by usage
    const { data: suggestions, error } = await supabase
      .rpc('get_ceremony_suggestions')

    if (error) throw error

    return NextResponse.json({ suggestions: suggestions || [] })
  } catch (error) {
    console.error('Error fetching ceremony suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ceremony suggestions' },
      { status: 500 }
    )
  }
}
