export type Player = 1 | 2;
export type Position = number;
export type GamePiece = {
  id: number;
  player: Player;
  position: Position;
};

export const VALID_MOVES: { [key: number]: number[] } = {
  0: [1],           // Top left
  1: [0, 2, 3],     // Top center
  2: [1],           // Top right
  3: [1, 4, 6],  // Center top
  4: [3],           // Left branch
  5: [6],           // Right branch
  6: [3, 5, 7],        // Center middle
  7: [6, 8, 9],     // Center bottom
  8: [7],           // Bottom left
  9: [7],           // Bottom right
};

export const WINNING_COMBINATIONS = [
  [0, 1, 2],    // Top Horizontal
  [8, 7, 9],    // Top Middle Vertical
  [1, 3, 6],    // Bottom Middle Vertical
  [3, 6, 7],    // Bottom Horizontal
];

export const BOARD_POSITIONS = [
  { x: 20, y: 10 },     // 0: Top left
  { x: 50, y: 10 },     // 1: Top center
  { x: 80, y: 10 },     // 2: Top right
  { x: 50, y: 30 },     // 3: Center top
  { x: 20, y: 30 },     // 4: Left branch (aligned with center top)
  { x: 80, y: 50 },     // 5: Right branch (aligned with center middle)
  { x: 50, y: 50 },     // 6: Center middle
  { x: 50, y: 70 },     // 7: Center bottom
  { x: 20, y: 70 },     // 8: Bottom left
  { x: 80, y: 70 },     // 9: Bottom right
];