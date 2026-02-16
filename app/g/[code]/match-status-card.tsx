import { Frown, Hourglass, Scale, Trophy, Users } from "lucide-react";

export function MatchStatusCard({
  status,
  isTerminal,
  didWin,
  isMyTurn,
  playerSymbol,
  nextPlayerName,
  turnRemainingSec,
}: {
  status: string;
  isTerminal: boolean;
  didWin: boolean;
  isMyTurn: boolean;
  playerSymbol: "X" | "O" | null;
  nextPlayerName: string;
  turnRemainingSec: number;
}) {
  let className = "status-card";
  let icon = <Users size={20} />;
  let title = "";
  let desc = "";

  if (status === "waiting") {
    className += " waiting";
    icon = <Hourglass size={20} />;
    if (playerSymbol) {
      title = "Waiting for opponent";
      desc = "Share the link to invite someone.";
    } else {
      title = "Room open";
      desc = "Join to start the match.";
    }
  } else if (isTerminal) {
    if (status === "draw") {
      className += " draw";
      icon = <Scale size={20} />;
      title = "Draw";
      desc = "Round ended in a draw.";
    } else if (didWin) {
      className += " victory";
      icon = <Trophy size={20} />;
      title = "Victory";
      desc = status === "timeout"
        ? "Opponent ran out of time."
        : status === "resigned"
          ? "Opponent left the match."
          : "You won this round.";
    } else {
      className += " defeat";
      icon = <Frown size={20} />;
      title = "Defeat";
      desc = status === "timeout"
        ? "Time's up."
        : status === "resigned"
          ? "You left the match."
          : "You lost this round.";
    }
  } else if (status === "active") {
    if (playerSymbol) {
      if (isMyTurn) {
        className += " your-turn";
        title = "Your turn";
        desc = `${turnRemainingSec}s remaining`;
      } else {
        className += " their-turn";
        title = `${nextPlayerName}'s turn`;
        desc = `${turnRemainingSec}s remaining`;
      }
    } else {
      className += " their-turn";
      title = `${nextPlayerName}'s turn`;
      desc = `${turnRemainingSec}s remaining`;
    }
  }

  return (
    <div className={className}>
      <span className="status-card-icon">{icon}</span>
      <div>
        <p className="status-card-title">{title}</p>
        <p className="status-card-desc">{desc}</p>
      </div>
    </div>
  );
}
