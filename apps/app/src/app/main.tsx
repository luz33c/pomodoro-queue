import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { initLocale } from "#/lib/i18n";

import { router } from "#/app/router";
import "#/app/styles/app.css";

initLocale();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing #root element in index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
