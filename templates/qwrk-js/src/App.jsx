import { state } from "qwrk";
import viteLogo from "/vite.svg";
import qwrkLogo from "./assets/qwrk.svg";
import "./App.css";

function App() {
  const count = state(0);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://github.com/Srinath10X/Qwrk" target="_blank">
          <img src={qwrkLogo} className="logo qwrk" alt="Qwrk logo" />
        </a>
      </div>
      <h1>Vite + Qwrk</h1>
      <div className="card">
        <button onClick={() => count.value++}>count is {count}</button>
        <p>
          Edit <code>src/App.jsx</code> and save to reload the app.
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and Qwrk logos to learn more
      </p>
    </>
  );
}

export default App;
