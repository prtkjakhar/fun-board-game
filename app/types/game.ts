export type Player = 1 | 2;
export type Position = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface GamePiece {
  id: number;
  player: Player;
  position: Position;
}

export interface PlayerData {
  number: Player;
  name: string;
  roomId?: string;
}

export interface GameState {
  pieces: GamePiece[];
  currentPlayer: Player;
  winner: Player | null;
  players: {
    [key: string]: PlayerData;
  };
}

export interface WaitingRoomState {
  waitingPlayers: {
    connectionId: string;
    name: string;
  }[];
  activeGames: Set<string>;
}

export interface BoardPosition {
  x: number;
  y: number;
}

export const BOARD_POSITIONS: readonly BoardPosition[] = [
  { x: 20, y: 10 },  // 0: Top left
  { x: 50, y: 10 },  // 1: Top center
  { x: 80, y: 10 },  // 2: Top right
  { x: 50, y: 30 },  // 3: Center top
  { x: 20, y: 30 },  // 4: Left branch
  { x: 80, y: 50 },  // 5: Right branch
  { x: 50, y: 50 },  // 6: Center middle
  { x: 50, y: 70 },  // 7: Center bottom
  { x: 20, y: 70 },  // 8: Bottom left
  { x: 80, y: 70 },  // 9: Bottom right
];

export const WINNING_COMBINATIONS: readonly Position[][] = [
  [0, 1, 2],    // Top Horizontal
  [8, 7, 9],    // Top Middle Vertical
  [1, 3, 6],    // Bottom Middle Vertical
  [3, 6, 7],    // Bottom Horizontal
];

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