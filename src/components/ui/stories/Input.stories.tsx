import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "../input";
import { Search, Mail, Lock, User } from "lucide-react";

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

export const WithLeftIcon: Story = {
  args: {
    placeholder: "Search...",
    leftIcon: Search,
  },
};

export const WithRightIcon: Story = {
  args: {
    placeholder: "Email address",
    rightIcon: Mail,
  },
};

export const LoginField: Story = {
  args: {
    placeholder: "Password",
    type: "password",
    leftIcon: Lock,
  },
};

export const Glow: Story = {
  args: {
    placeholder: "Glow variant",
    variant: "glow",
  },
};

export const Error: Story = {
  args: {
    placeholder: "Invalid input",
    error: true,
    defaultValue: "Wrong value",
  },
};

export const Success: Story = {
  args: {
    placeholder: "Correct input",
    success: true,
    defaultValue: "Correct value",
  },
};
