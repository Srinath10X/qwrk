import { defineConfig, type HeadConfig } from "vitepress";
import { codeTheme } from "./code-theme";

const site = "https://qwrk.srinath.website";
const github = "https://github.com/Srinath10X/qwrk";
const title = "Qwrk";
const description =
  "A small reactive JavaScript framework: fine-grained state, a JSX compiler that clones templates, keyed lists and no virtual DOM.";

export default defineConfig({
  title,
  titleTemplate: ":title · Qwrk",
  description,
  lang: "en-US",
  appearance: "force-dark",
  lastUpdated: true,
  sitemap: { hostname: site },

  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/qwrk.svg" }],
    [
      "link",
      {
        rel: "preload",
        href: "/fonts/InstrumentSans.woff2",
        as: "font",
        type: "font/woff2",
        crossorigin: "",
      },
    ],
    ["meta", { name: "theme-color", content: "#0f0e0d" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: title }],
    ["meta", { property: "og:image", content: `${site}/og.png` }],
    ["meta", { property: "og:image:width", content: "1200" }],
    ["meta", { property: "og:image:height", content: "630" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    ["meta", { name: "twitter:image", content: `${site}/og.png` }],
  ],

  transformHead({ pageData, title: pageTitle, description: pageDescription }) {
    const path = pageData.relativePath
      .replace(/(^|\/)index\.md$/, "$1")
      .replace(/\.md$/, ".html");
    const url = `${site}/${path}`;
    const head: HeadConfig[] = [
      ["link", { rel: "canonical", href: url }],
      ["meta", { property: "og:url", content: url }],
      ["meta", { property: "og:title", content: pageTitle }],
      ["meta", { property: "og:description", content: pageDescription }],
      ["meta", { name: "twitter:title", content: pageTitle }],
      ["meta", { name: "twitter:description", content: pageDescription }],
    ];
    return head;
  },

  markdown: {
    theme: codeTheme,
  },

  themeConfig: {
    logo: { src: "/qwrk.svg", width: 24, height: 24, alt: "" },
    siteTitle: "Qwrk",

    search: {
      provider: "local",
    },

    nav: [
      {
        text: "Guide",
        link: "/guide/getting-started",
        activeMatch: "^/guide/(?!benchmarks)",
      },
      { text: "API", link: "/api/state", activeMatch: "^/api/" },
      { text: "Benchmarks", link: "/guide/benchmarks" },
      {
        text: "0.4 beta",
        items: [
          {
            text: "Install the beta",
            link: "/guide/getting-started#try-the-0-4-beta",
          },
          {
            text: "qwrk on npm",
            link: "https://www.npmjs.com/package/qwrk?activeTab=versions",
          },
          {
            text: "qwrk-vite on npm",
            link: "https://www.npmjs.com/package/qwrk-vite?activeTab=versions",
          },
          { text: "Commits", link: `${github}/commits/main` },
        ],
      },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "What is Qwrk?", link: "/guide/" },
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Components & JSX", link: "/guide/components" },
          { text: "Compiler", link: "/guide/compiler" },
          { text: "Lists", link: "/guide/lists" },
          { text: "Benchmarks", link: "/guide/benchmarks" },
        ],
      },
      {
        text: "API",
        items: [
          { text: "state()", link: "/api/state" },
          { text: "derive()", link: "/api/derive" },
          { text: "effect()", link: "/api/effect" },
          { text: "batch()", link: "/api/batch" },
          { text: "createElement()", link: "/api/create-element" },
        ],
      },
    ],

    outline: { level: [2, 3], label: "On this page" },

    editLink: {
      pattern: `${github}/edit/main/docs/:path`,
      text: "Edit this page on GitHub",
    },

    lastUpdated: {
      text: "Updated",
      formatOptions: { dateStyle: "medium" },
    },

    docFooter: { prev: "Previous", next: "Next" },

    socialLinks: [{ icon: "github", link: github, ariaLabel: "GitHub" }],
  },
});
