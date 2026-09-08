import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App.tsx";
import "./index.css";
import { Compare } from "./pages/Compare.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { History } from "./pages/History.tsx";
import { RequestDetail } from "./pages/RequestDetail.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Dashboard />} />
          <Route path="history" element={<History />} />
          <Route path="history/:id" element={<RequestDetail />} />
          <Route path="compare" element={<Compare />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
