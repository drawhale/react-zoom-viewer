/* eslint-disable */

const plugin = require("tailwindcss/plugin")

/** @type {import('tailwindcss').Config} */
export default {
  content: ["**/*.{js,ts,jsx,tsx,mdx}", "./stories/**/*.{js,ts,jsx,tsx}"],
  future: {
    hoverOnlyWhenSupported: true,
  },
}
