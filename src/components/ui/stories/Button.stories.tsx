import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../button";
import { Mail, ArrowRight, Loader2 } from "lucide-react";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link", "whatsapp", "glowPurple", "glowGradient", "neon", "neonOutline", "success"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "xl", "icon", "icon-sm", "icon-lg"],
    },
    isLoading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: "Button",
    variant: "default",
    size: "default",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary Button",
    variant: "secondary",
  },
};

export const Outline: Story = {
  args: {
    children: "Outline Button",
    variant: "outline",
  },
};

export const Destructive: Story = {
  args: {
    children: "Destructive Action",
    variant: "destructive",
  },
};

export const Success: Story = {
  args: {
    children: "Success Action",
    variant: "success",
  },
};

export const Whatsapp: Story = {
  args: {
    children: "Contact via WhatsApp",
    variant: "whatsapp",
  },
};

export const Loading: Story = {
  args: {
    children: "Please wait",
    isLoading: true,
  },
};

export const WithIcon: Story = {
  render: (args) => (
    <Button {...args}>
      <Mail className="mr-2 h-4 w-4" />
      Login with Email
    </Button>
  ),
};

export const IconButton: Story = {
  args: {
    size: "icon",
    children: <ArrowRight className="h-4 w-4" />,
  },
};
