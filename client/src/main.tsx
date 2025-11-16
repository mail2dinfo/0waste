import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { EventProvider } from "./state/EventContext";
import "./i18n/i18n";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <EventProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </EventProvider>
  </React.StrictMode>
);

