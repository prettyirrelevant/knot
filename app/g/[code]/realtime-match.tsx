"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Check, Clock, Copy, Frown, Grid3X3, Hash, Hourglass, Scale, TrendingDown, TrendingUp, Trophy, Users } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AccountActions } from "@/app/account-actions";
import { getSymbolSkin } from "@/lib/symbol-skins";
import { useIdentityStore } from "@/stores/use-identity-store";
import { useUiStore } from "@/stores/use-ui-store";

const MATCH_QUERY = api.matches.getMatchByRoomCode;
const JOIN_ROOM = api.matches.joinRoom;
const MAKE_MOVE = api.matches.makeMove;
const TICK_TIMEOUT = api.matches.tickTimeout;
const REQUEST_REMATCH = api.matches.requestRematch;
const ACCEPT_REMATCH = api.matches.acceptRematch;
const ROUND_RATING_EVENTS = api.ratings.getRoundRatingEvents;

function isTerminalStatus(status: string) {
  return status === "won" || status === "draw" || status === "timeout" || status === "resigned";
}

function formatDelta(delta?: number) {
  if (typeof delta !== "number") {
    return "-";
  }

  return delta >= 0 ? `+${delta}` : `${delta}`;
}

function toPlayerId(value: string | null): Id<"players"> | null {
  return value ? (value as Id<"players">) : null;
}

function RulesGroup({
  boardSize,
  winLength,
  turnTimeSec,
}: {
  boardSize: number;
  winLength: number;
  turnTimeSec: number;
}) {
  return (
    <details className="info-group">
      <summary className="info-group-title"><Grid3X3 size={14} /> Rules</summary>
      <div className="info-group-body">
        <div className="info-item">
          <Hash size={16} />
          <span>
            {boardSize}&times;{boardSize} board
          </span>
        </div>
        <div className="info-item">
          <Trophy size={16} />
          <span>{winLength} in a row to win</span>
        </div>
        <div className="info-item">
          <Clock size={16} />
          <span>{turnTimeSec}s per turn</span>
        </div>
      </div>
    </details>
  );
}

