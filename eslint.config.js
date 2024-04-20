import eslint from "@eslint/js";
import spellcheck from "eslint-plugin-spellcheck";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    plugins: { spellcheck },
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-warning-comments": [
        "error",
        {
          terms: ["fixme"],
          location: "anywhere",
        },
      ],
      "spellcheck/spell-checker": [
        "error",
        {
          identifiers: false,
          skipWords: ["ascii", "unicode", "wasm"],
          skipIfMatch: ["^[0-9a-f]{64}"],
          minLength: 4,
        },
      ],
    },
  },
);
