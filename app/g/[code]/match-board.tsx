import type { SymbolSkin } from "@/lib/types/game";

export function MatchBoard({
  board,
  boardSize,
  status,
  timerRatio,
  winningLineSet,
  isTerminal,
  lastMoveIndex,
  canPlay,
  playerSymbol,
  nextPlayer,
  symbolSkin,
  onMove,
}: {
  board: Array<"X" | "O" | null>;
  boardSize: number;
  status: string;
  timerRatio: number;
  winningLineSet: Set<number>;
  isTerminal: boolean;
  lastMoveIndex: number | null | undefined;
  canPlay: boolean;
  playerSymbol: "X" | "O" | null;
  nextPlayer: string | null | undefined;
  symbolSkin: SymbolSkin;
  onMove: (cellIndex: number) => void;
}) {
  return (
    <div className="board-area glass-panel">
      {status === "active" && (
        <div className="timer-strip" aria-label="Turn timer">
          <div className="timer-fill" style={{ transform: `scaleX(${timerRatio})` }} />
        </div>
      )}

      <div className="knot-board" style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}>
        {board.map((cell, index) => {
          const isWinningCell = winningLineSet.has(index);
          const isLastMove = !isTerminal && index === lastMoveIndex;
          const isDisabled = !canPlay || cell !== null || nextPlayer !== playerSymbol;

          return (
            <button
              key={`cell-${index}`}
              type="button"
              className={`knot-cell${isWinningCell ? " is-winning" : isLastMove ? " is-last-move" : ""}`}
              onClick={() => onMove(index)}
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
  );
}
