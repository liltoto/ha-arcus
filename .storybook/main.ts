import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  // The repo has its own strict typecheck gate. Storybook's checker would run a
  // second, slower pass over every story.
  typescript: { check: false },
};

export default config;
