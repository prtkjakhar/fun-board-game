"use client";

import { useState, useEffect } from "react";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { GameBoard } from './components/GameBoard';
import type { GamePiece, Player } from './types/game';
import { WINNING_COMBINATIONS } from './types/game';

export default function Home() {
  const [pieces, setPieces] = useState<GamePiece[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [winner, setWinner] = useState<Player | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window);
    initializeGame();
  }, []);

  const initializeGame = () => {
    const availablePositions = Array.from({ length: 10 }, (_, i) => i);
    const shuffledPositions: number[] = [];
    
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * availablePositions.length);
      shuffledPositions.push(availablePositions[randomIndex]);
      availablePositions.splice(randomIndex, 1);
    }

    const newPieces: GamePiece[] = [
      { id: 1, player: 1, position: shuffledPositions[0] },
      { id: 2, player: 1, position: shuffledPositions[1] },
      { id: 3, player: 1, position: shuffledPositions[2] },
      { id: 4, player: 2, position: shuffledPositions[3] },
      { id: 5, player: 2, position: shuffledPositions[4] },
      { id: 6, player: 2, position: shuffledPositions[5] },
    ];

    setPieces(newPieces);
    setCurrentPlayer(1);
    setWinner(null);
  };

  const checkWinner = (pieces: GamePiece[]) => {
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
  };

  const handleMove = (piece: GamePiece, newPosition: number) => {
    if (winner || piece.player !== currentPlayer) return;

    const newPieces = pieces.map((p) =>
      p.id === piece.id ? { ...p, position: newPosition } : p
    );

    setPieces(newPieces);
    
    const newWinner = checkWinner(newPieces);
    if (newWinner) {
      setWinner(newWinner);
    } else {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  };

  return (
    <DndProvider backend={isTouchDevice ? TouchBackend : HTML5Backend}>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Fun Board Game</h1>
          <h1 className="text-xl text-white mb-4">Get same color pieces in a line to win!</h1>
          <p className="text-gray-300 mb-2">
            Player {currentPlayer}&apos;s Turn
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
          onClick={initializeGame}
          variant="outline"
          className="bg-white text-gray-900 hover:bg-gray-100"
        >
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
            <Button onClick={initializeGame}>Play Again</Button>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DndProvider>
  );
}