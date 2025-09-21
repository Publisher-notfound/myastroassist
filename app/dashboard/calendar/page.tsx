"use client"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DayPicker } from "react-day-picker"
import { createClient } from "@/lib/supabase/client"
import { ChevronLeft, ChevronRight, DollarSign, FileText } from "lucide-react"
import "react-day-picker/dist/style.css"

interface CalendarData {
  date: string
  revenue: number
  services: number
  serviceDetails: {
    id: string
    contact_name: string
    service_type: string
    amount: number
    payment_status: string
    time: string
  }[]
}

interface SelectedDateData {
  date: Date
  revenue: number
  services: number
  serviceDetails: typeof CalendarData.serviceDetails
}

export default function CalendarPage() {
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

      // Fetch services for the month with padding
      const { data: services, error } = await supabase
        .from("services")
        .select(`
          *,
          contacts (name),
          service_types (name)
        `)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true })

      if (error) throw error

      // Group services by date
      const dateMap = new Map<string, CalendarData>()

      services?.forEach((service) => {
        const date = new Date(service.created_at).toISOString().split('T')[0] // YYYY-MM-DD

        if (!dateMap.has(date)) {
          dateMap.set(date, {
            date,
            revenue: 0,
            services: 0,
            serviceDetails: []
          })
        }

        const dateData = dateMap.get(date)!

        // Only count paid services for revenue
        if (service.payment_status === "paid") {
          dateData.revenue += service.payment_amount || 0
        }

        dateData.services += 1
        dateData.serviceDetails.push({
          id: service.id,
          contact_name: service.contacts.name,
          service_type: service.service_types.name,
          amount: service.payment_amount || 0,
          payment_status: service.payment_status,
          time: new Date(service.created_at).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
          })
        })
      })

      setCalendarData(dateMap)
    } catch (error) {
      console.error("Error fetching calendar data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const dateData = calendarData.get(dateStr)

    if (dateData) {
      setSelectedDate({
        date,
        revenue: dateData.revenue,
        services: dateData.services,
        serviceDetails: dateData.serviceDetails
      })
      setIsDetailDialogOpen(true)
    }
  }

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date)
  }

  const modifiers = {
    hasRevenue: (date: Date) => {
      const dateStr = date.toISOString().split('T')[0]
      const data = calendarData.get(dateStr)
      return Boolean(data && data.revenue > 0)
    },
    hasServices: (date: Date) => {
      const dateStr = date.toISOString().split('T')[0]
      const data = calendarData.get(dateStr)
      return Boolean(data && data.services > 0)
    }
  }

  const modifiersStyles = {
    hasRevenue: {
      backgroundColor: '#dcfce7', // light green
      color: '#166534',
      fontWeight: '600'
    },
    hasServices: {
      position: 'relative' as const
    }
  }



  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Revenue Calendar</h1>
            <p className="text-gray-600">Click any date to see detailed service and revenue breakdown</p>
          </div>

          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  Loading calendar data...
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
                  <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                  <span>Days with revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span>Revenue amount (₹)</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Number of services</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  Click any date to see detailed breakdown
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
                      {selectedDate.date.toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Detailed breakdown of services and revenue for this date
                </DialogDescription>
              </DialogHeader>

              {selectedDate && (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        ₹{selectedDate.revenue.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Revenue</div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedDate.services}
                      </div>
                      <div className="text-sm text-muted-foreground">Services Provided</div>
                    </div>
                  </div>

                  {/* Services Table */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Service Details</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Service Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDate.serviceDetails.map((service: typeof selectedDate.serviceDetails[0]) => (
                          <TableRow key={service.id}>
                            <TableCell className="font-medium">{service.contact_name}</TableCell>
                            <TableCell>{service.service_type}</TableCell>
                            <TableCell>₹{service.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={service.payment_status === "paid" ? "default" : "secondary"}>
                                {service.payment_status}
                              </Badge>
                            </TableCell>
                            <TableCell>{service.time}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
