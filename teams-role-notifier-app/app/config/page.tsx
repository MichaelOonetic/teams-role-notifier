"use client";

import { useEffect, useState } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

export default function ConfigPage() {
  const [context, setContext] = useState<any>(null);

  useEffect(() => {
    monday.listen("context", (res) => {
      console.log("MONDAY CONTEXT", res);

      setContext(res.data);
    });
  }, []);

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "Arial",
      }}
    >
      <h1>Configuration Teams Notification</h1>

      <h2>Contexte Monday</h2>

      <pre
        style={{
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 8,
          overflow: "auto",
        }}
      >
        {JSON.stringify(context, null, 2)}
      </pre>
    </main>
  );
}