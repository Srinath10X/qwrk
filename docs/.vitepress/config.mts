import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Qwrk Docs",
  description: "Qwrk framework documentation website",
  head: [
    [
      "link",
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/qwrk.svg",
      },
    ],
  ],
  themeConfig: {
    logo: "/qwrk.svg",
    siteTitle: "Qwrk",

    search: {
      provider: "local",
    },

    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API", link: "/api/state" },
    ],

    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "What is Qwrk?", link: "/guide/" },
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Components & JSX", link: "/guide/components" },
        ],
      },
      {
        text: "API",
        items: [
          { text: "state()", link: "/api/state" },
          { text: "effect()", link: "/api/effect" },
          { text: "createElement()", link: "/api/create-element" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/Srinath10X/qwrk" },
    ],
  },
});
