"use client"

import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, FileText, DollarSign, Plus } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalContacts: 0,
    monthlyServices: 0,
    monthlyRevenue: 0,
    pendingAmount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // Get current month date range
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      // Fetch total contacts
      const { count: contactsCount } = await supabase.from("contacts").select("*", { count: "exact", head: true })

      // Fetch monthly services and revenue
      const { data: monthlyServices } = await supabase
        .from("services")
        .select("payment_amount, payment_status")
        .gte("created_at", startOfMonth.toISOString())
        .lte("created_at", endOfMonth.toISOString())

      // Fetch pending payments
      const { data: pendingServices } = await supabase
        .from("services")
        .select("payment_amount")
        .eq("payment_status", "unpaid")

      const monthlyRevenue =
        monthlyServices?.reduce((sum, service) => {
          return sum + (service.payment_status === "paid" ? service.payment_amount || 0 : 0)
        }, 0) || 0

      const pendingAmount =
        pendingServices?.reduce((sum, service) => {
          return sum + (service.payment_amount || 0)
        }, 0) || 0

      setStats({
        totalContacts: contactsCount || 0,
        monthlyServices: monthlyServices?.length || 0,
        monthlyRevenue,
        pendingAmount,
      })
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
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

          {/* Quick actions */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <CardTitle>View Reports</CardTitle>
                <CardDescription>Check your business analytics and reports</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/reports">
                  <Button variant="outline" className="w-full bg-transparent">
                    <FileText className="h-4 w-4 mr-2" />
                    View Reports
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
