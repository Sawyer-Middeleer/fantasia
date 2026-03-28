"use client";

import { useState } from "react";

export function InstallCommand() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText("npx fantasia-sh");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  };

  return (
    <div style={styles.wrapper}>
      <code style={styles.code}>npx fantasia-sh</code>
      <button onClick={handleCopy} style={styles.button}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    background: "#f0f0f0",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: "10px 16px",
    fontFamily: "'Courier New', Courier, monospace",
  },
  code: {
    fontSize: 15,
    color: "#333",
    fontFamily: "inherit",
    userSelect: "all",
  },
  button: {
    fontSize: 13,
    color: "#666",
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 5,
    padding: "4px 12px",
    cursor: "pointer",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    transition: "color 0.15s, border-color 0.15s",
  },
};
