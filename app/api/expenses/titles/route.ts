import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    if (!category || category.trim() === '') {
      return NextResponse.json(
        { error: 'Category parameter is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Use the PostgreSQL function to get titles by category
    const { data, error } = await supabase
      .rpc('get_expense_titles_by_category', {
        p_category: category.trim()
      })

    if (error) {
      console.error('Error fetching expense titles:', error)
      return NextResponse.json(
        { error: 'Failed to fetch expense titles' },
        { status: 500 }
      )
    }

    // Extract titles from the result (RPC returns title and count)
    const titles = (data || []).map((item: any) => item.title).slice(0, 10) // Limit to 10 suggestions

    return NextResponse.json({ titles })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
