import { NextRequest, NextResponse } from "next/server";

// GET /api/auth/cli/attio/callback — display auth code for CLI to consume
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return new NextResponse(renderPage("Error", "Missing authorization code."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  return new NextResponse(
    renderPage(
      "Authorization successful",
      `Copy this code and paste it into your terminal:`,
      code
    ),
    { headers: { "Content-Type": "text/html" } }
  );
}

function renderPage(title: string, message: string, code?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Fantasia CLI — ${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fafafa; color: #111; }
    .card { text-align: center; padding: 3rem; max-width: 500px; }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    p { color: #666; margin-bottom: 1.5rem; }
    .code { background: #111; color: #0f0; padding: 1rem 1.5rem; border-radius: 8px; font-family: monospace; font-size: 0.875rem; word-break: break-all; cursor: pointer; position: relative; }
    .code:hover::after { content: 'Click to copy'; position: absolute; top: -2rem; left: 50%; transform: translateX(-50%); font-size: 0.75rem; color: #888; }
    .hint { font-size: 0.8rem; color: #999; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    ${code ? `<div class="code" onclick="navigator.clipboard.writeText('${code}')" title="Click to copy">${code}</div><p class="hint">You can close this tab after pasting.</p>` : ""}
  </div>
</body>
</html>`;
}
