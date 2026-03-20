import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTutorial } from "../context/TutorialContext";

interface TutorialBubbleProps {
  title: string;
  description: string;
  tip?: string;
  children: ReactNode;
  preferSide?: "above" | "below" | "right" | "left";
}

const BUBBLE_W = 240;
const BUBBLE_OFFSET = 12;

export default function TutorialBubble({
  title,
  description,
  tip,
  children,
  preferSide = "above",
}: TutorialBubbleProps) {
  const { enabled } = useTutorial();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; side: string } | null>(null);

  function handleMouseEnter() {
    if (!enabled) return;
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let side = preferSide;
    let x = 0;
    let y = 0;

    if (side === "above") {
      x = Math.min(Math.max(r.left + r.width / 2 - BUBBLE_W / 2, 8), vw - BUBBLE_W - 8);
      y = r.top - BUBBLE_OFFSET;
      if (y < 80) side = "below";
    }
    if (side === "below") {
      x = Math.min(Math.max(r.left + r.width / 2 - BUBBLE_W / 2, 8), vw - BUBBLE_W - 8);
      y = r.bottom + BUBBLE_OFFSET;
      if (y > vh - 120) side = "above";
    }
    if (side === "right") {
      x = r.right + BUBBLE_OFFSET;
      y = r.top + r.height / 2;
      if (x + BUBBLE_W > vw - 8) {
        x = r.left - BUBBLE_W - BUBBLE_OFFSET;
        side = "left";
      }
    }

    if (side === "above") {
      x = Math.min(Math.max(r.left + r.width / 2 - BUBBLE_W / 2, 8), vw - BUBBLE_W - 8);
      y = r.top - BUBBLE_OFFSET;
    }
    if (side === "below") {
      x = Math.min(Math.max(r.left + r.width / 2 - BUBBLE_W / 2, 8), vw - BUBBLE_W - 8);
      y = r.bottom + BUBBLE_OFFSET;
    }

    setPos({ x, y, side });
  }

  function handleMouseLeave() {
    setPos(null);
  }

  const bubble = pos ? (
    <div
      className={`tutorial-bubble tutorial-bubble--${pos.side}`}
      style={{ left: pos.x, top: pos.y }}
      onMouseLeave={handleMouseLeave}
    >
      <div className="tutorial-bubble-title">{title}</div>
      <div className="tutorial-bubble-desc">{description}</div>
      {tip && <div className="tutorial-bubble-tip">💡 {tip}</div>}
    </div>
  ) : null;

  return (
    <>
      <div
        ref={wrapRef}
        style={{ display: "contents" }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {bubble && createPortal(bubble, document.body)}
    </>
  );
}
