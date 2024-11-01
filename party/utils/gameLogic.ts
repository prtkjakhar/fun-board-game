import type { GamePiece, Player, GameState, Position, BoardPosition } from '@/app/types/game';
import { BOARD_POSITIONS, WINNING_COMBINATIONS, VALID_MOVES } from '@/app/types/game';

export class GameLogic {
  static getNearestPosition(
    newPosition: BoardPosition,
    snapRadius: number
  ): Position | null {
    let closestPosition: Position | null = null;
    let minDistance = Infinity;

    BOARD_POSITIONS.forEach((pos, index) => {
      const distance = Math.sqrt(
        Math.pow(pos.x - newPosition.x, 2) + Math.pow(pos.y - newPosition.y, 2)
      );

      if (distance <= snapRadius && distance < minDistance) {
        closestPosition = index as Position;
        minDistance = distance;
      }
    });

    return closestPosition;
  }

  static isValidMove(
    piece: GamePiece,
    newPosition: Position,
    state: GameState,
    playerId: string
  ): boolean {
    const playerNumber = state.players[playerId]?.number;
    const validMoves = VALID_MOVES[piece.position];
    const isValidPosition = validMoves.includes(newPosition);
    const isPositionEmpty = !state.pieces.some(p => p.position === newPosition);

    return !!(
      playerNumber &&
      !state.winner &&
      piece.player === state.currentPlayer &&
      playerNumber === state.currentPlayer &&
      isValidPosition &&
      isPositionEmpty
    );
  }

  static checkWinner(pieces: GamePiece[]): Player | null {
    for (const combo of WINNING_COMBINATIONS) {
      const piecesInCombo = pieces.filter((p) => combo.includes(p.position));
      if (
        piecesInCombo.length === 3 &&
        piecesInCombo.every((p) => p.player === piecesInCombo[0].player)
      ) {
        return piecesInCombo[0].player;
      }
    }
    return null;
  }

  static createInitialGameState(): GameState {
    const positions = Array.from({ length: 10 }, (_, i) => i) as Position[];
    const shuffledPositions: Position[] = [];

    while (shuffledPositions.length < 6) {
      const randomIndex = Math.floor(Math.random() * positions.length);
      const position = positions[randomIndex];
      shuffledPositions.push(position);
      positions.splice(randomIndex, 1);
    }

    return {
      pieces: [
        { id: 1, player: 1, position: shuffledPositions[0] },
        { id: 2, player: 1, position: shuffledPositions[1] },
        { id: 3, player: 1, position: shuffledPositions[2] },
        { id: 4, player: 2, position: shuffledPositions[3] },
        { id: 5, player: 2, position: shuffledPositions[4] },
        { id: 6, player: 2, position: shuffledPositions[5] },
      ],
      currentPlayer: 1,
      winner: null,
      players: {},
    };
  }

  static generateRoomId(): string {
    return `game-${Math.random().toString(36).substring(2, 9)}`;
  }
}