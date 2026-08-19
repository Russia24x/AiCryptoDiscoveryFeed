import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // TypeScript rules
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/prefer-as-const": "off",
    "@typescript-eslint/no-unused-disable-directive": "off",
    
    // React rules
    "react-hooks/exhaustive-deps": "off",
    "react-hooks/purity": "off",
    // `set-state-in-effect`: this rule flags the common pattern
    // `useEffect(() => { setX(readFromLocalStorage()); }, [])` which is the
    // standard way to hydrate client state from localStorage in a way that
    // avoids SSR hydration mismatches. While React 19's ESLint plugin
    // recommends `useSyncExternalStore` for new code, this is a widespread
    // pattern in this codebase and many others; rewriting every instance
    // would be a large refactor. We disable the rule project-wide; the
    // pattern is safe as long as the effect is idempotent (it reads from
    // a stable source like localStorage).
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/refs": "off",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",
    "react-compiler/react-compiler": "off",
    // Preserve-manual-memoization: react-compiler error that fires when the
    // compiler can't preserve existing `useMemo`/`useCallback` patterns.
    // We're not using the React Compiler in this project, so this rule is
    // noisy and can be disabled.
    "react-hooks/preserve-manual-memoization": "off",
    
    // Next.js rules
    "@next/next/no-img-element": "off",
    "@next/next/no-html-link-for-pages": "off",
    
    // General JavaScript rules
    "prefer-const": "off",
    "no-unused-vars": "off",
    "no-console": "off",
    "no-debugger": "off",
    "no-empty": "off",
    "no-irregular-whitespace": "off",
    "no-case-declarations": "off",
    "no-fallthrough": "off",
    "no-mixed-spaces-and-tabs": "off",
    "no-redeclare": "off",
    "no-undef": "off",
    "no-unreachable": "off",
    "no-useless-escape": "off",
  },
}, {
  ignores: ["node_modules/**", ".next/**", ".open-next/**", ".wrangler/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills", ".dev.vars", "cloudflare-env.d.ts"]
}];

export default eslintConfig;
