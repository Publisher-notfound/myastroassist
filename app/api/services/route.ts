import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createServiceSchema = z.object({
  contact_id: z.string().min(1, 'Contact ID is required'),
  service_type_id: z.string().min(1, 'Service type ID is required'),
  duration: z.string().optional(),
  payment_amount: z.string().optional(),
  payment_mode: z.enum(['cash', 'upi', 'card']).optional(),
  payment_status: z.enum(['paid', 'unpaid']).optional(),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate the request body
    const validatedData = createServiceSchema.parse(body)

    const supabase = await createClient()

    // Convert string values to appropriate types
    const serviceData = {
      contact_id: validatedData.contact_id,
      service_type_id: validatedData.service_type_id,
      duration: validatedData.duration ? parseInt(validatedData.duration) : null,
      payment_amount: validatedData.payment_amount ? parseFloat(validatedData.payment_amount) : null,
      payment_mode: validatedData.payment_mode || 'cash',
      payment_status: validatedData.payment_status || 'paid',
      notes: validatedData.notes || null,
    }

    // Create the service record
    const { data, error } = await supabase
      .from('services')
      .insert(serviceData)
      .select()
      .single()

    if (error) {
      console.error('Error creating service:', error)
      return NextResponse.json(
        { error: 'Failed to create service record' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
