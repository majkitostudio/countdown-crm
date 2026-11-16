import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control border border-transparent px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 ease-interface motion-safe:enabled:active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-action-primary-hover",
        secondary:
          "border-border-default bg-action-secondary text-text-secondary hover:border-border-strong hover:bg-action-secondary-hover hover:text-text-primary",
        outline:
          "border-border-default bg-transparent text-text-primary hover:bg-action-secondary-hover",
        quiet: "border-transparent bg-transparent text-text-muted hover:bg-action-secondary-hover hover:text-text-secondary",
        destructive:
          "border-status-danger-border bg-action-danger text-status-danger-text hover:bg-action-danger-hover",
        link: "border-transparent bg-transparent text-text-secondary underline-offset-4 hover:text-text-primary hover:underline",
      },
      size: {
        default: "h-9",
        sm: "h-7 gap-1.5 px-3 py-1.5 text-[11px]",
        lg: "h-11 px-5",
        icon: "size-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? undefined : (type ?? "button")}
      {...props}
    />
  );
}

export { Button, buttonVariants };
