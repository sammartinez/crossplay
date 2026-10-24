### T1 · Vite + React + TS scaffold, harness, theme toggle
- complexity: high
- sets_pattern: true
- assignee: principal
- depends_on: []
- covers: [AC1, AC2, AC4, AC14, AC15, AC16]
- preview: ["/"]
- interface:
  - Scripts and dependencies as in AC1 and AC2.
  - Tooling files: `vite.config.ts` (`base: '/crossplay/'`, `server: { port: 5173, strictPort: true }`, and `test: { environment: 'jsdom', setupFiles: ['src/test/setup.ts'] }`), `tsconfig.json` (strict), `eslint.config.js`, and `.gitignore`.
  - Page shell: `index.html` becomes the Vite entry and keeps every meta and link in AC4. `favicon.png` and `apple-touch-icon.png` move to `public/`.
  - Entry and layout:
    - `src/main.tsx` renders `<App/>` into `#app`.
    - `src/App.tsx` is the page layout: the header with the h1, the subtitle and `<ThemeToggle/>`, plus placeholder slots for the form and the result.
    - `src/styles.css` holds the existing CSS verbatim.
  - Theme:
    - `src/lib/theme.ts` exports `readStoredTheme(): Theme|null`, `applyTheme(t: Theme|null): void` and `nextTheme(current: Theme): Theme`. Storage errors are tolerated.
    - `src/components/ThemeToggle.tsx` is a button labeled "Theme" that toggles between light and dark as in AC14.
  - `src/constants.ts` holds the app name, subtitle, `THEME_STORAGE_KEY = 'cp-theme'`, the theme names and the Theme label.
- notes:
  - This task sets the patterns the rest copy:
    - folder layout: `src/components/` for components, `src/lib/` for shared modules, `src/constants.ts` for constants;
    - colocated `*.test.ts(x)` files;
    - one component per file, with plain function components and props typed inline;
    - global CSS that reuses the existing class names.
  - QA owns `src/test/setup.ts`, which imports `@testing-library/jest-dom/vitest` and adds Testing Library cleanup. QA commits it with T1's tests. Testing `ThemeToggle` this way exercises the component plus Testing Library pattern from day one.
  - Delete the old inline script along with the root `index.html` content it replaces. The rest of the logic is rebuilt in T2–T5.
  - Write the comment about the dark-mode media query once, in CSS.
  - Edit `.team/config.json` in the working tree only (AC16). Never stage it.

## Acceptance criteria covered

- AC1 (tooling and gates):
  - `npm test` runs `vitest run` once, in jsdom, with Testing Library and `@testing-library/jest-dom` matchers available. It exits non-zero on any failing test.
  - `npm run lint` runs ESLint 9 with a flat config (`@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`) and exits non-zero on a lint error.
  - `npm run typecheck` runs `tsc` with `strict: true` and no emit, and exits non-zero on a type error.
  - `npm run build` produces `dist/`.
  - `npm run dev` serves the app at `http://localhost:5173/crossplay/`. The port is pinned with `strictPort`.
- AC2 (dependencies):
  - Runtime `dependencies` are only `react` and `react-dom`. Everything else is a devDependency.
  - `package-lock.json` is committed. `node_modules/` and `dist/` are gitignored.
- AC4 (page shell and Add to Home Screen): the built `index.html` keeps:
  - the title "Crossplay";
  - the viewport meta tag, including `viewport-fit=cover`;
  - the `apple-mobile-web-app-*` and `mobile-web-app-capable` metas;
  - both `theme-color` metas;
  - the font links;
  - the favicon and apple-touch-icon, served from `public/` under the base path.
- AC14 (theme):
  - By default the theme follows the system.
  - The Theme button toggles light and dark, starting from the theme currently shown.
  - The choice persists under the `localStorage` key `cp-theme` and is applied as `data-theme` on `<html>`.
  - The app still works if storage throws.
- AC15 (standards): every non-exempt literal lives in `src/constants.ts`, including JSX text, labels, messages, URLs, regexes, timeouts and keys. Modules in `src/lib/` other than `api.ts`, `clipboard.ts` and `theme.ts` are pure, with no DOM or network access. (`theme.ts` added in MR-001: `applyTheme` writes `<html>` and `localStorage` by design.)
- AC16 (`.team/config.json`, working tree only, never staged):

  | Key | Value |
  |---|---|
  | `test` | `npm test` |
  | `lint` | `npm run lint` |
  | `typecheck` | `npm run typecheck` |
  | `preview` | `npm run dev` |
  | `previewUrl` | `http://localhost:5173/crossplay` |
  | `paths` | `{ "constants": "src/constants.ts", "shared": "src/lib/" }` |
  | `testPaths` | existing list plus `src/test/` |
