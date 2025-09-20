'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

interface ServiceFormData {
  contact_id: string
  service_type_id: string
  duration: string
  payment_amount: string
  payment_mode: string
  payment_status: string
  notes: string
}

interface ServiceFormProps {
  initialData?: Partial<ServiceFormData>
  onSubmit: (data: ServiceFormData) => Promise<void>
  submitLabel: string
  contacts: Contact[]
  serviceTypes: ServiceType[]
}

export function ServiceForm({ initialData = {}, onSubmit, submitLabel, contacts, serviceTypes }: ServiceFormProps) {
  const [formData, setFormData] = useState<ServiceFormData>({
    contact_id: '',
    service_type_id: '',
    duration: '',
    payment_amount: '',
    payment_mode: '',
    payment_status: 'unpaid',
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
          duration: '',
          payment_amount: '',
          payment_mode: '',
          payment_status: 'unpaid',
          notes: '',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (field: keyof ServiceFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="contact_id">Client *</Label>
        <Select value={formData.contact_id} onValueChange={(value) => updateFormData('contact_id', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            {contacts.map((contact) => (
              <SelectItem key={contact.id} value={contact.id}>
                {contact.name} {contact.phone && `(${contact.phone})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <Label htmlFor="duration">Duration (minutes)</Label>
        <Input
          id="duration"
          type="number"
          value={formData.duration}
          onChange={(e) => updateFormData('duration', e.target.value)}
          placeholder="e.g., 60"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment_amount">Payment Amount (₹)</Label>
        <Input
          id="payment_amount"
          type="number"
          step="0.01"
          value={formData.payment_amount}
          onChange={(e) => updateFormData('payment_amount', e.target.value)}
          placeholder="e.g., 1500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment_mode">Payment Mode</Label>
        <Select
          value={formData.payment_mode}
          onValueChange={(value) => updateFormData('payment_mode', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select payment mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="card">Card</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment_status">Payment Status *</Label>
        <Select
          value={formData.payment_status}
          onValueChange={(value) => updateFormData('payment_status', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
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
