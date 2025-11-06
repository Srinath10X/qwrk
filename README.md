<p align="center">
  <img src=".github/assets/qwrk.svg" width="120" alt="qwrk logo" />
</p>

<h1 align="center">Qwrk</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/qwrk"><img alt="NPM version" src="https://img.shields.io/npm/v/qwrk?style=for-the-badge&color=babbf1&labelColor=1e1e2e&label=npm&logo=npm"></a>
  <a href="https://github.com/Srinath10X/qwrk/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-a6e3a1?style=for-the-badge&labelColor=1e1e2e"></a>
  <img alt="GitHub stars" src="https://img.shields.io/github/stars/Srinath10X/qwrk?style=for-the-badge&labelColor=1e1e2e&color=f9e2af">
</p>

<p align="center">
  <strong>Qwrk</strong> is a minimalistic, reactive javascript micro-framework built for raw speed, minimalism, and full control.
</p>

## 🚀 Getting started
Create a new project:
```bash
npx create-qwrk-app@latest
```
A simple example:
```jsx
import { state } from "qwrk";

function App() {
  const count = state(0);

  return (
    <>
      <h1>{count}</h1>
      <button onClick={() => count.value++}>+</button>
      <button onClick={() => count.value--}>-</button>
    </>
  );
}

document.getElementById("root").append(...App());
```

## 📚 Documentation
visit <a href="https://qwrk.srinath.website">https://qwrk.srinath.website</a> to
view the full documentation

## 🔐 Security 

If you believe you have discovered a security vulnerability in Qwrk, I request that you
responsibly disclose it by emailing <a href="mailto:srinath10x@protonmail">srinath10x@proton.me</a> with the relevant details.

Do not publicly disclose the issue before it is resolved.
