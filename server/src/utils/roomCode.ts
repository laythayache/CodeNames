const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion

export function generateRoomCode(existingCodes: Set<string>): string {
  let code: string;
  do {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
  } while (existingCodes.has(code));
  return code;
}
