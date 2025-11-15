import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "input-embossed field-sizing-content min-h-24 w-full rounded-2xl bg-zinc-200 px-4 py-3 text-sm text-zinc-700 placeholder:text-zinc-500 transition-all focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
