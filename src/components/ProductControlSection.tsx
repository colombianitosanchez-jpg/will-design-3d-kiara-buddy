import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Mount heavyweight editors only while their section is open. */
export function ProductControlSection({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className="border-t border-border pt-3">
    <Button type="button" variant="ghost" className="w-full justify-between px-0 text-sm font-bold" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      {title}<ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
    </Button>
    {open && <div className="mt-3 space-y-3">{children}</div>}
  </section>;
}