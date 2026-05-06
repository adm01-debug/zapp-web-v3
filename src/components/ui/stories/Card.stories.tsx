import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../card";
import { Button } from "../button";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "elevated", "interactive", "selected", "ghost", "glass", "neon", "gradient"],
    },
    padding: {
      control: "select",
      options: ["none", "sm", "default", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>This is a standard card description.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is the main content area of the card where you can put any information.</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">Action</Button>
      </CardFooter>
    </Card>
  ),
  args: {
    variant: "default",
    padding: "none",
  },
};

export const Interactive: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Interactive Card</CardTitle>
        <CardDescription>Hover over me to see the effect.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Perfect for list items or grid elements that need to be clickable.</p>
      </CardContent>
    </Card>
  ),
  args: {
    variant: "interactive",
    className: "w-[350px]",
  },
};

export const Glass: Story = {
  render: (args) => (
    <div className="p-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl">
      <Card {...args}>
        <CardHeader>
          <CardTitle className="text-white">OLED Glass Card</CardTitle>
          <CardDescription className="text-white/70">Backdrop blur and transparency.</CardDescription>
        </CardHeader>
        <CardContent className="text-white/90">
          Looks great on colored or busy backgrounds.
        </CardContent>
      </Card>
    </div>
  ),
  args: {
    variant: "glass",
    className: "w-[350px]",
  },
};

export const Selected: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Selected Item</CardTitle>
        <CardDescription>Active state indication.</CardDescription>
      </CardHeader>
      <CardContent>
        This card shows how a selected or active item looks in the design system.
      </CardContent>
    </Card>
  ),
  args: {
    variant: "selected",
    className: "w-[350px]",
  },
};
