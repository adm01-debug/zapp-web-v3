import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-none hover:bg-primary/90 hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-[0_0_15px_hsl(var(--destructive)/0.3)]",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-[0_0_15px_hsl(var(--secondary)/0.3)]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        whatsapp: "bg-whatsapp text-primary-foreground hover:bg-whatsapp-dark shadow-none hover:shadow-[0_0_20px_hsl(var(--whatsapp)/0.4)]",
        glowPurple: "bg-secondary text-secondary-foreground hover:bg-secondary/90 border border-secondary/30 hover:shadow-[0_0_20px_hsl(var(--secondary)/0.5)]",
        glowGradient: "bg-gradient-to-r from-primary to-secondary text-primary-foreground border border-secondary/20 hover:shadow-[0_0_20px_hsl(var(--secondary)/0.4)]",
        neon: "bg-transparent border-2 border-secondary text-secondary hover:bg-secondary/10 hover:shadow-[0_0_15px_hsl(var(--secondary)/0.3)]",
        neonOutline: "bg-transparent border border-secondary/40 text-secondary hover:border-secondary hover:shadow-[0_0_20px_hsl(var(--secondary)/0.4)] hover:bg-secondary/10",
        success: "bg-success text-success-foreground hover:bg-success/90 hover:shadow-[0_0_15px_hsl(var(--success)/0.3)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, loadingText, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={ref} 
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

// Motion button with built-in hover/tap animations and neon glow
interface MotionButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref">,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  loadingText?: string;
}

const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ className, variant, size, isLoading, loadingText, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ 
          scale: disabled || isLoading ? 1 : 1.02, 
          y: disabled || isLoading ? 0 : -2,
          transition: { duration: 0.2, ease: "easeOut" }
        }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);
MotionButton.displayName = "MotionButton";

export { Button, MotionButton, buttonVariants };
