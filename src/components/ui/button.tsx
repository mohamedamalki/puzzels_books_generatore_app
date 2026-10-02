import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Button({ className, asChild = false, variant = "default", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; variant?: "default" | "outline" | "ghost" }) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn("button", variant !== "default" && `button-${variant}`, className)} {...props} />;
}
