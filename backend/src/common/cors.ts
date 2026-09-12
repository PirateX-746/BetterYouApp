/**
 * Origins allowed to call the API and open sockets.
 *
 * Shared by the HTTP server and both WebSocket gateways. The gateways used
 * to declare `origin: '*'`, which is not merely loose — a wildcard origin is
 * incompatible with credentialed requests, so the browser refuses to send
 * the session cookie and socket authentication could never work.
 */
export function allowedOrigins(): string[] {
  return [
    process.env.FRONTEND_URL,
    'https://better-you-app-bay.vercel.app',
    'http://192.168.1.41:3000',
    // Local dev — required for SSE and direct socket connections.
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter(Boolean) as string[];
}

/** CORS options for the Socket.io gateways. */
export function socketCorsOptions() {
  return {
    origin: allowedOrigins(),
    credentials: true,
  };
}
