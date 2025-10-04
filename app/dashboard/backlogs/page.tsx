"use client"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DayPicker } from "react-day-picker"
import { createClient } from "@/lib/supabase/client"
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react"
import { SearchableContactSelector } from "@/components/searchable-contact-selector"
import "react-day-picker/dist/style.css"

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

// Simple wrapper for ServiceForm that shows selected date
function BacklogServiceForm({ selectedDate, onSubmit }: {
  selectedDate: string
  onSubmit: (data: ServiceFormData) => Promise<void>
}) {
  const [formData, setFormData] = useState<ServiceFormData>({
    contact_id: '',
    service_type_id: '',
    duration: '',
    payment_amount: '',
    payment_mode: 'cash',
    payment_status: 'paid',
    notes: '',
  })

  const [contacts, setContacts] = useState<Contact[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [{ data: contactsData }, { data: serviceTypesData }] = await Promise.all([
        supabase.from("contacts").select("id, name, phone, email").order("name"),
        supabase.from("service_types").select("*").order("name")
      ])
      setContacts(contactsData || [])
      setServiceTypes(serviceTypesData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      // Reset form
      setFormData({
        contact_id: '',
        service_type_id: '',
        duration: '',
        payment_amount: '',
        payment_mode: 'cash',
        payment_status: 'paid',
        notes: '',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (field: keyof ServiceFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Loading form...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Selected date display */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <div className="text-sm font-medium text-orange-800 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          Logging service for: {new Date(selectedDate).toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
        <div className="text-xs text-orange-600 mt-1">
          📝 Better to log services on the day they happen, but great you're catching up!
        </div>
      </div>

      {/* Contact selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Client *</label>
        <SearchableContactSelector
          value={formData.contact_id}
          onChange={(contactId) => updateFormData('contact_id', contactId)}
          placeholder="Search for a client..."
          contacts={contacts}
        />
      </div>

      {/* Service type selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Service Type *</label>
        <select
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={formData.service_type_id}
          onChange={(e) => updateFormData('service_type_id', e.target.value)}
          required
        >
          <option value="">Select service type</option>
          {serviceTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Duration (minutes)</label>
        <input
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          type="number"
          placeholder="e.g., 60"
          value={formData.duration}
          onChange={(e) => updateFormData('duration', e.target.value)}
        />
      </div>

      {/* Payment amount */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Payment Amount (₹)</label>
        <input
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          type="number"
          step="0.01"
          placeholder="e.g., 1500"
          value={formData.payment_amount}
          onChange={(e) => updateFormData('payment_amount', e.target.value)}
        />
      </div>

      {/* Payment mode */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Payment Mode</label>
        <select
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={formData.payment_mode}
          onChange={(e) => updateFormData('payment_mode', e.target.value)}
        >
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
        </select>
      </div>

      {/* Payment status */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Payment Status *</label>
        <select
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={formData.payment_status}
          onChange={(e) => updateFormData('payment_status', e.target.value)}
          required
        >
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Notes</label>
        <textarea
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Any additional notes about the service..."
          rows={3}
          value={formData.notes}
          onChange={(e) => updateFormData('notes', e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Logging...' : 'Log Service'}
      </Button>
    </form>
  )
}

export default function BacklogsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createClient()

  const handleDateClick = (date: Date) => {
    // Allow any date in the past (before today)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (date < today) {
      setSelectedDate(date)
      setIsDialogOpen(true)
    }
  }

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date)
  }

  const handleLogService = async (formData: ServiceFormData) => {
    if (!selectedDate) return

    try {
      setIsLoading(true)

      const serviceData = {
        contact_id: formData.contact_id,
        service_type_id: formData.service_type_id,
        duration: formData.duration ? Number.parseInt(formData.duration) : null,
        payment_amount: formData.payment_amount ? Number.parseFloat(formData.payment_amount) : null,
        payment_mode: formData.payment_mode || null,
        payment_status: formData.payment_status,
        notes: formData.notes || null,
        // Override created_at to the selected date - simulates it being logged on that day
        created_at: selectedDate.toISOString()
      }

      const { error } = await supabase.from("services").insert([serviceData])
      if (error) throw error

      setIsDialogOpen(false)
      setSelectedDate(null)
    } catch (error) {
      console.error('Error logging service:', error)
      alert('Failed to log service: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsLoading(false)
    }
  }

  const modifiers = {
    pastDate: (date: Date) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return date < today // Past dates are clickable
    },
    futureDate: (date: Date) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return date >= today // Future dates and today are disabled
    }
  }

  const modifiersStyles = {
    pastDate: {
      cursor: 'pointer',
      color: '#374151', // dark gray
      fontWeight: '500'
    },
    futureDate: {
      color: '#9ca3af', // light gray
      cursor: 'not-allowed',
      opacity: 0.4
    }
  }

  const formatCaption = (date: Date) => {
    return `${date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Log Backlogs</h1>
            <p className="text-gray-600">Catch up on missed service logging from any past date</p>
          </div>

          {/* Encouraging message */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="text-2xl">📝</div>
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">Better Late Than Never!</h3>
                  <p className="text-sm text-blue-700">
                    We recommend logging services on the day they're performed, but this page lets you
                    catch up on any missed entries. Just click any past date to log a service for that day.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Backlog Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <DayPicker
                  mode="single"
                  selected={selectedDate || undefined}
                  onSelect={() => {}}
                  month={currentMonth}
                  onMonthChange={handleMonthChange}
                  modifiers={modifiers}
                  modifiersStyles={modifiersStyles}
                  onDayClick={handleDateClick}
                  className="rounded-md border p-2"
                  formatters={{ formatCaption }}
                  disabled={[]} // Allow all dates
                />
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-700 rounded"></div>
                  <span>Past dates - Click to log missed services</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-300 rounded opacity-40"></div>
                  <span>Today & future dates (disabled)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Logging Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Log Service</DialogTitle>
                <DialogDescription>
                  Record a service performed on this date
                </DialogDescription>
              </DialogHeader>

              {selectedDate && (
                <BacklogServiceForm
                  selectedDate={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
                  onSubmit={handleLogService}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
