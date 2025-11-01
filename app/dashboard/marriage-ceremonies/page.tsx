"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Plus, Calendar, Users, DollarSign, Clock, ExternalLink } from "lucide-react"
import { SearchableContactSelector } from "@/components/searchable-contact-selector"

interface MarriageService {
  id: string
  contact_id: string
  service_type_id: string
  created_at: string
  contacts: { name: string; phone: string | null }
  service_types: { name: string }
  ceremony_count: number
  total_payment: number
  completed_ceremonies: number
}

interface Contact {
  id: string
  name: string
  phone: string | null
  email: string | null
}

export default function MarriageCeremoniesPage() {
  const router = useRouter()
  const [marriageServices, setMarriageServices] = useState<MarriageService[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedContact, setSelectedContact] = useState("")

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

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
        // If Marriage Ceremony type doesn't exist yet, show empty list
        setMarriageServices([])
        setContacts([])
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

      // Fetch contacts for creating new marriage services
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("id, name, phone, email")
        .order("name")

      setContacts(contactsData || [])
    } catch (error) {
      console.error("Error fetching marriage services:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateMarriageService = async () => {
    if (!selectedContact) return

    try {
      const serviceData = {
        contact_id: selectedContact,
        service_type_id: "marriage-ceremony", // We'll need to get this dynamically
        duration: null,
        payment_amount: null,
        payment_mode: null,
        payment_status: 'unpaid',
        notes: 'Marriage ceremony service',
      }

      // First get the marriage ceremony service type ID
      const { data: serviceType } = await supabase
        .from("service_types")
        .select("id")
        .eq("name", "Marriage Ceremony")
        .single()

      if (!serviceType) {
        alert("Marriage Ceremony service type not found. Please run the database migration.")
        return
      }

      serviceData.service_type_id = serviceType.id

      const { data, error } = await supabase
        .from("services")
        .insert([serviceData])
        .select()
        .single()

      if (error) throw error

      setIsCreateDialogOpen(false)
      setSelectedContact("")

      // Redirect to the ceremony management page
      router.push(`/dashboard/marriage-ceremonies/${data.id}`)
    } catch (error) {
      console.error('Error creating marriage service:', error)
      alert('Failed to create marriage service: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marriage Ceremonies</h1>
            <p className="text-gray-600">Comprehensive marriage ceremony management system</p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Marriage Services</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marriageServices.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active marriage services
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ceremonies</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {marriageServices.reduce((sum, service) => sum + service.ceremony_count, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all marriages
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{marriageServices.reduce((sum, service) => sum + service.total_payment, 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  From all ceremonies
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Action Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Log Marriage Service */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setIsCreateDialogOpen(true)}>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Log Marriage Service</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Create a new marriage service for a client and manage their ceremonies
                </p>
              </CardContent>
            </Card>

            {/* Reserve Marriage Service */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/dashboard/marriage-reserve')}>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">Reserve Marriage</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Book a marriage ceremony slot for future dates
                </p>
              </CardContent>
            </Card>

            {/* Marriage Services List */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/dashboard/marriage-services')}>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Manage Services</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  View and manage all marriage services with detailed filtering
                </p>
              </CardContent>
            </Card>

            {/* Marriage Calendar */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/dashboard/marriage-calendar')}>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle className="text-lg">Marriage Calendar</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  View marriage ceremonies and services on a calendar
                </p>
              </CardContent>
            </Card>
          </div>



          {/* Create Marriage Service Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Marriage Service</DialogTitle>
                <DialogDescription>
                  Start a new marriage service for a client. You'll be able to add individual ceremonies afterward.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact">Select Client *</Label>
                  <SearchableContactSelector
                    value={selectedContact}
                    onChange={setSelectedContact}
                    placeholder="Search for a client..."
                    contacts={contacts}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false)
                      setSelectedContact("")
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateMarriageService}
                    disabled={!selectedContact}
                    className="flex-1"
                  >
                    Create Service
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
