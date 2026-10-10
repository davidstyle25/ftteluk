function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Stack traces are only shown when SHOW_ERROR_DETAILS=true (useful while debugging a
// new deployment in Coolify). Keep it unset/false in production so internals are not leaked.
function renderDetail(error?: unknown): string {
  if (typeof process === "undefined" || process.env?.["SHOW_ERROR_DETAILS"] !== "true") return "";
  if (error == null) return "";
  const message = error instanceof Error ? (error.stack || error.message) : String(error);
  return `<pre style="text-align:left;white-space:pre-wrap;background:#fff;border:1px solid #e5e7eb;border-radius:.375rem;padding:1rem;font-size:12px;overflow:auto;max-height:60vh">${escapeHtml(message)}</pre>`;
}

export function renderErrorPage(error?: unknown): string {

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
      ${renderDetail(error)}

    </div>
  </body>
</html>`;
}
