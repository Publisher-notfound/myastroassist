"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ClientHistory } from "@/components/client-history"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Phone, Mail, MapPin, FileText } from "lucide-react"
import Link from "next/link"

interface Contact {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export default function ContactDetailPage() {
  const params = useParams()
  const contactId = params.id as string
  const [contact, setContact] = useState<Contact | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchContact()
  }, [contactId])

  const fetchContact = async () => {
    try {
      const { data, error } = await supabase.from("contacts").select("*").eq("id", contactId).single()

      if (error) throw error
      setContact(data)
    } catch (error) {
      console.error("Error fetching contact:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="text-center py-8">Loading contact details...</div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  if (!contact) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="text-center py-8">
            <div className="text-gray-500">Contact not found</div>
            <Link href="/dashboard/contacts">
              <Button className="mt-4">Back to Contacts</Button>
            </Link>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/contacts">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
              <p className="text-gray-600">Client Details & History</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contact Information */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contact.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-3 text-gray-400" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-3 text-gray-400" />
                      <span>{contact.email}</span>
                    </div>
                  )}
                  {contact.address && (
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 mr-3 mt-0.5 text-gray-400" />
                      <span>{contact.address}</span>
                    </div>
                  )}
                  {contact.notes && (
                    <div className="flex items-start">
                      <FileText className="h-4 w-4 mr-3 mt-0.5 text-gray-400" />
                      <span>{contact.notes}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <div className="text-sm text-gray-500">
                      Added on {new Date(contact.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Service History */}
            <div className="lg:col-span-2">
              <ClientHistory contactId={contact.id} contactName={contact.name} />
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
