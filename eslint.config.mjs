import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "app/phase1[b-k]/page.tsx"
    ]
  },
  ...nextVitals,
  ...nextTs,
];

export default eslintConfig;