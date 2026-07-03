"use client";

import { useState } from "react";

import Sidebar from "./components/Sidebar";

import Configuration from "./components/Configuration";
import Diagnostics from "./components/Diagnostics";
import History from "./components/History";
import Health from "./components/Health";
import About from "./components/About";

export default function ConfigPage() {
  const [selectedTab, setSelectedTab] =
    useState("configuration");

  return (
    <main
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "Arial",
      }}
    >
      <Sidebar
        selected={selectedTab}
        onSelect={setSelectedTab}
      />

      <div
        style={{
          flex: 1,
          padding: 24,
          overflow: "auto",
        }}
      >
        {selectedTab ===
          "configuration" && (
          <Configuration />
        )}

        {selectedTab ===
          "diagnostics" && (
          <Diagnostics />
        )}

        {selectedTab ===
          "history" && (
          <History />
        )}

        {selectedTab ===
          "health" && (
          <Health />
        )}

        {selectedTab ===
          "about" && (
          <About />
        )}
      </div>
    </main>
  );
}