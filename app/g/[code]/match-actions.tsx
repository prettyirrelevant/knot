import Link from "next/link";

import type { SymbolSkin } from "@/lib/types/game";

export function MatchActions({
  canJoin,
  canRequestRematch,
  canAcceptRematch,
  waitingForRematch,
  isArchived,
  isTerminal,
  joining,
  requestingRematch,
  acceptingRematch,
  symbolSkin,
  onJoin,
  onRequestRematch,
  onAcceptRematch,
}: {
  canJoin: boolean;
  canRequestRematch: boolean;
  canAcceptRematch: boolean;
  waitingForRematch: boolean;
  isArchived: boolean;
  isTerminal: boolean;
  joining: boolean;
  requestingRematch: boolean;
  acceptingRematch: boolean;
  symbolSkin: SymbolSkin;
  onJoin: () => void;
  onRequestRematch: () => void;
  onAcceptRematch: () => void;
}) {
  return (
    <>
      {canJoin && (
        <button
          className="button primary match-action-btn"
          type="button"
          onClick={onJoin}
          disabled={joining}
        >
          {joining ? "Joining..." : <>Join as <symbolSkin.O size={14} /></>}
        </button>
      )}

      {canRequestRematch && (
        <div className="rule-actions">
          <button
            className="button primary"
            type="button"
            onClick={onRequestRematch}
            disabled={requestingRematch}
          >
            {requestingRematch ? "Requesting..." : "Request Rematch"}
          </button>
          <Link className="button" href="/">Go Home</Link>
        </div>
      )}

      {canAcceptRematch && (
        <div className="rule-actions">
          <button
            className="button primary"
            type="button"
            onClick={onAcceptRematch}
            disabled={acceptingRematch}
          >
            {acceptingRematch ? "Accepting..." : "Accept Rematch"}
          </button>
          <Link className="button" href="/">Go Home</Link>
        </div>
      )}

      {waitingForRematch && (
        <div className="rule-actions">
          <p className="feedback-line">Waiting for opponent to accept...</p>
          <Link className="button" href="/">Go Home</Link>
        </div>
      )}

      {isArchived && isTerminal && !canRequestRematch && !canAcceptRematch && !waitingForRematch && (
        <div className="rule-actions">
          <p className="feedback-line">This game has been archived.</p>
          <Link className="button" href="/">Go Home</Link>
        </div>
      )}
    </>
  );
}
