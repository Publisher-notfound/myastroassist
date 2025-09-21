"use client"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ReservationForm } from "@/components/reservation-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DayPicker } from "react-day-picker"
import { createClient } from "@/lib/supabase/client"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Edit, Trash2, Search } from "lucide-react"
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

interface ReservationData {
  date: string
  reservations: Array<{
    id: string
    reservation_time: string
    contacts: Contact
    service_types: ServiceType
    notes: string | null
  }>
}

export default function ReservePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<{
    id: string
    reservation_date: string
    reservation_time: string
    contacts: Contact
    service_types: ServiceType
    notes: string | null
  } | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [reservations, setReservations] = useState<Map<string, ReservationData>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [viewDate, setViewDate] = useState<Date | null>(null)
  const [isViewCalendarOpen, setIsViewCalendarOpen] = useState(false)
  const [viewedDayReservations, setViewedDayReservations] = useState<Map<string, ReservationData>>(new Map())

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [currentMonth])

  const fetchData = async () => {
    try {
      setIsLoading(true)

      // Calculate date range for current month view
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const startDate = new Date(year, month, 1)
      const endDate = new Date(year, month + 1, 0) // Last day of the month

      // Add padding for previous/next month visibility
      startDate.setDate(startDate.getDate() - 7)
      endDate.setDate(endDate.getDate() + 7)

      // Fetch contacts and service types
      const [contactsResponse, serviceTypesResponse, reservationsResponse] = await Promise.all([
        supabase.from("contacts").select("id, name, phone, email").order("name"),
        supabase.from("service_types").select("*").order("name"),
        supabase
          .from("reservations")
          .select(`
            *,
            contacts (name, phone),
            service_types (name)
          `)
          .gte("reservation_date", `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`)
          .lte("reservation_date", `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`)
          .eq("status", "active")
          .order("reservation_date", { ascending: true })
          .order("reservation_time", { ascending: true })
      ])

      if (contactsResponse.error) throw contactsResponse.error
      if (serviceTypesResponse.error) throw serviceTypesResponse.error
      if (reservationsResponse.error) throw reservationsResponse.error

      setContacts(contactsResponse.data || [])
      setServiceTypes(serviceTypesResponse.data || [])

      // Group reservations by date
      const reservationsMap = new Map<string, ReservationData>()
      reservationsResponse.data?.forEach((reservation: any) => {
        const date = reservation.reservation_date
        if (!reservationsMap.has(date)) {
          reservationsMap.set(date, {
            date,
            reservations: []
          })
        }
        reservationsMap.get(date)!.reservations.push(reservation)
      })

      setReservations(reservationsMap)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateClick = (date: Date) => {
    // Only allow future dates (today and later)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (date >= today) {
      setSelectedDate(date)
      setIsDialogOpen(true)
    }
  }

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date)
  }

  const handleCreateReservation = async (formData: {
    contact_id: string
    service_type_id: string
    reservation_time: string
    notes: string
  }) => {
    if (!selectedDate) return

    try {
      // Create local date string to avoid timezone offset
      const localDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: formData.contact_id,
          service_type_id: formData.service_type_id,
          reservation_date: localDateStr, // YYYY-MM-DD without timezone conversion
          reservation_time: formData.reservation_time,
          notes: formData.notes
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create reservation')
      }

      setIsDialogOpen(false)
      setSelectedDate(null)
      setIsEditing(false)
      fetchData() // Refresh the calendar
      if (viewDate) viewReservationsForDate(viewDate) // Refresh viewed reservations
    } catch (error) {
      console.error('Error creating reservation:', error)
      alert('Failed to create reservation: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleEditReservation = (reservation: any) => {
    const fullReservation = {
      ...reservation,
      reservation_date: reservation.reservation_date
    }
    setSelectedReservation(fullReservation)
    const reservationDate = new Date(reservation.reservation_date + 'T12:00')
    setSelectedDate(reservationDate)
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleUpdateReservation = async (formData: {
    contact_id: string
    service_type_id: string
    reservation_time: string
    notes: string
  }) => {
    if (!selectedReservation || !selectedDate) return

    try {
      const localDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`

      const response = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedReservation.id,
          contact_id: formData.contact_id,
          service_type_id: formData.service_type_id,
          reservation_date: localDateStr, // YYYY-MM-DD without timezone conversion
          reservation_time: formData.reservation_time,
          notes: formData.notes
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update reservation')
      }

      setIsDialogOpen(false)
      setSelectedDate(null)
      setSelectedReservation(null)
      setIsEditing(false)
      fetchData() // Refresh the calendar
      if (viewDate) viewReservationsForDate(viewDate) // Refresh viewed reservations
    } catch (error) {
      console.error('Error updating reservation:', error)
      alert('Failed to update reservation: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleDeleteReservation = async (reservationId: string) => {
    if (!confirm('Are you sure you want to delete this reservation?')) return

    try {
      const response = await fetch(`/api/reservations?id=${reservationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete reservation')
      }

      fetchData() // Refresh the calendar
      if (viewDate) viewReservationsForDate(viewDate) // Refresh viewed reservations
    } catch (error) {
      console.error('Error deleting reservation:', error)
      alert('Failed to delete reservation: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleViewDayClick = (date: Date) => {
    setViewDate(date)
    setIsViewCalendarOpen(false)
    viewReservationsForDate(date)
  }

  const viewReservationsForDate = (date: Date) => {
    // Use local date formatting to match how dates are stored and fetched
    const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const dayData = reservations.get(localDateStr) || { date: localDateStr, reservations: [] }
    const dayMap = new Map([[localDateStr, dayData]])
    setViewedDayReservations(dayMap)
  }

  const modifiers = {
    hasReservations: (date: Date) => {
      // Use local date format to match storage and retrieval
      const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const data = reservations.get(localDateStr)
      return Boolean(data && data.reservations.length > 0)
    },
    pastDate: (date: Date) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return date < today
    }
  }

  const modifiersStyles = {
    hasReservations: {
      backgroundColor: '#3b82f6', // blue
      color: '#ffffff',
      fontWeight: '600'
    },
    pastDate: {
      opacity: 0.4,
      cursor: 'not-allowed'
    }
  }

  // Custom components for day contents
  const formatCaption = (date: Date) => {
    return `${date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Book Reservations</h1>
            <p className="text-gray-600">Click any future date to schedule a service reservation</p>
          </div>

          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  Loading calendar...
                </div>
              ) : (
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
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>Days with reservations - Click to view</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 border rounded opacity-40"></div>
                  <span>Past dates (disabled)</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  Empty days - Click to book new reservation
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Date Picker for Viewing Reservations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">View Reservations</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsViewCalendarOpen(!isViewCalendarOpen)}
                  className="flex items-center gap-2"
                >
                  <CalendarIcon className="h-4 w-4" />
                  {viewDate ? new Date(viewDate).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }) : 'Select Date'}
                </Button>
              </div>
              {isViewCalendarOpen && (
                <div className="mt-4 border rounded-md p-2">
                  <DayPicker
                    mode="single"
                    selected={viewDate || undefined}
                    onSelect={(date) => date && handleViewDayClick(date)}
                    required={false}
                    className="text-sm"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent>
              {viewDate ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">
                    Reservations for {new Date(viewDate).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="space-y-2">
                    {viewedDayReservations.size > 0 ? (
                      Array.from(viewedDayReservations.values()).map(dayData =>
                        dayData.reservations.map((reservation) => (
                          <div key={reservation.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{reservation.contacts.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {reservation.service_types.name} • {reservation.reservation_time}
                              </div>
                              {reservation.notes && (
                                <div className="text-sm text-muted-foreground mt-1 italic">
                                  "{reservation.notes}"
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditReservation(reservation)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteReservation(reservation.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )
                    ) : (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No reservations for this date
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Select a date above to view reservations
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reservation Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Reservation' : 'Create Reservation'}</DialogTitle>
                <DialogDescription>
                  {isEditing ? 'Update the service appointment details' : 'Schedule a service appointment for this date'}
                </DialogDescription>
              </DialogHeader>

              {selectedDate && (
                <ReservationForm
                  selectedDate={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
                  contacts={contacts}
                  serviceTypes={serviceTypes}
                  onSubmit={isEditing ? handleUpdateReservation : handleCreateReservation}
                  submitLabel={isEditing ? 'Update Reservation' : 'Create Reservation'}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
