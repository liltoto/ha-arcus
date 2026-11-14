import type { Preview } from "@storybook/react";
import { withStoryFrame } from "../src/ui/providers/StoryFrame";

const preview: Preview = {
  decorators: [withStoryFrame],
  parameters: {
    layout: "fullscreen",
    backgrounds: { disable: true },
    controls: { expanded: true },
  },
  globalTypes: {
    theme: {
      description: "Arcus appearance",
      defaultValue: "dark",
      toolbar: {
        items: [
          { value: "dark", title: "Dark" },
          { value: "light", title: "Light" },
        ],
      },
    },
    density: {
      description: "Arcus density",
      defaultValue: "comfortable",
      toolbar: {
        items: [
          { value: "comfortable", title: "Comfortable" },
          { value: "compact", title: "Compact" },
        ],
      },
    },
  },
};

export default preview;
