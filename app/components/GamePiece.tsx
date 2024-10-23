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
        "absolute w-8 h-8 transition-all duration-200 transform -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer hover:scale-110",
        piece.player === 1 ? "bg-red-500" : "bg-blue-500",
        isCurrentPlayer && !winner && "hover:ring-2 hover:ring-yellow-400",
        isDragging && "opacity-50"
      )}
      style={{
        left: `${BOARD_POSITIONS[piece.position].x}%`,
        top: `${BOARD_POSITIONS[piece.position].y}%`,
      }}
    />
  );
}