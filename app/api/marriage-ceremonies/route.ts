import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createCeremonySchema = z.object({
  marriage_service_id: z.string().uuid('Invalid service ID').optional(),
  reservation_id: z.string().uuid('Invalid reservation ID').optional(),
  ceremony_name: z.string().min(1, 'Ceremony name is required'),
  ceremony_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  ceremony_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  duration: z.string().optional(),
  payment_amount: z.string().optional(),
  payment_status: z.enum(['paid', 'unpaid']).optional(),
  notes: z.string().optional(),
  status: z.enum(['reserved', 'completed']).optional(),
}).refine(data => data.marriage_service_id || data.reservation_id, {
  message: "Either marriage_service_id or reservation_id must be provided"
})

const updateCeremonySchema = z.object({
  id: z.string().uuid('Invalid ceremony ID'),
  marriage_service_id: z.string().uuid('Invalid service ID').optional(),
  reservation_id: z.string().uuid('Invalid reservation ID').optional(),
  ceremony_name: z.string().min(1, 'Ceremony name is required'),
  ceremony_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  ceremony_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  duration: z.string().optional(),
  payment_amount: z.string().optional(),
  payment_status: z.enum(['paid', 'unpaid']).optional(),
  notes: z.string().optional(),
  status: z.enum(['reserved', 'completed']).optional(),
}).refine(data => data.marriage_service_id || data.reservation_id, {
  message: "Either marriage_service_id or reservation_id must be provided"
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const serviceId = searchParams.get('serviceId')
    const reservationId = searchParams.get('reservationId')

    if (!serviceId && !reservationId) {
      return NextResponse.json(
        { error: 'Either Service ID or Reservation ID is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('marriage_ceremonies')
      .select('*')
      .order('ceremony_date', { ascending: true })
      .order('ceremony_time', { ascending: true })

    if (serviceId) {
      query = query.eq('marriage_service_id', serviceId)
    } else if (reservationId) {
      query = query.eq('reservation_id', reservationId)
    }

    const { data: ceremonies, error } = await query

    if (error) throw error

    return NextResponse.json({ ceremonies: ceremonies || [] })
  } catch (error) {
    console.error('Error fetching marriage ceremonies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch marriage ceremonies' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createCeremonySchema.parse(body)

    const supabase = await createClient()

    // Update ceremony suggestions
    await supabase.rpc('update_ceremony_suggestion_usage', {
      p_ceremony_name: validatedData.ceremony_name
    })

    // Create ceremony record
    const ceremonyData = {
      marriage_service_id: validatedData.marriage_service_id || null,
      reservation_id: validatedData.reservation_id || null,
      ceremony_name: validatedData.ceremony_name,
      ceremony_date: validatedData.ceremony_date,
      ceremony_time: validatedData.ceremony_time,
      duration: validatedData.duration ? parseInt(validatedData.duration) : null,
      payment_amount: validatedData.payment_amount ? parseFloat(validatedData.payment_amount) : null,
      payment_status: validatedData.payment_status || 'unpaid',
      notes: validatedData.notes || null,
      status: validatedData.status || (validatedData.reservation_id ? 'reserved' : 'completed'),
    }

    const { data, error } = await supabase
      .from('marriage_ceremonies')
      .insert(ceremonyData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating marriage ceremony:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create marriage ceremony' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = updateCeremonySchema.parse(body)

    const supabase = await createClient()

    // Update ceremony suggestions
    await supabase.rpc('update_ceremony_suggestion_usage', {
      p_ceremony_name: validatedData.ceremony_name
    })

    // Update ceremony record
    const ceremonyData = {
      marriage_service_id: validatedData.marriage_service_id || null,
      reservation_id: validatedData.reservation_id || null,
      ceremony_name: validatedData.ceremony_name,
      ceremony_date: validatedData.ceremony_date,
      ceremony_time: validatedData.ceremony_time,
      duration: validatedData.duration ? parseInt(validatedData.duration) : null,
      payment_amount: validatedData.payment_amount ? parseFloat(validatedData.payment_amount) : null,
      payment_status: validatedData.payment_status || 'unpaid',
      notes: validatedData.notes || null,
      status: validatedData.status || (validatedData.reservation_id ? 'reserved' : 'completed'),
    }

    const { data, error } = await supabase
      .from('marriage_ceremonies')
      .update(ceremonyData)
      .eq('id', validatedData.id)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Marriage ceremony not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating marriage ceremony:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update marriage ceremony' },
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
        { error: 'Valid ceremony ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('marriage_ceremonies')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting marriage ceremony:', error)
    return NextResponse.json(
      { error: 'Failed to delete marriage ceremony' },
      { status: 500 }
    )
  }
}
