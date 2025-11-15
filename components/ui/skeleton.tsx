import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("wave-skeleton h-4 rounded-full", className)}
      {...props}
    />
  );
}

export { Skeleton };
