import React from "react";
import { Item, Position } from "./types";

interface DragIndicatorProps {
  isDragging: boolean;
  draggedItem: Item | null;
  position: Position;
}

export const DragIndicator: React.FC<DragIndicatorProps> = ({
  isDragging,
  draggedItem,
  position,
}) => {
  if (!isDragging || !draggedItem) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        pointerEvents: "none",
        zIndex: 1000,
        transform: "translate(-50%, -50%)",
      }}
      className="bg-blue-100 p-2 rounded opacity-70 shadow-lg"
    >
      {draggedItem.name}
    </div>
  );
};
