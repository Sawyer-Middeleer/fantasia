import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        color: "#111111",
      }}
    >
      <h1 style={{ fontSize: "4rem", fontWeight: 800, margin: 0 }}>404</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>Page not found.</p>
      <Link href="/" style={{ color: "#0066ff" }}>
        &larr; Back to home
      </Link>
    </div>
  );
}
