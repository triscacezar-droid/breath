# Breathing Website (React + Vite + Vercel) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a simple breathing exercise website (4–4–4 cycle) and make it easy to deploy publicly on Vercel.

**Architecture:** A single-page React app built with Vite. One main screen renders an animated circle and phase label, driven by a small phase state machine and a 1-second tick timer.

**Tech Stack:** React, TypeScript, Vite, CSS

---

### Task 1: Scaffold project

**Files:**
- Create: `/home/cezar/Desktop/Breath/breath-web/` (Vite scaffold)

**Step 1: Create the app**

Run:

```bash
cd "/home/cezar/Desktop/Breath"
npm create vite@5 breath-web -- --template react-ts
```

Expected: project created at `/home/cezar/Desktop/Breath/breath-web`.

**Step 2: Install dependencies**

Run:

```bash
cd "/home/cezar/Desktop/Breath/breath-web"
npm install
```

Expected: dependencies installed successfully.

**Step 3: Verify dev server boots**

Run:

```bash
npm run dev
```

Expected: Vite dev server URL printed; page loads.

---

### Task 2: Implement breathing loop UI (4s inhale, 4s hold, 4s exhale)

**Files:**
- Modify: `/home/cezar/Desktop/Breath/breath-web/src/App.tsx`
- Modify: `/home/cezar/Desktop/Breath/breath-web/src/index.css` (or `src/App.css` depending on scaffold)

**Step 1: Implement state machine**
- Phase enum: `INHALE`, `HOLD`, `EXHALE`
- Durations: 4 seconds each
- `isRunning` flag
- `secondsLeftInPhase` and `cycleCount` (optional)
- A 1-second interval tick while running

**Step 2: Implement animated circle**
- Use `transform: scale(...)` on a circular div
- Inhale: scale up over 4s
- Hold: stay at max scale
- Exhale: scale down over 4s

**Step 3: Add controls**
- Start/Pause toggle
- Reset (stops and returns to start of inhale)

**Step 4: Manual verification**
- Start: circle expands for 4s, holds 4s, contracts 4s, repeats
- Pause: animation and timer stop
- Reset: returns to inhale start

---

### Task 3: Build and deploy instructions for Vercel

**Files:**
- Modify: `/home/cezar/Desktop/Breath/breath-web/README.md`

**Step 1: Verify production build**

Run:

```bash
cd "/home/cezar/Desktop/Breath/breath-web"
npm run build
npm run preview
```

Expected: build succeeds; preview server runs and page loads.

**Step 2: Document Vercel deploy**
- Push repo to GitHub
- Import project in Vercel
- Set **Root Directory** to `breath-web`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

