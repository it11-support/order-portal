import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Icon } from '@iconify/react'

import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'

interface IconItem {
  name: string
  icon: string
}

const ICONS: IconItem[] = [
  // Beverage
  { name: 'Beverage', icon: 'mdi:cup' },
  { name: 'Coffee', icon: 'mdi:coffee' },
  { name: 'Tea', icon: 'mdi:tea' },
  { name: 'Water', icon: 'mdi:water' },
  { name: 'Bottle', icon: 'mdi:bottle-soda' },
  { name: 'Glass', icon: 'mdi:glass-cocktail' },
  { name: 'Drink', icon: 'mdi:glass-mug-variant' },

  // Dairy / Food
  { name: 'Dairy', icon: 'mdi:cheese' },
  { name: 'Food', icon: 'mdi:food' },
  { name: 'Fruit', icon: 'mdi:fruit-cherries' },
  { name: 'Apple', icon: 'mdi:food-apple' },
  { name: 'Bread', icon: 'mdi:bread-slice' },
  { name: 'Egg', icon: 'mdi:egg' },
  { name: 'Grain', icon: 'mdi:barley' },

  // Sauce / Condiment
  { name: 'Sauce', icon: 'mdi:bottle-tonic' },
  { name: 'Salt', icon: 'mdi:shaker-outline' },
  { name: 'Spice', icon: 'mdi:chili-mild' },

  // Chemical
  { name: 'Chemical', icon: 'mdi:flask' },
  { name: 'Laboratory', icon: 'mdi:test-tube' },
  { name: 'Chemical Bottle', icon: 'mdi:flask-empty-outline' },
  { name: 'Spray', icon: 'mdi:spray-bottle' },

  // Cleaning
  { name: 'Cleaning', icon: 'mdi:broom' },
  { name: 'Brush', icon: 'mdi:brush' },

  // Tissue / Paper
  { name: 'Tissue', icon: 'mdi:paper-roll' },
  { name: 'Toilet', icon: 'mdi:toilet' },
  { name: 'Paper', icon: 'mdi:file-document-outline' },
  { name: 'Document', icon: 'mdi:file-outline' },

  // Packaging
  { name: 'Package', icon: 'mdi:package-variant' },
  { name: 'Box', icon: 'mdi:package-variant-closed' },
  { name: 'Bag', icon: 'mdi:shopping' },
  { name: 'Cart', icon: 'mdi:cart' },
  { name: 'Warehouse', icon: 'mdi:warehouse' },
  { name: 'Delivery', icon: 'mdi:truck-delivery' },

  // General
  { name: 'Home', icon: 'mdi:home-outline' },
  { name: 'Store', icon: 'mdi:store-outline' },
  { name: 'Product', icon: 'mdi:tag-outline' },
]

interface IconPickerProps {
  value?: string
  onChange: (iconName: string) => void
}

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return ICONS
    const q = search.toLowerCase()
    return ICONS.filter((item) => item.name.toLowerCase().includes(q))
  }, [search])

  const selectedIcon = useMemo(() => ICONS.find((item) => item.icon === value), [value])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleSelect = (iconName: string) => {
    onChange(iconName)
    setOpen(false)
    setSearch('')
  }

  const handleClear = () => {
    onChange('')
    setOpen(false)
    setSearch('')
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        className="w-full justify-start gap-2 h-10"
        type="button"
        onClick={() => setOpen(!open)}
      >
        {selectedIcon ? (
          <>
            <Icon
              icon={selectedIcon.icon}
              width={20}
              height={20}
              className="shrink-0 text-emerald-600"
            />
            <span className="text-sm">{selectedIcon.name}</span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Pilih ikon...</span>
        )}
      </Button>
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-xl shadow-lg p-3 space-y-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ikon..."
            className="h-8 text-sm"
          />
          <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto">
            {filtered.map(({ name, icon }) => {
              const isSelected = value === icon

              return (
                <button
                  key={icon}
                  type="button"
                  onClick={() => handleSelect(icon)}
                  title={name}
                  className={`
                    p-2 rounded-lg border transition-all duration-150
                    flex items-center justify-center
                    ${
                      isSelected
                        ? 'border-emerald-400/70 bg-emerald-50'
                        : 'border-transparent hover:border-emerald-300/60'
                    }
                  `}
                >
                  <Icon icon={icon} width={20} height={20} className="text-emerald-600" />
                </button>
              )
            })}

            {filtered.length === 0 && (
              <p className="col-span-6 py-4 text-center text-xs text-muted-foreground">
                Tidak ditemukan
              </p>
            )}
          </div>
          {value && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="w-full text-xs">
              Hapus pilihan
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default IconPicker
