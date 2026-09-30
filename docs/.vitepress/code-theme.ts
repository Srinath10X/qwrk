import type { MarkdownOptions } from "vitepress";

type ThemeRegistration = Exclude<
  NonNullable<MarkdownOptions["theme"]>,
  string | { light: unknown; dark: unknown }
>;

/**
 * Syntax theme on the site's warm near-black: text in tones of the page
 * foreground, keywords and tags in the one accent, strings in a warm sand.
 */
export const codeTheme: ThemeRegistration = {
  name: "qwrk-dark",
  type: "dark",
  colors: {
    "editor.background": "#131211",
    "editor.foreground": "#d8d4cf",
  },
  tokenColors: [
    {
      settings: { foreground: "#d8d4cf" },
    },
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "#7e7a73", fontStyle: "italic" },
    },
    {
      scope: [
        "keyword",
        "storage",
        "storage.type",
        "storage.modifier",
        "keyword.control",
        "keyword.operator.new",
        "keyword.operator.expression",
        "variable.language",
      ],
      settings: { foreground: "#89b4fa" },
    },
    {
      scope: [
        "punctuation",
        "meta.brace",
        "keyword.operator",
        "punctuation.definition.tag",
        "meta.tag.attributes punctuation",
      ],
      settings: { foreground: "#8a847d" },
    },
    {
      scope: ["string", "string.quoted", "string.template", "markup.inline"],
      settings: { foreground: "#d6c4a4" },
    },
    {
      scope: [
        "constant.numeric",
        "constant.language",
        "constant.character",
        "support.constant",
      ],
      settings: { foreground: "#b8cff7" },
    },
    {
      scope: [
        "entity.name.function",
        "support.function",
        "meta.function-call entity.name.function",
      ],
      settings: { foreground: "#f6f5f4" },
    },
    {
      scope: [
        "entity.name.tag",
        "support.class.component",
        "entity.name.tag.tsx",
        "entity.name.tag.jsx",
      ],
      settings: { foreground: "#89b4fa" },
    },
    {
      scope: ["entity.other.attribute-name"],
      settings: { foreground: "#b1aba4" },
    },
    {
      scope: [
        "entity.name.type",
        "entity.name.class",
        "support.type",
        "support.class",
      ],
      settings: { foreground: "#b8cff7" },
    },
    {
      scope: [
        "variable.other.property",
        "support.variable.property",
        "meta.object-literal.key",
        "variable.other.object.property",
      ],
      settings: { foreground: "#ece9e5" },
    },
    {
      scope: ["variable.parameter"],
      settings: { foreground: "#d8d4cf" },
    },
    {
      scope: ["support.type.property-name.json"],
      settings: { foreground: "#ece9e5" },
    },
  ],
};
