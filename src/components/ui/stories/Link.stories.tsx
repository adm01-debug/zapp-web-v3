import type { Meta, StoryObj } from "@storybook/react";
import { buttonVariants } from "../button";
import { cn } from "@/lib/utils";
import { ExternalLink, ArrowRight, ChevronRight, Github } from "lucide-react";

/**
 * Links in this design system use primary color tokens and follow strict typography rules.
 * We use both standard anchor tags and the Button component with `variant="link"`.
 */
const meta: Meta = {
  title: "UI/Links",
  tags: ["autodocs"],
};

export default meta;

export const LinkGallery: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-8 p-4">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Standard Links</h3>
        <div className="flex flex-wrap gap-6 items-center">
          <a href="#" className="text-primary hover:text-primary/80 hover:underline underline-offset-4 transition-all font-medium">
            Primary Link
          </a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
            Muted Utility Link
          </a>
          <a href="#" className="text-destructive hover:underline underline-offset-4 transition-all text-sm font-medium">
            Destructive Link
          </a>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">With Icons</h3>
        <div className="flex flex-wrap gap-6 items-center">
          <a href="#" className="flex items-center gap-1.5 text-primary hover:underline underline-offset-4 font-medium">
            External Resource <ExternalLink className="h-4 w-4" />
          </a>
          <a href="#" className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors group">
            Learn More <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a href="#" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <Github className="h-4 w-4" /> View Source
          </a>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Button "Link" Variant</h3>
        <div className="flex flex-wrap gap-6 items-center">
          <button className={cn(buttonVariants({ variant: "link" }))}>
            Interactive Link Component
          </button>
          <button className={cn(buttonVariants({ variant: "link", size: "sm" }))}>
            Small Link
          </button>
          <button className={cn(buttonVariants({ variant: "link" }), "px-0")}>
            No Padding Link
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Navigation Links</h3>
        <nav className="flex items-center space-x-4 text-sm font-medium">
          <a href="#" className="text-primary">Overview</a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Analytics</a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Reports</a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Settings</a>
        </nav>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Inline Context</h3>
        <div className="max-w-md p-4 border border-border rounded-lg bg-card">
          <p className="text-sm text-muted-foreground leading-relaxed">
            By accessing our platform, you acknowledge that you have read and understood our{" "}
            <a href="#" className="text-primary font-medium hover:underline underline-offset-2">Terms of Use</a>{" "}
            and our{" "}
            <a href="#" className="text-primary font-medium hover:underline underline-offset-2">Privacy Policy</a>. 
            If you have any questions, please <a href="#" className="text-primary font-medium hover:underline">contact support</a>.
          </p>
        </div>
      </div>
    </div>
  ),
};
