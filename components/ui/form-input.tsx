'use client'

import React, { memo } from 'react'
import { Input } from './input'
import { Textarea } from './textarea'
import { Label } from './label'

interface FormInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
  isTextarea?: boolean
  placeholder?: string
}

export const FormInput = memo(function FormInput({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  isTextarea = false,
  placeholder,
}: FormInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label} {required && '*'}</Label>
      {isTextarea ? (
        <Textarea
          id={id}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
        />
      ) : (
        <Input
          id={id}
          type={type}
          value={value}
          onChange={handleChange}
          required={required}
          placeholder={placeholder}
        />
      )}
    </div>
  )
})