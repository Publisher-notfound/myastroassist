export interface ParsedContact {
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
}

export class VCFParserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VCFParserError'
  }
}

export function parseVCF(vcfContent: string): ParsedContact[] {
  if (!vcfContent || typeof vcfContent !== 'string') {
    throw new VCFParserError('Invalid VCF content provided')
  }

  const contacts: ParsedContact[] = []
  const vCardSeparators = /BEGIN:VCARD\s*\n|END:VCARD\s*\n/im

  // Split content into individual vCards
  const vCardBlocks = vcfContent
    .split(vCardSeparators)
    .filter(block => block.trim() && block.includes('FN:'))
    .map(block => block.trim())

  if (vCardBlocks.length === 0) {
    throw new VCFParserError('No valid vCards found in the file')
  }

  for (let i = 0; i < vCardBlocks.length; i++) {
    try {
      const contact = parseSingleVCard(vCardBlocks[i])
      if (contact.name || contact.phone || contact.email) {
        contacts.push(contact)
      }
    } catch (error) {
      // Skip malformed vCards but continue processing others
      console.warn(`Skipping malformed vCard at index ${i}:`, error)
    }
  }

  if (contacts.length === 0) {
    throw new VCFParserError('No valid contacts found in VCF file')
  }

  return contacts
}

function parseSingleVCard(vCardContent: string): ParsedContact {
  const lines = vCardContent.split('\n').map(line => line.trim())

  let fn = '' // Full Name (preferred)
  let n = ''  // Name components (fallback if FN not available)
  let tel = ''
  let email = ''
  let adr = ''
  let note = ''

  for (const line of lines) {
    if (!line) continue

    // Handle multiline entries (though this is a simple parser)
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.substring(0, colonIndex).toUpperCase()
    const value = line.substring(colonIndex + 1).trim()

    // Remove encoding indicators and decode
    const cleanedValue = decodeVCardValue(value)

    // Parse different field types
    if (key.startsWith('FN')) { // Full Name
      fn = cleanedValue
    } else if (key.startsWith('N')) { // Name components (Last;First;Middle;Prefix;Suffix)
      n = cleanedValue
    } else if (key.startsWith('TEL')) { // Telephone
      tel = getBestPhoneNumber(tel, cleanedValue)
    } else if (key.startsWith('EMAIL')) { // Email
      email = getBestEmail(email, cleanedValue)
    } else if (key.startsWith('ADR')) { // Address
      adr = getBestAddress(adr, cleanedValue)
    } else if (key.startsWith('NOTE')) { // Notes
      note = cleanedValue
    }
  }

  // Determine the best name to use
  const name = determineName(fn, n)

  return {
    name,
    phone: tel || null,
    email: email || null,
    address: adr || null,
    notes: note || null,
  }
}

function decodeVCardValue(value: string): string {
  // Handle CHARSET and ENCODING parameters
  if (value.includes(';')) {
    // Basic decoding - remove encoding indicators
    value = value.replace(/;\w+;.*:/gi, '').replace(/^;/, '')
  }

  // Decode quoted-printable if present
  if (value.includes('=')) {
    try {
      value = decodeURIComponent(value.replace(/=/g, '%'))
    } catch {
      // If decoding fails, use original value
    }
  }

  // Remove common VCF artifacts
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\n\s+/g, '') // Handle line continuations
    .trim()
}

function determineName(fn: string, n: string): string {
  if (fn && fn !== 'null' && fn !== 'undefined') {
    return fn
  }

  if (n) {
    // Parse N field format: Last;First;Middle;Prefix;Suffix
    const parts = n.split(';')
    if (parts.length >= 2) {
      const firstName = parts[1]?.trim() || ''
      const lastName = parts[0]?.trim() || ''
      if (firstName && lastName) {
        return `${firstName} ${lastName}`.trim()
      }
      return (firstName || lastName)
    }
  }

  return 'Unknown Contact'
}

function getBestPhoneNumber(current: string, newValue: string): string {
  // Prioritize mobile/cell phones over work/home
  if (!current) return newValue

  // If we already have a mobile number, prefer that
  if (current.toLowerCase().includes('cell') ||
      current.toLowerCase().includes('mobile')) {
    return current
  }

  // If new number is mobile, prefer it
  if (newValue.toLowerCase().includes('cell') ||
      newValue.toLowerCase().includes('mobile')) {
    return newValue
  }

  // Otherwise keep the first one we found
  return current
}

function getBestEmail(current: string, newValue: string): string {
  if (!current) return newValue

  // Prefer primary/preferred emails
  if (newValue.toLowerCase().includes('pref') &&
      !current.toLowerCase().includes('pref')) {
    return newValue
  }

  // If current is already preferred, keep it
  return current.toLowerCase().includes('pref') ? current : newValue
}

function getBestAddress(current: string, newValue: string): string {
  // For addresses, just use the first one we find
  // Could be enhanced to prefer work/home etc.
  return current || newValue
}

export function validateVCFContent(content: string): boolean {
  return /^BEGIN:VCARD[\s\S]*END:VCARD/m.test(content)
}
