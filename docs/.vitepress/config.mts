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
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide" },
    ],

    sidebar: [
      {
        text: "Introduction",
        items: [{ text: "What is Qwrk?", link: "/guide" }],
      },
      {
        text: "APIs",
        items: [
          { text: "State API", link: "/api/01_state" },
          { text: "Effect API", link: "/api/02_effect" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/Srinath10X/Qwrk" },
    ],
  },
});
