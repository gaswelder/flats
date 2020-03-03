import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { store } from "./state";
import { Main } from "./components/Main";

ReactDOM.render(
  <Provider store={store}>
    <Main />
  </Provider>,
  document.querySelector("#c")
);
