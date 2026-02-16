"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Clock, Grid3X3, Hash, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { toast } from "sonner";

import { MatchActions } from "@/app/g/[code]/match-actions";
import { MatchBoard } from "@/app/g/[code]/match-board";
import { MatchShareStrip } from "@/app/g/[code]/match-share-strip";
import { MatchStatusCard } from "@/app/g/[code]/match-status-card";
import { useMatchClock } from "@/app/g/[code]/use-match-clock";
import { AccountActions } from "@/app/account-actions";
import { api } from "@/convex/_generated/api";
import { toPlayerId } from "@/lib/convex-helpers";
import { formatDelta } from "@/lib/format";
import { getSymbolSkin } from "@/lib/symbol-skins";
import { useIdentityStore } from "@/stores/use-identity-store";
import { useUiStore } from "@/stores/use-ui-store";

const MATCH_QUERY = api.matches.getMatchByRoomCode;
const JOIN_ROOM = api.matches.joinRoom;
const MAKE_MOVE = api.matches.makeMove;
const REQUEST_REMATCH = api.matches.requestRematch;
const ACCEPT_REMATCH = api.matches.acceptRematch;
const ROUND_RATING_EVENTS = api.ratings.getRoundRatingEvents;

function isTerminalStatus(status: string) {
  return status === "won" || status === "draw" || status === "timeout" || status === "resigned";
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
  const [joining, setJoining] = useState(false);
  const [requestingRematch, setRequestingRematch] = useState(false);
  const [acceptingRematch, setAcceptingRematch] = useState(false);

  const localSymbolSkinId = useUiStore((state) => state.symbolSkinId);
  const identityStatus = useIdentityStore((state) => state.status);
  const identityPlayerId = useIdentityStore((state) => state.playerId);

  const playerId = toPlayerId(identityPlayerId);

  const joinRoom = useMutation(JOIN_ROOM);
  const makeMove = useMutation(MAKE_MOVE);
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

  const { turnRemainingSec, timerRatio } = useMatchClock(
    match ? { _id: match._id, status: String(match.status), turnDeadlineAt: Number(match.turnDeadlineAt), config: { turnTimeSec: Number(match.config.turnTimeSec) } } : null,
  );

  const playerSymbol = useMemo(() => {
    if (!playerId || !match) return null;
    if (match.players?.X && String(match.players.X) === playerId) return "X" as const;
    if (match.players?.O && String(match.players.O) === playerId) return "O" as const;
    return null;
  }, [match, playerId]);

  useEffect(() => {
    if (!match || !playerId) return;

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

  const winningLineSet = useMemo(
    () => new Set<number>((match?.winningLine as number[] | undefined) ?? []),
    [match?.winningLine],
  );

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
    if (!match || !playerId || !playerSymbol) return;
    if (match.status !== "active") return;

    if (match.nextPlayer !== playerSymbol) {
      toast.error("Not your turn.");
      return;
    }

    if ((match.board as Array<string | null>)[cellIndex] !== null) return;

    try {
      const result = await makeMove({ matchId: match._id, cellIndex, playerId });
      if (!result.ok) {
        toast.error(String(result.reason).replaceAll("_", " ").toLowerCase());
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That move didn't work. Try again.");
    }
  }

  async function handleRequestRematch() {
    if (!match || !playerId) return;

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
    if (!match || !playerId) return;

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
  const isArchived = Boolean(match.deletedAt);

  const didWin = Boolean(match.winner) && playerSymbol === match.winner;
  const isMyTurn = status === "active" && match.nextPlayer === playerSymbol;

  const requestedBy = (match.rematchRequestedBy as "X" | "O" | undefined) ?? undefined;
  const canJoin = !playerSymbol && !match.players?.O;
  const canPlay = Boolean(playerSymbol) && status === "active";
  const canRequestRematch = Boolean(playerSymbol) && isTerminal && !requestedBy && !isArchived;
  const canAcceptRematch = Boolean(playerSymbol) && isTerminal && Boolean(requestedBy) && requestedBy !== playerSymbol && !isArchived;
  const waitingForRematch = Boolean(playerSymbol) && isTerminal && requestedBy === playerSymbol && !isArchived;

  const nextSymbol = match.nextPlayer as "X" | "O";
  const nextPlayerName = match.playerNames?.[nextSymbol] ?? nextSymbol;

  const myDelta = typeof roundRating?.myDelta === "number" ? roundRating.myDelta : undefined;
  const myAfterElo = roundRating?.events.find(
    (e) => String(e.playerId) === playerId,
  )?.afterElo;

  return (
    <>
      <MatchShareStrip
        roomCode={roomCode}
        roundNumber={roundNumber}
        playerSymbol={playerSymbol}
        symbolSkin={symbolSkin}
      />

      <div className="match-layout interactive">
        <MatchBoard
          board={board}
          boardSize={boardSize}
          status={status}
          timerRatio={timerRatio}
          winningLineSet={winningLineSet}
          isTerminal={isTerminal}
          lastMoveIndex={match.lastMoveIndex}
          canPlay={canPlay}
          playerSymbol={playerSymbol}
          nextPlayer={match.nextPlayer}
          symbolSkin={symbolSkin}
          onMove={(i) => void handleMove(i)}
        />

        <aside className="match-sidebar">
          <MatchStatusCard
            status={status}
            isTerminal={isTerminal}
            didWin={didWin}
            isMyTurn={isMyTurn}
            playerSymbol={playerSymbol}
            nextPlayerName={nextPlayerName}
            turnRemainingSec={turnRemainingSec}
          />

          <MatchActions
            canJoin={canJoin}
            canRequestRematch={canRequestRematch}
            canAcceptRematch={canAcceptRematch}
            waitingForRematch={waitingForRematch}
            isArchived={isArchived}
            isTerminal={isTerminal}
            joining={joining}
            requestingRematch={requestingRematch}
            acceptingRematch={acceptingRematch}
            symbolSkin={symbolSkin}
            onJoin={() => void handleJoinRoom()}
            onRequestRematch={() => void handleRequestRematch()}
            onAcceptRematch={() => void handleAcceptRematch()}
          />

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
