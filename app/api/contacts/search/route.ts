import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.toLowerCase().trim()

    const supabase = await createClient()

    let queryBuilder = supabase
      .from('contacts')
      .select('id, name, phone, email')
      .order('name', { ascending: true })

    // Apply search filter if query is provided
    if (query && query.length > 0) {
      queryBuilder = queryBuilder.or(
        `name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`
      )
    }

    // For large contact databases, use higher limits for complete search coverage
    // If searching, rely on database filtering for efficiency
    if (query && query.length > 0) {
      // For search queries, use higher limit to ensure comprehensive results
      queryBuilder = queryBuilder.limit(5000) // Cover up to 5k contacts
    } else {
      // For initial load, load a substantial amount for client-side search
      queryBuilder = queryBuilder.limit(2500) // Load up to 2.5k contacts for full coverage
    }

    const { data: contacts, error } = await queryBuilder

    if (error) {
      console.error('Error fetching contacts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { status: 500 }
      )
    }

    // Return all contact count for UI indication
    const { count } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      contacts: contacts || [],
      totalCount: count || 0,
      query,
    })

  } catch (error) {
    console.error('Contacts search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
