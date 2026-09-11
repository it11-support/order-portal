'use client'

import 'sonner/dist/styles.css'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <>
      <style>{`
        [data-rich-colors='true'][data-sonner-toast][data-type='success'] {
          background: #16a34a !important;
          border-color: #16a34a !important;
          color: #ffffff !important;
        }
        [data-rich-colors='true'][data-sonner-toast][data-type='success'] [data-close-button] {
          background: #16a34a !important;
          border-color: #16a34a !important;
          color: #ffffff !important;
        }
        [data-rich-colors='true'][data-sonner-toast][data-type='error'] {
          background: #dc2626 !important;
          border-color: #dc2626 !important;
          color: #ffffff !important;
        }
        [data-rich-colors='true'][data-sonner-toast][data-type='error'] [data-close-button] {
          background: #dc2626 !important;
          border-color: #dc2626 !important;
          color: #ffffff !important;
        }
        [data-rich-colors='true'][data-sonner-toast][data-type='warning'] {
          background: #e2e8f0 !important;
          border-color: #e2e8f0 !important;
          color: #0f172a !important;
        }
        [data-rich-colors='true'][data-sonner-toast][data-type='warning'] [data-close-button] {
          background: #e2e8f0 !important;
          border-color: #e2e8f0 !important;
          color: #0f172a !important;
        }
        [data-rich-colors='true'][data-sonner-toast][data-type='info'] {
          background: #f1f5f9 !important;
          border-color: #e2e8f0 !important;
          color: #0f172a !important;
        }
        [data-rich-colors='true'][data-sonner-toast][data-type='info'] [data-close-button] {
          background: #f1f5f9 !important;
          border-color: #e2e8f0 !important;
          color: #0f172a !important;
        }
        [data-sonner-toaster] [data-sonner-toast] {
          border-radius: var(--radius) !important;
          font-family: 'Inter', system-ui, sans-serif !important;
        }
      `}</style>
      <Sonner
        data-rich-colors="true"
        style={
          {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
            '--success-bg': '#16a34a',
            '--success-border': '#16a34a',
            '--success-text': '#ffffff',
            '--error-bg': '#dc2626',
            '--error-border': '#dc2626',
            '--error-text': '#ffffff',
            '--warning-bg': '#e2e8f0',
            '--warning-border': '#e2e8f0',
            '--warning-text': '#0f172a',
            '--info-bg': '#f1f5f9',
            '--info-border': '#e2e8f0',
            '--info-text': '#0f172a',
            '--border-radius': 'var(--radius)',
          } as React.CSSProperties
        }
        {...props}
      />
    </>
  )
}

export { Toaster }