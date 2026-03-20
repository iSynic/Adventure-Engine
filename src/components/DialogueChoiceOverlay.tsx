import { useState, useEffect } from "react";
import type { DialogueChoice } from "../engine/dialogue/DialogueManager";

interface DialogueChoiceOverlayProps {
  speakerName: string;
  speakerText: string;
  speakerPortrait?: string;
  choices: DialogueChoice[];
  chosenBranchIds?: string[];
  onSelect: (branchIndex: number) => void;
  skippable?: boolean;
  onSkip?: () => void;
}

export default function DialogueChoiceOverlay({
  speakerName,
  speakerText,
  speakerPortrait,
  choices,
  chosenBranchIds = [],
  onSelect,
  skippable = false,
  onSkip,
}: DialogueChoiceOverlayProps) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!skippable) {
      setShowHint(false);
      return;
    }
    setShowHint(false);
    const timer = setTimeout(() => setShowHint(true), 800);
    return () => clearTimeout(timer);
  }, [skippable, speakerText]);

  const handleOverlayClick = () => {
    if (skippable && onSkip) onSkip();
  };

  return (
    <div
      className="dialogue-overlay"
      onClick={skippable && choices.length === 0 ? handleOverlayClick : undefined}
      style={skippable && choices.length === 0 ? { cursor: "pointer" } : undefined}
    >
      <div className="dialogue-speaker-box">
        {speakerPortrait && (
          <img
            className="dialogue-speaker-portrait"
            src={speakerPortrait}
            alt={speakerName}
          />
        )}
        <div className="dialogue-speaker-content">
          <span className="dialogue-speaker-name">{speakerName}</span>
          <span className="dialogue-speaker-text">{speakerText}</span>
          {showHint && (
            <span className="dialogue-continue-hint">click to continue &#9660;</span>
          )}
        </div>
      </div>
      {choices.length > 0 && (
        <div className="dialogue-choices">
          {choices.map((choice, i) => {
            const wasSeen = chosenBranchIds.includes(choice.id);
            return (
              <button
                key={choice.id}
                className={`dialogue-choice-btn${wasSeen ? " dialogue-choice-btn--seen" : ""}`}
                onClick={() => onSelect(choice.branchIndex)}
              >
                <span className="dialogue-choice-num">{i + 1}.</span>
                {wasSeen && <span className="dialogue-choice-seen-dot">•</span>}
                {choice.text}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
