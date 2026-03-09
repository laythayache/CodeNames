import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const savedName = sessionStorage.getItem("codenames:displayName");
    const savedRoom = sessionStorage.getItem("codenames:roomCode");

    socket = io(window.location.origin, {
      autoConnect: false,
      auth: {
        displayName: savedName || undefined,
        roomCode: savedRoom || undefined,
      },
    });
  }
  return socket;
}

export function connectSocket(displayName?: string, roomCode?: string): Socket {
  const s = getSocket();

  if (displayName) {
    sessionStorage.setItem("codenames:displayName", displayName);
    s.auth = { ...s.auth as object, displayName };
  }
  if (roomCode) {
    sessionStorage.setItem("codenames:roomCode", roomCode);
    s.auth = { ...s.auth as object, roomCode };
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
  sessionStorage.removeItem("codenames:displayName");
  sessionStorage.removeItem("codenames:roomCode");
}
