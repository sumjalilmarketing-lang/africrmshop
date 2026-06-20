import { ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  inverse = false,
  compact = false,
}: Readonly<{ inverse?: boolean; compact?: boolean }>) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "grid place-items-center rounded-xl",
          compact ? "size-9" : "size-10",
          inverse ? "bg-white text-[#0a3827]" : "bg-brand text-white",
        )}
      >
        <ShoppingBasket className={compact ? "size-4" : "size-[18px]"} />
      </span>
      {!compact && (
        <div className="leading-none">
          <p
            className={cn(
              "text-[15px] font-extrabold tracking-[-0.02em]",
              inverse && "text-white",
            )}
          >
            AFRICRM{" "}
            <span className={inverse ? "text-[#79d4a2]" : "text-brand"}>
              Shop
            </span>
          </p>
          <p
            className={cn(
              "mt-1.5 text-[9px] font-semibold tracking-[0.14em] uppercase",
              inverse ? "text-white/45" : "text-muted",
            )}
          >
            Caisse & gestion
          </p>
        </div>
      )}
    </div>
  );
}
