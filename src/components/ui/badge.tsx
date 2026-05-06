import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 shadow-none",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-none",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-none",
        outline: "text-foreground border-border bg-background hover:border-primary/40 transition-colors",
        subtle: "border-transparent bg-muted/30 text-muted-foreground",
        success: "border-transparent bg-success/15 text-success font-bold border border-success/30",
        warning: "border-transparent bg-warning/15 text-warning font-bold border border-warning/30",
        info: "border-transparent bg-info/15 text-info font-bold border border-info/30",
        whatsapp: "border-transparent bg-[#25D366] text-foreground hover:bg-[#25D366]/90 shadow-sm shadow-[#25D366]/20",
        glowPurple: "border-transparent bg-accent text-foreground hover:bg-accent shadow-[0_0_12px_rgba(139,92,246,0.3)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, variant, ...props }, ref) => {
  return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
});

Badge.displayName = "Badge";

export { Badge, badgeVariants };
