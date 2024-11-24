import React, { useState, useCallback } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useWebSocket } from "./useWebSocket";
import { DragIndicator } from "./DragIndicator";
import { Item, Section, Position, WebSocketMessage } from "./types";
import { Button } from "@/components/ui/button";
import { AddMemberModal } from "./AddMemberModal";

const WEBSOCKET_URL = "ws://222.121.208.186:6500";

const downloadJsonFile = <T extends object>(
  data: T,
  filename: string = "data.json"
): void => {
  try {
    // JSON 문자열로 변환
    const jsonString = JSON.stringify(data, null, 2);

    // Blob 객체 생성
    const blob = new Blob([jsonString], {
      type: "application/json;charset=utf-8",
    });

    // IE 브라우저 처리
    if ("msSaveBlob" in window.navigator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).msSaveBlob(blob, filename);
      return;
    }

    // 다운로드 링크 생성
    const downloadLink = document.createElement("a");

    // blob URL 생성
    const blobUrl = URL.createObjectURL(blob);

    // 링크 속성 설정
    downloadLink.href = blobUrl;
    downloadLink.download = filename;

    // 링크를 DOM에 추가하고 클릭
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // 메모리 정리
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    if (error instanceof Error) {
      console.error("파일 다운로드 중 오류 발생:", error.message);
    } else {
      console.error("파일 다운로드 중 알 수 없는 오류 발생");
    }
    throw error;
  }
};

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
  const [isLeaderModalOpen, setIsLeaderModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

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

  const handleDownload = () => {
    downloadJsonFile<Section[]>(sections, "user-data.json");
  };

  const handleAddLeader = (name: string) => {
    // 마지막 섹션의 ID를 찾아서 새 ID 생성
    const lastSectionId =
      sections.length > 0
        ? Math.max(...sections.map((section) => section.id))
        : 0;

    const newSection = {
      id: lastSectionId + 1,
      title: name,
      items: [],
    };

    const newSections = [...sections, newSection];
    setSections(newSections);

    sendMessage({
      type: "DROP_UPDATE",
      sections: newSections,
      items: items,
    });
  };

  const findLastId = (items: { id: number }[]): number => {
    return items.length > 0 ? Math.max(...items.map((item) => item.id)) : 0;
  };

  const handleAddMember = (name: string) => {
    // sections의 모든 items도 함께 고려하여 마지막 ID 찾기
    const allItems = [
      ...items,
      ...sections.flatMap((section) => section.items),
    ];
    const lastItemId = findLastId(allItems);

    const newMember = {
      id: lastItemId + 1,
      name,
    };

    const newItems = [...items, newMember];
    setItems(newItems);

    sendMessage({
      type: "DROP_UPDATE",
      sections: sections,
      items: newItems,
    });
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold mb-4">
          사랑방 편성 {isAdmin ? "(관리자)" : "(읽기 전용)"}
        </h1>
        {isAdmin && (
          <div className="flex justify-between items-center gap-4">
            <Button onClick={() => setIsLeaderModalOpen(true)}>
              리더 추가
            </Button>
            <Button onClick={() => setIsMemberModalOpen(true)}>
              순원 추가
            </Button>
            <Button onClick={handleDownload}>다운로드</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="">
          {sections.map((section) => (
            <Card
              key={section.id}
              className={` ${isDragging ? "border-2 border-dashed" : ""}`}
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
            <CardContent className="p-4 min-h-96">
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    draggable={isAdmin}
                    onDragStart={(e) => handleDragStart(e, item, "items")}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    className={`p-2 bg-blue-100 rounded w-20 text-center truncate
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
      <AddMemberModal
        isOpen={isLeaderModalOpen}
        onClose={() => setIsLeaderModalOpen(false)}
        onSubmit={handleAddLeader}
        type="leader"
      />

      <AddMemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        onSubmit={handleAddMember}
        type="member"
      />
    </div>
  );
};
