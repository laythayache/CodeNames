import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const savedName = localStorage.getItem("codenames:displayName");
    const savedRoom = localStorage.getItem("codenames:roomCode");
    const savedToken = localStorage.getItem("codenames:token");

    socket = io(window.location.origin, {
      autoConnect: false,
      auth: {
        displayName: savedName || undefined,
        roomCode: savedRoom || undefined,
        token: savedToken || undefined,
      },
    });
  }
  return socket;
}

export function connectSocket(displayName?: string, roomCode?: string): Socket {
  const s = getSocket();

  if (displayName) {
    localStorage.setItem("codenames:displayName", displayName);
    s.auth = { ...s.auth as object, displayName };
  }
  if (roomCode) {
    localStorage.setItem("codenames:roomCode", roomCode);
    s.auth = { ...s.auth as object, roomCode };
  }

  const savedToken = localStorage.getItem("codenames:token");
  if (savedToken) {
    s.auth = { ...s.auth as object, token: savedToken };
  }

  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  localStorage.removeItem("codenames:displayName");
  localStorage.removeItem("codenames:roomCode");
  localStorage.removeItem("codenames:token");
}

export async function getServerInfo(): Promise<{ url: string }> {
  const res = await fetch("/api/server-info");
  if (!res.ok) {
    throw new Error(`Failed to fetch server info: ${res.status}`);
  }
  return res.json();
}
