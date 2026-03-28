'use client'

import { forwardRef } from 'react'

interface NyamInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default'
}

export const NyamInput = forwardRef<HTMLInputElement, NyamInputProps>(
  function NyamInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`nyam-input${className ? ` ${className}` : ''}`}
        {...props}
      />
    )
  },
)
