import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseVCF, validateVCFContent } from '@/lib/vcf-parser'
import type { ParsedContact } from '@/lib/vcf-parser'

interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  message: string
}

const BATCH_SIZE = 100 // Process contacts in batches for performance

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check content type
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Invalid content type. Expected multipart/form-data' },
        { status: 400 }
      )
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('vcfFile') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check file type
    if (!file.name.toLowerCase().endsWith('.vcf') &&
        !file.type.includes('application/octet-stream') &&
        !file.name.toLowerCase().includes('contact')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a .vcf file' },
        { status: 400 }
      )
    }

    // Read file content
    const content = await file.text()

    if (!content.trim()) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      )
    }

    // Validate VCF content
    if (!validateVCFContent(content)) {
      return NextResponse.json(
        { error: 'Invalid VCF file format' },
        { status: 400 }
      )
    }

    // Parse VCF content
    const parsedContacts = parseVCF(content)

    if (parsedContacts.length === 0) {
      return NextResponse.json(
        { error: 'No valid contacts found in the VCF file' },
        { status: 400 }
      )
    }

    // Import contacts to database
    const result = await importContactsToDatabase(parsedContacts)

    return NextResponse.json(result)

  } catch (error) {
    console.error('VCF import error:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Import failed: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred during import' },
      { status: 500 }
    )
  }
}

async function importContactsToDatabase(contacts: ParsedContact[]): Promise<ImportResult> {
  const supabase = await createClient()
  let imported = 0
  let skipped = 0
  const errors: string[] = []

  const totalBatches = Math.ceil(contacts.length / BATCH_SIZE)

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batchStart = batchIndex * BATCH_SIZE
    const batchEnd = Math.min((batchIndex + 1) * BATCH_SIZE, contacts.length)
    const batch = contacts.slice(batchStart, batchEnd)

    // Process each contact in the batch
    for (const contact of batch) {
      try {
        // Check if contact with same name and phone already exists
        const { data: existingContacts } = await supabase
          .from('contacts')
          .select('id')
          .eq('name', contact.name)
          .eq('phone', contact.phone)
          .limit(1)

        // Skip duplicates
        if (existingContacts && existingContacts.length > 0) {
          skipped++
          continue
        }

        // Insert new contact
        const { error } = await supabase
          .from('contacts')
          .insert([{
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            address: contact.address,
            notes: contact.notes,
          }])

        if (error) {
          throw error
        }

        imported++
      } catch (contactError) {
        console.error('Error importing contact:', contact, contactError)
        errors.push(`Failed to import contact "${contact.name}": ${contactError instanceof Error ? contactError.message : 'Unknown error'}`)
        skipped++
      }
    }

    // Add small delay between batches to avoid overwhelming the database
    if (batchIndex < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  let message = `Imported ${imported} contacts. ${skipped} contacts were skipped.`

  if (errors.length > 0) {
    message += ` ${errors.length} errors occurred during import.`
  }

  return {
    success: true,
    imported,
    skipped,
    errors,
    message,
  }
}
