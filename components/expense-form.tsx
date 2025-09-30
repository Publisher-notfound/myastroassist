"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'

interface ExpenseFormData {
  category: string
  title: string
  amount: string
  payment_method: string
  notes: string
}

interface ExpenseFormProps {
  initialData?: Partial<ExpenseFormData>
  onSubmit: (data: ExpenseFormData & { expense_date: string }) => Promise<void>
  submitLabel: string
  selectedDate: string // YYYY-MM-DD format
}

const EXPENSE_CATEGORIES = [
  'Office Supplies',
  'Marketing',
  'Utilities',
  'Rent',
  'Software',
  'Equipment',
  'Transportation',
  'Education',
  'Health & Insurance',
  'Professional Services',
  'Entertainment',
  'Miscellaneous'
]

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' }
]

export function ExpenseForm({ initialData = {}, onSubmit, submitLabel, selectedDate }: ExpenseFormProps) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    category: '',
    title: '',
    amount: '',
    payment_method: 'cash',
    notes: '',
    ...initialData,
  })

  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)

  // Fetch title suggestions when category changes
  useEffect(() => {
    if (formData.category && formData.category.trim()) {
      fetchTitleSuggestions(formData.category.trim())
    } else {
      setTitleSuggestions([])
    }
  }, [formData.category])

  const fetchTitleSuggestions = async (category: string) => {
    setIsLoadingSuggestions(true)
    try {
      const response = await fetch(`/api/expenses/titles?category=${encodeURIComponent(category)}`)
      if (response.ok) {
        const data = await response.json()
        setTitleSuggestions(data.titles || [])
      }
    } catch (error) {
      console.error('Error fetching title suggestions:', error)
      setTitleSuggestions([])
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        ...formData,
        expense_date: selectedDate
      })

      // Don't reset form here - let parent handle it
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (field: keyof ExpenseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Selected Date Display */}
      <div className="p-3 bg-gray-50 rounded-lg border">
        <div className="text-sm font-medium text-gray-600">Expense Date</div>
        <div className="text-lg font-semibold">
          {new Date(selectedDate + 'T12:00').toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => updateFormData('category', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select expense category" />
          </SelectTrigger>
          <SelectContent>
            {EXPENSE_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <div className="relative">
          <Input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => updateFormData('title', e.target.value)}
            placeholder="Enter expense title..."
            list="title-suggestions"
          />
          <datalist id="title-suggestions">
            {titleSuggestions.map((title, index) => (
              <option key={index} value={title} />
            ))}
          </datalist>
          {isLoadingSuggestions && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              Loading...
            </div>
          )}
        </div>
        {titleSuggestions.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Previous titles in this category: {titleSuggestions.slice(0, 3).join(', ')}
            {titleSuggestions.length > 3 && ` + ${titleSuggestions.length - 3} more`}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount (₹) *</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          value={formData.amount}
          onChange={(e) => updateFormData('amount', e.target.value)}
          placeholder="e.g., 1500.00"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment_method">Payment Method *</Label>
        <Select
          value={formData.payment_method}
          onValueChange={(value) => updateFormData('payment_method', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((method) => (
              <SelectItem key={method.value} value={method.value}>
                {method.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => updateFormData('notes', e.target.value)}
          placeholder="Any additional notes about the expense..."
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  )
}
