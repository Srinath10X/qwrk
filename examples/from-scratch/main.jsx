import { state } from "qwrk";

function App() {
  const count = state(0);

  return (
    <>
      <h1>Qwrk from scratch</h1>
      <button onClick={() => count.value++}>count is {count}</button>
    </>
  );
}

document.getElementById("root").append(App());
