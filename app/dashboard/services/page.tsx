"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ServiceForm } from "@/components/service-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, Clock, DollarSign, User } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useSearchParams } from "next/navigation"

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

interface Service {
  id: string
  contact_id: string
  service_type_id: string
  duration: number | null
  payment_amount: number | null
  payment_mode: string | null
  payment_status: string
  notes: string | null
  created_at: string
  contacts: Contact
  service_types: ServiceType
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
    if (searchParams.get("action") === "add") {
      setIsAddDialogOpen(true)
    }
  }, [searchParams])

  const fetchData = async () => {
    try {
      // Fetch services with related data
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select(`
          *,
          contacts (id, name, phone, email),
          service_types (id, name)
        `)
        .order("created_at", { ascending: false })

      if (servicesError) throw servicesError

      // Fetch contacts - remove limit to get all contacts for the service form
      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts")
        .select("id, name, phone, email")
        .order("name")

      if (contactsError) throw contactsError

      // Fetch service types
      const { data: serviceTypesData, error: serviceTypesError } = await supabase
        .from("service_types")
        .select("*")
        .order("name")

      if (serviceTypesError) throw serviceTypesError

      setServices(servicesData || [])
      setContacts(contactsData || [])
      setServiceTypes(serviceTypesData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddService = async (formData: {
    contact_id: string
    service_type_id: string
    duration: string
    payment_amount: string
    payment_mode: string
    payment_status: string
    notes: string
  }) => {
    try {
      const serviceData = {
        contact_id: formData.contact_id,
        service_type_id: formData.service_type_id,
        duration: formData.duration ? Number.parseInt(formData.duration) : null,
        payment_amount: formData.payment_amount ? Number.parseFloat(formData.payment_amount) : null,
        payment_mode: formData.payment_mode || null,
        payment_status: formData.payment_status,
        notes: formData.notes || null,
      }

      const { error } = await supabase.from("services").insert([serviceData])
      if (error) throw error

      setIsAddDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error("Error saving service:", error)
    }
  }

  const handleUpdateService = async (formData: {
    contact_id: string
    service_type_id: string
    duration: string
    payment_amount: string
    payment_mode: string
    payment_status: string
    notes: string
  }) => {
    if (!editingService) return

    try {
      const serviceData = {
        contact_id: formData.contact_id,
        service_type_id: formData.service_type_id,
        duration: formData.duration ? Number.parseInt(formData.duration) : null,
        payment_amount: formData.payment_amount ? Number.parseFloat(formData.payment_amount) : null,
        payment_mode: formData.payment_mode || null,
        payment_status: formData.payment_status,
        notes: formData.notes || null,
      }

      const { error } = await supabase.from("services").update(serviceData).eq("id", editingService.id)
      if (error) throw error

      setIsEditDialogOpen(false)
      setEditingService(null)
      fetchData()
    } catch (error) {
      console.error("Error updating service:", error)
    }
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this service record?")) {
      try {
        const { error } = await supabase.from("services").delete().eq("id", id)

        if (error) throw error
        fetchData()
      } catch (error) {
        console.error("Error deleting service:", error)
      }
    }
  }

  const filteredServices = services.filter(
    (service) =>
      service.contacts.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.service_types.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Services</h1>
              <p className="text-gray-600">Log and manage your astrology services</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Log Service
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Log New Service</DialogTitle>
                    <DialogDescription>Record a service provided to a client</DialogDescription>
                  </DialogHeader>
                  <ServiceForm
                    onSubmit={handleAddService}
                    submitLabel="Log Service"
                    contacts={contacts}
                    serviceTypes={serviceTypes}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search services by client name or service type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Services table */}
          <Card>
            <CardHeader>
              <CardTitle>Service Records ({filteredServices.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading services...</div>
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm
                    ? "No services found matching your search."
                    : "No services logged yet. Log your first service!"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredServices.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2 text-gray-400" />
                              <div>
                                <div className="font-medium">{service.contacts.name}</div>
                                {service.contacts.phone && (
                                  <div className="text-sm text-gray-500">{service.contacts.phone}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{service.service_types.name}</TableCell>
                          <TableCell>
                            {service.duration ? (
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1 text-gray-400" />
                                {service.duration}m
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {service.payment_amount ? (
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-1 text-gray-400" />₹{service.payment_amount}
                                {service.payment_mode && (
                                  <span className="text-sm text-gray-500 ml-1">({service.payment_mode})</span>
                                )}
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={service.payment_status === "paid" ? "default" : "secondary"}>
                              {service.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(service.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEdit(service)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete(service.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Service</DialogTitle>
                <DialogDescription>Update service information</DialogDescription>
              </DialogHeader>
              <ServiceForm
                initialData={{
                  contact_id: editingService?.contact_id || '',
                  service_type_id: editingService?.service_type_id || '',
                  duration: editingService?.duration?.toString() || '',
                  payment_amount: editingService?.payment_amount?.toString() || '',
                  payment_mode: editingService?.payment_mode || '',
                  payment_status: editingService?.payment_status || 'unpaid',
                  notes: editingService?.notes || '',
                }}
                onSubmit={handleUpdateService}
                submitLabel="Update Service"
                contacts={contacts}
                serviceTypes={serviceTypes}
              />
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
