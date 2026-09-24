import { state } from "qwrk";

export default function Counter() {
  const count = state(0);

  return (
    <>
      <p>Counter: {count}</p>
      <button onClick={() => count.value++}>Increment</button>
    </>
  );
}
