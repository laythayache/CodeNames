import { Server } from "socket.io";

interface ActiveTimer {
  interval: NodeJS.Timeout;
  secondsRemaining: number;
}

export class TimerManager {
  private timers: Map<string, ActiveTimer> = new Map();

  start(
    io: Server,
    roomCode: string,
    duration: number,
    onExpire: () => void
  ): void {
    this.stop(roomCode);

    const timer: ActiveTimer = {
      interval: setInterval(() => {
        timer.secondsRemaining--;
        io.to(roomCode).emit("server:timer-tick", {
          secondsRemaining: timer.secondsRemaining,
        });

        if (timer.secondsRemaining <= 0) {
          this.stop(roomCode);
          io.to(roomCode).emit("server:timer-expired");
          onExpire();
        }
      }, 1000),
      secondsRemaining: duration,
    };

    this.timers.set(roomCode, timer);
  }

  stop(roomCode: string): void {
    const timer = this.timers.get(roomCode);
    if (timer) {
      clearInterval(timer.interval);
      this.timers.delete(roomCode);
    }
  }

  pause(roomCode: string): void {
    const timer = this.timers.get(roomCode);
    if (timer) {
      clearInterval(timer.interval);
    }
  }

  resume(io: Server, roomCode: string, onExpire: () => void): void {
    const timer = this.timers.get(roomCode);
    if (!timer) return;

    timer.interval = setInterval(() => {
      timer.secondsRemaining--;
      io.to(roomCode).emit("server:timer-tick", {
        secondsRemaining: timer.secondsRemaining,
      });

      if (timer.secondsRemaining <= 0) {
        this.stop(roomCode);
        io.to(roomCode).emit("server:timer-expired");
        onExpire();
      }
    }, 1000);
  }

  getRemaining(roomCode: string): number {
    return this.timers.get(roomCode)?.secondsRemaining ?? 0;
  }

  stopAll(): void {
    for (const [roomCode] of this.timers) {
      this.stop(roomCode);
    }
  }
}
