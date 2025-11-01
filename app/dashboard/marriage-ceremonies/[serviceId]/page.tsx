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
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

interface MarriageService {
  id: string
  contact_id: string
  service_type_id: string
  created_at: string
  contacts: { name: string }
  service_types: { name: string }
}

interface Ceremony {
  id: string
  marriage_service_id: string
  ceremony_name: string
  ceremony_date: string
  ceremony_time: string
  duration: number | null
  payment_amount: number | null
  payment_status: string
  notes: string | null
  created_at: string
}

interface CeremonySuggestion {
  ceremony_name: string
  usage_count: number
}

export default function MarriageCeremoniesPage() {
  const params = useParams()
  const router = useRouter()
  const serviceId = params.serviceId as string

  const [marriageService, setMarriageService] = useState<MarriageService | null>(null)
  const [ceremonies, setCeremonies] = useState<Ceremony[]>([])
  const [suggestions, setSuggestions] = useState<CeremonySuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCeremony, setEditingCeremony] = useState<Ceremony | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [serviceId])

  const fetchData = async () => {
    try {
      setIsLoading(true)

      // Fetch marriage service details
      const { data: serviceData, error: serviceError } = await supabase
        .from("services")
        .select(`
          id,
          contact_id,
          service_type_id,
          created_at,
          contacts (name),
          service_types (name)
        `)
        .eq("id", serviceId)
        .single()

      if (serviceError) throw serviceError
      // Transform the data to match our interface
      const transformedService = {
        ...serviceData,
        contacts: Array.isArray(serviceData.contacts) ? serviceData.contacts[0] : serviceData.contacts,
        service_types: Array.isArray(serviceData.service_types) ? serviceData.service_types[0] : serviceData.service_types
      }
      setMarriageService(transformedService)

      // Set default date to service creation date
      if (serviceData) {
        setSelectedDate(new Date(serviceData.created_at))
      }

      // Fetch ceremonies
      await fetchCeremonies()

      // Fetch suggestions
      const { data: suggestionsData } = await supabase
        .from("marriage_ceremony_suggestions")
        .select("ceremony_name, usage_count")
        .order("usage_count", { ascending: false })
        .limit(10)

      setSuggestions(suggestionsData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCeremonies = async () => {
    try {
      const response = await fetch(`/api/marriage-ceremonies?serviceId=${serviceId}`)
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
    payment_status: string
    notes: string
  }) => {
    try {
      const ceremonyData = {
        marriage_service_id: serviceId,
        ...formData
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
    payment_status: string
    notes: string
  }) => {
    if (!editingCeremony) return

    try {
      const ceremonyData = {
        id: editingCeremony.id,
        marriage_service_id: serviceId,
        ...formData
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
    if (!confirm('Are you sure you want to delete this ceremony?')) return

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
    const completed = ceremonies.filter(c => c.payment_status === 'paid').length
    return { total, completed }
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading marriage ceremonies...</div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  if (!marriageService) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="text-center py-8">
            <div className="text-red-600">Marriage service not found</div>
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
                Back to Services
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Marriage Ceremonies</h1>
              <p className="text-gray-600">
                Managing ceremonies for {marriageService.contacts.name}'s {marriageService.service_types.name}
              </p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Ceremony
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ceremonies</CardTitle>
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
                <CardTitle className="text-sm font-medium">Total Payment</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{getTotalPayment().toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all ceremonies
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Service Date</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {new Date(marriageService.created_at).toLocaleDateString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground">
                  Marriage service logged
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ceremonies List */}
          <Card>
            <CardHeader>
              <CardTitle>Ceremonies ({ceremonies.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {ceremonies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No ceremonies added yet. Click "Add Ceremony" to get started!
                </div>
              ) : (
                <div className="space-y-4">
                  {ceremonies.map((ceremony) => (
                    <div key={ceremony.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium">{ceremony.ceremony_name}</h3>
                          <Badge variant={ceremony.payment_status === "paid" ? "default" : "secondary"}>
                            {ceremony.payment_status}
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
                            setSelectedDate(new Date(ceremony.ceremony_date))
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
                  {editingCeremony ? 'Edit Ceremony' : 'Add Ceremony'}
                </DialogTitle>
                <DialogDescription>
                  {editingCeremony ? 'Update ceremony details' : 'Add a new ceremony to this marriage service'}
                </DialogDescription>
              </DialogHeader>

              <CeremonyForm
                initialData={editingCeremony ? {
                  ceremony_name: editingCeremony.ceremony_name,
                  ceremony_date: editingCeremony.ceremony_date,
                  ceremony_time: editingCeremony.ceremony_time,
                  duration: editingCeremony.duration?.toString() || '',
                  payment_amount: editingCeremony.payment_amount?.toString() || '',
                  payment_status: editingCeremony.payment_status,
                  notes: editingCeremony.notes || '',
                } : undefined}
                suggestions={suggestions}
                selectedDate={selectedDate}
                onSubmit={editingCeremony ? handleUpdateCeremony : handleAddCeremony}
                submitLabel={editingCeremony ? 'Update Ceremony' : 'Add Ceremony'}
                onClose={() => {
                  setIsDialogOpen(false)
                  setEditingCeremony(null)
                  setSelectedDate(marriageService ? new Date(marriageService.created_at) : null)
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}

// Ceremony Form Component
function CeremonyForm({
  initialData,
  suggestions,
  selectedDate,
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
    payment_status: string
    notes: string
  }
  suggestions: CeremonySuggestion[]
  selectedDate: Date | null
  onSubmit: (data: any) => Promise<void>
  submitLabel: string
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    ceremony_name: '',
    ceremony_date: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
    ceremony_time: '',
    duration: '',
    payment_amount: '',
    payment_status: 'unpaid',
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
      {/* Ceremony Name with Suggestions */}
      <div className="space-y-2">
        <Label htmlFor="ceremony_name">Ceremony Name *</Label>
        <div className="relative">
          <Input
            id="ceremony_name"
            value={formData.ceremony_name}
            onChange={(e) => updateFormData('ceremony_name', e.target.value)}
            placeholder="e.g., Ring Ceremony, Havan, Reception"
            required
            list="ceremony-suggestions"
          />
          <datalist id="ceremony-suggestions">
            {suggestions.map((suggestion, index) => (
              <option key={index} value={suggestion.ceremony_name} />
            ))}
          </datalist>
        </div>
        {suggestions.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Popular ceremonies: {suggestions.slice(0, 3).map(s => s.ceremony_name).join(', ')}
          </div>
        )}
      </div>

      {/* Date */}
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

      {/* Time */}
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

      {/* Duration */}
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

      {/* Payment Amount */}
      <div className="space-y-2">
        <Label htmlFor="payment_amount">Payment Amount (₹)</Label>
        <Input
          id="payment_amount"
          type="number"
          step="0.01"
          placeholder="e.g., 5000"
          value={formData.payment_amount}
          onChange={(e) => updateFormData('payment_amount', e.target.value)}
        />
      </div>

      {/* Payment Status */}
      <div className="space-y-2">
        <Label htmlFor="payment_status">Payment Status</Label>
        <Select
          value={formData.payment_status}
          onValueChange={(value) => updateFormData('payment_status', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any additional notes about this ceremony..."
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
