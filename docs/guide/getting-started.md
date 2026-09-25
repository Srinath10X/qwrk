# Getting Started

## Create a project

Scaffold a new Vite + Qwrk project with your package manager:

::: code-group

```sh [npm]
npm create qwrk-app@latest
```

```sh [pnpm]
pnpm create qwrk-app
```

```sh [yarn]
yarn create qwrk-app
```

```sh [bun]
bun create qwrk-app
```

:::

It asks for a project name and a variant (JavaScript or TypeScript), then prints the next steps for the package manager you used.

To skip the prompts, pass a name and `--template js` or `--template ts`:

::: code-group

```sh [npm]
npm create qwrk-app@latest my-app -- --template ts
```

```sh [pnpm]
pnpm create qwrk-app my-app --template ts
```

```sh [yarn]
yarn create qwrk-app my-app --template ts
```

```sh [bun]
bun create qwrk-app my-app --template ts
```

:::

npm needs the extra `--` to pass flags through to the CLI.

## Add Qwrk to an existing Vite project

Install `qwrk` and the `qwrk-vite` plugin:

```sh
npm install qwrk
npm install -D qwrk-vite
```

Add the plugin to `vite.config.js`:

```js
import qwrk from "qwrk-vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [qwrk()],
});
```

The plugin compiles JSX with Qwrk's automatic runtime (`qwrk/jsx-runtime`), so you never import anything for JSX.

## TypeScript

Tell TypeScript to use Qwrk's JSX runtime in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "qwrk"
  }
}
```

`state()` is generic, so `state<number>(0)` gives you a typed `.value`, and JSX results are typed as DOM `Node`s.

## Other bundlers

Anything that supports the automatic JSX runtime works without the plugin. Point it at `qwrk` as the import source:

- **esbuild:** `--jsx=automatic --jsx-import-source=qwrk`
- **Bun, tsc and other tools that read `tsconfig.json`:** the TypeScript settings above

## Mount your app

Components return real DOM nodes, so mounting is one `append` call:

```jsx
import App from "./App";

document.getElementById("root").append(<App />);
```

This works whether `App` returns a single element or a fragment (`<>...</>`).

Next: [Components & JSX](/guide/components).
