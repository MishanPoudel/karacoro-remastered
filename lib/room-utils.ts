/**
 * Generates a random uppercase alphanumeric room ID
 * @param length - Length of the room ID (default: 6)
 * @returns Random uppercase alphanumeric string
 */
export function generateRoomId(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Validates room ID format (uppercase alphanumeric, 6 characters)
 * @param roomId - Room ID to validate
 * @returns Boolean indicating if room ID is valid
 */
export function validateRoomId(roomId: string): boolean {
  const roomIdRegex = /^[A-Z0-9]{6}$/;
  return roomIdRegex.test(roomId);
}