export function RealtimeMatch({ roomCode }: { roomCode: string }) {
  const [feedback, setFeedback] = useState("");
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [joining, setJoining] = useState(false);
  const [tickingTimeout, setTickingTimeout] = useState(false);
  const [requestingRematch, setRequestingRematch] = useState(false);
  const [acceptingRematch, setAcceptingRematch] = useState(false);
  const [copied, setCopied] = useState(false);

  const localSymbolSkinId = useUiStore((state) => state.symbolSkinId);
  const identityStatus = useIdentityStore((state) => state.status);
  const identityPlayerId = useIdentityStore((state) => state.playerId);

  const playerId = toPlayerId(identityPlayerId);

  const joinRoom = useMutation(JOIN_ROOM);
  const makeMove = useMutation(MAKE_MOVE);
  const tickTimeout = useMutation(TICK_TIMEOUT);
  const requestRematch = useMutation(REQUEST_REMATCH);
  const acceptRematch = useMutation(ACCEPT_REMATCH);

  const match = useQuery(MATCH_QUERY, { roomCode });
  const symbolSkin = getSymbolSkin(
    match?.config?.symbolSkinId ?? localSymbolSkinId,
  );

  const terminalRoundArgs =
    match && isTerminalStatus(String(match.status))
      ? {
          matchId: match._id,
          roundNumber: Number(match.roundNumber ?? 1),
          playerId: playerId ?? undefined,
        }
      : "skip";

  const roundRating = useQuery(ROUND_RATING_EVENTS, terminalRoundArgs);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockMs(Date.now());
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const playerSymbol = useMemo(() => {
    if (!playerId || !match) {
      return null;
    }

    if (match.players?.X && String(match.players.X) === playerId) {
      return "X" as const;
    }

    if (match.players?.O && String(match.players.O) === playerId) {
      return "O" as const;
    }

    return null;
  }, [match, playerId]);

  useEffect(() => {
    if (!match || !playerId) {
      return;
    }

    const status = String(match.status);

    if (status === "won" || status === "draw" || status === "timeout" || status === "resigned") {
      setFeedback("");
      return;
    }

    if (playerSymbol) {
      setFeedback("");
      return;
    }

    if (match.players?.O) {
      setFeedback("Room's full. You're watching this one.");
      return;
    }

    setFeedback("Room's open. Jump in.");
  }, [match, playerId, playerSymbol]);

  useEffect(() => {
    if (!match || match.status !== "active") {
      return;
    }

    if (clockMs <= Number(match.turnDeadlineAt)) {
      return;
    }

    if (tickingTimeout) {
      return;
    }

    let cancelled = false;

    setTickingTimeout(true);
    void tickTimeout({ matchId: match._id })
      .catch(() => {
        if (!cancelled) {
          toast.error("Something went wrong with the timer.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTickingTimeout(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clockMs, match, tickTimeout, tickingTimeout]);

  const turnRemainingSec = match
    ? Math.max(0, Math.ceil((Number(match.turnDeadlineAt) - clockMs) / 1000))
    : 0;

  const timerRatio = match
    ? Math.max(
        0,
        Math.min(
          1,
          (Number(match.turnDeadlineAt) - clockMs) / (Number(match.config.turnTimeSec) * 1000),
        ),
      )
    : 0;

  const winningLineSet = useMemo(
    () => new Set<number>((match?.winningLine as number[] | undefined) ?? []),
    [match?.winningLine],
  );

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/g/${roomCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleJoinRoom() {
    if (!playerId) {
      toast("Setting you up...");
      return;
    }

    setJoining(true);
    try {
      await joinRoom({ roomCode, playerId });
      toast.success("Joined room.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to join room.");
    } finally {
      setJoining(false);
    }
  }

  async function handleMove(cellIndex: number) {
    if (!match || !playerId || !playerSymbol) {
      return;
    }

    if (match.status !== "active") {
      return;
    }

    if (match.nextPlayer !== playerSymbol) {
      toast.error("Not your turn.");
      return;
    }

    if ((match.board as Array<string | null>)[cellIndex] !== null) {
      return;
    }

    try {
      const result = await makeMove({
        matchId: match._id,
        cellIndex,
        playerId,
      });

      if (!result.ok) {
        toast.error(String(result.reason).replaceAll("_", " ").toLowerCase());
        return;
      }

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That move didn't work. Try again.");
    }
  }

  async function handleRequestRematch() {
    if (!match || !playerId) {
      return;
    }

    setRequestingRematch(true);
    try {
      const result = await requestRematch({ matchId: match._id, playerId });
      if (!result.ok) {
        toast.error(String(result.reason).replaceAll("_", " ").toLowerCase());
        return;
      }
      toast.success("Rematch sent. Waiting on them.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send rematch. Try again.");
    } finally {
      setRequestingRematch(false);
    }
  }

  async function handleAcceptRematch() {
    if (!match || !playerId) {
      return;
    }

    setAcceptingRematch(true);
    try {
      const result = await acceptRematch({ matchId: match._id, playerId });
      if (!result.ok) {
        toast.error(String(result.reason).replaceAll("_", " ").toLowerCase());
        return;
      }
      toast.success("Rematch accepted. Let's go.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't accept rematch. Try again.");
    } finally {
      setAcceptingRematch(false);
    }
  }

  if (identityStatus === "booting" || match === undefined) {
    return (
      <div className="match-layout">
        <div className="skeleton skeleton-board" />
        <div className="match-sidebar">
          <div className="skeleton skeleton-sidebar-tile" />
          <div className="skeleton skeleton-sidebar-tile" />
          <div className="skeleton skeleton-sidebar-tile" />
        </div>
      </div>
    );
  }

  if (!playerId) {
    return <p className="feedback-line">Couldn't identify you. Refresh and try again.</p>;
  }

  if (match === null) {
    return (
      <div>
        <p className="feedback-line">
          No room with code <strong>{roomCode}</strong>. Check the code or create a new one.
        </p>
        <div className="rule-actions" style={{ marginTop: "0.75rem" }}>
          <Link className="button primary" href="/">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const board = (match.board as Array<"X" | "O" | null>) ?? [];
  const boardSize = Number(match.config.size);
  const roundNumber = Number(match.roundNumber ?? 1);
  const status = String(match.status);
  const isTerminal = isTerminalStatus(status);

  const didWin = Boolean(match.winner) && playerSymbol === match.winner;
  const isMyTurn = status === "active" && match.nextPlayer === playerSymbol;

  const requestedBy = (match.rematchRequestedBy as "X" | "O" | undefined) ?? undefined;
  const canJoin = !playerSymbol && !match.players?.O;
  const canPlay = Boolean(playerSymbol) && status === "active";
  const canRequestRematch = Boolean(playerSymbol) && isTerminal && !requestedBy;
  const canAcceptRematch = Boolean(playerSymbol) && isTerminal && requestedBy && requestedBy !== playerSymbol;
  const waitingForRematch = Boolean(playerSymbol) && isTerminal && requestedBy === playerSymbol;

  const myDelta = typeof roundRating?.myDelta === "number" ? roundRating.myDelta : undefined;
  const myAfterElo = roundRating?.events.find(
    (e) => String(e.playerId) === playerId,
  )?.afterElo;

  // status card config
  let statusCardClass = "status-card";
  let statusIcon = <Users size={20} />;
  let statusTitle = "";
  let statusDesc = "";

  if (status === "waiting") {
    statusCardClass += " waiting";
    statusIcon = <Hourglass size={20} />;
    if (playerSymbol) {
      statusTitle = "Waiting for opponent";
      statusDesc = "Share the link to invite someone.";
    } else {
      statusTitle = "Room open";
      statusDesc = "Join to start the match.";
    }
  } else if (isTerminal) {
    if (status === "draw") {
      statusCardClass += " draw";
      statusIcon = <Scale size={20} />;
      statusTitle = "Draw";
      statusDesc = "Round ended in a draw.";
    } else if (didWin) {
      statusCardClass += " victory";
      statusIcon = <Trophy size={20} />;
      statusTitle = "Victory";
      statusDesc = status === "timeout"
        ? "Opponent ran out of time."
        : status === "resigned"
          ? "Opponent left the match."
          : "You won this round.";
    } else {
      statusCardClass += " defeat";
      statusIcon = <Frown size={20} />;
      statusTitle = "Defeat";
      statusDesc = status === "timeout"
        ? "Time's up."
        : status === "resigned"
          ? "You left the match."
          : "You lost this round.";
    }
  } else if (status === "active") {
    const nextSymbol = match.nextPlayer as "X" | "O";
    const nextName = match.playerNames?.[nextSymbol] ?? nextSymbol;
    if (playerSymbol) {
      if (isMyTurn) {
        statusCardClass += " your-turn";
        statusTitle = "Your turn";
        statusDesc = `${turnRemainingSec}s remaining`;
      } else {
        statusCardClass += " their-turn";
        statusTitle = `${nextName}'s turn`;
        statusDesc = `${turnRemainingSec}s remaining`;
      }
    } else {
      statusCardClass += " their-turn";
      statusTitle = `${nextName}'s turn`;
      statusDesc = `${turnRemainingSec}s remaining`;
    }
  }

  return (
    <>
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

      <div className="match-layout interactive">
        <div className="board-area glass-panel">
          {status === "active" && (
            <div className="timer-strip" aria-label="Turn timer">
              <div className="timer-fill" style={{ transform: `scaleX(${timerRatio})` }} />
            </div>
          )}

          <div className="knot-board" style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}>
            {board.map((cell, index) => {
              const isWinningCell = winningLineSet.has(index);
              const isDisabled = !canPlay || cell !== null || match.nextPlayer !== playerSymbol;

              return (
                <button
                  key={`cell-${index}`}
                  type="button"
                  className={`knot-cell${isWinningCell ? " is-winning" : ""}`}
                  onClick={() => void handleMove(index)}
                  disabled={isDisabled}
                  aria-label={`Cell ${index + 1}`}
                >
                  <span>
                    {cell === "X" ? <symbolSkin.X /> : cell === "O" ? <symbolSkin.O /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="match-sidebar">
          <div className={statusCardClass}>
            <span className="status-card-icon">{statusIcon}</span>
            <div>
              <p className="status-card-title">{statusTitle}</p>
              <p className="status-card-desc">{statusDesc}</p>
            </div>
          </div>

          {canJoin && (
            <button
              className="button primary match-action-btn"
              type="button"
              onClick={() => void handleJoinRoom()}
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
                onClick={() => void handleRequestRematch()}
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
                onClick={() => void handleAcceptRematch()}
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

          {isTerminal && myDelta !== undefined && (
            <details className="info-group">
              <summary className="info-group-title">
                {myDelta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                Rating{" "}
                <span className={`elo-delta${myDelta >= 0 ? " positive" : " negative"}`}>
                  {formatDelta(myDelta)}
                </span>
              </summary>
              <div className="info-group-body">
                {myAfterElo !== undefined && (
                  <div className="info-item">
                    <span>New rating: {myAfterElo.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </details>
          )}

          <RulesGroup
            boardSize={boardSize}
            winLength={Number(match.config.winLength)}
            turnTimeSec={Number(match.config.turnTimeSec)}
          />

          {feedback && (
            <p className="feedback-line" role="status">
              {feedback}
            </p>
          )}

          {isTerminal && <AccountActions />}
        </aside>
      </div>
    </>
  );
}
