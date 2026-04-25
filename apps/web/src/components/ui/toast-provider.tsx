"use client";

import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "#111111",
          color: "#ffffff",
          border: "1px solid #1f1f1f",
        },
      }}
    />
  );
}
