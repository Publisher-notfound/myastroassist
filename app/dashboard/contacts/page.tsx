"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ContactForm } from "@/components/contact-form"
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
import { Plus, Search, Edit, Trash2, Phone, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useSearchParams } from "next/navigation"

interface Contact {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    fetchContacts()
    if (searchParams.get("action") === "add") {
      setIsAddDialogOpen(true)
    }
  }, [searchParams])

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase.from("contacts").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setContacts(data || [])
    } catch (error) {
      console.error("Error fetching contacts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddContact = async (formData: { name: string; phone: string; email: string; address: string; notes: string }) => {
    try {
      const { error } = await supabase.from("contacts").insert([
        {
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          notes: formData.notes || null,
        },
      ])

      if (error) throw error
      setIsAddDialogOpen(false)
      fetchContacts()
    } catch (error) {
      console.error("Error saving contact:", error)
    }
  }

  const handleUpdateContact = async (formData: { name: string; phone: string; email: string; address: string; notes: string }) => {
    if (!editingContact) return

    try {
      const { error } = await supabase
        .from("contacts")
        .update({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          notes: formData.notes || null,
        })
        .eq("id", editingContact.id)

      if (error) throw error
      setIsEditDialogOpen(false)
      setEditingContact(null)
      fetchContacts()
    } catch (error) {
      console.error("Error updating contact:", error)
    }
  }

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      try {
        const { error } = await supabase.from("contacts").delete().eq("id", id)

        if (error) throw error
        fetchContacts()
      } catch (error) {
        console.error("Error deleting contact:", error)
      }
    }
  }

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone?.includes(searchTerm) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
              <p className="text-gray-600">Manage your client contacts</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Contact</DialogTitle>
                    <DialogDescription>Add a new client to your contact list</DialogDescription>
                  </DialogHeader>
                  <ContactForm
                    onSubmit={handleAddContact}
                    submitLabel="Add Contact"
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
                  placeholder="Search contacts by name, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contacts table */}
          <Card>
            <CardHeader>
              <CardTitle>All Contacts ({filteredContacts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading contacts...</div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? "No contacts found matching your search." : "No contacts yet. Add your first contact!"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">{contact.name}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {contact.phone && (
                                <div className="flex items-center text-sm">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {contact.phone}
                                </div>
                              )}
                              {contact.email && (
                                <div className="flex items-center text-sm">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {contact.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{contact.address || "-"}</TableCell>
                          <TableCell className="max-w-xs truncate">{contact.notes || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEdit(contact)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete(contact.id)}>
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Contact</DialogTitle>
                <DialogDescription>Update contact information</DialogDescription>
              </DialogHeader>
              <ContactForm
                initialData={{
                  name: editingContact?.name || '',
                  phone: editingContact?.phone || '',
                  email: editingContact?.email || '',
                  address: editingContact?.address || '',
                  notes: editingContact?.notes || '',
                }}
                onSubmit={handleUpdateContact}
                submitLabel="Update Contact"
              />
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
