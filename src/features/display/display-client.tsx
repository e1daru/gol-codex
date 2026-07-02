"use client";

import { Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { choosePlacement, type Rect } from "@/lib/life/placement";
import { createGrid, seedRandom, stampCells, stepGrid, type LifeGrid } from "@/lib/life/life";
import { renderPixelText, renderSpecialPixelArt } from "@/lib/life/pixel-font";
import { createSeededRandom } from "@/lib/life/random";
import type { DisplaySubmission } from "@/lib/submissions/types";

const CELL_SIZE = 4;
const BOARD_WIDTH = 1920;
const BOARD_HEIGHT = 1080;
const BOARD_COLS = Math.floor(BOARD_WIDTH / CELL_SIZE);
const BOARD_ROWS = Math.floor(BOARD_HEIGHT / CELL_SIZE);
const BOARD_SEED = "gol-codex-display-v2";
const DEFAULT_TICK_MS = 100;
const INTRO_MS = 2600;
const CELL_COLOR = "#adff3f";

type DisplayClientProps = {
  submitUrl: string;
};

type BoardRuntime = {
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
  boardWidth: number;
  boardHeight: number;
  renderScale: number;
  offsetX: number;
  offsetY: number;
  cols: number;
  rows: number;
  reserved: Rect;
};

type DisplayControlPayload =
  | {
      action: "pause" | "play" | "reset" | "seed";
      seed?: string;
    }
  | {
      action: "speed";
      fps: number;
    };

type PendingText = {
  id: string;
  cells: Array<{ x: number; y: number }>;
  x: number;
  y: number;
  startedAtMs: number;
};

export function DisplayClient({ submitUrl }: DisplayClientProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridRef = useRef<LifeGrid | null>(null);
  const bufferRef = useRef<LifeGrid | null>(null);
  const runtimeRef = useRef<BoardRuntime | null>(null);
  const seenSubmissionIds = useRef<Set<string>>(new Set());
  const pendingTextsRef = useRef<PendingText[]>([]);
  const hasLoadedInitialSubmissionsRef = useRef(false);
  const displayBootedAtMsRef = useRef(Date.now());
  const seedKeyRef = useRef(BOARD_SEED);
  const pausedRef = useRef(false);
  const tickMsRef = useRef(DEFAULT_TICK_MS);

  const [paused, setPaused] = useState(false);
  const [fps, setFps] = useState(Math.round(1000 / DEFAULT_TICK_MS));
  const [approvedCount, setApprovedCount] = useState(0);
  const [connectionNote, setConnectionNote] = useState<string | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const grid = gridRef.current;

    if (!canvas || !grid) {
      return;
    }

    const context = canvas.getContext("2d");
    const runtime = runtimeRef.current;

    if (!context || !runtime) {
      return;
    }

    context.setTransform(runtime.pixelRatio, 0, 0, runtime.pixelRatio, 0, 0);
    context.globalAlpha = 1;
    context.fillStyle = "#000000";
    context.fillRect(0, 0, runtime.viewportWidth, runtime.viewportHeight);
    context.translate(runtime.offsetX, runtime.offsetY);
    context.scale(runtime.renderScale, runtime.renderScale);
    context.fillRect(0, 0, runtime.boardWidth, runtime.boardHeight);
    context.fillStyle = CELL_COLOR;

    for (let y = 0; y < grid.height; y += 1) {
      for (let x = 0; x < grid.width; x += 1) {
        if (grid.cells[y * grid.width + x] === 1) {
          context.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
        }
      }
    }

    const nowMs = Date.now();

    for (const pendingText of pendingTextsRef.current) {
      const progress = Math.min(1, Math.max(0, (nowMs - pendingText.startedAtMs) / INTRO_MS));
      const pulse = 0.36 + Math.abs(Math.sin(progress * Math.PI * 6)) * 0.58;
      context.globalAlpha = pulse * (1 - progress * 0.1);
      context.fillStyle = CELL_COLOR;

      for (const cell of pendingText.cells) {
        context.fillRect((pendingText.x + cell.x) * CELL_SIZE, (pendingText.y + cell.y) * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
      }
    }

    context.globalAlpha = 1;
  }, []);

  const resetBoard = useCallback(
    (seed = true, seedKey = seedKeyRef.current) => {
      const runtime = runtimeRef.current;

      if (!runtime) {
        return;
      }

      const grid = createGrid(runtime.cols, runtime.rows);
      const buffer = createGrid(runtime.cols, runtime.rows);

      if (seed) {
        seedKeyRef.current = seedKey;
        seedRandom(grid, 0.075, createSeededRandom(`${seedKey}:${runtime.cols}x${runtime.rows}`));
      }

      gridRef.current = grid;
      bufferRef.current = buffer;
      pendingTextsRef.current = [];
      draw();
    },
    [draw]
  );

  const queueSubmissionIntro = useCallback(
    (submission: DisplaySubmission) => {
      if (seenSubmissionIds.current.has(submission.id)) {
        return;
      }

      const runtime = runtimeRef.current;

      if (!runtime) {
        return;
      }

      const availableWidth = Math.max(12, runtime.cols - runtime.reserved.width - 6);
      const availableHeight = Math.max(12, runtime.rows - 6);
      const submissionSeed = createSubmissionSeed(submission);
      const text =
        renderSpecialPixelArt(submission.name, availableWidth, availableHeight, createSeededRandom(`${submissionSeed}:art`)) ??
        renderPixelText(submission.name);
      const placement = choosePlacement(
        runtime.cols,
        runtime.rows,
        text.width,
        text.height,
        [runtime.reserved],
        createSeededRandom(`${submissionSeed}:placement`)
      );
      seenSubmissionIds.current.add(submission.id);
      pendingTextsRef.current.push({
        id: submission.id,
        cells: text.cells,
        x: placement.x,
        y: placement.y,
        startedAtMs: getSubmissionIntroStartMs(submission)
      });
      setApprovedCount((current) => current + 1);
      draw();
    },
    [draw]
  );

  const applyControl = useCallback(
    (payload: DisplayControlPayload) => {
      if (payload.action === "pause" || payload.action === "play") {
        const nextPaused = payload.action === "pause";
        pausedRef.current = nextPaused;
        setPaused(nextPaused);
        return;
      }

      if (payload.action === "speed") {
        const nextFps = Math.min(24, Math.max(2, Math.round(payload.fps)));
        tickMsRef.current = 1000 / nextFps;
        setFps(nextFps);
        return;
      }

      if (payload.action === "reset") {
        resetBoard(false);
        pendingTextsRef.current = [];
        setApprovedCount(0);
        return;
      }

      if (payload.action === "seed") {
        resetBoard(true, payload.seed ?? createControlSeed("display-seed"));
      }
    },
    [resetBoard]
  );

  useEffect(() => {
    function resizeBoard() {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const pixelRatio = window.devicePixelRatio || 1;
      const renderScale = Math.min(viewportWidth / BOARD_WIDTH, viewportHeight / BOARD_HEIGHT);
      const boardDisplayWidth = BOARD_WIDTH * renderScale;
      const boardDisplayHeight = BOARD_HEIGHT * renderScale;
      const offsetX = (viewportWidth - boardDisplayWidth) / 2;
      const offsetY = (viewportHeight - boardDisplayHeight) / 2;
      const qrWidthCells = Math.ceil(280 / renderScale / CELL_SIZE);
      const qrHeightCells = Math.ceil(250 / renderScale / CELL_SIZE);

      canvas.width = Math.floor(viewportWidth * pixelRatio);
      canvas.height = Math.floor(viewportHeight * pixelRatio);
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;

      runtimeRef.current = {
        viewportWidth,
        viewportHeight,
        pixelRatio,
        boardWidth: BOARD_WIDTH,
        boardHeight: BOARD_HEIGHT,
        renderScale,
        offsetX,
        offsetY,
        cols: BOARD_COLS,
        rows: BOARD_ROWS,
        reserved: {
          x: Math.max(0, BOARD_COLS - qrWidthCells - 2),
          y: Math.max(0, BOARD_ROWS - qrHeightCells - 2),
          width: qrWidthCells + 2,
          height: qrHeightCells + 2
        }
      };

      if (!gridRef.current || gridRef.current.width !== BOARD_COLS || gridRef.current.height !== BOARD_ROWS) {
        resetBoard(true, seedKeyRef.current);
        return;
      }

      draw();
    }

    resizeBoard();
    window.addEventListener("resize", resizeBoard);

    return () => window.removeEventListener("resize", resizeBoard);
  }, [draw, resetBoard]);

  useEffect(() => {
    let animationFrame = 0;
    let lastTick = 0;

    function tick(timestamp: number) {
      if (timestamp - lastTick >= tickMsRef.current) {
        const nowMs = Date.now();
        const stepCount = Math.max(1, Math.min(8, Math.floor((timestamp - lastTick) / tickMsRef.current)));
        let grid = gridRef.current;
        let buffer = bufferRef.current;

        const maturedTexts = pendingTextsRef.current.filter((pendingText) => nowMs - pendingText.startedAtMs >= INTRO_MS);
        if (grid && maturedTexts.length > 0) {
          for (const pendingText of maturedTexts) {
            stampCells(grid, pendingText.cells, pendingText.x, pendingText.y);
          }
          pendingTextsRef.current = pendingTextsRef.current.filter((pendingText) => nowMs - pendingText.startedAtMs < INTRO_MS);
        }

        if (grid && buffer && !pausedRef.current) {
          for (let step = 0; step < stepCount; step += 1) {
            stepGrid(grid, buffer);
            gridRef.current = buffer;
            bufferRef.current = grid;
            grid = gridRef.current;
            buffer = bufferRef.current;
          }
        }

        draw();
        lastTick += stepCount * tickMsRef.current;
      } else if (pendingTextsRef.current.length > 0) {
        draw();
      }

      animationFrame = requestAnimationFrame(tick);
    }

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [draw]);

  useEffect(() => {
    let cancelled = false;

    async function loadApprovedSubmissions() {
      try {
        const response = await fetch("/api/display/submissions", { cache: "no-store" });

        if (!response.ok) {
          setConnectionNote("Connect Supabase to receive live names.");
          return;
        }

        const payload = (await response.json()) as { submissions?: DisplaySubmission[] };

        if (cancelled) {
          return;
        }

        const submissions = payload.submissions ?? [];

        if (!hasLoadedInitialSubmissionsRef.current) {
          for (const submission of submissions) {
            if (getSubmissionIntroStartMs(submission) <= displayBootedAtMsRef.current) {
              seenSubmissionIds.current.add(submission.id);
            } else {
              queueSubmissionIntro(submission);
            }
          }

          hasLoadedInitialSubmissionsRef.current = true;
          setConnectionNote(null);
          return;
        }

        for (const submission of submissions) {
          queueSubmissionIntro(submission);
        }

        setConnectionNote(null);
      } catch {
        setConnectionNote("Live submission feed is offline.");
      }
    }

    loadApprovedSubmissions();
    const interval = window.setInterval(loadApprovedSubmissions, 6000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [queueSubmissionIntro]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    if (!supabase) {
      setConnectionNote("Supabase env vars are missing; display is running in demo mode.");
      return;
    }

    const submissionsChannel = supabase
      .channel("display-submissions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        (payload) => {
          const row = payload.new as DisplaySubmission & { status?: string };

          if (row.status === "approved") {
            queueSubmissionIntro(row);
          }
        }
      )
      .subscribe();

    const controlsChannel = supabase
      .channel("display-controls")
      .on("broadcast", { event: "display-control" }, ({ payload }) => {
        const control = payload as Partial<DisplayControlPayload>;

        if (control.action === "pause" || control.action === "play" || control.action === "reset" || control.action === "seed") {
          applyControl({ action: control.action, seed: typeof control.seed === "string" ? control.seed : undefined });
        }

        if (control.action === "speed" && typeof control.fps === "number") {
          applyControl({ action: "speed", fps: control.fps });
        }
      })
      .subscribe();

    setConnectionNote(null);

    return () => {
      supabase.removeChannel(submissionsChannel);
      supabase.removeChannel(controlsChannel);
    };
  }, [applyControl, queueSubmissionIntro]);

  return (
    <main className="display-shell">
      <canvas ref={canvasRef} className="life-canvas" aria-label="Conway's Game of Life display" />

      <div className="display-toolbar" aria-label="Display controls">
        <button type="button" className="icon-button" title={paused ? "Play" : "Pause"} onClick={() => applyControl({ action: paused ? "play" : "pause" })}>
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </button>
        <button type="button" className="icon-button" title="Reset" onClick={() => applyControl({ action: "reset" })}>
          <RotateCcw size={18} />
        </button>
        <button type="button" className="icon-button" title="Seed" onClick={() => applyControl({ action: "seed" })}>
          <Sparkles size={18} />
        </button>
        <span className="display-stat">{approvedCount}</span>
        <span className="display-stat">{fps}</span>
      </div>

      <aside className="qr-panel" aria-label="Submission QR code">
        <QRCodeSVG value={submitUrl} size={152} bgColor="#ffffff" fgColor="#000000" marginSize={2} />
        <div className="qr-text">
          <strong>Scan to join</strong>
          <span>{new URL(submitUrl).host}</span>
        </div>
      </aside>

      {connectionNote ? <div className="display-note">{connectionNote}</div> : null}
    </main>
  );
}

function createSubmissionSeed(submission: DisplaySubmission): string {
  return `${submission.id}:${submission.approved_at ?? ""}:${submission.name}`;
}

function getSubmissionIntroStartMs(submission: DisplaySubmission): number {
  const timestamp = Date.parse(submission.approved_at ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function createControlSeed(prefix: string): string {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
