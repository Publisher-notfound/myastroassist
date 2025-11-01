"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Plus, Edit, Trash2, Calendar, Clock, DollarSign, CheckCircle, XCircle, ArrowLeft } from "lucide-react"

interface MarriageReservation {
  id: string
  contact_id: string
  reservation_date: string
  notes: string | null
  created_at: string
  contacts: { name: string }
}

interface Ceremony {
  id: string
  marriage_service_id: string | null
  reservation_id: string | null
  ceremony_name: string
  ceremony_date: string
  ceremony_time: string
  duration: number | null
  payment_amount: number | null
  payment_status: string
  notes: string | null
  created_at: string
  status: 'reserved' | 'completed'
}

export default function ReservationCeremoniesPage() {
  const params = useParams()
  const router = useRouter()
  const reservationId = params.reservationId as string

  const [marriageReservation, setMarriageReservation] = useState<MarriageReservation | null>(null)
  const [ceremonies, setCeremonies] = useState<Ceremony[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCeremony, setEditingCeremony] = useState<Ceremony | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [reservationId])

  const fetchData = async () => {
    try {
      setIsLoading(true)

      // Fetch marriage reservation details
      const { data: reservationData, error: reservationError } = await supabase
        .from("marriage_reservations")
        .select(`
          *,
          contacts (name)
        `)
        .eq("id", reservationId)
        .single()

      if (reservationError) throw reservationError

      const transformedReservation = {
        ...reservationData,
        contacts: Array.isArray(reservationData.contacts) ? reservationData.contacts[0] : reservationData.contacts
      }
      setMarriageReservation(transformedReservation)

      // Fetch ceremonies for this reservation
      await fetchCeremonies()
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCeremonies = async () => {
    try {
      const response = await fetch(`/api/marriage-ceremonies?reservationId=${reservationId}`)
      if (response.ok) {
        const data = await response.json()
        setCeremonies(data.ceremonies || [])
      }
    } catch (error) {
      console.error("Error fetching ceremonies:", error)
    }
  }

  const handleAddCeremony = async (formData: {
    ceremony_name: string
    ceremony_date: string
    ceremony_time: string
    duration: string
    payment_amount: string
    notes: string
  }) => {
    try {
      const ceremonyData = {
        reservation_id: reservationId,
        marriage_service_id: null, // No service ID for reservations
        ...formData,
        status: 'reserved' // Mark as reserved, not completed
      }

      const response = await fetch('/api/marriage-ceremonies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ceremonyData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create ceremony')
      }

      setIsDialogOpen(false)
      await fetchCeremonies()
    } catch (error) {
      console.error('Error creating ceremony:', error)
      alert('Failed to create ceremony: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleUpdateCeremony = async (formData: {
    ceremony_name: string
    ceremony_date: string
    ceremony_time: string
    duration: string
    payment_amount: string
    notes: string
  }) => {
    if (!editingCeremony) return

    try {
      const ceremonyData = {
        id: editingCeremony.id,
        reservation_id: reservationId,
        marriage_service_id: null,
        ...formData,
        status: 'reserved'
      }

      const response = await fetch('/api/marriage-ceremonies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ceremonyData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update ceremony')
      }

      setIsDialogOpen(false)
      setEditingCeremony(null)
      await fetchCeremonies()
    } catch (error) {
      console.error('Error updating ceremony:', error)
      alert('Failed to update ceremony: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleDeleteCeremony = async (ceremonyId: string) => {
    if (!confirm('Are you sure you want to delete this ceremony reservation?')) return

    try {
      const response = await fetch(`/api/marriage-ceremonies?id=${ceremonyId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete ceremony')
      }

      await fetchCeremonies()
    } catch (error) {
      console.error('Error deleting ceremony:', error)
      alert('Failed to delete ceremony: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const getTotalPayment = () => {
    return ceremonies.reduce((sum, ceremony) => sum + (ceremony.payment_amount || 0), 0)
  }

  const getCeremonyStats = () => {
    const total = ceremonies.length
    const completed = ceremonies.filter(c => c.status === 'completed').length
    return { total, completed }
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading marriage ceremony reservations...</div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  if (!marriageReservation) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="text-center py-8">
            <div className="text-red-600">Marriage reservation not found</div>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  const stats = getCeremonyStats()

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Button variant="ghost" onClick={() => router.back()} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Marriage Services
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Ceremony Reservations</h1>
              <p className="text-gray-600">
                Managing ceremony reservations for {marriageReservation.contacts.name}'s marriage booking
              </p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Ceremony Reservation
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ceremony Reservations</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.completed} completed
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reserved Payment</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ₹{getTotalPayment().toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  For reserved ceremonies
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reservation Date</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {new Date(marriageReservation.reservation_date).toLocaleDateString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground">
                  Marriage reservation date
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ceremonies List */}
          <Card>
            <CardHeader>
              <CardTitle>Ceremony Reservations ({ceremonies.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {ceremonies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No ceremony reservations added yet. Click "Add Ceremony Reservation" to get started!
                </div>
              ) : (
                <div className="space-y-4">
                  {ceremonies.map((ceremony) => (
                    <div key={ceremony.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium">{ceremony.ceremony_name}</h3>
                          <Badge variant={ceremony.status === "completed" ? "default" : "secondary"}>
                            {ceremony.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(ceremony.ceremony_date).toLocaleDateString('en-IN')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {ceremony.ceremony_time}
                          </span>
                          {ceremony.duration && (
                            <span>{ceremony.duration}m</span>
                          )}
                          {ceremony.payment_amount && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ₹{ceremony.payment_amount}
                            </span>
                          )}
                        </div>
                        {ceremony.notes && (
                          <div className="text-sm text-gray-500 mt-1 italic">
                            "{ceremony.notes}"
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingCeremony(ceremony)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCeremony(ceremony.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add/Edit Ceremony Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCeremony ? 'Edit Ceremony Reservation' : 'Add Ceremony Reservation'}
                </DialogTitle>
                <DialogDescription>
                  {editingCeremony ? 'Update ceremony reservation details' : 'Add a ceremony reservation to this marriage booking'}
                </DialogDescription>
              </DialogHeader>

              <ReservationCeremonyForm
                initialData={editingCeremony ? {
                  ceremony_name: editingCeremony.ceremony_name,
                  ceremony_date: editingCeremony.ceremony_date,
                  ceremony_time: editingCeremony.ceremony_time,
                  duration: editingCeremony.duration?.toString() || '',
                  payment_amount: editingCeremony.payment_amount?.toString() || '',
                  notes: editingCeremony.notes || '',
                } : undefined}
                onSubmit={editingCeremony ? handleUpdateCeremony : handleAddCeremony}
                submitLabel={editingCeremony ? 'Update Reservation' : 'Add Reservation'}
                onClose={() => {
                  setIsDialogOpen(false)
                  setEditingCeremony(null)
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}

// Reservation Ceremony Form Component
function ReservationCeremonyForm({
  initialData,
  onSubmit,
  submitLabel,
  onClose
}: {
  initialData?: {
    ceremony_name: string
    ceremony_date: string
    ceremony_time: string
    duration: string
    payment_amount: string
    notes: string
  }
  onSubmit: (data: any) => Promise<void>
  submitLabel: string
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    ceremony_name: '',
    ceremony_date: '',
    ceremony_time: '',
    duration: '',
    payment_amount: '',
    notes: '',
    ...initialData,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ceremony_name">Ceremony Name *</Label>
        <Input
          id="ceremony_name"
          value={formData.ceremony_name}
          onChange={(e) => updateFormData('ceremony_name', e.target.value)}
          placeholder="e.g., Ring Ceremony, Havan, Reception"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ceremony_date">Date *</Label>
        <Input
          id="ceremony_date"
          type="date"
          value={formData.ceremony_date}
          onChange={(e) => updateFormData('ceremony_date', e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ceremony_time">Time *</Label>
        <Input
          id="ceremony_time"
          type="time"
          value={formData.ceremony_time}
          onChange={(e) => updateFormData('ceremony_time', e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">Duration (minutes)</Label>
        <Input
          id="duration"
          type="number"
          placeholder="e.g., 60"
          value={formData.duration}
          onChange={(e) => updateFormData('duration', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment_amount">Reserved Payment Amount (₹)</Label>
        <Input
          id="payment_amount"
          type="number"
          step="0.01"
          placeholder="e.g., 5000"
          value={formData.payment_amount}
          onChange={(e) => updateFormData('payment_amount', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any additional notes about this ceremony reservation..."
          value={formData.notes}
          onChange={(e) => updateFormData('notes', e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
