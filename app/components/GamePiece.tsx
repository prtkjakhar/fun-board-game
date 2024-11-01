"use client";

import { useDrag } from 'react-dnd';
import { cn } from "@/lib/utils";
import { GamePiece as GamePieceType } from '../types/game';
import { BOARD_POSITIONS } from '../types/game';

interface GamePieceProps {
  piece: GamePieceType;
  isCurrentPlayer: boolean;
  winner: number | null;
}

export function GamePiece({ piece, isCurrentPlayer, winner }: GamePieceProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'piece',
    item: piece,
    canDrag: isCurrentPlayer && !winner,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={cn(
        "absolute w-10 h-10 transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg cursor-pointer",
        piece.player === 1 ? "bg-gradient-to-br from-red-400 to-red-600" : "bg-gradient-to-br from-blue-400 to-blue-600",
        isCurrentPlayer && !winner && "hover:scale-110 hover:shadow-xl hover:ring-4 hover:ring-yellow-400/50",
        isDragging && "opacity-75 scale-125",
        !isCurrentPlayer && "opacity-90"
      )}
      style={{
        left: `${BOARD_POSITIONS[piece.position].x}%`,
        top: `${BOARD_POSITIONS[piece.position].y}%`,
      }}
    />
  );
}