import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createExpenseSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  title: z.string().min(1, 'Title is required'),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Amount must be a positive number'
  }),
  payment_method: z.enum(['cash', 'upi', 'card', 'bank', 'other']),
  notes: z.string().optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
})

const updateExpenseSchema = createExpenseSchema.extend({
  id: z.string().uuid('Invalid ID format'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate the request body
    const validatedData = createExpenseSchema.parse(body)

    const supabase = await createClient()

    // Convert string values to appropriate types
    const expenseData = {
      category: validatedData.category,
      title: validatedData.title,
      amount: parseFloat(validatedData.amount),
      payment_method: validatedData.payment_method,
      notes: validatedData.notes || null,
      expense_date: validatedData.expense_date,
    }

    // Create the expense record
    const { data, error } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select()
      .single()

    if (error) {
      console.error('Error creating expense:', error)
      return NextResponse.json(
        { error: 'Failed to create expense record' },
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate the request body
    const validatedData = updateExpenseSchema.parse(body)

    const supabase = await createClient()

    // Convert string values to appropriate types
    const expenseData = {
      category: validatedData.category,
      title: validatedData.title,
      amount: parseFloat(validatedData.amount),
      payment_method: validatedData.payment_method,
      notes: validatedData.notes || null,
      expense_date: validatedData.expense_date,
    }

    // Update the expense record
    const { data, error } = await supabase
      .from('expenses')
      .update(expenseData)
      .eq('id', validatedData.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating expense:', error)
      return NextResponse.json(
        { error: 'Failed to update expense record' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json(
        { error: 'Valid expense ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting expense:', error)
      return NextResponse.json(
        { error: 'Failed to delete expense record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
