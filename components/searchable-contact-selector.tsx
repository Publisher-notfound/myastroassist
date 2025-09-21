'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, X, ChevronDown, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Contact {
  id: string
  name: string
  phone: string | null
  email: string | null
}

interface SearchableContactSelectorProps {
  value?: string
  onChange: (contactId: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  contacts?: Contact[]
  selectedContact?: Contact
}

export function SearchableContactSelector({
  value,
  onChange,
  placeholder = "Search for a client...",
  disabled = false,
  className,
  contacts = [],
  selectedContact,
}: SearchableContactSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentSelectedContact, setCurrentSelectedContact] = useState<Contact | null>(null)
  const [searchResults, setSearchResults] = useState<Contact[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Initialize with selectedContact if provided (one time only)
  useEffect(() => {
    if (selectedContact && !currentSelectedContact) {
      // Only set if we haven't already initialized
      setCurrentSelectedContact(selectedContact)
      setSearchTerm(selectedContact.name)
      if (!value || value !== selectedContact.id) {
        onChange(selectedContact.id)
      }
    }
  }, [selectedContact, currentSelectedContact, value, onChange])

  // Handle value changes from parent (like when lookup succeeds)
  useEffect(() => {
    if (!selectedContact && value && contacts.length > 0 && !currentSelectedContact) {
      // Only try to lookup if we're not pre-filled and we have contacts
      const foundContact = contacts.find(contact => contact.id === value)
      if (foundContact && foundContact.id !== currentSelectedContact?.id) {
        setCurrentSelectedContact(foundContact)
        setSearchTerm(foundContact.name)
      }
    }

    if (!value && !selectedContact && currentSelectedContact) {
      setCurrentSelectedContact(null)
      setSearchTerm('')
    }
  }, [value, contacts, currentSelectedContact, selectedContact])

  // Execute search call to API
  const executeSearch = async () => {
    if (!searchTerm.trim()) return

    setIsSearching(true)
    setHasSearched(true)

    try {
      const queryParams = new URLSearchParams({ q: searchTerm.trim() })
      const response = await fetch(`/api/contacts/search?${queryParams}`)

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.contacts || [])
      } else {
        console.error('Search failed:', response.status)
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchTerm(newValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      executeSearch()
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const handleContactSelect = (contact: Contact) => {
    setCurrentSelectedContact(contact)
    setSearchTerm(contact.name)
    setSearchResults([])
    setIsOpen(false)
    onChange(contact.id)
  }

  const handleClear = () => {
    setCurrentSelectedContact(null)
    setSearchTerm('')
    setSearchResults([])
    setIsOpen(false)
    setHasSearched(false)
    onChange('')
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleInputBlur = () => {
    // Delay closing to allow for dropdown item selection
    setTimeout(() => {
      setIsOpen(false)
    }, 200)
  }

  const displayValue = currentSelectedContact ? currentSelectedContact.name : searchTerm

  return (
    <div className={cn("relative", className)}>
      <Label htmlFor="contact-selector" className="sr-only">
        Select Contact
      </Label>

      <div className="relative flex">
        <Input
          ref={inputRef}
          id="contact-selector"
          type="text"
          value={displayValue}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-28"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={executeSearch}
            disabled={disabled || isSearching || !searchTerm.trim()}
            className="h-6 w-8 p-0"
            title="Search contacts (or press Enter)"
          >
            <Search className="h-3 w-3" />
          </Button>

          {currentSelectedContact && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 w-6 p-0 hover:bg-destructive/20"
              title="Clear selection"
            >
              <X className="h-3 w-3" />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className="h-6 w-6 p-0"
            title={isOpen ? "Close dropdown" : "Open dropdown"}
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-64 overflow-y-auto"
        >
          <div className="p-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-primary border-t-transparent rounded-full" />
                Searching contacts...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center px-2 py-1 text-xs text-muted-foreground">
                  <Search className="h-3 w-3 mr-1" />
                  Search results for "{searchTerm}"
                </div>

                {searchResults.map((contact, index) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleContactSelect(contact)}
                    className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground rounded-sm text-sm transition-colors focus:outline-none focus:bg-accent"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{contact.name}</div>
                          {contact.phone && (
                            <div className="text-xs text-muted-foreground truncate">
                              📞 {contact.phone}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>#{index + 1}</span>
                        {contact.email && (
                          <Badge variant="secondary" className="text-xs">
                            ✉️
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : hasSearched ? (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                No contacts found matching "{searchTerm}"
              </div>
            ) : (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                Press Enter or click search button to find contacts
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search instructions */}
      {!hasSearched && !isSearching && (
        <div className="text-xs text-muted-foreground mt-1">
          Type contact name and press Enter or click search to find contacts
        </div>
      )}
    </div>
  )
}
