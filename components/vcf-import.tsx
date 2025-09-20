'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react'

interface VCFImportProps {
  isOpen: boolean
  onClose: () => void
  onImport: (file: File) => Promise<void>
}

export function VCFImportDialog({ isOpen, onClose, onImport }: VCFImportProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.name.toLowerCase().endsWith('.vcf') &&
          !file.name.toLowerCase().includes('contact')) {
        setError('Please select a .vcf file (vCard format).')
        setSelectedFile(null)
        return
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size too large. Maximum 10MB allowed.')
        setSelectedFile(null)
        return
      }

      setSelectedFile(file)
      setError(null)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      setUploadProgress(25)
      await onImport(selectedFile)
      setUploadProgress(100)

      // Close dialog after successful import
      setTimeout(() => {
        handleClose()
      }, 1000)

    } catch (err) {
      console.error('Import failed:', err)
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setError(null)
    setIsUploading(false)
    setUploadProgress(0)
    onClose()
  }

  const validateFile = (file: File): boolean => {
    const validExtensions = ['.vcf', '.contact']
    const validTypes = [
      'application/octet-stream',
      'text/plain',
      'application/vnd.apple.pkpass4', // Some contact exports
    ]

    const isValidExtension = validExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    )
    const isValidType = validTypes.includes(file.type) || file.type === ''

    return isValidExtension || isValidType
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import VCF Contacts
          </DialogTitle>
          <DialogDescription>
            Upload your VCF file to import contacts into your database.
            Files containing up to 2,200 contacts are supported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="vcf-file">VCF File</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".vcf,.contact,application/octet-stream,text/plain"
                onChange={handleFileSelect}
                className="hidden"
                id="vcf-file"
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                {selectedFile ? selectedFile.name : 'Select VCF File'}
              </Button>
            </div>

            {selectedFile && (
              <div className="text-sm text-muted-foreground">
                <FileText className="h-4 w-4 inline mr-1" />
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {/* Progress Indicator */}
          {isUploading && (
            <div className="space-y-2">
              <Label>Uploading and processing...</Label>
              <Progress value={uploadProgress} className="w-full" />
              <div className="text-sm text-muted-foreground">
                {uploadProgress === 100 ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Import completed successfully!
                  </div>
                ) : (
                  'Please wait while we process your contacts...'
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/15 text-destructive rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm">{error}</div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <strong>VCF Import Notes:</strong>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Supports vCard 2.1, 3.0, and 4.0 formats</li>
                <li>Handles contact deduplication automatically</li>
                <li>Imports names, phone numbers, emails, and addresses</li>
                <li>Large files (2200+ contacts) may take a few minutes</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? 'Importing...' : 'Import Contacts'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
