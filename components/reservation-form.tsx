"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SearchableContactSelector } from '@/components/searchable-contact-selector'

interface Contact {
  id: string
  name: string
  phone: string | null
  email: string | null
}

interface ServiceType {
  id: string
  name: string
}

interface ReservationFormData {
  contact_id: string
  service_type_id: string
  reservation_time: string
  notes: string
}

interface ReservationFormProps {
  initialData?: Partial<ReservationFormData>
  onSubmit: (data: ReservationFormData) => Promise<void>
  submitLabel: string
  contacts: Contact[]
  serviceTypes: ServiceType[]
  selectedDate: string // YYYY-MM-DD format
}

export function ReservationForm({ initialData = {}, onSubmit, submitLabel, contacts, serviceTypes, selectedDate }: ReservationFormProps) {
  const [formData, setFormData] = useState<ReservationFormData>({
    contact_id: '',
    service_type_id: '',
    reservation_time: '',
    notes: '',
    ...initialData,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      // Reset form only if it's an add operation (no initialData provided)
      if (!initialData.contact_id) {
        setFormData({
          contact_id: '',
          service_type_id: '',
          reservation_time: '',
          notes: '',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (field: keyof ReservationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Selected Date Display */}
      <div className="p-3 bg-gray-50 rounded-lg border">
        <div className="text-sm font-medium text-gray-600">Reservation Date</div>
        <div className="text-lg font-semibold">
          {new Date(selectedDate + 'T12:00').toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact_id">Client *</Label>
        <SearchableContactSelector
          value={formData.contact_id}
          onChange={(contactId) => updateFormData('contact_id', contactId)}
          placeholder="Search for a client..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="service_type_id">Service Type *</Label>
        <Select
          value={formData.service_type_id}
          onValueChange={(value) => updateFormData('service_type_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select service type" />
          </SelectTrigger>
          <SelectContent>
            {serviceTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reservation_time">Appointment Time *</Label>
        <Input
          id="reservation_time"
          type="time"
          value={formData.reservation_time}
          onChange={(e) => updateFormData('reservation_time', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => updateFormData('notes', e.target.value)}
          placeholder="Any additional notes about the service..."
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  )
}
