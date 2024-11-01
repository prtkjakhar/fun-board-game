import type * as Party from 'partykit/server';

type PlayerData = {
  number: Player;
  name: string;
  roomId?: string;
};

const BOARD_POSITIONS = [
  { x: 20, y: 10 },
  { x: 50, y: 10 },
  { x: 80, y: 10 },
  { x: 50, y: 30 },
  { x: 20, y: 30 },
  { x: 80, y: 50 },
  { x: 50, y: 50 },
  { x: 50, y: 70 },
  { x: 20, y: 70 },
  { x: 80, y: 70 },
];

type GameState = {
  pieces: GamePiece[];
  currentPlayer: Player;
  winner: Player | null;
  players: {
    [key: string]: PlayerData;
  };
};

type WaitingRoomState = {
  waitingPlayers: {
    connectionId: string;
    name: string;
  }[];
  activeGames: Set<string>;
};

type GamePiece = {
  id: number;
  player: Player;
  position: number;
};

type Player = 1 | 2;

export default class GameServer implements Party.Server {
  options: Party.ServerOptions = {
    hibernate: false,
  };

  constructor(readonly room: Party.Room) {
    this.initialize();
  }

  async initialize() {
    if (this.room.id === 'waiting-room') {
      const waitingState: WaitingRoomState = {
        waitingPlayers: [],
        activeGames: new Set(),
      };
      await this.room.storage.put('waitingState', waitingState);
    } else {
      await this.initializeGameState();
    }
  }

  private async initializeGameState() {
    const initialState: GameState = {
      pieces: [],
      currentPlayer: 1,
      winner: null,
      players: {},
    };
    await this.room.storage.put('gameState', initialState);
  }

  private async getWaitingState(): Promise<WaitingRoomState> {
    const state = await this.room.storage.get<WaitingRoomState>('waitingState');
    return state || { waitingPlayers: [], activeGames: new Set() };
  }

  private async setWaitingState(state: WaitingRoomState) {
    await this.room.storage.put('waitingState', state);
  }

  async getState(): Promise<GameState> {
    const state = await this.room.storage.get<GameState>('gameState');
    return (
      state || {
        pieces: [],
        currentPlayer: 1,
        winner: null,
        players: {},
      }
    );
  }

  async setState(state: GameState) {
    await this.room.storage.put('gameState', state);
  }

  private generateRoomId(): string {
    return `game-${Math.random().toString(36).substring(2, 9)}`;
  }

  async onConnect(conn: Party.Connection) {
    if (this.room.id === 'waiting-room') {
      const waitingState = await this.getWaitingState();
      conn.send(
        JSON.stringify({
          type: 'waitingState',
          playersCount: waitingState.waitingPlayers.length,
        })
      );
    } else {
      const state = await this.getState();

      // Check if this is a reconnecting player
      const existingPlayer = Object.entries(state.players).find(
        ([_, player]) => player.name === conn.id
      );

      if (existingPlayer) {
        // Reconnect existing player
        const [oldId, playerData] = existingPlayer;
        delete state.players[oldId];
        state.players[conn.id] = playerData;
      }

      await this.setState(state);
      await this.broadcastState();
    }
  }

