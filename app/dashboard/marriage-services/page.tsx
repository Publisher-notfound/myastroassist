"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Calendar, Users, DollarSign, Clock, ExternalLink, Search, Filter, ArrowLeft } from "lucide-react"

interface MarriageService {
  id: string
  contact_id: string
  service_type_id: string
  created_at: string
  payment_amount: number | null
  contacts: { name: string; phone: string | null }
  service_types: { name: string }
  ceremony_count: number
  total_payment: number
  completed_ceremonies: number
  has_ceremonies: boolean
}

export default function MarriageServicesPage() {
  const router = useRouter()
  const [marriageServices, setMarriageServices] = useState<MarriageService[]>([])
  const [filteredServices, setFilteredServices] = useState<MarriageService[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [yearFilter, setYearFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterServices()
  }, [marriageServices, searchTerm, yearFilter, statusFilter])

  const fetchData = async () => {
    try {
      setIsLoading(true)

      // First get the Marriage Ceremony service type ID
      const { data: marriageServiceType, error: typeError } = await supabase
        .from("service_types")
        .select("id")
        .eq("name", "Marriage Ceremony")
        .single()

      if (typeError || !marriageServiceType) {
        setMarriageServices([])
        setIsLoading(false)
        return
      }

      // Fetch marriage services with ceremony counts
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select(`
          id,
          contact_id,
          service_type_id,
          created_at,
          payment_amount,
          contacts (name, phone),
          service_types (name)
        `)
        .eq("service_type_id", marriageServiceType.id)
        .order("created_at", { ascending: false })

      if (servicesError) throw servicesError

      // Fetch ceremony counts and payments for each service
      const servicesWithCounts = await Promise.all(
        (servicesData || []).map(async (service) => {
          const { data: ceremonies } = await supabase
            .from("marriage_ceremonies")
            .select("payment_amount, payment_status")
            .eq("marriage_service_id", service.id)

          const ceremony_count = ceremonies?.length || 0
          const ceremony_payment = ceremonies?.reduce((sum, c) => sum + (c.payment_amount || 0), 0) || 0

          // Include service payment if no ceremonies exist yet (for existing marriages)
          const total_payment = ceremony_payment || service.payment_amount || 0
          const completed_ceremonies = ceremonies?.filter(c => c.payment_status === 'paid').length || 0

          return {
            ...service,
            contacts: Array.isArray(service.contacts) ? service.contacts[0] : service.contacts,
            service_types: Array.isArray(service.service_types) ? service.service_types[0] : service.service_types,
            ceremony_count,
            total_payment,
            completed_ceremonies,
            has_ceremonies: ceremony_count > 0
          }
        })
      )

      setMarriageServices(servicesWithCounts)
    } catch (error) {
      console.error("Error fetching marriage services:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterServices = () => {
    let filtered = marriageServices

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.contacts.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Year filter
    if (yearFilter !== "all") {
      const year = parseInt(yearFilter)
      filtered = filtered.filter(service => {
        const serviceYear = new Date(service.created_at).getFullYear()
        return serviceYear === year
      })
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(service => {
        switch (statusFilter) {
          case "setup-needed":
            return service.ceremony_count === 0
          case "in-progress":
            return service.ceremony_count > 0 && service.completed_ceremonies < service.ceremony_count
          case "completed":
            return service.completed_ceremonies === service.ceremony_count && service.ceremony_count > 0
          default:
            return true
        }
      })
    }

    setFilteredServices(filtered)
  }

  const getAvailableYears = () => {
    const years = new Set(marriageServices.map(service =>
      new Date(service.created_at).getFullYear()
    ))
    return Array.from(years).sort((a, b) => b - a) // Most recent first
  }

  const getStats = () => {
    const total = marriageServices.length
    const setupNeeded = marriageServices.filter(s => s.ceremony_count === 0).length
    const inProgress = marriageServices.filter(s => s.ceremony_count > 0 && s.completed_ceremonies < s.ceremony_count).length
    const completed = marriageServices.filter(s => s.completed_ceremonies === s.ceremony_count && s.ceremony_count > 0).length
    const totalRevenue = marriageServices.reduce((sum, s) => sum + s.total_payment, 0)
    const totalCeremonies = marriageServices.reduce((sum, s) => sum + s.ceremony_count, 0)

    return { total, setupNeeded, inProgress, completed, totalRevenue, totalCeremonies }
  }

  const stats = getStats()

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Button variant="ghost" onClick={() => router.back()} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Marriage Ceremonies
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Marriage Services</h1>
              <p className="text-gray-600">Detailed view of all marriage services with filtering and statistics</p>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Services</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Setup Needed</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.setupNeeded}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <Clock className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ceremonies</CardTitle>
                <Users className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.totalCeremonies}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₹{stats.totalRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by client name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Year Filter */}
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {getAvailableYears().map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="setup-needed">Setup Needed</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Clear Filters */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setYearFilter("all")
                      setStatusFilter("all")
                    }}
                    className="w-full sm:w-auto"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Marriage Services List */}
          <Card>
            <CardHeader>
              <CardTitle>Marriage Services ({filteredServices.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Loading marriage services...
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">
                    {marriageServices.length === 0 ? "No Marriage Services Yet" : "No services match your filters"}
                  </h3>
                  <p className="text-sm mb-4">
                    {marriageServices.length === 0
                      ? "Create your first marriage service to get started."
                      : "Try adjusting your search or filter criteria."
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredServices.map((service) => (
                    <div key={service.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <h3 className="font-medium text-lg">{service.contacts.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {service.ceremony_count} ceremonies
                            </Badge>
                            {service.ceremony_count === 0 && (
                              <Badge variant="secondary" className="text-xs">Setup Needed</Badge>
                            )}
                            {service.ceremony_count > 0 && service.completed_ceremonies < service.ceremony_count && (
                              <Badge variant="default" className="text-xs">In Progress</Badge>
                            )}
                            {service.completed_ceremonies === service.ceremony_count && service.ceremony_count > 0 && (
                              <Badge variant="default" className="bg-green-100 text-green-800 text-xs">Completed</Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{new Date(service.created_at).toLocaleDateString('en-IN')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 flex-shrink-0" />
                              <span>₹{service.total_payment.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 flex-shrink-0" />
                              <span>{service.completed_ceremonies}/{service.ceremony_count} completed</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col gap-2 sm:w-auto w-full">
                          <Button
                            variant="outline"
                            onClick={() => router.push(`/dashboard/marriage-ceremonies/${service.id}`)}
                            className="w-full sm:w-auto whitespace-nowrap"
                            size="sm"
                          >
                            <ExternalLink className="h-3 w-3 mr-2" />
                            Manage Ceremonies
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
