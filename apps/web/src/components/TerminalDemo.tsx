"use client";

import { useState } from "react";

const helpOutput = `$ fantasia --help

  fantasia v0.1.0
  Micro tools for building and running a business.

  Usage: fantasia <command> [options]

  Commands:
    audit     Run a CRM data-quality audit
    fix       Preview and apply auto-fixes for CRM issues
    login     Authenticate with a CRM integration
    status    Show connection status for integrations

  Options:
    --help    Show help for any command
    --json    Machine-readable output (most commands)

  More tools coming. github.com/Sawyer-Middeleer/fantasia`;

const auditOutput = `$ fantasia audit

  FANTASIA CRM AUDIT

  Health Score: 61/100  D
  \u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591\u2591\u2591

  Category          Score   Affected
  Duplicates          45      127
  Stale Records       58       89
  Missing Fields      72       56
  Format Issues       69       34

  3,847 records scanned | Portal 245538850`;

export function TerminalDemo() {
  const [tab, setTab] = useState<"help" | "audit">("help");

  return (
    <div style={styles.terminal}>
      <div style={styles.titleBar}>
        <div style={styles.dots}>
          <span style={{ ...styles.dot, background: "#ff5f57" }} />
          <span style={{ ...styles.dot, background: "#febc2e" }} />
          <span style={{ ...styles.dot, background: "#28c840" }} />
        </div>
        <span style={styles.titleText}>fantasia</span>
        <div style={styles.dotsPlaceholder} />
      </div>
      <div style={styles.tabBar}>
        <button
          onClick={() => setTab("help")}
          style={{
            ...styles.tab,
            ...(tab === "help" ? styles.tabActive : {}),
          }}
        >
          --help
        </button>
        <button
          onClick={() => setTab("audit")}
          style={{
            ...styles.tab,
            ...(tab === "audit" ? styles.tabActive : {}),
          }}
        >
          audit
        </button>
      </div>
      <pre style={styles.body}>
        {tab === "help" ? helpOutput : auditOutput}
      </pre>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  terminal: {
    background: "#1a1a2e",
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #2a2a3e",
    boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
    maxWidth: 700,
    margin: "0 auto",
  },
  titleBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    background: "#16162a",
    borderBottom: "1px solid #2a2a3e",
  },
  dots: {
    display: "flex",
    gap: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    display: "inline-block",
  },
  dotsPlaceholder: {
    width: 54,
  },
  titleText: {
    fontSize: 13,
    color: "#666680",
    fontFamily: "monospace",
  },
  tabBar: {
    display: "flex",
    gap: 0,
    borderBottom: "1px solid #2a2a3e",
    background: "#16162a",
  },
  tab: {
    padding: "8px 20px",
    fontSize: 13,
    fontFamily: "monospace",
    color: "#666680",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    transition: "color 0.15s, border-color 0.15s",
  },
  tabActive: {
    color: "#e0e0f0",
    borderBottomColor: "#6366f1",
  },
  body: {
    padding: "20px 24px",
    margin: 0,
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: 13,
    lineHeight: 1.6,
    color: "#c8c8e0",
    overflowX: "auto",
    whiteSpace: "pre",
  },
};
