/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        pitch: "#0F1C13",
        pitchCard: "#16261B",
        turf: "#2E5136",
        chalk: "#EDEAE0",
        chalkDim: "#A9B3A6",
        floodlight: "#F5E6A8",
        home: "#E1553A",
        homeDim: "#5A2419",
        away: "#4E7FBF",
        awayDim: "#233B57",
      },
      fontFamily: {
        display: ["Anton", "sans-serif"],
        body: ["'Work Sans'", "sans-serif"],
        mono2: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
