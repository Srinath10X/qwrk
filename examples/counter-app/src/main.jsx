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
