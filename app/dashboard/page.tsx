"use client"

import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users, FileText, DollarSign, Plus, TrendingUp, Calendar, Clock, X, Check } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { ServiceForm } from "@/components/service-form"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalContacts: 0,
    monthlyServices: 0,
    monthlyRevenue: 0,
    pendingAmount: 0,
  })

  const [dailyStats, setDailyStats] = useState({
    todayRevenue: 0,
    todayServices: 0,
    thisWeekRevenue: 0,
    thisWeekServices: 0,
    yesterdayRevenue: 0,
    yesterdayServices: 0,
  })

  const [expenseStats, setExpenseStats] = useState({
    thisWeekExpenses: 0,
    thisMonthExpenses: 0,
    thisWeekExpenseCount: 0,
    thisMonthExpenseCount: 0,
  })

  const [dailyBreakdown, setDailyBreakdown] = useState<{ date: string, revenue: number, services: number }[]>([])

  const [todayReservations, setTodayReservations] = useState<Array<{
    id: string
    reservation_time: string
    contacts: { name: string; id: string }
    service_types: { name: string; id: string }
  }>>([])

  const [contacts, setContacts] = useState<Array<{ id: string; name: string; phone: string | null; email: string | null }>>([])
  const [serviceTypes, setServiceTypes] = useState<Array<{ id: string; name: string }>>([])

  const [isLoading, setIsLoading] = useState(true)
  const [selectedReservation, setSelectedReservation] = useState<{
    id: string
    reservation_time: string
    contacts: { name: string; id: string }
    service_types: { name: string; id: string }
  } | null>(null)
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchInitialData()
    fetchDashboardStats()
  }, [])

  const fetchInitialData = async () => {
    try {
      const [{ data: allContacts }, { data: allServiceTypes }] = await Promise.all([
        supabase.from("contacts").select("id, name, phone, email"),
        supabase.from("service_types").select("id, name")
      ])
      setContacts(allContacts || [])
      setServiceTypes(allServiceTypes || [])
    } catch (error) {
      console.error("Error fetching initial data:", error)
    }
  }

  const handleReservationComplete = (reservation: typeof todayReservations[0]) => {
    setSelectedReservation(reservation)
    setIsServiceDialogOpen(true)
  }

  const handleReservationDismiss = async (reservationId: string) => {
    if (!confirm('Are you sure you want to dismiss this reservation?')) return

    try {
      await deleteReservation(reservationId)
      // Refresh today's reservations
      fetchDashboardStats()
    } catch (error) {
      console.error('Error dismissing reservation:', error)
      alert('Failed to dismiss reservation')
    }
  }

  const deleteReservation = async (reservationId: string) => {
    const response = await fetch(`/api/reservations?id=${reservationId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error('Failed to delete reservation')
    }
  }

  const handleServiceComplete = async (formData: {
    contact_id: string
    service_type_id: string
    duration: string
    payment_amount: string
    payment_mode: string
    payment_status: string
    notes: string
  }) => {
    try {
      // Create service record
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to create service record')
      }

      // Dismiss the reservation (no confirmation needed once service is completed)
      if (selectedReservation) {
        await deleteReservation(selectedReservation.id)
      }

      // Close dialog and refresh stats
      setIsServiceDialogOpen(false)
      setSelectedReservation(null)
      fetchDashboardStats() // Refresh to show updated stats
    } catch (error) {
      console.error('Error completing reservation:', error)
      alert('Failed to complete reservation')
    }
  }

  const fetchDashboardStats = async () => {
    try {
      const now = new Date()

      // Get date ranges
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)

      const fourteenDaysAgo = new Date(now)
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

      // Fetch total contacts
      const { count: contactsCount } = await supabase.from("contacts").select("*", { count: "exact", head: true })

      // Fetch monthly services and revenue
      const { data: monthlyServices } = await supabase
        .from("services")
        .select("payment_amount, payment_status")
        .gte("created_at", startOfMonth.toISOString())
        .lte("created_at", endOfMonth.toISOString())

      // Fetch today's services
      const { data: todayServices } = await supabase
        .from("services")
        .select("payment_amount, payment_status, created_at")
        .gte("created_at", today.toISOString())
        .lt("created_at", tomorrow.toISOString())

      // Fetch this week's services
      const { data: weekServices } = await supabase
        .from("services")
        .select("payment_amount, payment_status, created_at")
        .gte("created_at", weekAgo.toISOString())

      // Fetch last 14 days for breakdown chart
      const { data: recentServices } = await supabase
        .from("services")
        .select("payment_amount, payment_status, created_at")
        .gte("created_at", fourteenDaysAgo.toISOString())
        .order("created_at", { ascending: true })

      // Fetch this week's expenses
      const { data: weekExpenses } = await supabase
        .from("expenses")
        .select("amount, expense_date")
        .gte("expense_date", weekAgo.toISOString().split('T')[0])

      // Fetch this month's expenses
      const { data: monthExpenses } = await supabase
        .from("expenses")
        .select("amount, expense_date")
        .gte("expense_date", startOfMonth.toISOString().split('T')[0])

      // Fetch pending payments
      const { data: pendingServices } = await supabase
        .from("services")
        .select("payment_amount")
        .eq("payment_status", "unpaid")

      // Fetch today's reservations - Create local date strings to avoid timezone issues
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const { data: todayReservationsData } = await supabase
        .from("reservations")
        .select(`
          id,
          reservation_time,
          contacts!inner (id, name),
          service_types!inner (id, name)
        `)
        .eq("reservation_date", todayStr)
        .eq("status", "active")
        .order("reservation_time", { ascending: true })

      // Transform the data to flat structure
      const transformedReservations = todayReservationsData?.map(reservation => ({
        id: reservation.id,
        reservation_time: reservation.reservation_time,
        contacts: Array.isArray(reservation.contacts) ? reservation.contacts[0] : reservation.contacts,
        service_types: Array.isArray(reservation.service_types) ? reservation.service_types[0] : reservation.service_types
      })) || []

      // Calculate monthly stats
      const monthlyRevenue = monthlyServices?.reduce((sum, service) =>
        sum + (service.payment_status === "paid" ? service.payment_amount || 0 : 0), 0) || 0

      const pendingAmount = pendingServices?.reduce((sum, service) =>
        sum + (service.payment_amount || 0), 0) || 0

      // Calculate daily stats
      const todayRevenue = todayServices?.reduce((sum, service) =>
        sum + (service.payment_status === "paid" ? service.payment_amount || 0 : 0), 0) || 0

      const todaySvcCount = todayServices?.length || 0

      const weekRevenue = weekServices?.reduce((sum, service) =>
        sum + (service.payment_status === "paid" ? service.payment_amount || 0 : 0), 0) || 0

      const weekSvcCount = weekServices?.length || 0

      // Calculate yesterday's stats
      const yesterdayRevenue = recentServices?.reduce((sum, service) => {
        const serviceDate = new Date(service.created_at)
        const isYesterday = serviceDate.toDateString() === yesterday.toDateString()
        if (isYesterday && service.payment_status === "paid") {
          return sum + (service.payment_amount || 0)
        }
        return sum
      }, 0) || 0

      const yesterdaySvcCount = recentServices?.filter(service => {
        const serviceDate = new Date(service.created_at)
        return serviceDate.toDateString() === yesterday.toDateString()
      }).length || 0

      // Calculate daily breakdown for last 14 days
      const dailyData = []
      for (let i = 13; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD format

        const dayRevenue = recentServices?.reduce((sum, service) => {
          const serviceDate = service.created_at.split('T')[0]
          if (serviceDate === dateStr && service.payment_status === "paid") {
            return sum + (service.payment_amount || 0)
          }
          return sum
        }, 0) || 0

        const dayServices = recentServices?.filter(service =>
          service.created_at.split('T')[0] === dateStr
        ).length || 0

        dailyData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dayRevenue,
          services: dayServices,
        })
      }

      setStats({
        totalContacts: contactsCount || 0,
        monthlyServices: monthlyServices?.length || 0,
        monthlyRevenue,
        pendingAmount,
      })

      setDailyStats({
        todayRevenue,
        todayServices: todaySvcCount,
        thisWeekRevenue: weekRevenue,
        thisWeekServices: weekSvcCount,
        yesterdayRevenue,
        yesterdayServices: yesterdaySvcCount,
      })

      setDailyBreakdown(dailyData)

      // Calculate expense stats
      const weekExpenseTotal = weekExpenses?.reduce((sum, expense) =>
        sum + (expense.amount || 0), 0) || 0

      const monthExpenseTotal = monthExpenses?.reduce((sum, expense) =>
        sum + (expense.amount || 0), 0) || 0

      setExpenseStats({
        thisWeekExpenses: weekExpenseTotal,
        thisMonthExpenses: monthExpenseTotal,
        thisWeekExpenseCount: weekExpenses?.length || 0,
        thisMonthExpenseCount: monthExpenses?.length || 0,
      })

      setTodayReservations(transformedReservations)
      // Note: contacts and serviceTypes are already fetched and stored above in the state when the component initially loads
      // We don't need to refetch them here as they're already available for the service form dialog
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome to your astrology business management system</p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? "..." : stats.totalContacts}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalContacts === 0 ? "No contacts yet" : "Active clients"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Services This Month</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? "..." : stats.monthlyServices}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.monthlyServices === 0 ? "No services logged" : "Services provided"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{isLoading ? "..." : stats.monthlyRevenue.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.monthlyRevenue === 0 ? "No revenue yet" : "From paid services"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Performance */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{isLoading ? "..." : dailyStats.todayRevenue.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dailyStats.todayServices} services logged today
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ₹{isLoading ? "..." : dailyStats.thisWeekRevenue.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dailyStats.thisWeekServices} services this week
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Expense Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week Expenses</CardTitle>
                <DollarSign className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₹{isLoading ? "..." : expenseStats.thisWeekExpenses.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {expenseStats.thisWeekExpenseCount} expenses this week
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month Expenses</CardTitle>
                <DollarSign className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₹{isLoading ? "..." : expenseStats.thisMonthExpenses.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {expenseStats.thisMonthExpenseCount} expenses this month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Pending Payments (moved below daily stats) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 max-w-sm">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <DollarSign className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  ₹{isLoading ? "..." : stats.pendingAmount.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingAmount === 0 ? "All payments up to date" : "Outstanding amount"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Today's Reservations */}
          {todayReservations.length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Today's Reservations</h2>
                <p className="text-sm text-gray-600">Upcoming appointments for today</p>
              </div>
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-4" style={{ width: 'fit-content', minWidth: '100%' }}>
                  {todayReservations.map((reservation) => (
                    <Card key={reservation.id} className="flex-shrink-0 w-64">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">{reservation.contacts.name}</CardTitle>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">Service:</span>
                              <span>{reservation.service_types.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">Time:</span>
                              <span>{new Date(`1970-01-01T${reservation.reservation_time}`).toLocaleTimeString('en-IN', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}</span>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2 pt-2 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReservationComplete(reservation)}
                              className="flex-1 flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="h-3 w-3" />
                              Complete
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReservationDismiss(reservation.id)}
                              className="flex-1 flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-3 w-3" />
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Add New Contact</CardTitle>
                <CardDescription>Add a new client to your contact list</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/contacts?action=add">
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Log New Service</CardTitle>
                <CardDescription>Record a new service provided to a client</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/services?action=add">
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Log Service
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Book Reservation</CardTitle>
                <CardDescription>Schedule a new appointment</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/reserve">
                  <Button className="w-full">
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>View All Reservations</CardTitle>
                <CardDescription>Manage all appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/reserve">
                  <Button variant="outline" className="w-full">
                    <Calendar className="h-4 w-4 mr-2" />
                    Manage Reservations
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Track Expenses</CardTitle>
                <CardDescription>Record and track business expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/expenses">
                  <Button variant="default" className="w-full">
                    <DollarSign className="h-4 w-4 mr-2" />
                    View Expenses
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Service Completion Dialog */}
          <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Complete Reservation</DialogTitle>
                <DialogDescription>
                  Record the service details for this appointment
                </DialogDescription>
              </DialogHeader>

              {selectedReservation && (
                <ServiceForm
                  initialData={{
                    contact_id: selectedReservation.contacts.id,
                    service_type_id: selectedReservation.service_types.id,
                    duration: '',
                    payment_amount: '',
                    payment_mode: 'cash',
                    payment_status: 'paid',
                    notes: ''
                  }}
                  contacts={contacts}
                  serviceTypes={serviceTypes}
                  onSubmit={handleServiceComplete}
                  submitLabel="Complete Service"
                  selectedContact={{
                    id: selectedReservation.contacts.id,
                    name: selectedReservation.contacts.name,
                    phone: null,
                    email: null,
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
