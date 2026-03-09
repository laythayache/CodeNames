import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager";
import { GamePhase } from "shared/types";
import { ABANDONMENT_TIMEOUT, HOST_TRANSFER_TIMEOUT } from "../config";

const disconnectTimers: Map<string, NodeJS.Timeout> = new Map();
const hostTransferTimers: Map<string, NodeJS.Timeout> = new Map();

export function registerConnectionHandlers(
  io: Server,
  socket: Socket,
  gameManager: GameManager
): void {
  // Handle reconnection via auth
  const { displayName, roomCode } = socket.handshake.auth as {
    displayName?: string;
    roomCode?: string;
  };

  if (displayName && roomCode) {
    const game = gameManager.getGame(roomCode);
    if (game) {
      const player = game.findPlayerByName(displayName);
      if (player && !player.isConnected) {
        // Reconnect
        player.id = socket.id;
        player.isConnected = true;
        socket.join(game.roomCode);

        // Cancel abandonment timer
        const timerKey = `${game.roomCode}:${displayName}`;
        const timer = disconnectTimers.get(timerKey);
        if (timer) {
          clearTimeout(timer);
          disconnectTimers.delete(timerKey);
        }

        // Cancel host transfer timer if this is the host
        if (player.isHost) {
          const htTimer = hostTransferTimers.get(game.roomCode);
          if (htTimer) {
            clearTimeout(htTimer);
            hostTransferTimers.delete(game.roomCode);
          }
        }

        console.log(`Reconnected: ${displayName} to room ${game.roomCode}`);

        // Send current state
        if (game.phase === GamePhase.LOBBY) {
          socket.emit("server:room-created", { roomCode: game.roomCode });
          io.to(game.roomCode).emit("server:lobby-state", game.getLobbyState());
        } else {
          socket.emit("server:game-state", game.getGameStatePayload(player));
          // Notify others of reconnection
          io.to(game.roomCode).emit("server:lobby-state", game.getLobbyState());
        }
        return;
      }
    }
  }

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);

    const game = gameManager.findGameBySocketId(socket.id);
    if (!game) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player) return;

    player.isConnected = false;

    // Remove disconnected player's votes
    game.removeVotesForPlayer(player.displayName);

    // Notify room
    if (game.phase === GamePhase.LOBBY) {
      io.to(game.roomCode).emit("server:lobby-state", game.getLobbyState());
    } else {
      // Broadcast updated votes
      io.to(game.roomCode).emit("server:votes-updated", {
        votes: game.getVotesPayload(),
      });
      // Broadcast updated player list
      for (const p of game.players) {
        if (p.isConnected) {
          const sock = io.sockets.sockets.get(p.id);
          if (sock) {
            sock.emit("server:game-state", game.getGameStatePayload(p));
          }
        }
      }
    }

    // Start abandonment timer
    const timerKey = `${game.roomCode}:${player.displayName}`;
    disconnectTimers.set(
      timerKey,
      setTimeout(() => {
        disconnectTimers.delete(timerKey);
        // Player didn't reconnect — mark as abandoned
        console.log(`Player abandoned: ${player.displayName} from room ${game.roomCode}`);
      }, ABANDONMENT_TIMEOUT)
    );

    // Host transfer timer
    if (player.isHost) {
      hostTransferTimers.set(
        game.roomCode,
        setTimeout(() => {
          hostTransferTimers.delete(game.roomCode);
          // Transfer host to next connected player
          const nextHost = game.players.find((p) => p.isConnected && !p.isHost);
          if (nextHost) {
            player.isHost = false;
            nextHost.isHost = true;
            console.log(`Host transferred to ${nextHost.displayName} in room ${game.roomCode}`);

            if (game.phase === GamePhase.LOBBY) {
              io.to(game.roomCode).emit("server:lobby-state", game.getLobbyState());
            } else {
              for (const p of game.players) {
                if (p.isConnected) {
                  const sock = io.sockets.sockets.get(p.id);
                  if (sock) {
                    sock.emit("server:game-state", game.getGameStatePayload(p));
                  }
                }
              }
            }
          }
        }, HOST_TRANSFER_TIMEOUT)
      );
    }

    // Clean up empty games
    const connected = game.players.filter((p) => p.isConnected);
    if (connected.length === 0) {
      setTimeout(() => {
        const stillEmpty = game.players.every((p) => !p.isConnected);
        if (stillEmpty) {
          gameManager.removeGame(game.roomCode);
        }
      }, ABANDONMENT_TIMEOUT);
    }
  });
}
