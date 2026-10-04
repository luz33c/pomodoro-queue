import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import process from "node:process";

process.env.HOST = "127.0.0.1";
process.env.PORT = "0";

const { server } = await import("../server.ts");
const signal = AbortSignal.timeout(15_000);

try {
  if (!server.listening) await once(server, "listening", { signal });
  const address = server.address();
  assert(address && typeof address === "object");
  const basePath = new URL(
    process.env.VITE_WEB_URL ?? "http://localhost:3000/web"
  ).pathname.replace(/\/+$/, "");
  const origin = `http://127.0.0.1:${address.port}`;
  const baseUrl = `${origin}${basePath}`;

  const health = await fetch(`${baseUrl}/_api/health/live`, { signal });
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, "healthy");

  const expectedHome = await readFile(new URL("../dist/client/index.html", import.meta.url));
  const home = await fetch(`${baseUrl}/`, { signal });
  assert.equal(home.status, 200);
  assert.deepEqual(Buffer.from(await home.arrayBuffer()), expectedHome);

  const expectedIcon = await readFile(new URL("../dist/client/favicon.ico", import.meta.url));
  const icon = await fetch(`${baseUrl}/favicon.ico`, { signal });
  assert.equal(icon.status, 200);
  assert.deepEqual(Buffer.from(await icon.arrayBuffer()), expectedIcon);

  const head = await fetch(`${baseUrl}/favicon.ico`, { method: "HEAD", signal });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");

  const post = await fetch(`${baseUrl}/favicon.ico`, { method: "POST", signal });
  assert.notEqual(post.status, 200, "POST must not serve static files");
  await post.body?.cancel();

  if (basePath) {
    const outside = await fetch(`${origin}/favicon.ico`, { signal });
    assert.equal(outside.status, 404, "Static files must stay under the configured base path");
    await outside.body?.cancel();
  }
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
}
