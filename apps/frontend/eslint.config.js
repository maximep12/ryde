import config from "@repo/config-eslint-custom/vite";

export default [
  ...config,
  {
    rules: {
      // Disable i18n literal string rule for starter kit simplicity
      "i18next/no-literal-string": "off",
      // Allow setState in effects for state sync patterns
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
