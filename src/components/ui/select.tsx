"use client"

import { Select as SelectPrimitive } from "@base-ui/react/select"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectProps
  extends Omit<React.ComponentProps<typeof SelectPrimitive.Root>, "onValueChange"> {
  onValueChange?: (value: string) => void
}

function Select({ children, onValueChange, ...props }: SelectProps) {
  return (
    <SelectPrimitive.Root
      {...props}
      onValueChange={
        onValueChange ? (v: unknown) => onValueChange(v as string) : undefined
      }
    >
      {children}
    </SelectPrimitive.Root>
  )
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectValue({
  className,
  placeholder,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value> & { placeholder?: string }) {
  return (
    <SelectPrimitive.Value
      className={cn("flex-1 text-left", className)}
      placeholder={placeholder}
      {...props}
    />
  )
}

function SelectContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Positioner>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        className="z-50"
        {...props}
      >
        <SelectPrimitive.Popup
          className={cn(
            "relative min-w-[8rem] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[starting-style]:animate-in data-[starting-style]:fade-in-0",
            className
          )}
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText className="pl-5">{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
}
