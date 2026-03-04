import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Mithrandir",
  description: "Automated Docker-based homelab setup, backup, and restore",

  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/" },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [{ text: "Getting Started", link: "/guide/" }],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com" },
    ],
  },
});
