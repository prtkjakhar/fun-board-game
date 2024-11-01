"use client";

import { useDrop } from 'react-dnd';
import { cn } from "@/lib/utils";
import { GamePiece, VALID_MOVES } from '../types/game';

interface BoardPositionProps {
  position: number;
  x: number;
  y: number;
  onMove: (piece: GamePiece, position: number) => void;
  pieces: GamePiece[];
}

export function BoardPosition({ position, x, y, onMove, pieces }: BoardPositionProps) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'piece',
    canDrop: (item: GamePiece) => {
      const validMoves = VALID_MOVES[item.position] || [];
      const isValidMove = validMoves.includes(position);
      const isPositionEmpty = !pieces.some(p => p.position === position);
      return isValidMove && isPositionEmpty;
    },
    drop: (item: GamePiece) => {
      onMove(item, position);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });

  return (
    <div
      ref={drop}
      className={cn(
        "absolute w-12 h-12 transform -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200",
        canDrop && "border-4 border-yellow-500/50 bg-yellow-500/20",
        isOver && "bg-yellow-500/40 scale-125",
        !canDrop && "border-2 border-gray-400/30 bg-gray-800/20"
      )}
      style={{
        left: `${x}%`,
        top: `${y}%`,
      }}
    />
  );
}