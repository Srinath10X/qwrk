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
        href: "/assets/qwrk.svg",
      },
    ],
  ],
  themeConfig: {
    logo: "/assets/qwrk.svg",
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
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/Srinath10X/Qwrk" },
    ],
  },
});