  async onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message);

    if (this.room.id === 'waiting-room') {
      if (data.type === 'joinQueue') {
        const waitingState = await this.getWaitingState();

        // Add new player to queue
        waitingState.waitingPlayers.push({
          connectionId: sender.id,
          name: data.playerName,
        });

        // Match players if we have enough
        if (waitingState.waitingPlayers.length >= 2) {
          const [player1, player2] = waitingState.waitingPlayers.slice(0, 2);
          const newRoomId = this.generateRoomId();

          // Create new game room
          waitingState.activeGames.add(newRoomId);

          // Notify matched players individually
          const player1Conn = this.room.connections.get(player1.connectionId);
          const player2Conn = this.room.connections.get(player2.connectionId);

          if (player1Conn) {
            player1Conn.send(
              JSON.stringify({
                type: 'roomAssignment',
                roomId: newRoomId,
                yourPlayer: { number: 1, name: player1.name },
              })
            );
          }

          if (player2Conn) {
            player2Conn.send(
              JSON.stringify({
                type: 'roomAssignment',
                roomId: newRoomId,
                yourPlayer: { number: 2, name: player2.name },
              })
            );
          }

          // Remove matched players from queue
          waitingState.waitingPlayers = waitingState.waitingPlayers.slice(2);
          await this.setWaitingState(waitingState);
        } else {
          await this.setWaitingState(waitingState);
        }

        // Broadcast updated queue count
        this.room.broadcast(
          JSON.stringify({
            type: 'waitingState',
            playersCount: waitingState.waitingPlayers.length,
          })
        );
      }
    } else {
      const state = await this.getState();

      switch (data.type) {
        case 'join':
          if (!state.players[sender.id]) {
            state.players[sender.id] = {
              number: data.playerNumber,
              name: data.playerName,
              roomId: this.room.id,
            };
            await this.setState(state);

            // Initialize game immediately if both players are present
            if (Object.keys(state.players).length === 2) {
              await this.initializeGame();
            } else {
              await this.broadcastState();
            }
          }
          break;

        case 'move':
          await this.handleMove(data.piece, data.newPosition, sender.id, state);
          break;

        case 'reset':
          await this.initializeGame();
          break;
      }
    }
  }

  private async initializeGame() {
    const availablePositions = Array.from({ length: 10 }, (_, i) => i);
    const shuffledPositions: number[] = [];

    // Randomly assign initial positions
    while (shuffledPositions.length < 6) {
      const randomIndex = Math.floor(Math.random() * availablePositions.length);
      shuffledPositions.push(availablePositions[randomIndex]);
      availablePositions.splice(randomIndex, 1);
    }

    const currentState = await this.getState();
    const newState: GameState = {
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
      players: currentState.players,
    };

    await this.setState(newState);
    await this.broadcastState();
  }

  private async handleMove(
    piece: GamePiece,
    newPosition: number,
    senderId: string,
    state: GameState
  ) {
    const playerNumber = state.players[senderId]?.number;

    if (
      !playerNumber ||
      state.winner ||
      piece.player !== state.currentPlayer ||
      playerNumber !== state.currentPlayer
    ) {
      return;
    }

    const targetPosition = BOARD_POSITIONS[newPosition];
    const snapRadius = 35;
    const validPositionIndex = this.getNearestPosition(
      targetPosition,
      snapRadius
    );

    if (validPositionIndex !== null) {
      // Update piece position
      state.pieces = state.pieces.map((p) =>
        p.id === piece.id ? { ...p, position: validPositionIndex } : p
      );

      // Check for winner
      const winner = this.checkWinner(state.pieces);
      if (winner) {
        state.winner = winner;
      } else {
        state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
      }

      await this.setState(state);
      await this.broadcastState();
    }
  }

  private getNearestPosition(
    newPosition: { x: number; y: number },
    snapRadius: number
  ): number | null {
    let closestPosition = null;
    let minDistance = Infinity;

    BOARD_POSITIONS.forEach((pos, index) => {
      const distance = Math.sqrt(
        Math.pow(pos.x - newPosition.x, 2) + Math.pow(pos.y - newPosition.y, 2)
      );

      if (distance <= snapRadius && distance < minDistance) {
        closestPosition = index;
        minDistance = distance;
      }
    });

    return closestPosition;
  }

  private checkWinner(pieces: GamePiece[]): Player | null {
    const WINNING_COMBINATIONS = [
      [0, 1, 2], // Top Horizontal
      [8, 7, 9], // Top Middle Vertical
      [1, 3, 6], // Bottom Middle Vertical
      [3, 6, 7], // Bottom Horizontal
    ];

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

  private async broadcastState() {
    const state = await this.getState();
    this.room.broadcast(
      JSON.stringify({
        type: 'gameState',
        state,
      })
    );
  }

  async onClose(connection: Party.Connection) {
    if (this.room.id === 'waiting-room') {
      const waitingState = await this.getWaitingState();
      waitingState.waitingPlayers = waitingState.waitingPlayers.filter(
        (p) => p.connectionId !== connection.id
      );
      await this.setWaitingState(waitingState);

      // Broadcast updated queue count
      this.room.broadcast(
        JSON.stringify({
          type: 'waitingState',
          playersCount: waitingState.waitingPlayers.length,
        })
      );
    } else {
      const state = await this.getState();
      if (state.players[connection.id]) {
        delete state.players[connection.id];
        await this.setState(state);
        await this.broadcastState();

        // If no active players, reset the game state
        if (Object.keys(state.players).length === 0) {
          await this.initializeGameState();
        }
      }
    }
  }
}
