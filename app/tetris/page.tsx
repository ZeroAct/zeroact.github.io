"use client";

import { useEffect, useRef, useState } from "react";

const COLS = 10;
const ROWS = 20;

type Cell = string | 0;
type Board = Cell[][];

type PieceDef = {
  shape: number[][];
  color: string;
};

type Piece = {
  shape: number[][];
  color: string;
  x: number;
  y: number;
};

type GameStatus = "running" | "paused" | "gameover";

const PIECES: PieceDef[] = [
  { shape: [[1, 1, 1, 1]], color: "#22c55e" }, // I
  { shape: [[1, 1], [1, 1]], color: "#f59e0b" }, // O
  { shape: [[0, 1, 0], [1, 1, 1]], color: "#8b5cf6" }, // T
  { shape: [[1, 0, 0], [1, 1, 1]], color: "#06b6d4" }, // J
  { shape: [[0, 0, 1], [1, 1, 1]], color: "#ef4444" }, // L
  { shape: [[1, 1, 0], [0, 1, 1]], color: "#3b82f6" }, // S
  { shape: [[0, 1, 1], [1, 1, 0]], color: "#eab308" }, // Z
];

const rotate = (matrix: number[][]) =>
  matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export default function TetrisPage() {
  const boardWrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const resetRef = useRef<(() => void) | null>(null);
  const pauseToggleRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<{
    left: () => void;
    right: () => void;
    down: () => void;
    rotate: () => void;
    hardDrop: () => void;
  } | null>(null);

  const statusRef = useRef<GameStatus>("running");
  const [status, setStatus] = useState<GameStatus>("running");

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const levelRef = useRef(1);

  useEffect(() => {
    const wrap = boardWrapRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const c = ctx;
    const gameCanvas = canvas;

    const nextCanvas = nextCanvasRef.current;
    const nextCtx = nextCanvas?.getContext("2d") ?? null;
    const previewCanvas = nextCanvas;
    const previewCtx = nextCtx;

    let block = 26;
    let previewBlock = 22;

    const resize = () => {
      const w = wrap?.clientWidth ?? window.innerWidth;
      const h = wrap?.clientHeight ?? Math.floor(window.innerHeight * 0.7);
      block = clamp(Math.floor(Math.min(w / COLS, h / ROWS)), 10, 44);
      previewBlock = clamp(Math.floor(block * 0.82), 10, 36);

      gameCanvas.width = COLS * block;
      gameCanvas.height = ROWS * block;

      if (previewCanvas) {
        previewCanvas.width = 6 * previewBlock;
        previewCanvas.height = 6 * previewBlock;
      }
    };

    resize();
    const ro = wrap ? new ResizeObserver(resize) : null;
    if (ro && wrap) ro.observe(wrap);
    window.addEventListener("resize", resize);

    const createBoard = () =>
      Array.from({ length: ROWS }, () => Array(COLS).fill(0));

    let board: Board = createBoard();
    let current: Piece;
    let next: Piece;

    let dropCounter = 0;
    let lastTime = 0;
    let animationId = 0;

    const makePiece = (def: PieceDef): Piece => {
      const shape = def.shape.map((row) => row.slice());
      return {
        shape,
        color: def.color,
        x: Math.floor((COLS - shape[0].length) / 2),
        y: 0,
      };
    };

    const randomPiece = () => makePiece(PIECES[Math.floor(Math.random() * PIECES.length)]);

    const respawn = () => {
      current = next;
      current.x = Math.floor((COLS - current.shape[0].length) / 2);
      current.y = 0;
      next = randomPiece();
    };

    function collide(
      b: Board,
      piece: { shape: number[][]; x: number; y: number }
    ) {
      for (let y = 0; y < piece.shape.length; y += 1) {
        for (let x = 0; x < piece.shape[y].length; x += 1) {
          if (!piece.shape[y][x]) continue;
          const nextX = piece.x + x;
          const nextY = piece.y + y;
          if (nextX < 0 || nextX >= COLS || nextY >= ROWS) return true;
          if (nextY >= 0 && b[nextY][nextX]) return true;
        }
      }
      return false;
    }

    function merge(b: Board, piece: Piece) {
      for (let y = 0; y < piece.shape.length; y += 1) {
        for (let x = 0; x < piece.shape[y].length; x += 1) {
          if (piece.shape[y][x]) {
            b[piece.y + y][piece.x + x] = piece.color;
          }
        }
      }
    }

    function clearLines() {
      let cleared = 0;
      for (let y = ROWS - 1; y >= 0; y -= 1) {
        if (board[y].every(Boolean)) {
          board.splice(y, 1);
          board.unshift(Array(COLS).fill(0));
          cleared += 1;
          y += 1;
        }
      }
      if (cleared <= 0) return;

      setLines((prevLines) => {
        const nextLines = prevLines + cleared;
        const nextLevel = clamp(Math.floor(nextLines / 10) + 1, 1, 20);
        levelRef.current = nextLevel;
        setLevel(nextLevel);
        return nextLines;
      });

      // Simple scoring: reward multi-line clears.
      const base = cleared === 1 ? 100 : cleared === 2 ? 300 : cleared === 3 ? 500 : 800;
      setScore((prev) => prev + base * Math.max(1, levelRef.current));
    }

    function drawCell(x: number, y: number, color: string) {
      c.fillStyle = color;
      c.fillRect(x * block, y * block, block - 1, block - 1);
    }

    function drawGhost() {
      const ghost: Piece = { ...current, shape: current.shape, x: current.x, y: current.y };
      while (!collide(board, ghost)) ghost.y += 1;
      ghost.y -= 1;

      c.globalAlpha = 0.22;
      for (let y = 0; y < ghost.shape.length; y += 1) {
        for (let x = 0; x < ghost.shape[y].length; x += 1) {
          if (ghost.shape[y][x]) drawCell(ghost.x + x, ghost.y + y, ghost.color);
        }
      }
      c.globalAlpha = 1;
    }

    function drawNext() {
      if (!previewCtx || !previewCanvas) return;
      const nc = previewCanvas;
      const nctx = previewCtx;

      nctx.fillStyle = "#0b0d12";
      nctx.fillRect(0, 0, nc.width, nc.height);

      const shape = next.shape;
      const offsetX = Math.floor((6 - shape[0].length) / 2);
      const offsetY = Math.floor((6 - shape.length) / 2);
      nctx.fillStyle = next.color;

      for (let y = 0; y < shape.length; y += 1) {
        for (let x = 0; x < shape[y].length; x += 1) {
          if (!shape[y][x]) continue;
          const px = (offsetX + x) * previewBlock;
          const py = (offsetY + y) * previewBlock;
          nctx.fillRect(px, py, previewBlock - 1, previewBlock - 1);
        }
      }
    }

    function draw() {
      c.fillStyle = "#0b0d12";
      c.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

      // Subtle grid.
      c.globalAlpha = 0.08;
      c.strokeStyle = "#e5e7eb";
      for (let x = 0; x <= COLS; x += 1) {
        c.beginPath();
        c.moveTo(x * block, 0);
        c.lineTo(x * block, ROWS * block);
        c.stroke();
      }
      for (let y = 0; y <= ROWS; y += 1) {
        c.beginPath();
        c.moveTo(0, y * block);
        c.lineTo(COLS * block, y * block);
        c.stroke();
      }
      c.globalAlpha = 1;

      for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLS; x += 1) {
          const cell = board[y][x];
          if (cell) drawCell(x, y, cell);
        }
      }

      drawGhost();

      for (let y = 0; y < current.shape.length; y += 1) {
        for (let x = 0; x < current.shape[y].length; x += 1) {
          if (current.shape[y][x]) {
            drawCell(current.x + x, current.y + y, current.color);
          }
        }
      }

      drawNext();
    }

    function drop() {
      if (statusRef.current !== "running") return;
      current.y += 1;
      if (collide(board, current)) {
        current.y -= 1;
        merge(board, current);
        clearLines();
        respawn();
        if (collide(board, current)) {
          statusRef.current = "gameover";
          setStatus("gameover");
        }
      }
      dropCounter = 0;
    }

    function hardDrop() {
      if (statusRef.current !== "running") return;
      while (!collide(board, current)) current.y += 1;
      current.y -= 1;
      merge(board, current);
      clearLines();
      respawn();
      if (collide(board, current)) {
        statusRef.current = "gameover";
        setStatus("gameover");
      }
      dropCounter = 0;
    }

    function move(dir: number) {
      if (statusRef.current !== "running") return;
      current.x += dir;
      if (collide(board, current)) current.x -= dir;
    }

    function playerRotate() {
      if (statusRef.current !== "running") return;
      const rotated = rotate(current.shape);
      const original = current.shape;
      const originalX = current.x;
      const kicks = [0, -1, 1, -2, 2];
      for (const offset of kicks) {
        current.shape = rotated;
        current.x = originalX + offset;
        if (!collide(board, current)) return;
      }
      current.shape = original;
      current.x = originalX;
    }

    function togglePause() {
      if (statusRef.current === "gameover") return;
      statusRef.current = statusRef.current === "paused" ? "running" : "paused";
      setStatus(statusRef.current);
    }

    function resetGame() {
      board = createBoard();
      setScore(0);
      setLines(0);
      setLevel(1);
      levelRef.current = 1;
      statusRef.current = "running";
      setStatus("running");
      dropCounter = 0;

      // Fresh bag.
      current = randomPiece();
      next = randomPiece();
      // Avoid an immediate collision if a piece is tall.
      current.y = 0;
      if (collide(board, current)) current.y = -1;
    }

    function update(time = 0) {
      const delta = time - lastTime;
      lastTime = time;
      if (statusRef.current === "running") {
        dropCounter += delta;
        const speedMs = clamp(700 - (levelRef.current - 1) * 45, 110, 700);
        if (dropCounter > speedMs) drop();
      }
      draw();
      animationId = requestAnimationFrame(update);
    }

    function onKeyDown(event: KeyboardEvent) {
      const handled = [
        "ArrowLeft",
        "ArrowRight",
        "ArrowDown",
        "ArrowUp",
        "Space",
        "KeyP",
        "KeyR",
      ].includes(event.code);
      if (handled) event.preventDefault();

      if (event.code === "ArrowLeft") move(-1);
      if (event.code === "ArrowRight") move(1);
      if (event.code === "ArrowDown") drop();
      if (event.code === "ArrowUp") playerRotate();
      if (event.code === "Space") hardDrop();
      if (event.code === "KeyP") togglePause();
      if (event.code === "KeyR") resetGame();
    }

    resetRef.current = resetGame;
    pauseToggleRef.current = togglePause;
    inputRef.current = {
      left: () => move(-1),
      right: () => move(1),
      down: () => drop(),
      rotate: () => playerRotate(),
      hardDrop: () => hardDrop(),
    };

    // Init game state.
    current = randomPiece();
    next = randomPiece();
    current.y = 0;

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", () => {
      if (statusRef.current === "running") togglePause();
    });
    update();

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", resize);
      ro?.disconnect();
      cancelAnimationFrame(animationId);
    };
  }, []);

  const isPaused = status === "paused";
  const isGameOver = status === "gameover";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at top, #1f2937 0%, #0b0d12 60%)",
        color: "#e5e7eb",
        padding: "clamp(16px, 3vw, 32px)",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: "24px",
          gridTemplateColumns: "minmax(0, 1fr)",
          maxWidth: "980px",
          width: "100%",
        }}
      >
        <header style={{ display: "grid", gap: "12px" }}>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)", margin: 0 }}>
            Tetris Sprint
          </h1>
          <p style={{ margin: 0, color: "#9ca3af" }}>
            Keyboard: arrows move/rotate, Space hard drop, P pause, R restart.
          </p>
        </header>
        <div
          style={{
            display: "grid",
            gap: "24px",
            gridTemplateColumns: "minmax(0, 1fr) 260px",
            alignItems: "start",
          }}
        >
          <div
            ref={boardWrapRef}
            style={{
              background: "#0f172a",
              padding: "16px",
              borderRadius: "16px",
              border: "1px solid #1f2937",
              position: "relative",
              overflow: "hidden",
              height: "min(74vh, 860px)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: "auto",
                height: "100%",
                maxWidth: "100%",
                display: "block",
                imageRendering: "pixelated",
                touchAction: "none",
              }}
            />
            {(isPaused || isGameOver) && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(2, 6, 23, 0.72)",
                  backdropFilter: "blur(6px)",
                  padding: "16px",
                }}
              >
                <div style={{ display: "grid", gap: "10px", textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: 800 }}>
                    {isGameOver ? "Game Over" : "Paused"}
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: "14px" }}>
                    {isGameOver ? "Press R to restart." : "Press P to resume."}
                  </div>
                </div>
              </div>
            )}
          </div>
          <aside
            style={{
              background: "#111827",
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid #1f2937",
              display: "grid",
              gap: "16px",
            }}
          >
            <div style={{ display: "grid", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ fontSize: "14px", color: "#9ca3af" }}>Next</div>
                <div style={{ fontSize: "14px", color: "#9ca3af" }}>Level {level}</div>
              </div>
              <div
                style={{
                  background: "#0f172a",
                  borderRadius: "12px",
                  border: "1px solid #1f2937",
                  padding: "10px",
                }}
              >
                <canvas
                  ref={nextCanvasRef}
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    imageRendering: "pixelated",
                  }}
                />
              </div>
            </div>
            <div>
              <div style={{ fontSize: "14px", color: "#9ca3af" }}>Score</div>
              <div style={{ fontSize: "32px", fontWeight: 700 }}>{score}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #1f2937",
                  borderRadius: "12px",
                  padding: "12px",
                }}
              >
                <div style={{ fontSize: "12px", color: "#9ca3af" }}>Lines</div>
                <div style={{ fontSize: "18px", fontWeight: 800 }}>{lines}</div>
              </div>
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #1f2937",
                  borderRadius: "12px",
                  padding: "12px",
                }}
              >
                <div style={{ fontSize: "12px", color: "#9ca3af" }}>Status</div>
                <div style={{ fontSize: "18px", fontWeight: 800 }}>
                  {status === "running"
                    ? "Running"
                    : status === "paused"
                      ? "Paused"
                      : "Game Over"}
                </div>
              </div>
            </div>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "999px",
                background: isPaused ? "#b91c1c" : isGameOver ? "#7c2d12" : "#16a34a",
                color: "white",
                textAlign: "center",
                fontSize: "14px",
              }}
            >
              {isPaused ? "Paused" : isGameOver ? "Game Over" : "Running"}
            </div>
            <button
              type="button"
              onClick={() => pauseToggleRef.current?.()}
              disabled={isGameOver}
              style={{
                border: "none",
                padding: "12px 16px",
                borderRadius: "12px",
                background: isPaused ? "#22c55e" : "#60a5fa",
                color: "#0b0d12",
                fontWeight: 800,
                cursor: isGameOver ? "not-allowed" : "pointer",
                opacity: isGameOver ? 0.5 : 1,
              }}
            >
              {isPaused ? "Resume (P)" : "Pause (P)"}
            </button>
            <button
              type="button"
              onClick={() => resetRef.current?.()}
              style={{
                border: "none",
                padding: "12px 16px",
                borderRadius: "12px",
                background: "#f97316",
                color: "#0f172a",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Restart (R)
            </button>

            <div style={{ display: "grid", gap: "10px" }}>
              <div style={{ fontSize: "14px", color: "#9ca3af" }}>Touch Controls</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    inputRef.current?.left();
                  }}
                  style={{
                    border: "1px solid #1f2937",
                    background: "#0f172a",
                    color: "#e5e7eb",
                    padding: "12px",
                    borderRadius: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Left
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    inputRef.current?.rotate();
                  }}
                  style={{
                    border: "1px solid #1f2937",
                    background: "#0f172a",
                    color: "#e5e7eb",
                    padding: "12px",
                    borderRadius: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Rotate
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    inputRef.current?.right();
                  }}
                  style={{
                    border: "1px solid #1f2937",
                    background: "#0f172a",
                    color: "#e5e7eb",
                    padding: "12px",
                    borderRadius: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Right
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    inputRef.current?.down();
                  }}
                  style={{
                    gridColumn: "span 2",
                    border: "1px solid #1f2937",
                    background: "#111827",
                    color: "#e5e7eb",
                    padding: "12px",
                    borderRadius: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Soft Drop
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    inputRef.current?.hardDrop();
                  }}
                  style={{
                    border: "1px solid #1f2937",
                    background: "#111827",
                    color: "#e5e7eb",
                    padding: "12px",
                    borderRadius: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Hard
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
