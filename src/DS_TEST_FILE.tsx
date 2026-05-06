
import { cn } from "@/lib/utils";
import { clsx } from "clsx";

export const TestComponent = () => {
  return (
    <div className={cn(
      "bg-background text-background", // High priority
      "hover:bg-primary",      // Medium priority
      "dark:text-muted-foreground",    // Medium priority
      "",             // Low priority
      "bg-primary",             // Allowed
      "dark:hover:bg-foreground" // Nested variants
    )}>
      <p className={clsx("text-destructive-foreground", "group-hover:border-border")}>
        // @ds-ignore
        <span className="text-[#ff0000]">Ignored</span>
      </p>
    </div>
  );
};
