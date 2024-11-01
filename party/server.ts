import type * as Party from 'partykit/server';
import type { Player } from '@/app/types/game';
import { WaitingRoomManager } from './managers/WaitingRoomManager';
import { GameManager } from './managers/GameManager';

export default class GameServer implements Party.Server {
  options: Party.ServerOptions = {
    hibernate: false,
  };

  private manager: WaitingRoomManager | GameManager;

  constructor(readonly room: Party.Room) {
    this.manager = room.id === 'waiting-room'
      ? new WaitingRoomManager(room, room.storage)
      : new GameManager(room, room.storage);
  }

  async onConnect(conn: Party.Connection) {
    if (this.room.id === 'waiting-room') {
      const state = await (this.manager as WaitingRoomManager).getState();
      conn.send(
        JSON.stringify({
          type: 'waitingState',
          playersCount: state.waitingPlayers.length,
        })
      );
    } else {
      const state = await (this.manager as GameManager).getState();
      const existingPlayer = Object.entries(state.players).find(
        ([_, player]) => player.name === conn.id
      );

      if (existingPlayer) {
        const [oldId, playerData] = existingPlayer;
        delete state.players[oldId];
        state.players[conn.id] = playerData;
        await (this.manager as GameManager).setState(state);
      }
    }
  }

  async onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message);

    if (this.room.id === 'waiting-room') {
      if (data.type === 'joinQueue') {
        await (this.manager as WaitingRoomManager).handleJoinQueue(
          sender.id,
          data.playerName
        );
      }
    } else {
      switch (data.type) {
        case 'join':
          await (this.manager as GameManager).handlePlayerJoin(
            sender.id,
            data.playerNumber as Player,
            data.playerName
          );
          break;

        case 'move':
          await (this.manager as GameManager).handleMove(
            data.piece,
            data.newPosition,
            sender.id
          );
          break;

        case 'reset':
          await (this.manager as GameManager).initializeGame();
          break;
      }
    }
  }

  async onClose(connection: Party.Connection) {
    if (this.room.id === 'waiting-room') {
      await (this.manager as WaitingRoomManager).handlePlayerDisconnect(
        connection.id
      );
    } else {
      await (this.manager as GameManager).handlePlayerDisconnect(connection.id);
    }
  }
}