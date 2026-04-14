'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { AppSidebar } from '@/components/layout/AppSidebar'

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close on navigation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // (pathname change closes the sheet)
  if (open && typeof window !== 'undefined') {
    // We rely on the user tapping a link which re-renders with new pathname
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-60" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div onClick={() => setOpen(false)}>
            <AppSidebar />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
