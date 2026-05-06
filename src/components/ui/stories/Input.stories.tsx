import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "../input";
import { Search, User, Mail, AlertCircle, CheckCircle } from "lucide-react";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "glow", "neon", "ghost", "underline"],
    },
    inputSize: {
      control: "select",
      options: ["sm", "default", "lg"],
    },
    error: { control: "boolean" },
    success: { control: "boolean" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: "Type something...",
    variant: "default",
  },
};

export const WithIcon: Story = {
  args: {
    placeholder: "Search components...",
    leftIcon: Search,
  },
};

export const WithRightElement: Story = {
  args: {
    placeholder: "Enter username",
    rightIcon: User,
  },
};

export const ErrorState: Story = {
  args: {
    placeholder: "Invalid email",
    variant: "glow",
    error: true,
    defaultValue: "wrong-email",
    leftIcon: Mail,
    rightIcon: AlertCircle,
  },
};

export const SuccessState: Story = {
  args: {
    placeholder: "Valid input",
    variant: "glow",
    success: true,
    defaultValue: "Correct value",
    rightIcon: CheckCircle,
  },
};

export const Underline: Story = {
  args: {
    placeholder: "Underline variant",
    variant: "underline",
  },
};
