export interface Item {
  id: number;
  name: string;
}

export interface Section {
  id: number;
  title: string;
  items: Item[];
}

export interface Position {
  x: number;
  y: number;
}

export interface AppState {
  sections: Section[];
  items: Item[];
  lastUpdated: number;
}

export type WebSocketMessage =
  | { type: "DRAG_UPDATE"; item: Item; position: Position }
  | { type: "DROP_UPDATE"; sections: Section[]; items: Item[] }
  | { type: "DRAG_END" }
  | { type: "INIT_STATE"; state: AppState };
