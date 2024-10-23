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

// Custom provider component to handle touch detection
const CustomDndProvider = ({ children }: any) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const touchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore
      navigator.msMaxTouchPoints > 0;
    setIsTouchDevice(touchDevice);
  }, []);

  return (
    <DynamicDndProvider
      backend={isTouchDevice ? TouchBackend : HTML5Backend}
      options={{
        enableMouseEvents: true, // Enable both mouse and touch events
        enableHoverOutsideTarget: true,
        delayTouchStart: 100, // Adjust touch delay for better response
        ignoreContextMenu: true,
        touchSlop: 25, // Add some tolerance for slight finger movements
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

  console.log(myPlayer)

  const socket = usePartySocket({
    host: "fun-board-game.prtkjakhar.partykit.dev",
    room: "game",
    onMessage(event) {
      const data = JSON.parse(event.data);
      if (data.type === 'gameState') {
        setPieces(data.state.pieces);
        setCurrentPlayer(data.state.currentPlayer);
        setWinner(data.state.winner);
        
        if (data.yourPlayer) {
          setMyPlayer(data.yourPlayer);
        }
        
        // If we have two players, game can start
        setWaiting(Object.keys(data.state.players).length < 2);
      }
    }
  });

  const handleMove = (piece: GamePiece, newPosition: number) => {
    if (winner || piece.player !== currentPlayer || piece.player !== myPlayer) return;

    socket.send(JSON.stringify({
      type: 'move',
      piece,
      newPosition
    }));
  };

  const handleReset = () => {
    socket.send(JSON.stringify({ type: 'reset' }));
  };

  if (waiting) {
    return (
      <div className="min-h-[100svh] bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold text-white mb-4">Waiting for opponent...</h1>
      </div>
    );
  }
console.log(myPlayer, currentPlayer)
  return (
    <CustomDndProvider>
      <div className="min-h-[100svh] bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Fun Board Game</h1>
          <h2 className="text-xl text-white mb-4">
            Get same color pieces in a line to win!
          </h2>
          <p className="text-gray-300 mb-2">
            {currentPlayer === myPlayer ? `Your Turn (${currentPlayer === 1 ? 'Red' : 'Blue'})` : `Other Player\'s Turn (${currentPlayer === 1 ? 'Red' : 'Blue'})`}
          </p>
          <div className="flex gap-2 justify-center mb-4">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-gray-300">Player 1</span>
            <div className="w-4 h-4 rounded-full bg-blue-500 ml-4"></div>
            <span className="text-gray-300">Player 2</span>
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
                Player {winner} wins! 🎉
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Button onClick={handleReset}>Play Again</Button>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </CustomDndProvider>
  );
}
