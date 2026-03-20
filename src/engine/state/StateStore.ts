import type {
  GameState, Point, Direction, AnimationState,
  ActorRuntimeState, ObjectRuntimeState, RoomRuntimeState,
  CameraRuntimeState, DialogueRuntimeState,
} from "../core/types";
import { DEFAULT_DISPLAY_CONFIG } from "../../shared/displayConfig";

function defaultCamera(): CameraRuntimeState {
  return { x: 0, y: 0, width: DEFAULT_DISPLAY_CONFIG.baseWidth, height: DEFAULT_DISPLAY_CONFIG.baseHeight, zoom: 1, followActorId: null };
}

function defaultDialogue(): DialogueRuntimeState {
  return { active: false, currentTreeId: null, currentNodeId: null };
}

function createEmptyState(): GameState {
  return {
    flags: {},
    variables: {},
    currentRoomId: "",
    actors: {},
    objects: {},
    rooms: {},
    inventory: {},
    camera: defaultCamera(),
    dialogue: defaultDialogue(),
    dialogueSeen: {},

    visitedRooms: [],
    actorPositions: {},
    actorFacing: {},
    objectStates: {},
    objectLocations: {},
  };
}

function migrateState(raw: Partial<GameState>): GameState {
  const state = { ...raw } as GameState;
  if (!state.actors) state.actors = {};
  if (!state.objects) state.objects = {};
  if (!state.rooms) state.rooms = {};
  if (!state.camera) state.camera = defaultCamera();
  if (!state.dialogue) state.dialogue = defaultDialogue();
  if (!state.visitedRooms) state.visitedRooms = [];
  if (!state.actorPositions) state.actorPositions = {};
  if (!state.actorFacing) state.actorFacing = {};
  if (!state.objectStates) state.objectStates = {};
  if (!state.objectLocations) state.objectLocations = {};
  if (!state.inventory) state.inventory = {};
  if (!state.flags) state.flags = {};
  if (!state.variables) state.variables = {};
  if (!state.currentRoomId) state.currentRoomId = "";
  if (!state.dialogueSeen) state.dialogueSeen = {};
  return state;
}

type StateChangeCallback = (type: "flag" | "variable" | "objectState" | "roomVar" | "room", key: string, value: unknown) => void;

export class StateStore {
  private state: GameState;
  private changeListeners: StateChangeCallback[] = [];

  constructor() {
    this.state = createEmptyState();
  }

