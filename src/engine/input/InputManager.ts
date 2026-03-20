import type { Point } from "../core/types";

export interface MouseState {
  x: number;
  y: number;
  buttons: number;
  justClicked: boolean;
  justRightClicked: boolean;
  moved: boolean;
}

export type InputEventType = "click" | "rightclick" | "mousemove" | "keydown";

export interface InputEvent {
  type: InputEventType;
  x?: number;
  y?: number;
  key?: string;
}

type InputHandler = (event: InputEvent) => void;

export class InputManager {
  private mouse: MouseState = {
    x: 0,
    y: 0,
    buttons: 0,
    justClicked: false,
    justRightClicked: false,
    moved: false,
  };
  private handlers: InputHandler[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private _locked = false;

  private clickListener: ((e: MouseEvent) => void) | null = null;
  private contextMenuListener: ((e: MouseEvent) => void) | null = null;
  private mouseMoveListener: ((e: MouseEvent) => void) | null = null;
  private keyDownListener: ((e: KeyboardEvent) => void) | null = null;

  get locked(): boolean {
    return this._locked;
  }

  lockInput(): void {
    this._locked = true;
  }

  unlockInput(): void {
    this._locked = false;
  }

  attach(canvas: HTMLCanvasElement): void {
    this.detach();
    this.canvas = canvas;

    this.clickListener = (e: MouseEvent) => {
      const pos = this.getCanvasPos(e);
      this.mouse.justClicked = true;
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
      this.emit({ type: "click", x: pos.x, y: pos.y });
    };

    this.contextMenuListener = (e: MouseEvent) => {
      e.preventDefault();
      const pos = this.getCanvasPos(e);
      this.mouse.justRightClicked = true;
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
      this.emit({ type: "rightclick", x: pos.x, y: pos.y });
    };

    this.mouseMoveListener = (e: MouseEvent) => {
      const pos = this.getCanvasPos(e);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
      this.mouse.moved = true;
      this.emit({ type: "mousemove", x: pos.x, y: pos.y });
    };

    this.keyDownListener = (e: KeyboardEvent) => {
      this.emit({ type: "keydown", key: e.key });
    };

    canvas.addEventListener("click", this.clickListener);
    canvas.addEventListener("contextmenu", this.contextMenuListener);
    canvas.addEventListener("mousemove", this.mouseMoveListener);
    window.addEventListener("keydown", this.keyDownListener);
  }

  private getCanvasPos(e: MouseEvent): Point {
    if (!this.canvas) return { x: e.clientX, y: e.clientY };
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  on(handler: InputHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  private emit(event: InputEvent): void {
    // While locked, block keydown (prevent hotkeys during cutscenes), but allow
    // click and rightclick through so EngineInputBridge can still dismiss speech
    // bubbles / messages and advance dialogue even during scripted sequences.
    // EngineInputBridge guards world interactions with its own locked check.
    if (this._locked && event.type === "keydown") {
      return;
    }
    for (const h of this.handlers) h(event);
  }

  getMousePosition(): Point {
    return { x: this.mouse.x, y: this.mouse.y };
  }

  update(): void {
    this.mouse.justClicked = false;
    this.mouse.justRightClicked = false;
    this.mouse.moved = false;
  }

  detach(): void {
    if (this.canvas) {
      if (this.clickListener) this.canvas.removeEventListener("click", this.clickListener);
      if (this.contextMenuListener) this.canvas.removeEventListener("contextmenu", this.contextMenuListener);
      if (this.mouseMoveListener) this.canvas.removeEventListener("mousemove", this.mouseMoveListener);
      this.canvas = null;
    }
    if (this.keyDownListener) {
      window.removeEventListener("keydown", this.keyDownListener);
    }
    this.clickListener = null;
    this.contextMenuListener = null;
    this.mouseMoveListener = null;
    this.keyDownListener = null;
    this.handlers = [];
  }
}
