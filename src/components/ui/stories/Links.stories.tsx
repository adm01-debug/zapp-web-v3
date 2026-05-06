import type { Meta, StoryObj } from "@storybook/react";
import { buttonVariants } from "../button";
import { cn } from "@/lib/utils";

/**
 * In this design system, links are often styled using Button variants (variant="link")
 * or standard anchor tags with utility classes.
 */
const meta: Meta = {
  title: "UI/Links",
  tags: ["autodocs"],
};

export default meta;

export const TextLink = {
  render: () => (
    <div className="flex flex-col gap-4">
      <a href="#" className="text-primary hover:underline transition-all">Standard Primary Link</a>
      <a href="#" className="text-muted-foreground hover:text-foreground hover:underline transition-all">Muted Footer Link</a>
      <a href="#" className={cn(buttonVariants({ variant: "link" }), "p-0 h-auto")}>Design System Link Variant</a>
    </div>
  ),
};

export const InlineLinks = {
  render: () => (
    <p className="text-sm text-muted-foreground">
      By clicking continue, you agree to our{" "}
      <a href="#" className="text-primary hover:underline">Terms of Service</a> and{" "}
      <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
    </p>
  ),
};
