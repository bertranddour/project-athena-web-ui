import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "neo-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-zinc-300/70 bg-zinc-200 px-7 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-zinc-600 shadow-wave-button transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400/50",
  {
    variants: {
      variant: {
        primary: "",
        outline: "bg-zinc-200 border-zinc-400",
        secondary:
          "bg-zinc-100 text-zinc-500 shadow-wave-well tracking-[0.2em]",
        ghost:
          "border-transparent bg-transparent shadow-none text-zinc-500 hover:bg-zinc-100",
        brand:
          "bg-teal-300/70 text-teal-800 border-teal-200/60 hover:bg-teal-200",
        subtle:
          "bg-zinc-100 text-zinc-600 shadow-wave-well tracking-[0.2em]",
      },
      size: {
        default: "px-7 py-3",
        sm: "px-5 py-2 text-[0.6rem]",
        lg: "px-10 py-4 text-[0.75rem]",
        icon: "rounded-2xl p-2.5 text-[0.5rem] tracking-[0.2em]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants, type ButtonProps };
