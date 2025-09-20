"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Clock, DollarSign, Calendar } from "lucide-react"

interface Service {
  id: string
  service_type_id: string
  duration: number | null
  payment_amount: number | null
  payment_mode: string | null
  payment_status: string
  notes: string | null
  created_at: string
  service_types: {
    name: string
  }
}

interface ClientHistoryProps {
  contactId: string
  contactName: string
}

export function ClientHistory({ contactId, contactName }: ClientHistoryProps) {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalSpent, setTotalSpent] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    fetchClientHistory()
  }, [contactId])

  const fetchClientHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          service_types (name)
        `)
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })

      if (error) throw error

      setServices(data || [])

      // Calculate total spent
      const total =
        data?.reduce((sum, service) => {
          return sum + (service.payment_status === "paid" ? service.payment_amount || 0 : 0)
        }, 0) || 0
      setTotalSpent(total)
    } catch (error) {
      console.error("Error fetching client history:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-4">Loading client history...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Service History for {contactName}</h3>
        <div className="text-right">
          <div className="text-sm text-gray-500">Total Spent</div>
          <div className="text-lg font-bold text-green-600">₹{totalSpent.toFixed(2)}</div>
        </div>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">No services recorded for this client yet.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <Card key={service.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="font-medium">{service.service_types.name}</div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(service.created_at).toLocaleDateString()}
                      </div>
                      {service.duration && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {service.duration}m
                        </div>
                      )}
                      {service.payment_amount && (
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />₹{service.payment_amount}
                          {service.payment_mode && <span className="ml-1">({service.payment_mode})</span>}
                        </div>
                      )}
                    </div>
                    {service.notes && <div className="text-sm text-gray-600">{service.notes}</div>}
                  </div>
                  <Badge variant={service.payment_status === "paid" ? "default" : "secondary"}>
                    {service.payment_status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
