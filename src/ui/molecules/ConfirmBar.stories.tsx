import type { Meta, StoryObj } from "@storybook/react";
import { ConfirmBar } from "./ConfirmBar";

const meta = {
  title: "Molecules/ConfirmBar",
  component: ConfirmBar,
  args: {
    text: "Sluk alle lys i hjemmet?",
    confirmLabel: "Ja, sluk",
    cancelLabel: "Annuller",
    onConfirm: () => undefined,
    onCancel: () => undefined,
  },
  render: (args) => (
    <div className="sheet-scroll" style={{ minHeight: 200 }}>
      <ConfirmBar {...args} />
    </div>
  ),
} satisfies Meta<typeof ConfirmBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomAction: Story = {
  args: { confirmAct: "sluk-alt-go", text: "Sluk alt lys?" },
};
