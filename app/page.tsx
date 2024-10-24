'use client';

import { useState, useEffect } from 'react';
import { usePartySocket } from 'partysocket/react';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GameBoard } from './components/GameBoard';
import type { GamePiece, Player } from './types/game';
import dynamic from 'next/dynamic';

type PlayerData = {
  number: Player;
  name: string;
};

const DynamicDndProvider = dynamic(
  async () => {
    const mod = await import('react-dnd');
    return ({ children, ...props }: any) => {
      const [mounted, setMounted] = useState(false);

      useEffect(() => {
        setMounted(true);
      }, []);

      if (!mounted) {
        return null;
      }

      return <mod.DndProvider {...props}>{children}</mod.DndProvider>;
    };
  },
  { ssr: false }
);

const CustomDndProvider = ({ children }: any) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore
      navigator.msMaxTouchPoints > 0
    );
  }, []);

  return (
    <DynamicDndProvider
      backend={isTouchDevice ? TouchBackend : HTML5Backend}
      options={{
        enableMouseEvents: true,
        enableHoverOutsideTarget: true,
        delayTouchStart: 100,
        ignoreContextMenu: true,
        touchSlop: 25,
      }}>
      {children}
    </DynamicDndProvider>
  );
};

export default function Home() {
  const [pieces, setPieces] = useState<GamePiece[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [winner, setWinner] = useState<Player | null>(null);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [waiting, setWaiting] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [players, setPlayers] = useState<{[key: string]: PlayerData}>({});
  const [gameRoomId, setGameRoomId] = useState<string | null>(null);
  const [playersInQueue, setPlayersInQueue] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Initial connection to waiting room
  const waitingSocket = usePartySocket({
    host: 'fun-board-game.prtkjakhar.partykit.dev',
    room: 'waiting-room',
    onMessage(event) {
      const data = JSON.parse(event.data);
      
      if (data.type === 'waitingState') {
        setPlayersInQueue(data.playersCount);
      } else if (data.type === 'roomAssignment') {
        setGameRoomId(data.roomId);
        setMyPlayer(data.yourPlayer.number);
        
        // Close waiting room socket when assigned to a game room
        waitingSocket.close();
      }
    },
    onClose() {
      if (!gameRoomId) {
        setConnectionError('Lost connection to waiting room. Please refresh and try again.');
      }
    }
  });

  // Game room socket
  const gameSocket = usePartySocket({
    host: 'fun-board-game.prtkjakhar.partykit.dev',
    room: gameRoomId || 'temp-room',
    onMessage(event) {
      if (!gameRoomId) return;
      
      const data = JSON.parse(event.data);
      if (data.type === 'gameState') {
        setPieces(data.state.pieces);
        setCurrentPlayer(data.state.currentPlayer);
        setWinner(data.state.winner);
        setPlayers(data.state.players);
        
        // Update waiting state based on number of players and game initialization
        const isWaiting = Object.keys(data.state.players).length < 2;
        setWaiting(isWaiting);
      }
    },
    onClose() {
      if (gameRoomId) {
        setConnectionError('Lost connection to game. Please refresh to rejoin.');
      }
    }
  });

  // Effect to join game room when assigned
  useEffect(() => {
    if (gameRoomId && myPlayer && playerName) {
      console.log('Joining game room:', gameRoomId, 'as player:', myPlayer);
      gameSocket.send(JSON.stringify({
        type: 'join',
        playerNumber: myPlayer,
        playerName: playerName,
      }));
    }
  }, [gameRoomId, myPlayer, playerName, gameSocket]);

  const handleMove = (piece: GamePiece, newPosition: number) => {
    if (winner || piece.player !== currentPlayer || piece.player !== myPlayer) return;

    gameSocket.send(
      JSON.stringify({
        type: 'move',
        piece,
        newPosition,
      })
    );
  };

  const handleReset = () => {
    gameSocket.send(JSON.stringify({ type: 'reset' }));
  };

  const handleJoinQueue = () => {
    if (!playerName.trim()) {
      alert('Please enter a valid name');
      return;
    }

    waitingSocket.send(
      JSON.stringify({
        type: 'joinQueue',
        playerName: playerName.trim(),
      })
    );
    setNameSubmitted(true);
  };

  if (connectionError) {
    return (
      <div className="min-h-[100svh] bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
        <div className="bg-red-500 text-white p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Connection Error</h2>
          <p>{connectionError}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-white text-red-500 hover:bg-gray-100"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  if (!nameSubmitted) {
    return (
      <div className="min-h-[100svh] bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold text-white mb-4">Enter your name</h1>
        <input
          className="text-2xl p-4 outline-none text-black rounded-lg"
          placeholder="Your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleJoinQueue()}
        />
        <Button
          className="text-2xl p-4 outline-none bg-red-500 hover:bg-red-600 text-white mt-4 rounded-lg"
          onClick={handleJoinQueue}>
          Join Game
        </Button>
      </div>
    );
  }

  if (!gameRoomId) {
    return (
      <div className="min-h-[100svh] bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold text-white mb-4">Finding opponent...</h1>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
        <p className="text-white mt-4">Players in queue: {playersInQueue}</p>
      </div>
    );
  }

  if (waiting) {
    return (
      <div className="min-h-[100svh] bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold text-white mb-4">
          {Object.keys(players).length < 2 
            ? "Waiting for opponent to join..."
            : "Initializing game..."}
        </h1>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <CustomDndProvider>
      <div className="min-h-[100svh] bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Fun Board Game</h1>
          <h2 className="text-xl text-white mb-4">
            Get same color pieces in a line to win!
          </h2>
          <p className="text-gray-300 mb-2">
            {currentPlayer === myPlayer
              ? 'Your Turn'
              : `${
                  Object.values(players).find((p) => p.number === currentPlayer)
                    ?.name
                }'s Turn`}
            ({currentPlayer === 1 ? 'Red' : 'Blue'})
          </p>

          <div className="flex gap-2 justify-center mb-4">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-gray-300">
              {Object.values(players).find((p) => p.number === 1)?.name}
            </span>
            <div className="w-4 h-4 rounded-full bg-blue-500 ml-4"></div>
            <span className="text-gray-300">
              {Object.values(players).find((p) => p.number === 2)?.name}
            </span>
          </div>
        </div>

        <GameBoard
          pieces={pieces}
          currentPlayer={currentPlayer}
          winner={winner}
          onMove={handleMove}
        />

        <Button
          onClick={handleReset}
          variant="outline"
          className="bg-white text-gray-900 hover:bg-gray-100 mt-4">
          Reset Game
        </Button>

        <AlertDialog open={winner !== null}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Game Over!</AlertDialogTitle>
              <AlertDialogDescription>
                {Object.values(players).find((p) => p.number === winner)?.name}{' '}
                wins! 🎉
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Button onClick={handleReset}>Play Again</Button>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </CustomDndProvider>
  );
}
