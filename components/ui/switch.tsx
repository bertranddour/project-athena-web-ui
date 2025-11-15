import * as React from "react";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        className={cn("wave-toggle", className)}
        {...props}
      />
    );
  },
);

Switch.displayName = "Switch";

export { Switch };
