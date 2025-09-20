"use client"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Download, DollarSign, FileText, Users, AlertCircle } from "lucide-react"

interface MonthlyData {
  month: string
  revenue: number
  services: number
}

interface ServiceTypeData {
  name: string
  count: number
  revenue: number
  color: string
}

interface PendingPayment {
  id: string
  contact_name: string
  service_type: string
  amount: number
  date: string
  phone: string | null
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

export default function ReportsPage() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [serviceTypeData, setServiceTypeData] = useState<ServiceTypeData[]>([])
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalServices, setTotalServices] = useState(0)
  const [totalClients, setTotalClients] = useState(0)
  const [pendingAmount, setPendingAmount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchReportsData()
  }, [selectedYear])

  const fetchReportsData = async () => {
    try {
      const startDate = `${selectedYear}-01-01`
      const endDate = `${selectedYear}-12-31`

      // Fetch services for the selected year
      const { data: services, error: servicesError } = await supabase
        .from("services")
        .select(`
          *,
          contacts (name, phone),
          service_types (name)
        `)
        .gte("created_at", startDate)
        .lte("created_at", endDate)

      if (servicesError) throw servicesError

      // Fetch all contacts count
      const { count: contactsCount, error: contactsError } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })

      if (contactsError) throw contactsError

      // Process monthly data
      const monthlyStats: { [key: string]: { revenue: number; services: number } } = {}
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

      // Initialize all months
      months.forEach((month, index) => {
        monthlyStats[month] = { revenue: 0, services: 0 }
      })

      // Process services data
      let yearRevenue = 0
      let yearServices = 0
      let yearPendingAmount = 0
      const serviceTypes: { [key: string]: { count: number; revenue: number } } = {}
      const pending: PendingPayment[] = []

      services?.forEach((service) => {
        const date = new Date(service.created_at)
        const month = months[date.getMonth()]

        // Monthly stats
        monthlyStats[month].services += 1
        if (service.payment_status === "paid" && service.payment_amount) {
          monthlyStats[month].revenue += service.payment_amount
          yearRevenue += service.payment_amount
        }

        // Service type stats
        const typeName = service.service_types.name
        if (!serviceTypes[typeName]) {
          serviceTypes[typeName] = { count: 0, revenue: 0 }
        }
        serviceTypes[typeName].count += 1
        if (service.payment_status === "paid" && service.payment_amount) {
          serviceTypes[typeName].revenue += service.payment_amount
        }

        // Pending payments
        if (service.payment_status === "unpaid" && service.payment_amount) {
          yearPendingAmount += service.payment_amount
          pending.push({
            id: service.id,
            contact_name: service.contacts.name,
            service_type: service.service_types.name,
            amount: service.payment_amount,
            date: service.created_at,
            phone: service.contacts.phone,
          })
        }

        yearServices += 1
      })

      // Convert to chart data
      const monthlyChartData = months.map((month) => ({
        month,
        revenue: monthlyStats[month].revenue,
        services: monthlyStats[month].services,
      }))

      const serviceTypeChartData = Object.entries(serviceTypes).map(([name, data], index) => ({
        name,
        count: data.count,
        revenue: data.revenue,
        color: COLORS[index % COLORS.length],
      }))

      setMonthlyData(monthlyChartData)
      setServiceTypeData(serviceTypeChartData)
      setPendingPayments(pending)
      setTotalRevenue(yearRevenue)
      setTotalServices(yearServices)
      setTotalClients(contactsCount || 0)
      setPendingAmount(yearPendingAmount)
    } catch (error) {
      console.error("Error fetching reports data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportToCSV = () => {
    const csvData = [
      ["Month", "Revenue", "Services"],
      ...monthlyData.map((item) => [item.month, item.revenue, item.services]),
    ]

    const csvContent = csvData.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `astrology-report-${selectedYear}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="text-center py-8">Loading reports...</div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-gray-600">Business insights and performance metrics</p>
            </div>
            <div className="flex gap-2">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue ({selectedYear})</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₹{totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">From paid services</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Services Provided</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalServices}</div>
                <p className="text-xs text-muted-foreground">Total services in {selectedYear}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalClients}</div>
                <p className="text-xs text-muted-foreground">Active client base</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">₹{pendingAmount.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{pendingPayments.length} unpaid services</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue ({selectedYear})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${value}`, "Revenue"]} />
                      <Bar dataKey="revenue" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Service Types Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Service Types Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, count }) => `${name} (${count})`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {serviceTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Types Table */}
          <Card>
            <CardHeader>
              <CardTitle>Service Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Avg. Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceTypeData.map((service) => (
                    <TableRow key={service.name}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{service.count}</TableCell>
                      <TableCell>₹{service.revenue.toFixed(2)}</TableCell>
                      <TableCell>
                        ₹{service.count > 0 ? (service.revenue / service.count).toFixed(2) : "0.00"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pending Payments */}
          {pendingPayments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{payment.contact_name}</div>
                            {payment.phone && <div className="text-sm text-gray-500">{payment.phone}</div>}
                          </div>
                        </TableCell>
                        <TableCell>{payment.service_type}</TableCell>
                        <TableCell>₹{payment.amount.toFixed(2)}</TableCell>
                        <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Unpaid</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
