import bcrypt from "bcryptjs";

// 12 rounds ~ 250ms per hash: slow enough to hurt brute force, fast enough for login.
const COST = 12;

export const MIN_PASSWORD_LENGTH = 8;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

// Compared against when the email is unknown, so a missing account takes as
// long as a wrong password and login timing can't reveal which emails exist.
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash("not-a-real-password", COST);
  return dummyHash;
}

export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  const ok = await bcrypt.compare(password, hash ?? (await getDummyHash()));
  return hash !== null && ok;
}
