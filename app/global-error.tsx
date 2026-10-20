"use client";

// Replaces the root layout when the layout itself throws, so globals.css and the
// fonts registered on it may be unavailable — keep this self-contained and readable.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f6f3eb",
          color: "#221d16",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <main style={{ maxWidth: "34rem", padding: "0 20px", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Something on this page went wrong</h1>
          <p style={{ marginTop: "0.75rem", color: "#5c5346", lineHeight: 1.6 }}>
            The page couldn&apos;t load. You can try again, or reload and come back to it.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1.5rem",
              borderRadius: "9999px",
              border: "1px solid transparent",
              backgroundColor: "#795b1e",
              color: "#f6f3eb",
              padding: "0.75rem 1.5rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
