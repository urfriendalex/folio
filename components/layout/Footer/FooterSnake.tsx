"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { initialGame, snakeReducer, type Direction } from "./snake";
import styles from "./FooterSnake.module.scss";

const KEYS: Record<string, Direction> = { ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };
const CONTROLS: { direction: Direction; glyph: string }[] = [
  { direction: "up", glyph: "↑" }, { direction: "left", glyph: "←" },
  { direction: "down", glyph: "↓" }, { direction: "right", glyph: "→" },
];

export function FooterSnake() {
  const [game, dispatch] = useReducer(snakeReducer, undefined, () => initialGame());
  const boardRef = useRef<HTMLDivElement>(null);
  const [boosting, setBoosting] = useState(false);
  const playing = game.status === "playing";
  const ended = game.status === "over" || game.status === "won";

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = () => {
      const width = board.clientWidth;
      const height = board.clientHeight;
      if (!width || !height) return;
      const cell = Math.max(16, Math.min(28, Math.min(width, height) / 16));
      dispatch({ type: "resize", columns: Math.max(10, Math.floor(width / cell)), rows: Math.max(8, Math.floor(height / cell)) });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => dispatch({ type: "tick", random: Math.random() }), boosting ? 65 : 155);
    return () => window.clearInterval(timer);
  }, [playing, boosting]);

  useEffect(() => {
    const pause = () => { dispatch({ type: "pause" }); setBoosting(false); };
    const onVisibility = () => { if (document.hidden) pause(); };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // The revealed footer owns game keys, regardless of which control has focus.
  // Wheel/touch scrolling remains owned by the footer's reversible extension.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Shift") { setBoosting(true); return; }
      const direction = KEYS[event.key] ?? KEYS[event.key.toLowerCase()];
      if (direction) {
        event.preventDefault();
        event.stopImmediatePropagation();
        dispatch({ type: "turn", direction });
      } else if (event.code === "Space" && !(event.target instanceof Element && event.target.closest("button"))) {
        event.preventDefault();
        event.stopImmediatePropagation();
        dispatch({ type: "toggle" });
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") setBoosting(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, []);

  return (
    <div data-footer-game data-boosting={boosting && playing} className={styles.game}>
      <div className={styles.scoreboard} role="status">
        <span>{game.status === "over" ? "game over" : game.status === "won" ? "you win" : ""}</span>
        <span>score {String(game.score).padStart(2, "0")}</span>
      </div>
      <div className={styles.playArea}>
        <div ref={boardRef} className={styles.board} role="group"
          aria-label="Snake game. Arrow keys or W A S D to move. Space to start or pause. Hold Shift to boost.">
          <svg viewBox={`0 0 ${game.columns * 10} ${game.rows * 10}`} preserveAspectRatio="none" role="img" aria-label={`Snake board, score ${game.score}`}>
            {game.status !== "ready" && <path className={styles.grid} d={Array.from({ length: game.columns * game.rows }, (_, i) => `M${(i % game.columns) * 10 + 5} ${Math.floor(i / game.columns) * 10 + 5}h.5`).join("")} />}
            {game.snake.map((cell, index) => <rect key={`${cell.x},${cell.y}`}
              x={cell.x * 10 + 1} y={cell.y * 10 + 1} width={8} height={8}
              className={index === 0 ? styles.head : styles.body} />)}
            {game.food && <path className={styles.food} d={`M${game.food.x * 10 + 5} ${game.food.y * 10 + 1}v8m-4-4h8`} />}
          </svg>
        </div>
        <div className={styles.controls}>
          <div className={styles.dpad} aria-label="Snake direction controls">
            {CONTROLS.map(({ direction, glyph }) => <button key={direction} type="button"
              className={styles.key} data-direction={direction} aria-label={`Move ${direction}`}
              onClick={() => dispatch({ type: "turn", direction })}>{glyph}</button>)}
          </div>
          <div className={styles.actions}>
            <button type="button" data-play-control className={styles.action} onClick={() => {
              dispatch({ type: "toggle" });
            }}>{playing ? "pause" : ended ? "again" : game.status === "paused" ? "resume" : "play"}</button>
            <button type="button" className={styles.action} onClick={() => {
              dispatch({ type: "restart" });
            }}>reset</button>
            <button type="button" className={`${styles.action} ${styles.boost}`} aria-label="Hold Shift to boost"
              aria-pressed={boosting} title="Hold to boost"
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                setBoosting(true);
              }}
              onPointerUp={() => setBoosting(false)} onPointerCancel={() => setBoosting(false)}
              onLostPointerCapture={() => setBoosting(false)}
              onKeyDown={(event) => {
                if (event.key === " " || event.key === "Enter") { event.preventDefault(); setBoosting(true); }
              }}
              onKeyUp={(event) => {
                if (event.key === " " || event.key === "Enter") { event.preventDefault(); setBoosting(false); }
              }}
              onBlur={() => setBoosting(false)}>shift</button>
          </div>
        </div>
      </div>
    </div>
  );
}
