"use client";

import { BOARD_POSITIONS } from '../types/game';
import { BoardPosition } from './BoardPosition';
import { GamePiece as GamePieceComponent } from './GamePiece';
import type { GamePiece } from '../types/game';

interface GameBoardProps {
  pieces: GamePiece[];
  currentPlayer: number;
  winner: number | null;
  onMove: (piece: GamePiece, position: number) => void;
}

export function GameBoard({ pieces, currentPlayer, winner, onMove }: GameBoardProps) {
  return (
    <div className="relative w-80 h-96 sm:w-96 sm:h-96 mb-8">
      {/* Board Lines */}
      <svg className="absolute inset-0 w-full h-full" strokeWidth="2" stroke="rgba(156, 163, 175, 0.5)">
        {/* Vertical center line */}
        <line x1="50%" y1="10%" x2="50%" y2="70%" />
        
        {/* Top horizontal line */}
        <line x1="20%" y1="10%" x2="80%" y2="10%" />
        
        {/* Middle branches - aligned with nodes */}
        <line x1="20%" y1="30%" x2="50%" y2="30%" />
        <line x1="50%" y1="50%" x2="80%" y2="50%" />
        
        {/* Bottom horizontal line */}
        <line x1="20%" y1="70%" x2="80%" y2="70%" />
      </svg>

      {/* Board Positions */}
      {BOARD_POSITIONS.map((pos, i) => (
        <BoardPosition
          key={i}
          position={i}
          x={pos.x}
          y={pos.y}
          onMove={onMove}
          pieces={pieces}
        />
      ))}

      {/* Game Pieces */}
      {pieces.map((piece) => (
        <GamePieceComponent
          key={piece.id}
          piece={piece}
          isCurrentPlayer={piece.player === currentPlayer}
          winner={winner}
        />
      ))}
    </div>
  );
}