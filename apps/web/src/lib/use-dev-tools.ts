import { useState, useEffect } from "react";

export function useDevTools() {
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  const [showDevPanel, setShowDevPanel] = useState<boolean>(false);
  const [devCountry, setDevCountry] = useState<string>("be");
  const [devDataType, setDevDataType] = useState<string>("cards");
  const [devJson, setDevJson] = useState<string>("");
  const [devStatus, setDevStatus] = useState<{ type: "success" | "error" | "loading"; message: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("dev") === "true") {
        setIsDevMode(true);
      }
    }
  }, []);

  async function handleMergeSubmit() {
    setDevStatus({ type: "loading", message: "Saving data and compiling..." });
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(devJson);
      } catch {
        throw new Error("Invalid JSON: Please check the syntax.");
      }

      const res = await fetch("http://localhost:3001/api/update-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: devCountry,
          dataType: devDataType,
          data: parsed,
        }),
      });

      const result = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(result.error || "Failed to update data");
      }

      setDevStatus({ type: "success", message: "Saved, validated, and compiled successfully. Reloading..." });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      setDevStatus({ type: "error", message: err instanceof Error ? err.message : "An error occurred" });
    }
  }

  return {
    isDevMode,
    showDevPanel,
    setShowDevPanel,
    devCountry,
    setDevCountry,
    devDataType,
    setDevDataType,
    devJson,
    setDevJson,
    devStatus,
    handleMergeSubmit,
  };
}