  onStateChange(cb: StateChangeCallback): () => void {
    this.changeListeners.push(cb);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== cb);
    };
  }

  getState(): GameState {
    return this.state;
  }

  setState(state: GameState): void {
    this.state = migrateState(state);
  }

  setFlag(key: string, value: boolean): void {
    this.state.flags[key] = value;
    for (const cb of this.changeListeners) cb("flag", key, value);
  }

  getFlag(key: string): boolean {
    return this.state.flags[key] ?? false;
  }

  setVariable(key: string, value: boolean | number | string): void {
    this.state.variables[key] = value;
    for (const cb of this.changeListeners) cb("variable", key, value);
  }

  getVariable(key: string): boolean | number | string | undefined {
    return this.state.variables[key];
  }

  incrementVariable(key: string, amount = 1): void {
    const raw = this.state.variables[key];
    const current = typeof raw === "number" ? raw : (Number(raw) || 0);
    const newValue = current + amount;
    this.state.variables[key] = newValue;
    for (const cb of this.changeListeners) cb("variable", key, newValue);
  }

  setCurrentRoom(roomId: string): void {
    this.state.currentRoomId = roomId;
    if (!this.state.visitedRooms.includes(roomId)) {
      this.state.visitedRooms.push(roomId);
    }
    const rs = this.ensureRoomState(roomId);
    rs.visited = true;
    for (const cb of this.changeListeners) cb("room", roomId, true);
  }

  setCurrentRoomId(roomId: string): void {
    this.state.currentRoomId = roomId;
  }

  getCurrentRoom(): string {
    return this.state.currentRoomId;
  }

  hasVisitedRoom(roomId: string): boolean {
    return this.state.rooms[roomId]?.visited ?? this.state.visitedRooms.includes(roomId);
  }

  getActorRuntimeState(actorId: string): ActorRuntimeState | undefined {
    return this.state.actors[actorId];
  }

  setActorRuntimeState(actorId: string, s: ActorRuntimeState): void {
    this.state.actors[actorId] = s;
    this.state.actorPositions[actorId] = { x: s.x, y: s.y };
    this.state.actorFacing[actorId] = s.facing;
  }

  updateActorRuntimeState(actorId: string, patch: Partial<ActorRuntimeState>): void {
    const existing = this.state.actors[actorId];
    if (existing) {
      Object.assign(existing, patch);
      if (patch.x !== undefined || patch.y !== undefined) {
        this.state.actorPositions[actorId] = { x: existing.x, y: existing.y };
      }
      if (patch.facing !== undefined) {
        this.state.actorFacing[actorId] = existing.facing;
      }
    }
  }

  setActorPosition(actorId: string, pos: Point): void {
    this.state.actorPositions[actorId] = { ...pos };
    const actor = this.state.actors[actorId];
    if (actor) {
      actor.x = pos.x;
      actor.y = pos.y;
    }
  }

  getActorPosition(actorId: string): Point | undefined {
    const actor = this.state.actors[actorId];
    if (actor) return { x: actor.x, y: actor.y };
    return this.state.actorPositions[actorId];
  }

  setActorFacing(actorId: string, dir: Direction): void {
    this.state.actorFacing[actorId] = dir;
    const actor = this.state.actors[actorId];
    if (actor) actor.facing = dir;
  }

  getActorFacing(actorId: string): Direction | undefined {
    const actor = this.state.actors[actorId];
    if (actor) return actor.facing;
    return this.state.actorFacing[actorId];
  }

  getObjectRuntimeState(objectId: string): ObjectRuntimeState | undefined {
    return this.state.objects[objectId];
  }

  setObjectRuntimeState(objectId: string, s: ObjectRuntimeState): void {
    this.state.objects[objectId] = s;
    this.state.objectStates[objectId] = { ...s.currentState };
    this.state.objectLocations[objectId] = s.roomId;
    this.applyPendingPrimaryState(objectId);
  }

  updateObjectRuntimeState(objectId: string, patch: Partial<ObjectRuntimeState>): void {
    const existing = this.state.objects[objectId];
    if (existing) {
      Object.assign(existing, patch);
      if (patch.currentState !== undefined) {
        this.state.objectStates[objectId] = { ...existing.currentState };
      }
      if (patch.roomId !== undefined) {
        this.state.objectLocations[objectId] = existing.roomId;
      }
    }
  }

  setObjectState(objectId: string, key: string, value: unknown): void {
    if (!this.state.objectStates[objectId]) {
      this.state.objectStates[objectId] = {};
    }
    this.state.objectStates[objectId][key] = value;
    const obj = this.state.objects[objectId];
    if (obj) obj.currentState[key] = value;
    for (const cb of this.changeListeners) cb("objectState", `${objectId}.${key}`, value);
  }

  getObjectState(objectId: string, key: string): unknown {
    const obj = this.state.objects[objectId];
    if (obj) return obj.currentState[key];
    return this.state.objectStates[objectId]?.[key];
  }

  private pendingPrimaryStates: Record<string, number> = {};

  setObjectPrimaryState(objectId: string, stateIndex: number): void {
    const obj = this.state.objects[objectId];
    if (obj) {
      obj.primaryState = stateIndex;
    } else {
      this.pendingPrimaryStates[objectId] = stateIndex;
    }
    for (const cb of this.changeListeners) cb("objectState", `${objectId}.__primaryState`, stateIndex);
  }

  getObjectPrimaryState(objectId: string): number {
    const obj = this.state.objects[objectId];
    if (obj) return obj.primaryState;
    return this.pendingPrimaryStates[objectId] ?? 0;
  }

  applyPendingPrimaryState(objectId: string): void {
    const pending = this.pendingPrimaryStates[objectId];
    if (pending !== undefined) {
      const obj = this.state.objects[objectId];
      if (obj) {
        obj.primaryState = pending;
      }
      delete this.pendingPrimaryStates[objectId];
    }
  }

  setObjectLocation(objectId: string, location: string | null): void {
    this.state.objectLocations[objectId] = location;
    const obj = this.state.objects[objectId];
    if (obj) obj.roomId = location;
  }

  getObjectLocation(objectId: string): string | null {
    const obj = this.state.objects[objectId];
    if (obj) return obj.roomId;
    return this.state.objectLocations[objectId] ?? null;
  }

  ensureRoomState(roomId: string): RoomRuntimeState {
    if (!this.state.rooms[roomId]) {
      this.state.rooms[roomId] = {
        visited: this.state.visitedRooms.includes(roomId),
        localVariables: {},
        objectOverrides: {},
        scriptState: {},
      };
    }
    return this.state.rooms[roomId];
  }

  getRoomState(roomId: string): RoomRuntimeState | undefined {
    return this.state.rooms[roomId];
  }

  setRoomLocalVariable(roomId: string, key: string, value: boolean | number | string): void {
    const rs = this.ensureRoomState(roomId);
    rs.localVariables[key] = value;
    for (const cb of this.changeListeners) cb("roomVar", `${roomId}.${key}`, value);
  }

  getRoomLocalVariable(roomId: string, key: string): boolean | number | string | undefined {
    return this.state.rooms[roomId]?.localVariables[key];
  }

  setRoomScriptState(roomId: string, key: string, value: unknown): void {
    const rs = this.ensureRoomState(roomId);
    rs.scriptState[key] = value;
  }

  getRoomScriptState(roomId: string, key: string): unknown {
    return this.state.rooms[roomId]?.scriptState[key];
  }

  getCameraState(): CameraRuntimeState {
    return this.state.camera;
  }

  setCameraState(cam: CameraRuntimeState): void {
    this.state.camera = cam;
  }

  getDialogueState(): DialogueRuntimeState {
    return this.state.dialogue;
  }

  setDialogueState(d: DialogueRuntimeState): void {
    this.state.dialogue = d;
  }

  private ensureDialogueSeen(treeId: string) {
    if (!this.state.dialogueSeen[treeId]) {
      this.state.dialogueSeen[treeId] = { nodes: [], branches: [] };
    }
    return this.state.dialogueSeen[treeId];
  }

  markDialogueNodeSeen(treeId: string, nodeId: string): void {
    const ds = this.ensureDialogueSeen(treeId);
    if (!ds.nodes.includes(nodeId)) ds.nodes.push(nodeId);
  }

  markDialogueBranchChosen(treeId: string, branchId: string): void {
    const ds = this.ensureDialogueSeen(treeId);
    if (!ds.branches.includes(branchId)) ds.branches.push(branchId);
  }

  hasSeenDialogueNode(treeId: string, nodeId: string): boolean {
    return this.state.dialogueSeen[treeId]?.nodes.includes(nodeId) ?? false;
  }

  hasChosenDialogueBranch(treeId: string, branchId: string): boolean {
    return this.state.dialogueSeen[treeId]?.branches.includes(branchId) ?? false;
  }

  getDialogueSeenState(): Record<string, { nodes: string[]; branches: string[] }> {
    return this.state.dialogueSeen;
  }

  clearDialogueSeen(): void {
    this.state.dialogueSeen = {};
  }

  getInventory(actorId: string): string[] {
    return this.state.inventory[actorId] ?? [];
  }

  addToInventory(actorId: string, itemId: string): void {
    if (!this.state.inventory[actorId]) {
      this.state.inventory[actorId] = [];
    }
    if (!this.state.inventory[actorId].includes(itemId)) {
      this.state.inventory[actorId].push(itemId);
    }
  }

  removeFromInventory(actorId: string, itemId: string): void {
    if (this.state.inventory[actorId]) {
      this.state.inventory[actorId] = this.state.inventory[actorId].filter(
        (id) => id !== itemId
      );
    }
  }

  hasItem(actorId: string, itemId: string): boolean {
    return this.getInventory(actorId).includes(itemId);
  }

  getSnapshot(): {
    flags: Record<string, boolean>;
    variables: Record<string, boolean | number | string>;
    currentRoomId: string;
    inventory: Record<string, string[]>;
    objectStates: Record<string, Record<string, unknown>>;
    objectLocations: Record<string, string | null>;
    actors: Record<string, ActorRuntimeState>;
    objects: Record<string, ObjectRuntimeState>;
    rooms: Record<string, RoomRuntimeState>;
    camera: CameraRuntimeState;
    dialogue: DialogueRuntimeState;
    dialogueSeen: Record<string, { nodes: string[]; branches: string[] }>;
  } {
    return {
      flags: { ...this.state.flags },
      variables: { ...this.state.variables },
      currentRoomId: this.state.currentRoomId,
      inventory: Object.fromEntries(
        Object.entries(this.state.inventory).map(([k, v]) => [k, [...v]])
      ),
      objectStates: JSON.parse(JSON.stringify(this.state.objectStates)),
      objectLocations: { ...this.state.objectLocations },
      actors: JSON.parse(JSON.stringify(this.state.actors)),
      objects: JSON.parse(JSON.stringify(this.state.objects)),
      rooms: JSON.parse(JSON.stringify(this.state.rooms)),
      camera: { ...this.state.camera },
      dialogue: { ...this.state.dialogue },
      dialogueSeen: JSON.parse(JSON.stringify(this.state.dialogueSeen)),
    };
  }

  serialize(): string {
    return JSON.stringify(this.state);
  }

  deserialize(json: string): void {
    this.state = migrateState(JSON.parse(json));
  }

  reset(): void {
    this.state = createEmptyState();
  }
}
