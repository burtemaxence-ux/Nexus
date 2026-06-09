import bcrypt from 'bcryptjs'

export function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10)
}

export function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}
