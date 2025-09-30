"use client"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ExpenseForm } from "@/components/expense-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DayPicker } from "react-day-picker"
import { createClient } from "@/lib/supabase/client"
import { ChevronLeft, ChevronRight, Edit, Trash2, Plus, DollarSign, Calendar as CalendarIcon } from "lucide-react"
import "react-day-picker/dist/style.css"

interface ExpenseData {
  date: string
  expenses: Array<{
    id: string
    category: string
    title: string
    amount: number
    payment_method: string
    notes: string | null
  }>
}

export default function ExpensesPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [expenses, setExpenses] = useState<Map<string, ExpenseData>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [viewDate, setViewDate] = useState<Date | null>(null)
  const [isViewCalendarOpen, setIsViewCalendarOpen] = useState(false)
  const [viewedDayExpenses, setViewedDayExpenses] = useState<Map<string, ExpenseData>>(new Map())

  const supabase = createClient()

  useEffect(() => {
    fetchExpenses()
  }, [currentMonth])

  const fetchExpenses = async () => {
    try {
      setIsLoading(true)

      // Calculate date range for current month view (broader than reservations since expenses can be in past)
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const startDate = new Date(year, month - 1, 20) // Start 10 days into previous month
      const endDate = new Date(year, month + 2, 10) // End 10 days into next month

      // Fetch expenses
      const { data: expensesData, error } = await supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`)
        .lte("expense_date", `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`)
        .order("expense_date", { ascending: true })
        .order("title", { ascending: true })

      if (error) throw error

      // Group expenses by date
      const expensesMap = new Map<string, ExpenseData>()
      expensesData?.forEach((expense: any) => {
        const date = expense.expense_date
        if (!expensesMap.has(date)) {
          expensesMap.set(date, {
            date,
            expenses: []
          })
        }
        expensesMap.get(date)!.expenses.push(expense)
      })

      setExpenses(expensesMap)
    } catch (error) {
      console.error("Error fetching expenses:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setIsDialogOpen(true)
  }

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date)
  }

  const handleCreateExpense = async (formData: {
    category: string
    title: string
    amount: string
    payment_method: string
    notes: string
    expense_date: string
  }) => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create expense')
      }

      setIsDialogOpen(false)
      setSelectedDate(null)
      setIsEditing(false)
      fetchExpenses() // Refresh the calendar
      if (viewDate) viewExpensesForDate(viewDate) // Refresh viewed expenses
    } catch (error) {
      console.error('Error creating expense:', error)
      alert('Failed to create expense: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleEditExpense = (expense: any) => {
    const fullExpense = expense
    setSelectedExpense(fullExpense)
    const expenseDate = new Date(expense.expense_date + 'T12:00')
    setSelectedDate(expenseDate)
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleUpdateExpense = async (formData: {
    category: string
    title: string
    amount: string
    payment_method: string
    notes: string
    expense_date: string
  }) => {
    if (!selectedExpense || !selectedDate) return

    try {
      const response = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedExpense.id,
          ...formData
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update expense')
      }

      setIsDialogOpen(false)
      setSelectedDate(null)
      setSelectedExpense(null)
      setIsEditing(false)
      fetchExpenses() // Refresh the calendar
      if (viewDate) viewExpensesForDate(viewDate) // Refresh viewed expenses
    } catch (error) {
      console.error('Error updating expense:', error)
      alert('Failed to update expense: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      const response = await fetch(`/api/expenses?id=${expenseId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete expense')
      }

      fetchExpenses() // Refresh the calendar
      if (viewDate) viewExpensesForDate(viewDate) // Refresh viewed expenses
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Failed to delete expense: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleViewDayClick = (date: Date) => {
    setViewDate(date)
    setIsViewCalendarOpen(false)
    viewExpensesForDate(date)
  }

  const viewExpensesForDate = (date: Date) => {
    const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const dayData = expenses.get(localDateStr) || { date: localDateStr, expenses: [] }
    const dayMap = new Map([[localDateStr, dayData]])
    setViewedDayExpenses(dayMap)
  }

  const modifiers = {
    hasExpenses: (date: Date) => {
      const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const data = expenses.get(localDateStr)
      return Boolean(data && data.expenses.length > 0)
    }
  }

  const modifiersStyles = {
    hasExpenses: {
      backgroundColor: '#dc2626', // red
      color: '#ffffff',
      fontWeight: '600'
    }
  }

  const formatCaption = (date: Date) => {
    return `${date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Track Expenses</h1>
            <p className="text-gray-600">Click any date to record expenses (past, present, or future)</p>
          </div>

          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  Loading calendar...
                </div>
              ) : (
                <div className="flex justify-center">
                  <DayPicker
                    mode="single"
                    selected={selectedDate || undefined}
                    onSelect={() => {}}
                    month={currentMonth}
                    onMonthChange={handleMonthChange}
                    modifiers={modifiers}
                    modifiersStyles={modifiersStyles}
                    onDayClick={handleDateClick}
                    className="rounded-md border p-2"
                    formatters={{ formatCaption }}
                    disabled={[]} // Allow all dates including past ones
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-600 rounded"></div>
                  <span>Days with expenses - Click to view</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  Any date - Click to add expense
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date Picker for Viewing Expenses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">View Expenses</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsViewCalendarOpen(!isViewCalendarOpen)}
                  className="flex items-center gap-2"
                >
                  <CalendarIcon className="h-4 w-4" />
                  {viewDate ? new Date(viewDate).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }) : 'Select Date'}
                </Button>
              </div>
              {isViewCalendarOpen && (
                <div className="mt-4 border rounded-md p-2">
                  <DayPicker
                    mode="single"
                    selected={viewDate || undefined}
                    onSelect={(date) => date && handleViewDayClick(date)}
                    required={false}
                    className="text-sm"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent>
              {viewDate ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">
                    Expenses for {new Date(viewDate).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="space-y-2">
                    {viewedDayExpenses.size > 0 ? (
                      Array.from(viewedDayExpenses.values()).map(dayData =>
                        dayData.expenses.map((expense) => (
                          <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{expense.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {expense.category} • ₹{expense.amount.toFixed(2)} • {expense.payment_method}
                              </div>
                              {expense.notes && (
                                <div className="text-sm text-muted-foreground mt-1 italic">
                                  "{expense.notes}"
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditExpense(expense)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )
                    ) : (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No expenses for this date
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Select a date above to view expenses
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expense Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
                <DialogDescription>
                  {isEditing ? 'Update the expense details' : 'Record an expense for this date'}
                </DialogDescription>
              </DialogHeader>

              {selectedDate && (
                <ExpenseForm
                  initialData={isEditing && selectedExpense ? {
                    category: selectedExpense.category,
                    title: selectedExpense.title,
                    amount: selectedExpense.amount.toString(),
                    payment_method: selectedExpense.payment_method,
                    notes: selectedExpense.notes
                  } : undefined}
                  onSubmit={isEditing ? handleUpdateExpense : handleCreateExpense}
                  submitLabel={isEditing ? 'Update Expense' : 'Add Expense'}
                  selectedDate={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
