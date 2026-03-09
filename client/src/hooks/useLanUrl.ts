import { useState, useEffect } from "react";

/**
 * Returns a LAN-accessible join URL for QR codes.
 * If the host is on localhost, fetches the server's LAN IP.
 */
export function useLanJoinUrl(roomCode: string): string {
  const [lanOrigin, setLanOrigin] = useState<string | null>(null);
  const hostname = window.location.hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

  useEffect(() => {
    if (!isLocal) return;
    fetch("/api/server-info")
      .then((r) => r.json())
      .then((data: { ip: string; port: number }) => {
        setLanOrigin(`http://${data.ip}:${window.location.port || data.port}`);
      })
      .catch(() => {
        // fallback: stay with localhost
      });
  }, [isLocal]);

  const origin = isLocal && lanOrigin ? lanOrigin : window.location.origin;
  return `${origin}?room=${roomCode}`;
}
