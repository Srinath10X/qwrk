# Getting Started

## Create a project

Scaffold a new Vite + Qwrk project with your package manager:

::: code-group

```sh [npm]
npm create qwrk-app@latest
```

```sh [bun]
bun create qwrk-app@latest
```

```sh [pnpm]
pnpm create qwrk-app@latest
```

```sh [yarn]
yarn create qwrk-app@latest
```

:::

It asks for a project name and a variant (JavaScript or TypeScript), then prints the next steps for the package manager you used.

To skip the prompts, pass a name and `--template js` or `--template ts`:

::: code-group

```sh [npm]
npm create qwrk-app@latest my-app -- --template ts
```

```sh [bun]
bun create qwrk-app@latest my-app --template ts
```

```sh [pnpm]
pnpm create qwrk-app@latest my-app --template ts
```

```sh [yarn]
yarn create qwrk-app@latest my-app --template ts
```

:::

npm needs the extra `--` to pass flags through to the CLI.

## Try the 0.4 beta

Qwrk 0.4 is in beta on the `next` tag. It brings the [compiler](/guide/compiler), keyed [lists](/guide/lists), [`batch()`](/api/batch) and glitch-free [derives](/api/derive), which these docs describe. New projects start on the latest stable release; to move one to the beta, install both packages from `next`:

::: code-group

```sh [npm]
npm i qwrk@next qwrk-vite@next
```

```sh [bun]
bun add qwrk@next qwrk-vite@next
```

```sh [pnpm]
pnpm add qwrk@next qwrk-vite@next
```

```sh [yarn]
yarn add qwrk@next qwrk-vite@next
```

:::

Install them together: the code `qwrk-vite@next` compiles imports helpers that only the 0.4 runtime has.

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

The plugin [compiles your JSX](/guide/compiler) into templates and fine-grained DOM bindings, and hands what it leaves untouched to Qwrk's automatic runtime (`qwrk/jsx-runtime`), so you never import anything for JSX.

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

With esbuild, use the compiler's [esbuild plugin](/guide/compiler#esbuild), `qwrk-vite/esbuild`.

Anything that supports the automatic JSX runtime also works without the compiler. Point it at `qwrk` as the import source:

- **esbuild:** `--jsx=automatic --jsx-import-source=qwrk`
- **Bun, tsc and other tools that read `tsconfig.json`:** the TypeScript settings above

Without the compiler, JSX expressions are evaluated once: pass the state itself, or a [`derive()`](/api/derive), to keep the DOM in sync.

## Mount your app

Components return real DOM nodes, so mounting is one `append` call:

```jsx
import App from "./App";

document.getElementById("root").append(<App />);
```

This works whether `App` returns a single element or a fragment (`<>...</>`).

Next: [Components & JSX](/guide/components).
