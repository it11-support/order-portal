'use client'

import * as React from 'react'
import { cn } from './utils'

type DialogContextType = {
  open: boolean
  setOpen: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextType | null>(null)

const useDialog = () => {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog')
  }
  return context
}

type DialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Dialog = ({ open: controlledOpen, onOpenChange, children }: DialogProps) => {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>
}

const DialogTrigger = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { setOpen } = useDialog()
  return (
    <button
      type="button"
      data-slot="dialog-trigger"
      {...props}
      onClick={(e) => {
        props.onClick?.(e)
        setOpen(true)
      }}
    >
      {children}
    </button>
  )
}

const DialogPortal = ({ children }: { children: React.ReactNode }) => {
  const { open } = useDialog()
  if (!open) return null
  return <>{children}</>
}

const DialogOverlay = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const { open } = useDialog()
  if (!open) return null
  return (
    <div
      data-slot="dialog-overlay"
      className={cn('fixed inset-0 z-50 bg-black/50', className)}
      {...props}
    />
  )
}

const DialogContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const { open, setOpen } = useDialog()
  if (!open) return null
  return (
    <div
      data-slot="dialog-content"
      className={cn(
        'fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg sm:max-w-lg',
        className,
      )}
      {...props}
    >
      {children}
      <button
        type="button"
        className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
        onClick={() => setOpen(false)}
        aria-label="Close"
      >
        <span className="text-lg leading-none">&times;</span>
      </button>
    </div>
  )
}

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  )
}

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

const DialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
  return (
    <h2 data-slot="dialog-title" className={cn('text-lg font-semibold', className)} {...props} />
  )
}

const DialogDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
  return (
    <p
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

const DialogClose = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { setOpen } = useDialog()
  return (
    <button
      type="button"
      data-slot="dialog-close"
      {...props}
      onClick={(e) => {
        props.onClick?.(e)
        setOpen(false)
      }}
    >
      {children}
    </button>
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
