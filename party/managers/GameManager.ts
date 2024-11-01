import type * as Party from 'partykit/server';
import type { GameState, GamePiece, Position, Player } from '@/app/types/game';
import { GameLogic } from '../utils/gameLogic';
import { BOARD_POSITIONS } from '@/app/types/game';

export class GameManager {
  constructor(
    private room: Party.Room,
    private storage: Party.Storage
  ) {}

  async getState(): Promise<GameState> {
    const state = await this.storage.get<GameState>('gameState');
    return state || GameLogic.createInitialGameState();
  }

  async setState(state: GameState) {
    await this.storage.put('gameState', state);
  }

  async handlePlayerJoin(playerId: string, playerNumber: Player, playerName: string) {
    const state = await this.getState();

    if (!state.players[playerId]) {
      state.players[playerId] = {
        number: playerNumber,
        name: playerName,
        roomId: this.room.id,
      };
      await this.setState(state);

      // Initialize game if both players are present
      if (Object.keys(state.players).length === 2) {
        await this.initializeGame();
      } else {
        await this.broadcastState();
      }
    }
  }

  async handleMove(piece: GamePiece, newPosition: Position, playerId: string) {
    const state = await this.getState();

    if (!GameLogic.isValidMove(piece, newPosition, state, playerId)) {
      return;
    }

    const targetPosition = BOARD_POSITIONS[newPosition];
    const snapRadius = 35;
    const validPositionIndex = GameLogic.getNearestPosition(targetPosition, snapRadius);

    if (validPositionIndex !== null) {
      // Update piece position
      state.pieces = state.pieces.map((p) =>
        p.id === piece.id ? { ...p, position: validPositionIndex } : p
      );

      // Check for winner
      const winner = GameLogic.checkWinner(state.pieces);
      if (winner) {
        state.winner = winner;
      } else {
        state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
      }

      await this.setState(state);
      await this.broadcastState();
    }
  }

  async initializeGame() {
    const currentState = await this.getState();
    const newState = {
      ...GameLogic.createInitialGameState(),
      players: currentState.players,
    };

    await this.setState(newState);
    await this.broadcastState();
  }

  async handlePlayerDisconnect(playerId: string) {
    const state = await this.getState();
    if (state.players[playerId]) {
      delete state.players[playerId];
      await this.setState(state);
      await this.broadcastState();

      // Reset game if no players remain
      if (Object.keys(state.players).length === 0) {
        await this.setState(GameLogic.createInitialGameState());
      }
    }
  }

  private async broadcastState() {
    const state = await this.getState();
    this.room.broadcast(
      JSON.stringify({
        type: 'gameState',
        state,
      })
    );
  }
}