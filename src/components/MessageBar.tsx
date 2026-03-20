import { useState, useEffect } from "react";

interface MessageBarProps {
  message: string;
  skippable: boolean;
  fallbackText?: string;
}

export default function MessageBar({ message, skippable, fallbackText }: MessageBarProps) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!message || !skippable) {
      setShowHint(false);
      return;
    }
    setShowHint(false);
    const timer = setTimeout(() => setShowHint(true), 800);
    return () => clearTimeout(timer);
  }, [message, skippable]);

  return (
    <>
      <span>{message || fallbackText || ""}</span>
      {showHint && (
        <span className="message-continue-hint">click to continue &#9660;</span>
      )}
    </>
  );
}
