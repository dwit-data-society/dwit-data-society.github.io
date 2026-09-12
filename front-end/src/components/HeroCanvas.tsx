"use client";

import { useEffect, useRef } from "react";

const GRID_COLOR = "#171717";
const CHAR_COLOR = "#dadada";
const ASCII_CHARS = ".:+*#%@0369";
const THRESHOLD = 0.25;
const PUSH_RADIUS = 5;
const PUSH_FORCE = 30;
const SPRING = 0.025;
const DAMPING = 0.5;

type Cell = {
  col: number;
  row: number;
  char: string;
  isLit: boolean;
  offsetX: number;
  offsetY: number;
  velX: number;
  velY: number;
};

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const logoImg = imgRef.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    const dpr = window.devicePixelRatio || 1;

    let CELL_SIZE = 8;
    let CELL_GAP = 2;
    let CELL_STEP = CELL_SIZE + CELL_GAP;
    let cols = 0;
    let rows = 0;
    let cells: Cell[] = [];
    let animFrameId: number;
    let intervalId: ReturnType<typeof setInterval>;

    function setupCanvas() {
      CELL_SIZE = window.innerWidth < 768 ? 3 : 8;
      CELL_GAP = window.innerWidth < 768 ? 1 : 2;
      CELL_STEP = CELL_SIZE + CELL_GAP;
      cols = Math.floor(window.innerWidth / CELL_STEP);
      rows = Math.floor(window.innerHeight / CELL_STEP);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function sampleLogoIntoCells() {
      const rect = logoImg.getBoundingClientRect();
      const logoCols = Math.ceil(rect.width / CELL_STEP);
      const logoRows = Math.ceil(rect.height / CELL_STEP);
      const startCol = Math.floor(rect.left / CELL_STEP);
      const startRow = Math.floor(rect.top / CELL_STEP);

      const sampleCanvas = document.createElement("canvas");
      sampleCanvas.width = logoCols;
      sampleCanvas.height = logoRows;
      const sampleCtx = sampleCanvas.getContext("2d")!;
      sampleCtx.fillStyle = "#000";
      sampleCtx.fillRect(0, 0, logoCols, logoRows);
      sampleCtx.drawImage(logoImg, 0, 0, logoCols, logoRows);
      const { data } = sampleCtx.getImageData(0, 0, logoCols, logoRows);

      cells = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const inLogo =
            col >= startCol &&
            col < startCol + logoCols &&
            row >= startRow &&
            row < startRow + logoRows;
          let isLit = false;
          let char = " ";
          if (inLogo) {
            const idx = ((row - startRow) * logoCols + (col - startCol)) * 4;
            const brightness =
              (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
            isLit = brightness > THRESHOLD;
            char = isLit
              ? ASCII_CHARS[Math.min(ASCII_CHARS.length - 1, Math.floor(brightness * ASCII_CHARS.length))]
              : " ";
          }
          cells.push({ col, row, char, isLit, offsetX: 0, offsetY: 0, velX: 0, velY: 0 });
        }
      }
    }

    function renderFrame() {
      ctx.font = `${CELL_SIZE + 2}px monospace`;
      ctx.textBaseline = "top";
      ctx.textAlign = "center";
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      ctx.fillStyle = GRID_COLOR;
      for (const { col, row } of cells) {
        ctx.fillRect(col * CELL_STEP, row * CELL_STEP, CELL_SIZE, CELL_SIZE);
      }
      ctx.fillStyle = CHAR_COLOR;
      for (const { col, row, char, isLit, offsetX, offsetY } of cells) {
        if (isLit) {
          const x = (col + offsetX) * CELL_STEP;
          const y = (row + offsetY) * CELL_STEP;
          ctx.fillText(char, x + CELL_SIZE / 2, y);
        }
      }
    }

    function init() {
      setupCanvas();
      sampleLogoIntoCells();
      renderFrame();
    }

    const mouse = { col: -999, row: -999, isMoving: false };
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    function updatePhysics() {
      for (const cell of cells) {
        if (!cell.isLit) continue;
        if (mouse.isMoving) {
          const dx = cell.col + cell.offsetX - mouse.col;
          const dy = cell.row + cell.offsetY - mouse.row;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < PUSH_RADIUS && dist > 0) {
            const force = (1 - dist / PUSH_RADIUS) ** 2 * PUSH_FORCE;
            cell.velX += (dx / dist) * force;
            cell.velY += (dy / dist) * force;
          }
        }
        cell.velX += -cell.offsetX * SPRING;
        cell.velY += -cell.offsetY * SPRING;
        cell.velX *= DAMPING;
        cell.velY *= DAMPING;
        cell.offsetX += cell.velX;
        cell.offsetY += cell.velY;
        if (Math.abs(cell.offsetX) < 0.01 && Math.abs(cell.offsetY) < 0.01) {
          cell.offsetX = cell.velX = 0;
        }
        if (Math.abs(cell.offsetY) < 0.01) {
          cell.offsetY = cell.velY = 0;
        }
      }
    }

    function animationLoop() {
      updatePhysics();
      renderFrame();
      animFrameId = requestAnimationFrame(animationLoop);
    }

    function onMouseMove(e: MouseEvent) {
      mouse.col = e.clientX / CELL_STEP;
      mouse.row = e.clientY / CELL_STEP;
      mouse.isMoving = true;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { mouse.isMoving = false; }, 50);
    }

    function onMouseLeave() {
      mouse.col = mouse.row = -999;
      mouse.isMoving = false;
    }

    window.addEventListener("resize", init);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    intervalId = setInterval(() => {
      for (const cell of cells)
        if (cell.isLit)
          cell.char = ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
      renderFrame();
    }, 50);

    if (logoImg.complete) {
      init();
    } else {
      logoImg.addEventListener("load", init);
    }

    animationLoop();

    return () => {
      window.removeEventListener("resize", init);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(animFrameId);
      clearInterval(intervalId);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, []);

  return (
    <section style={{ position: "relative", width: "100%", height: "100svh", backgroundColor: "black" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "75%" }}>
        <img
          ref={imgRef}
          src="/motto.svg"
          alt="DataSociety"
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", visibility: "hidden" }}
        />
      </div>
    </section>
  );
}
