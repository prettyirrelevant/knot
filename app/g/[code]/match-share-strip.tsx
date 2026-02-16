import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

import type { SymbolSkin } from "@/lib/types/game";

export function MatchShareStrip({
  roomCode,
  roundNumber,
  playerSymbol,
  symbolSkin,
}: {
  roomCode: string;
  roundNumber: number;
  playerSymbol: "X" | "O" | null;
  symbolSkin: SymbolSkin;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/g/${roomCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="match-share-strip">
      <span className="badge filled">
        {playerSymbol
          ? <>Playing as {React.createElement(symbolSkin[playerSymbol], { size: 14 })}</>
          : "Spectating"}
      </span>
      <span className="badge muted">Round <strong>#{roundNumber}</strong></span>
      <div className="share-code">
        <span className="share-code-label">{roomCode}</span>
        <button
          className="share-code-btn"
          type="button"
          onClick={() => void handleCopyLink()}
          aria-label="Copy room link"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}
