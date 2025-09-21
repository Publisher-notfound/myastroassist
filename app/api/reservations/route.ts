import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Get today's reservations for dashboard
    if (searchParams.get('today') === 'true') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: reservations, error } = await supabase
        .from("reservations")
        .select(`
          *,
          contacts (name, phone),
          service_types (name)
        `)
        .gte("reservation_date", today.toISOString())
        .lt("reservation_date", tomorrow.toISOString())
        .eq("status", "active")
        .order("reservation_time", { ascending: true })

      if (error) throw error
      return NextResponse.json({ reservations: reservations || [] })
    }

    // Get all reservations for calendar view
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0) // Last day of month

      const { data: reservations, error } = await supabase
        .from("reservations")
        .select(`
          *,
          contacts (name),
          service_types (name)
        `)
        .gte("reservation_date", startDate.toISOString().split('T')[0])
        .lte("reservation_date", endDate.toISOString().split('T')[0])
        .eq("status", "active")
        .order("reservation_date", { ascending: true })

      if (error) throw error
      return NextResponse.json({ reservations: reservations || [] })
    }

    // Default: get all active reservations
    const { data: reservations, error } = await supabase
      .from("reservations")
      .select(`
        *,
        contacts (name, phone),
        service_types (name)
      `)
      .eq("status", "active")
      .order("reservation_date", { ascending: true })
      .order("reservation_time", { ascending: true })

    if (error) throw error
    return NextResponse.json({ reservations: reservations || [] })
  } catch (error) {
    console.error("Error fetching reservations:", error)
    return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const reservationData = {
      contact_id: body.contact_id,
      service_type_id: body.service_type_id,
      reservation_date: body.reservation_date, // YYYY-MM-DD format
      reservation_time: body.reservation_time, // HH:MM format
      notes: body.notes || null,
      status: 'active'
    }

    // Check if the date is in the future
    const reservationDate = new Date(reservationData.reservation_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (reservationDate < today) {
      return NextResponse.json({ error: "Cannot create reservations for past dates" }, { status: 400 })
    }

    const { data: reservation, error } = await supabase
      .from("reservations")
      .insert([reservationData])
      .select(`
        *,
        contacts (name),
        service_types (name)
      `)
      .single()

    if (error) throw error
    return NextResponse.json({ reservation }, { status: 201 })
  } catch (error) {
    console.error("Error creating reservation:", error)
    return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { id, contact_id, service_type_id, reservation_date, reservation_time, notes } = body

    if (!id) {
      return NextResponse.json({ error: "Reservation ID required" }, { status: 400 })
    }

    const updateData: any = {
      contact_id,
      service_type_id,
      reservation_date,
      reservation_time,
      notes: notes || null,
      updated_at: new Date().toISOString()
    }

    // Check if the date is in the future (for date changes)
    const reservationDate = new Date(reservation_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (reservationDate < today) {
      return NextResponse.json({ error: "Cannot update reservations to past dates" }, { status: 400 })
    }

    const { data: reservation, error } = await supabase
      .from("reservations")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        contacts (name),
        service_types (name)
      `)
      .single()

    if (error) throw error
    return NextResponse.json({ reservation }, { status: 200 })
  } catch (error) {
    console.error("Error updating reservation:", error)
    return NextResponse.json({ error: "Failed to update reservation" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "Reservation ID required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("reservations")
      .update({ status: 'cancelled' })
      .eq("id", id)

    if (error) throw error
    return NextResponse.json({ message: "Reservation cancelled" })
  } catch (error) {
    console.error("Error cancelling reservation:", error)
    return NextResponse.json({ error: "Failed to cancel reservation" }, { status: 500 })
  }
}
