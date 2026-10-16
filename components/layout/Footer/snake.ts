export const COLUMNS = 24;
export const ROWS = 14;
export type Point = { x: number; y: number };
export type Direction = "up" | "down" | "left" | "right";
export type Game = {
  columns: number;
  rows: number;
  snake: Point[];
  direction: Direction;
  nextDirection: Direction;
  food: Point | null;
  status: "ready" | "playing" | "paused" | "over" | "won";
  score: number;
};
export type Action = { type: "tick"; random: number } | { type: "toggle" | "restart" | "pause" } | { type: "turn"; direction: Direction } | { type: "resize"; columns: number; rows: number };
const STEPS: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" };
export const initialGame = (columns = COLUMNS, rows = ROWS): Game => {
  const x = Math.max(3, Math.floor(columns * 0.3));
  const y = Math.floor(rows / 2);
  return {
    columns, rows,
    snake: Array.from({ length: 4 }, (_, index) => ({ x: x - index, y })),
    direction: "right", nextDirection: "right", food: { x: Math.floor(columns * 0.7), y }, status: "ready", score: 0,
  };
};

export function snakeReducer(game: Game, action: Action): Game {
  if (action.type === "resize") return action.columns === game.columns && action.rows === game.rows ? game : initialGame(action.columns, action.rows);
  if (action.type === "restart") return { ...initialGame(game.columns, game.rows), status: "playing" };
  if (action.type === "pause") return game.status === "playing" ? { ...game, status: "paused" } : game;
  if (action.type === "toggle") {
    if (game.status === "over" || game.status === "won") return { ...initialGame(game.columns, game.rows), status: "playing" };
    return { ...game, status: game.status === "playing" ? "paused" : "playing" };
  }
  if (action.type === "turn") {
    if (game.status === "over" || game.status === "won") return game;
    // Accept one turn per tick; two quick keys must not reverse into the neck.
    if (game.nextDirection !== game.direction || action.direction === OPPOSITE[game.direction]) return game;
    return { ...game, nextDirection: action.direction, status: "playing" };
  }
  if (action.type !== "tick" || game.status !== "playing") return game;
  const step = STEPS[game.nextDirection];
  const head = { x: game.snake[0].x + step.x, y: game.snake[0].y + step.y };
  const eating = head.x === game.food?.x && head.y === game.food?.y;
  const body = eating ? game.snake : game.snake.slice(0, -1);
  if (head.x < 0 || head.x >= game.columns || head.y < 0 || head.y >= game.rows || body.some(cell => cell.x === head.x && cell.y === head.y)) {
    return { ...game, status: "over" };
  }
  const snake = [head, ...body];
  let food = game.food;
  if (eating) {
    const occupied = new Set(snake.map(cell => cell.y * game.columns + cell.x));
    const free = Array.from({ length: game.columns * game.rows }, (_, i) => i).filter(i => !occupied.has(i));
    const next = free[Math.floor(action.random * free.length)];
    food = next === undefined ? null : { x: next % game.columns, y: Math.floor(next / game.columns) };
  }
  return { ...game, snake, food, direction: game.nextDirection, nextDirection: game.nextDirection, score: game.score + (eating ? 1 : 0), status: food ? "playing" : "won" };
}
