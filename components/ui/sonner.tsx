import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "light" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-[1.5rem] border border-zinc-300/60 bg-zinc-200 px-6 py-4 text-zinc-700 shadow-wave-panel",
          description: "group-[.toast]:text-zinc-500",
          actionButton:
            "group-[.toast]:neo-btn rounded-full border border-zinc-300/70 bg-zinc-200 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-zinc-600 shadow-wave-button",
          cancelButton:
            "group-[.toast]:neo-btn rounded-full border border-zinc-300/70 bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
