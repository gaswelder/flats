import React, { useState } from "react";
import { API } from "../../api";
import { getSetting, setSetting } from "../../state";
import { LoginForm } from "./LoginForm";
import { MainOk } from "./MainOK";

export const Main = () => {
  const [state, setState] = useState({
    type: getSetting("token") ? "ok" : "none",
  });

  if (state.type == "ok") {
    return <MainOk />;
  }
  if (state.type == "waitingAuth") {
    return "logging in...";
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    const u = e.target.querySelector('[name="user"').value;
    const p = e.target.querySelector('[name="password"').value;
    setState({ type: "waitingAuth" });
    const { ok, token } = await API.login(u, p);
    if (!ok) {
      setState({ type: "failed" });
    } else {
      setSetting("token", token);
      setState({ type: "ok" });
    }
  };
  return (
    <>
      {state.type == "failed" && <p>Login failed</p>}
      <LoginForm onSubmit={onSubmit} />;
    </>
  );
};

// const Div = styled.div`
//   position: absolute;
//   left: 25px;
//   top: 20px;
//   right: 25px;
//   height: 300px;
//   background: rgba(255, 255, 255, 0.8);
//   overflow-y: auto;
// `;

// const clg = console.log;

// console.list = [];
// console.listeners = [];
// console.log = (...args) => {
//   clg(...args);
//   console.list.push(args);
//   if (console.list.length > 10) {
//     console.list.shift();
//   }
//   console.listeners.forEach((f) => f());
// };

// const Console = () => {
//   const [list, setList] = useState(console.list);
//   useEffect(() => {
//     console.listeners.push(() => {
//       setList([...console.list]);
//     });
//   }, []);
//   return list.map((args, i) => (
//     <pre style={{ fontSize: "small", margin: 0 }} key={i}>
//       {JSON.stringify(args.length == 1 ? args[0] : args, null, 2)}
//     </pre>
//   ));
// };
