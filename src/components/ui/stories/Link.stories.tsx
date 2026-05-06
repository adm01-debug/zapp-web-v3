import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../button";

const meta: Meta<typeof Button> = {
  title: "UI/Link",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["default", "sm", "lg"],
    },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: "Standard Link",
    variant: "link",
  },
};

export const Small: Story = {
  args: {
    children: "Small Link",
    variant: "link",
    size: "sm",
  },
};
