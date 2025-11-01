"use client"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, DollarSign, User } from "lucide-react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

interface MarriageCeremony {
  id: string
  marriage_service_id: string
  ceremony_name: string
  ceremony_date: string
  ceremony_time: string
  duration: number | null
  payment_amount: number | null
  payment_status: string
  notes: string | null
  created_at: string
  services: {
    id: string
    contacts: { name: string }
    service_types: { name: string }
  }
}

interface CalendarData {
  date: string
  ceremonies: MarriageCeremony[]
  totalRevenue: number
  ceremonyCount: number
}

interface SelectedDateData {
  date: Date
  ceremonies: MarriageCeremony[]
  totalRevenue: number
}

export default function MarriageCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarData, setCalendarData] = useState<Map<string, CalendarData>>(new Map())
  const [selectedDate, setSelectedDate] = useState<SelectedDateData | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchCalendarData()
  }, [currentMonth])

  const fetchCalendarData = async () => {
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

      // Fetch marriage ceremonies for the month with padding
      const { data: ceremonies, error: ceremoniesError } = await supabase
        .from("marriage_ceremonies")
        .select(`
          *,
          services (
            id,
            contacts (name),
            service_types (name)
          )
        `)
        .gte("ceremony_date", startDate.toISOString().split('T')[0])
        .lte("ceremony_date", endDate.toISOString().split('T')[0])
        .order("ceremony_date", { ascending: true })
        .order("ceremony_time", { ascending: true })

      if (ceremoniesError) throw ceremoniesError

      // Fetch marriage services (for showing existing marriages without ceremonies)
      const { data: marriageServiceType } = await supabase
        .from("service_types")
        .select("id")
        .eq("name", "Marriage Ceremony")
        .single()

      let marriageServices: any[] = []
      if (marriageServiceType) {
        const { data: services } = await supabase
          .from("services")
          .select(`
            id,
            contact_id,
            service_type_id,
            created_at,
            payment_amount,
            contacts (name),
            service_types (name)
          `)
          .eq("service_type_id", marriageServiceType.id)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString())
          .order("created_at", { ascending: true })

        marriageServices = services || []
      }

      // Fetch marriage reservations for the month
      const { data: marriageReservations, error: reservationsError } = await supabase
        .from("marriage_reservations")
        .select(`
          *,
          contacts (name, phone)
        `)
        .gte("reservation_date", startDate.toISOString().split('T')[0])
        .lte("reservation_date", endDate.toISOString().split('T')[0])
        .eq("status", "active")
        .order("reservation_date", { ascending: true })

      if (reservationsError) throw reservationsError

      // Group ceremonies by date
      const dateMap = new Map<string, CalendarData>()

      // Add ceremonies to the map
      ceremonies?.forEach((ceremony: MarriageCeremony) => {
        const date = ceremony.ceremony_date

        if (!dateMap.has(date)) {
          dateMap.set(date, {
            date,
            ceremonies: [],
            totalRevenue: 0,
            ceremonyCount: 0
          })
        }

        const dateData = dateMap.get(date)!
        dateData.ceremonies.push(ceremony)

        // Only count paid ceremonies for revenue
        if (ceremony.payment_status === "paid") {
          dateData.totalRevenue += ceremony.payment_amount || 0
        }

        dateData.ceremonyCount += 1
      })

      // Add marriage services (existing marriages) to the map
      marriageServices.forEach((service: any) => {
        const serviceDate = service.created_at.split('T')[0] // Extract date part

        if (!dateMap.has(serviceDate)) {
          dateMap.set(serviceDate, {
            date: serviceDate,
            ceremonies: [],
            totalRevenue: 0,
            ceremonyCount: 0
          })
        }

        const dateData = dateMap.get(serviceDate)!

        // Add a synthetic ceremony entry for the marriage service itself
        const marriageEntry: MarriageCeremony = {
          id: `service-${service.id}`,
          marriage_service_id: service.id,
          ceremony_name: "Marriage Service",
          ceremony_date: serviceDate,
          ceremony_time: "00:00", // Default time for service entry
          duration: null,
          payment_amount: service.payment_amount,
          payment_status: "paid", // Assume service payment is paid
          notes: "Marriage service entry",
          created_at: service.created_at,
          services: {
            id: service.id,
            contacts: service.contacts,
            service_types: service.service_types
          }
        }

        dateData.ceremonies.push(marriageEntry)
        dateData.totalRevenue += service.payment_amount || 0
        dateData.ceremonyCount += 1
      })

      // Add marriage reservations to the map
      marriageReservations?.forEach((reservation: any) => {
        const reservationDate = reservation.reservation_date

        if (!dateMap.has(reservationDate)) {
          dateMap.set(reservationDate, {
            date: reservationDate,
            ceremonies: [],
            totalRevenue: 0,
            ceremonyCount: 0
          })
        }

        const dateData = dateMap.get(reservationDate)!

        // Add a synthetic ceremony entry for the marriage reservation
        const reservationEntry: MarriageCeremony = {
          id: `reservation-${reservation.id}`,
          marriage_service_id: "", // No service ID for reservations
          ceremony_name: "Marriage Reservation",
          ceremony_date: reservationDate,
          ceremony_time: "00:00", // Default time for reservation entry
          duration: null,
          payment_amount: null, // Reservations don't have payment amounts
          payment_status: "unpaid", // Reservations are unpaid by default
          notes: reservation.notes || "Marriage reservation",
          created_at: reservation.created_at,
          services: {
            id: "", // No service ID
            contacts: reservation.contacts,
            service_types: { name: "Marriage Ceremony" } // Hardcoded service type
          }
        }

        dateData.ceremonies.push(reservationEntry)
        // Don't add to revenue since reservations don't have payments
        dateData.ceremonyCount += 1
      })

      setCalendarData(dateMap)
    } catch (error) {
      console.error("Error fetching marriage calendar data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateClick = (date: Date) => {
    const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const dateData = calendarData.get(localDateStr)

    if (dateData && dateData.ceremonies.length > 0) {
      setSelectedDate({
        date,
        ceremonies: dateData.ceremonies,
        totalRevenue: dateData.totalRevenue
      })
      setIsDetailDialogOpen(true)
    }
  }

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date)
  }

  const modifiers = {
    hasCeremonies: (date: Date) => {
      const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const data = calendarData.get(localDateStr)
      return Boolean(data && data.ceremonyCount > 0)
    },
    hasRevenue: (date: Date) => {
      const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const data = calendarData.get(localDateStr)
      return Boolean(data && data.totalRevenue > 0)
    }
  }

  const modifiersStyles = {
    hasCeremonies: {
      backgroundColor: '#fef3c7', // light yellow
      color: '#92400e',
      fontWeight: '600'
    },
    hasRevenue: {
      backgroundColor: '#dcfce7', // light green
      color: '#166534',
      fontWeight: '600'
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
            <h1 className="text-2xl font-bold text-gray-900">Marriage Calendar</h1>
            <p className="text-gray-600">View marriage ceremonies and services on a calendar. Click any date to see details.</p>
          </div>

          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Marriage Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  Loading marriage calendar data...
                </div>
              ) : (
                <div className="flex justify-center">
                  <DayPicker
                    mode="single"
                    selected={undefined}
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
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                  <span>Dates with marriage ceremonies</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                  <span>Dates with paid ceremonies (revenue)</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span>Revenue amount (₹)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-blue-600" />
                  <span>Number of ceremonies</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  Click any highlighted date to see detailed breakdown
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detail Dialog */}
          <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedDate && (
                    <>
                      Marriage Ceremonies - {selectedDate.date.toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </>
                  )}
                </DialogTitle>
                <DialogDescription>
                  All marriage ceremonies and services scheduled for this date
                </DialogDescription>
              </DialogHeader>

              {selectedDate && (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {selectedDate.ceremonies.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Ceremonies</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        ₹{selectedDate.totalRevenue.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Revenue</div>
                    </div>
                  </div>

                  {/* Ceremonies List */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Ceremonies for this Date</h3>
                    <div className="space-y-3">
                      {selectedDate.ceremonies.map((ceremony) => (
                        <div key={ceremony.id} className="p-4 border rounded-lg bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-lg">{ceremony.ceremony_name}</h4>
                            <Badge variant={ceremony.payment_status === "paid" ? "default" : "secondary"}>
                              {ceremony.payment_status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">{ceremony.services.contacts.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span>{ceremony.ceremony_time}</span>
                                {ceremony.duration && <span>({ceremony.duration}m)</span>}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-gray-400" />
                                <span>{ceremony.services.service_types.name}</span>
                              </div>
                              {ceremony.payment_amount && (
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-gray-400" />
                                  <span>₹{ceremony.payment_amount}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {ceremony.notes && (
                            <div className="mt-3 p-2 bg-white rounded text-sm italic">
                              "{ceremony.notes}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
