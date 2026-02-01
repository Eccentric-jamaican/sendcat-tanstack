import * as React from "react";
import { Check } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  labelClassName?: string;
}

export function Checkbox({
  className,
  labelClassName,
  checked = false,
  onCheckedChange,
  disabled,
  children,
  ...props
}: CheckboxProps) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-2",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        labelClassName,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-gray-300 transition-all",
          checked
            ? "border-[#a23b67] bg-[#a23b67]"
            : "bg-white hover:border-gray-400",
          className,
        )}
      >
        {checked && <Check className="h-3.5 w-3.5 stroke-[3] text-white" />}
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        {...props}
      />
      {children ? <span>{children}</span> : null}
    </label>
  );
}
