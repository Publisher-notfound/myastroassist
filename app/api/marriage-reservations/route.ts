import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createReservationSchema = z.object({
  contact_id: z.string().uuid('Invalid contact ID'),
  reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  notes: z.string().optional(),
})

const updateReservationSchema = createReservationSchema.extend({
  id: z.string().uuid('Invalid reservation ID'),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let query = supabase
      .from('marriage_reservations')
      .select(`
        *,
        contacts (name, phone)
      `)
      .eq('status', 'active')
      .order('reservation_date', { ascending: true })

    if (startDate) {
      query = query.gte('reservation_date', startDate)
    }

    if (endDate) {
      query = query.lte('reservation_date', endDate)
    }

    const { data: reservations, error } = await query

    if (error) throw error

    return NextResponse.json({ reservations: reservations || [] })
  } catch (error) {
    console.error('Error fetching marriage reservations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch marriage reservations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createReservationSchema.parse(body)

    const supabase = await createClient()

    const reservationData = {
      contact_id: validatedData.contact_id,
      reservation_date: validatedData.reservation_date,
      notes: validatedData.notes || null,
      status: 'active',
    }

    const { data, error } = await supabase
      .from('marriage_reservations')
      .insert(reservationData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating marriage reservation:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create marriage reservation' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = updateReservationSchema.parse(body)

    const supabase = await createClient()

    const reservationData = {
      contact_id: validatedData.contact_id,
      reservation_date: validatedData.reservation_date,
      notes: validatedData.notes || null,
    }

    const { data, error } = await supabase
      .from('marriage_reservations')
      .update(reservationData)
      .eq('id', validatedData.id)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Marriage reservation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating marriage reservation:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update marriage reservation' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json(
        { error: 'Valid reservation ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('marriage_reservations')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting marriage reservation:', error)
    return NextResponse.json(
      { error: 'Failed to delete marriage reservation' },
      { status: 500 }
    )
  }
}
