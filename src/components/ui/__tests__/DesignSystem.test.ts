import { expect, test } from "vitest";
import { buttonVariants } from "@/components/ui/button";
import { inputVariants } from "@/components/ui/input";
import { cardVariants } from "@/components/ui/card";

test("Design System: Button variants consistency", () => {
  // Check if primary button has the correct OLED-friendly classes
  const primaryClasses = buttonVariants({ variant: "default" });
  expect(primaryClasses).toContain("bg-primary");
  expect(primaryClasses).toContain("text-primary-foreground");
  expect(primaryClasses).toContain("rounded-lg"); // Base design system radius
  expect(primaryClasses).toContain("hover:shadow-glow-primary");
});

test("Design System: Input variants consistency", () => {
  const defaultInput = inputVariants({ variant: "default" });
  expect(defaultInput).toContain("rounded-xl"); // Design system defined input radius
  expect(defaultInput).toContain("bg-background");
  expect(defaultInput).toContain("focus-visible:ring-ring");
});

test("Design System: Card variants consistency", () => {
  const defaultCard = cardVariants({ variant: "default" });
  expect(defaultCard).toContain("rounded-2xl"); // Design system defined card radius
  expect(defaultCard).toContain("bg-card");
  
  const glassCard = cardVariants({ variant: "glass" });
  expect(glassCard).toContain("backdrop-blur-md");
  expect(glassCard).toContain("bg-background/40");
});
