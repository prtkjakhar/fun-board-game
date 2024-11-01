import type * as Party from 'partykit/server';
import type { WaitingRoomState } from '@/app/types/game';
import { GameLogic } from '../utils/gameLogic';

export class WaitingRoomManager {
  constructor(
    private room: Party.Room,
    private storage: Party.Storage
  ) {}

  async getState(): Promise<WaitingRoomState> {
    const state = await this.storage.get<WaitingRoomState>('waitingState');
    return state || { waitingPlayers: [], activeGames: new Set() };
  }

  private async setState(state: WaitingRoomState) {
    await this.storage.put('waitingState', state);
  }

  async handleJoinQueue(playerId: string, playerName: string) {
    const state = await this.getState();

    // Add new player to queue
    state.waitingPlayers.push({
      connectionId: playerId,
      name: playerName,
    });

    // Match players if we have enough
    if (state.waitingPlayers.length >= 2) {
      await this.matchPlayers(state);
    } else {
      await this.setState(state);
    }

    // Broadcast updated queue count
    this.broadcastQueueState(state.waitingPlayers.length);
  }

  private async matchPlayers(state: WaitingRoomState) {
    const [player1, player2] = state.waitingPlayers.slice(0, 2);
    const newRoomId = GameLogic.generateRoomId();

    // Create new game room
    state.activeGames.add(newRoomId);

    // Notify matched players
    this.notifyPlayer(player1, newRoomId, 1);
    this.notifyPlayer(player2, newRoomId, 2);

    // Remove matched players from queue
    state.waitingPlayers = state.waitingPlayers.slice(2);
    await this.setState(state);
  }

  private notifyPlayer(
    player: { connectionId: string; name: string },
    roomId: string,
    playerNumber: 1 | 2
  ) {
    const conn = this.room.connections.get(player.connectionId);
    if (conn) {
      conn.send(
        JSON.stringify({
          type: 'roomAssignment',
          roomId,
          yourPlayer: { number: playerNumber, name: player.name },
        })
      );
    }
  }

  private broadcastQueueState(playersCount: number) {
    this.room.broadcast(
      JSON.stringify({
        type: 'waitingState',
        playersCount,
      })
    );
  }

  async handlePlayerDisconnect(playerId: string) {
    const state = await this.getState();
    state.waitingPlayers = state.waitingPlayers.filter(
      (p) => p.connectionId !== playerId
    );
    await this.setState(state);
    this.broadcastQueueState(state.waitingPlayers.length);
  }
}