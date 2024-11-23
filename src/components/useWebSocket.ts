// src/hooks/useWebSocket.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { WebSocketMessage } from "./types";

interface UseWebSocketProps {
  url: string;
  onMessage: (data: WebSocketMessage) => void;
  onError?: (error: Event) => void;
}

export const useWebSocket = ({
  url,
  onMessage,
  onError,
}: UseWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // 핸들러 레퍼런스 유지
  const messageHandlerRef = useRef(onMessage);
  const errorHandlerRef = useRef(onError);

  useEffect(() => {
    messageHandlerRef.current = onMessage;
    errorHandlerRef.current = onError;
  }, [onMessage, onError]);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, "Component unmounting");
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    // 이미 연결이 있으면 새로운 연결을 시도하지 않음
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log("Max reconnection attempts reached");
      return;
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket Connected");
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          messageHandlerRef.current(data);
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket Error:", error);
        errorHandlerRef.current?.(error);
      };

      ws.onclose = (event) => {
        // 정상적인 종료가 아닌 경우에만 재연결 시도
        if (event.code !== 1000) {
          console.log(
            "WebSocket Closed unexpectedly:",
            event.code,
            event.reason
          );
          setIsConnected(false);
          wsRef.current = null;

          // 재연결 시도
          const timeout = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            10000
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, timeout);
        } else {
          console.log("WebSocket Closed normally:", event.code, event.reason);
          setIsConnected(false);
          wsRef.current = null;
        }
      };
    } catch (error) {
      console.error("WebSocket Connection Error:", error);
    }
  }, [url]); // url만 의존성으로 가짐

  useEffect(() => {
    connect();
    return () => {
      cleanup();
    };
  }, [connect, cleanup]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected");
    }
  }, []);

  const reconnect = useCallback(() => {
    cleanup();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect, cleanup]);

  return {
    sendMessage,
    isConnected,
    reconnect,
  };
};
