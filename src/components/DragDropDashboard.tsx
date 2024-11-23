import React, { useState, useCallback } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useWebSocket } from "./useWebSocket";
import { DragIndicator } from "./DragIndicator";
import { Item, Section, Position, WebSocketMessage } from "./types";

const WEBSOCKET_URL = "wss://ws-sarang.onrender.com";

export const DragDropDashboard: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [draggedItem, setDraggedItem] = useState<Item | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragPosition, setDragPosition] = useState<Position>({ x: 0, y: 0 });
  const [dragSource, setDragSource] = useState<"items" | "section" | null>(
    null
  );
  const [sourceSectionId, setSourceSectionId] = useState<number | null>(null);
  const [isAdmin] = useState<boolean>(() =>
    window.location.pathname.includes("/admin")
  );

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case "INIT_STATE":
        setSections(message.state.sections);
        setItems(message.state.items);
        break;

      case "DRAG_UPDATE":
        setDragPosition(message.position);
        setDraggedItem(message.item);
        setIsDragging(true);
        break;

      case "DROP_UPDATE":
        setSections(message.sections);
        setItems(message.items);
        setIsDragging(false);
        setDraggedItem(null);
        break;

      case "DRAG_END":
        setIsDragging(false);
        setDraggedItem(null);
        break;
    }
  }, []);

  const { sendMessage, isConnected } = useWebSocket({
    url: WEBSOCKET_URL,
    onMessage: handleWebSocketMessage,
    onError: (error) => {
      console.error("WebSocket Error:", error);
    },
  });

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    item: Item,
    source: "items" | "section",
    sectionId?: number
  ) => {
    if (!isAdmin) return;

    setDraggedItem(item);
    setIsDragging(true);
    setDragSource(source);
    setSourceSectionId(sectionId ?? null);
    e.dataTransfer.setData("text/plain", "");

    const position = {
      x: e.clientX,
      y: e.clientY,
    };

    sendMessage({
      type: "DRAG_UPDATE",
      item,
      position,
    });
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.clientX && !e.clientY) return;

    const position = {
      x: e.clientX,
      y: e.clientY,
    };

    setDragPosition(position);

    if (draggedItem) {
      sendMessage({
        type: "DRAG_UPDATE",
        item: draggedItem,
        position,
      });
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedItem(null);
    setDragSource(null);
    setSourceSectionId(null);

    sendMessage({
      type: "DRAG_END",
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDropOnSection = (
    e: React.DragEvent<HTMLDivElement>,
    targetSectionId: number
  ) => {
    e.preventDefault();

    if (!draggedItem || !isAdmin) return;

    let newSections = [...sections];
    let newItems = [...items];

    if (dragSource === "section") {
      newSections = newSections.map((section) => {
        if (section.id === sourceSectionId) {
          return {
            ...section,
            items: section.items.filter((item) => item.id !== draggedItem.id),
          };
        }
        return section;
      });
    } else if (dragSource === "items") {
      newItems = newItems.filter((item) => item.id !== draggedItem.id);
    }

    newSections = newSections.map((section) => {
      if (section.id === targetSectionId) {
        const itemExists = section.items.some(
          (item) => item.id === draggedItem.id
        );
        if (!itemExists) {
          return {
            ...section,
            items: [...section.items, draggedItem],
          };
        }
      }
      return section;
    });

    setSections(newSections);
    setItems(newItems);

    sendMessage({
      type: "DROP_UPDATE",
      sections: newSections,
      items: newItems,
    });

    setIsDragging(false);
    setDraggedItem(null);
    setDragSource(null);
    setSourceSectionId(null);
  };

  const handleDropOnItemsList = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (!draggedItem || !isAdmin || dragSource !== "section") return;

    const newSections = sections.map((section) => {
      if (section.id === sourceSectionId) {
        return {
          ...section,
          items: section.items.filter((item) => item.id !== draggedItem.id),
        };
      }
      return section;
    });

    const newItems = [...items, draggedItem];

    setSections(newSections);
    setItems(newItems);

    sendMessage({
      type: "DROP_UPDATE",
      sections: newSections,
      items: newItems,
    });

    setIsDragging(false);
    setDraggedItem(null);
    setDragSource(null);
    setSourceSectionId(null);
  };

  return (
    <div className="p-4">
      <DragIndicator
        isDragging={isDragging}
        draggedItem={draggedItem}
        position={dragPosition}
      />

      {!isConnected && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          서버와 연결이 끊어졌습니다. 재연결 시도 중...
        </div>
      )}

      <h1 className="text-2xl font-bold mb-4">
        사랑방 {isAdmin ? "(관리자)" : "(읽기 전용)"}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          {sections.map((section) => (
            <Card
              key={section.id}
              className={`${isDragging ? "border-2 border-dashed" : ""}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnSection(e, section.id)}
            >
              <CardHeader>
                <h3 className="font-medium">{section.title}</h3>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      draggable={isAdmin}
                      onDragStart={(e) =>
                        handleDragStart(e, item, "section", section.id)
                      }
                      onDrag={handleDrag}
                      onDragEnd={handleDragEnd}
                      className={`p-2 bg-gray-100 rounded w-16 text-center truncate
                        ${isAdmin ? "cursor-move" : ""} 
                        ${
                          isDragging && draggedItem?.id === item.id
                            ? "opacity-50"
                            : ""
                        }`}
                    >
                      {item.name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card onDragOver={handleDragOver} onDrop={handleDropOnItemsList}>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    draggable={isAdmin}
                    onDragStart={(e) => handleDragStart(e, item, "items")}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    className={`p-2 bg-blue-100 rounded w-16 text-center truncate
                      ${isAdmin ? "cursor-move" : ""} 
                      ${
                        isDragging && draggedItem?.id === item.id
                          ? "opacity-50"
                          : ""
                      }`}
                  >
                    {item.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
