import { state } from "qwrk";

export default function App() {
  const counter = state(0);

  return (
    <>
      <h1>Astro + Qwrk</h1>
      <p>Counter: {counter}</p>
      <button onClick={() => counter.value++}>Increment</button>
    </>
  );
}

document.getElementById("root").append(...App());
