import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[120] rounded-md border border-fuchsia-200/70 bg-[#FDF0FB] px-2 py-1 text-[11px] font-medium tracking-tight text-fuchsia-900 shadow-sm transition-all duration-150 ease-out data-[state=delayed-open]:opacity-100 data-[state=delayed-open]:translate-y-0 data-[state=closed]:opacity-0 data-[state=closed]:translate-y-1",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent }
