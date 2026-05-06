
import { cn } from "@/lib/utils";
import { clsx } from "clsx";

export const TestComponent = () => {
  return (
    <div className={cn(
      "bg-[#ffffff] text-black", // High priority
      "hover:bg-blue-500",      // Medium priority
      "dark:text-slate-200",    // Medium priority
      "font-inter",             // Low priority
      "bg-primary",             // Allowed
      "dark:hover:bg-[#000000]" // Nested variants
    )}>
      <p className={clsx("text-red-500", "group-hover:border-[#fff]")}>
        // @ds-ignore
        <span className="text-[#ff0000]">Ignored</span>
      </p>
    </div>
  );
};
