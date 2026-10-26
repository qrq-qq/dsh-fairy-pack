window.__ModuleLoader__.load({
  id: 'dsh-fairy-splash',
  factory(require) {
    try {
    const React = require('react')
    const h = React.createElement

    const VIDEO_URL = '/fairy-splash/v1/boot.mp4'
    const POSTER_URL = '/fairy-splash/v1/poster.jpg'
    const ICON_URL = '/fairy-splash/v1/icon-64.png'
    /* 把标签页图标换成 H.D.D. 核心；失败不影响任何功能。 */
    ;(() => {
      try {
        let link = document.querySelector('link[rel="icon"]')
        if (link === null) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.head.appendChild(link)
        }
        link.type = 'image/png'
        link.href = ICON_URL
      }
      catch {
        /* ignore */
      }
    })()
    /*
     * The fairy stage follows the conversation column instead of the window.
     * Opening the right task panel (or collapsing the left sidebar) moves the
     * centre of the conversation, so the core and its halo have to move with
     * it. better-sidebar marks that column with [data-dsh-center-col]; the
     * shell's own conversation slot is the fallback when it is absent. The two
     * custom properties feed .fs-hero, which every layer inside is centred on.
     */
    ;(() => {
      const STAGE_LEFT = '--fairy-stage-left'
      const STAGE_RIGHT = '--fairy-stage-right'
      const STAGE_SELECTORS = [
        '[data-dsh-center-col]',
        '[data-slot="main.conversation"]',
        '.Dc7zOa_root',
        '.xz4KEq_root',
      ]
      let frame = 0
      let stage = null
      let resizeObserver = null
      let lastLeft = Number.NaN
      let lastRight = Number.NaN
      const findStage = () => {
        for (const selector of STAGE_SELECTORS) {
          const el = document.querySelector(selector)
          if (el !== null && el.getBoundingClientRect().width > 1) return el
        }
        return null
      }
      const applyStage = () => {
        frame = 0
        const root = document.documentElement
        const next = findStage()
        if (next !== stage) {
          resizeObserver?.disconnect()
          resizeObserver = null
          stage = next
          if (stage !== null && typeof ResizeObserver === 'function') {
            resizeObserver = new ResizeObserver(scheduleStage)
            resizeObserver.observe(stage)
          }
        }
        if (stage === null) {
          lastLeft = Number.NaN
          lastRight = Number.NaN
          root.style.removeProperty(STAGE_LEFT)
          root.style.removeProperty(STAGE_RIGHT)
          return
        }
        const rect = stage.getBoundingClientRect()
        const left = Math.round(rect.left)
        const right = Math.max(0, Math.round(window.innerWidth - rect.right))
        if (left === lastLeft && right === lastRight) return
        lastLeft = left
        lastRight = right
        root.style.setProperty(STAGE_LEFT, left + 'px')
        root.style.setProperty(STAGE_RIGHT, right + 'px')
      }
      const scheduleStage = () => {
        if (frame === 0 && typeof window.requestAnimationFrame === 'function') {
          frame = window.requestAnimationFrame(applyStage)
        }
      }
      /* The column's own ResizeObserver covers the panel opening, closing and
         being dragged. The interval is the safety net for a wholesale swap of
         the centre column, and it costs one rect read per tick. Deliberately no
         subtree MutationObserver: a streaming reply would schedule it on every
         token. */
      window.addEventListener('resize', scheduleStage, { passive: true })
      scheduleStage()
      window.setInterval(scheduleStage, 1200)
    })()
    const CORE_GLITCH_CYCLE = 7200
    const CORE_EPOCH = performance.now()
    const coreGlitchPhase = () => `${-((performance.now() - CORE_EPOCH) % CORE_GLITCH_CYCLE)}ms`
    /* Master switch for the boot film. */
    const SPLASH_ENABLED = true
    /*
     * The film belongs to a launch of the app, not to every page load.
     * Two signals have to agree: the document must not be a reload, and this
     * window must not have booted before. Session storage survives Ctrl+R and
     * F5 and is wiped when the app itself restarts, so a refresh never sees the
     * film twice, including the first refresh after an update.
     */
    const SPLASH_ON_LAUNCH = (() => {
      if (!SPLASH_ENABLED) return false
      const entries = performance.getEntriesByType('navigation')
      const navigationType = entries[0]?.type ?? 'navigate'
      let booted = false
      try {
        const storage = window.sessionStorage
        booted = storage.getItem('fairy-splash:booted') === '1'
        if (!booted && navigationType !== 'reload') storage.setItem('fairy-splash:booted', '1')
      }
      catch {
        // Storage unavailable: the navigation type alone decides.
      }
      return !booted && navigationType !== 'reload'
    })()

    const CSS = `
.fs-root, .fs-root * { box-sizing: border-box; }
/*
 * Keep the top-left layout exactly as the app owns it: only the existing
 * "应用 / 编辑" caption menu is allowed to float over the video. The brand row
 * (icon + wordmark) stays below the splash layer, so no DeepSeek mark appears
 * and nothing is nudged into a different position.
 */
html[data-fairy-skin][data-fairy-splash-caption] [data-windows-menu] {
  filter: drop-shadow(0 1px 9px rgba(0, 0, 0, .8));
  pointer-events: none;
}
html[data-fairy-skin][data-fairy-splash-caption] .BynINW_frame:before {
  background: transparent !important;
}
.fs-root {
  position: fixed; inset: 0; z-index: 2147482200;
  pointer-events: none;
  font-family: "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif;
  color: #eaf1ff;
}

/* ---------- boot picture ---------- */
.fs-cinema {
  position: fixed; inset: 0; z-index: 2147483000;
  display: flex; align-items: center; justify-content: center;
  background: #000; overflow: hidden; pointer-events: auto;
  opacity: 1; transition: opacity 280ms cubic-bezier(.4, 0, .2, 1);
}
.fs-cinema.is-leaving { opacity: 0; pointer-events: none; }
.fs-cinema video {
  display: block; width: 100%; height: 100%; object-fit: cover;
  background: #000;
}
.fs-cinema::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 54%, rgba(0, 0, 0, .46) 100%);
}
.fs-controls {
  position: absolute; right: clamp(16px, 3vw, 40px); bottom: clamp(14px, 2.4vw, 30px);
  z-index: 2; display: flex; align-items: center; gap: 9px;
  opacity: 0; transition: opacity 500ms ease;
}
.fs-controls.is-ready { opacity: .72; }
.fs-controls:hover { opacity: 1; }
.fs-btn {
  appearance: none; cursor: pointer;
  padding: 7px 14px; border-radius: 999px;
  corner-shape: round;
  border: 1px solid rgba(201, 220, 255, .24);
  background: rgba(8, 17, 38, .44); color: rgba(233, 242, 255, .9);
  font: inherit; font-size: 11px; line-height: 1; letter-spacing: .16em;
  text-transform: uppercase; backdrop-filter: blur(9px);
  transition: border-color 180ms ease, background 180ms ease, color 180ms ease;
}
.fs-btn:hover { border-color: rgba(147, 179, 255, .64); background: rgba(20, 37, 78, .64); color: #fff; }
.fs-btn:focus-visible { outline: 2px solid #7f9cff; outline-offset: 3px; }

.fs-aura {
  position: absolute; inset: -28%; border-radius: 50%;
  corner-shape: round;
  background: radial-gradient(circle, rgba(103, 139, 255, .22) 0%, rgba(63, 90, 218, .10) 42%, transparent 70%);
  filter: blur(16px);
  animation: fs-aura 5.6s ease-in-out infinite;
}
.fs-orb { position: relative; display: block; width: 100%; height: 100%; overflow: visible; }
.fs-orb .fs-gear { transform-box: view-box; transform-origin: 300px 300px; animation: fs-gear-spin 18s linear infinite; }
.fs-orb .fs-iris-spin { transform-box: view-box; transform-origin: 300px 300px; animation: fs-iris-spin 12s linear infinite; }
.fs-orb .fs-iris { transform-box: view-box; transform-origin: 300px 300px; animation: fs-iris-pulse 8s ease-in-out infinite; }
.fs-orb .fs-pupil { transform-box: view-box; transform-origin: 300px 300px; animation: fs-pupil-pulse 4s ease-in-out infinite; }
.fs-orb .fs-highlight {
  transform-box: view-box; transform-origin: 372px 372px;
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, .9));
  animation: fs-highlight-twinkle 3s ease-in-out infinite, fs-highlight-jump 7s ease-in-out infinite;
}
/*
 * Global motion: the eye blinks and the core breathes a halo whenever the
 * console is up, with no streaming marker required.
 */
.fs-orb .fs-lid {
  animation: fs-lid-blink 7s cubic-bezier(.45, 0, .3, 1) 1.2s infinite;
}
/* Slow lid: ~0.7s to close, ~2s held shut, ~0.7s to open again. */
@keyframes fs-lid-blink {
  0%, 45% { transform: translateY(-380px); }
  50% { transform: translateY(-150px); }
  55%, 83% { transform: translateY(0); }
  93%, 100% { transform: translateY(-380px); }
}
/*
 * The halo sits beside the core instead of inside .fs-hero-orb: that element
 * carries a drop-shadow filter, and its filter region would crop a travelling
 * ring into a rounded square. Out here the ring stays a true circle at every
 * scale.
 */
.fs-halo {
  position: absolute;
  left: 50%;
  top: var(--fairy-orb-top);
  width: var(--fairy-orb-size);
  height: var(--fairy-orb-size);
  transform: translateX(-50%);
  pointer-events: none;
}
.fs-halo::before,
.fs-halo::after {
  content: "";
  position: absolute;
  inset: -6%;
  border-radius: 50%;
  corner-shape: round;
  background: radial-gradient(circle,
    rgba(236, 243, 255, 0) 58%,
    rgba(236, 243, 255, .18) 67%,
    rgba(240, 246, 255, .55) 74%,
    rgba(236, 243, 255, .16) 81%,
    rgba(236, 243, 255, 0) 90%);
  filter: blur(1.5px);
  opacity: 0;
  pointer-events: none;
  will-change: transform, opacity;
  animation: fs-halo-ring 2.6s cubic-bezier(.22, .6, .3, 1) infinite;
}
.fs-halo::after { animation-delay: 1.3s; }
@keyframes fs-halo-ring {
  0% { transform: scale(.92); opacity: 0; }
  16% { opacity: .5; }
  68% { opacity: .16; }
  100% { transform: scale(1.55); opacity: 0; }
}

/* =====================================================================
   Fairy H.D.D. skin — the dark blue console shown after the boot film.
   Every selector is scoped to html[data-fairy-skin], so disabling the
   bundle restores the untouched app theme.
   ===================================================================== */
:root[data-fairy-skin] {
  --fairy-display-font: "Segoe UI", "Arial", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif;
  --fairy-orb-size: clamp(180px, min(22.5vw, 33vh), 330px);
  --fairy-orb-top: 42px;
  --fairy-chat-top: calc(var(--fairy-orb-size) + 16px);
  --fairy-line: rgba(196, 205, 218, .55);
  /* How far above the reserved band the message text starts dissolving. */
  --fairy-chat-fade: 200px;
  --fairy-chat-fade-from: max(0px, calc(var(--fairy-chat-top) - var(--fairy-chat-fade)));
  color-scheme: dark;
}
html[data-fairy-skin] { background: #04060d !important; }
html[data-fairy-skin] body {
  /* One typeface across the console; the heavy cut is reserved for the
     nameplate and controls, body copy keeps a readable regular weight. */
  --dsw-font-family: "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", "Arial", sans-serif !important;
  --dsw-alias-bg-base: #05070e !important;
  --dsw-alias-bg-layer-1: #070b14f2 !important;
  --dsw-alias-bg-layer-2: #0a1020e8 !important;
  --dsw-alias-bg-layer-3: #0c1428f2 !important;
  --dsw-alias-bg-overlay: #070b14fa !important;
  --dsw-alias-brand-primary: #5b7cff !important;
  --dsw-alias-brand-text: #eaf1ff !important;
  --dsw-alias-link: #91a9ff !important;
  --dsw-alias-label-primary: #eaf1ff !important;
  --dsw-alias-label-secondary: #adc0e2 !important;
  --dsw-alias-label-tertiary: #8196bb !important;
  --dsw-alias-label-caption: #6f84a8 !important;
  --dsw-alias-border-l1: #16233c99 !important;
  --dsw-alias-border-l2: #1d3050aa !important;
  --dsw-alias-border-l3: #2a4270cc !important;
  --dsw-alias-button-primary-fill: #5b7cff !important;
  --dsw-alias-button-primary-hover: #7893ff !important;
  --dsw-focus-ring-color: #6d8cff !important;
  --dsw-specific-sidebar-fill: #070b14 !important;
  --dsw-alias-interactive-bg-hover: rgba(103, 139, 255, .10) !important;
  --dsw-alias-interactive-bg-hover-danger: rgba(255, 96, 128, .12) !important;
  --dsw-alias-scrollbar-bg-l2: #1b2942 !important;
  --dsw-alias-scrollbar-hover-l2: #2a4168 !important;
  color: #dbe6ff !important;
  background: #05070e !important;
}
html[data-fairy-skin] .BynINW_frame {
  background:
    linear-gradient(rgba(92, 128, 255, .048) 1px, transparent 1px),
    linear-gradient(90deg, rgba(92, 128, 255, .048) 1px, transparent 1px),
    radial-gradient(900px 620px at 58% 4%, rgba(54, 88, 230, .13), transparent 62%),
    radial-gradient(720px 560px at 18% 104%, rgba(38, 66, 185, .10), transparent 66%),
    #05070e !important;
  background-size: 22px 22px, 22px 22px, auto, auto, auto !important;
}
html[data-fairy-skin] .BynINW_frame:before {
  background: rgba(4, 7, 14, .30) !important;
}
html[data-fairy-skin] .BynINW_sidebarCol {
  background:
    linear-gradient(rgba(92, 128, 255, .034) 1px, transparent 1px),
    linear-gradient(90deg, rgba(92, 128, 255, .034) 1px, transparent 1px),
    linear-gradient(180deg, rgba(7, 12, 24, .93), rgba(4, 7, 14, .97)) !important;
  background-size: 22px 22px, 22px 22px, auto !important;
  border-right: 1px solid rgba(91, 124, 220, .16) !important;
}
html[data-fairy-skin] ._2H3hWW_root {
  background: transparent !important;
  color: #dfe9ff !important;
}
html[data-fairy-skin] :is([data-slot="main"], [data-slot="main.conversation"], .Dc7zOa_root, .Dc7zOa_body, .Dc7zOa_scrollBody, .Dc7zOa_scroll, .Dc7zOa_column, .xz4KEq_root, .xz4KEq_scroll, .xz4KEq_column) {
  background: transparent !important;
}
html[data-fairy-skin] .Dc7zOa_header {
  background: transparent !important;
  border-bottom: 1px solid rgba(91, 124, 220, .13) !important;
  backdrop-filter: none !important;
}
html[data-fairy-skin] ._2H3hWW_newSession {
  background: linear-gradient(180deg, rgba(12, 22, 43, .90), rgba(7, 14, 28, .92)) !important;
  border: 1px solid rgba(103, 139, 255, .30) !important;
  border-radius: 8px !important;
  color: #dfe9ff !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .05), 0 0 18px rgba(70, 110, 255, .08) !important;
}
html[data-fairy-skin] ._2H3hWW_newSession:hover {
  border-color: rgba(125, 158, 255, .62) !important;
  background: rgba(16, 31, 60, .94) !important;
}
html[data-fairy-skin] ._2H3hWW_panelRow,
html[data-fairy-skin] ._9lTDKa_sessionRow {
  border-radius: 6px !important;
}
html[data-fairy-skin] ._2H3hWW_panelRow:hover,
html[data-fairy-skin] ._9lTDKa_sessionRow:hover {
  background: rgba(103, 139, 255, .07) !important;
}
html[data-fairy-skin] ._9lTDKa_sessionRow[aria-current="true"],
html[data-fairy-skin] ._9lTDKa_sessionRow[data-active="true"] {
  border: 1px solid rgba(103, 139, 255, .28) !important;
  background: rgba(41, 70, 145, .18) !important;
}
html[data-fairy-skin] .cJsG2q_bubble {
  background: linear-gradient(135deg, #1d5da6, #15457c) !important;
  border: 1px solid rgba(110, 168, 255, .32) !important;
  border-radius: 18px !important;
  color: #f4f9ff !important;
  padding: 10px 18px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .28), inset 0 1px 0 rgba(255, 255, 255, .10) !important;
  font-size: 15px !important;
}
html[data-fairy-skin] .cJsG2q_contextRow {
  color: #b9cdf0 !important;
  font-size: 14px !important;
  opacity: .85;
}
html[data-fairy-skin] .cJsG2q_contextRow svg { color: #a8c4ff !important; }
html[data-fairy-skin] .xz4KEq_column { color: #eaf2ff !important; }
html[data-fairy-skin] .xz4KEq_column :is(p, li) { color: #eaf2ff !important; }
html[data-fairy-skin] ._3GBCTG_title,
html[data-fairy-skin] ._3GBCTG_summaryText { color: #a9c1e8 !important; }
html[data-fairy-skin] .Dc7zOa_composerSeat {
  background: linear-gradient(180deg, rgba(5, 7, 14, 0) 0%, rgba(5, 7, 14, .92) 46%) !important;
}
/*
 * New-session (hero) state: the app centers the composer seat in the
 * scrollport, which drops it straight onto the H.D.D. wordmark. Dock the seat
 * at the bottom of the column instead — the seat keeps its own 32px hero
 * padding — and keep the hero copy clear of the input.
 */
html[data-fairy-skin] :is(.Dc7zOa_root[data-phase="hero"], .Dc7zOa_body[data-content-phase="hero"]) .Dc7zOa_scrollBody {
  justify-content: flex-start;
}
html[data-fairy-skin] :is(.Dc7zOa_root[data-phase="hero"], .Dc7zOa_body[data-content-phase="hero"]) .Dc7zOa_composerSeat {
  margin-top: auto;
}
html[data-fairy-skin] .RlGAzG_card {
  background: linear-gradient(180deg, rgba(10, 20, 40, .96), rgba(6, 12, 24, .97)) !important;
  border: 1px solid rgba(102, 138, 255, .27) !important;
  border-radius: 18px !important;
  box-shadow:
    0 24px 70px rgba(0, 0, 0, .55),
    inset 0 1px 0 rgba(255, 255, 255, .06),
    0 0 38px rgba(60, 95, 255, .10) !important;
}
html[data-fairy-skin] .RlGAzG_card:focus-within {
  border-color: rgba(120, 154, 255, .62) !important;
  box-shadow:
    0 24px 80px rgba(0, 0, 0, .62),
    0 0 0 1px rgba(103, 139, 255, .28),
    0 0 44px rgba(60, 95, 255, .16) !important;
}
html[data-fairy-skin] .RlGAzG_input { color: #e7efff !important; caret-color: #7d9cff !important; }
html[data-fairy-skin] .RlGAzG_placeholder { color: #6f84aa !important; }
html[data-fairy-skin] .RlGAzG_add { color: #93a8cd !important; }
html[data-fairy-skin] ._2WTFBq_bar { background: rgba(103, 139, 255, .12) !important; }
html[data-fairy-skin] ::selection { background: rgba(103, 139, 255, .30); color: #f4f8ff; }
html[data-fairy-skin] ::-webkit-scrollbar { width: 9px; height: 9px; }
html[data-fairy-skin] ::-webkit-scrollbar-track { background: #060a12; }
html[data-fairy-skin] ::-webkit-scrollbar-thumb { background: #1b2942; border: 1px solid #24395c; border-radius: 6px; }

/* The console chrome shares the nameplate family at semibold. Body copy and
   conversation text keep their regular weight so long passages stay readable. */
html[data-fairy-skin] :is(button, [role="button"], [role="tab"], summary) {
  font-family: var(--fairy-display-font);
  font-weight: 600;
}
html[data-fairy-skin] :is(._2H3hWW_newSession, ._9lTDKa_sessionRow, ._2H3hWW_panelRow) {
  font-weight: 600;
}

/* Heavy rounded region outlines from the reference. The sidebar brand cell
   and the conversation trajectory stay unoutlined. */
html[data-fairy-skin] .BynINW_sidebarCol {
  border-right-width: 2px !important;
  border-right-color: var(--fairy-line) !important;
}
html[data-fairy-skin] ._2H3hWW_newSession {
  border-width: 2px !important;
  border-radius: 12px !important;
  border-color: var(--fairy-line) !important;
}
html[data-fairy-skin] ._9lTDKa_root {
  border-radius: 16px;
  box-shadow:
    inset 0 0 0 2px var(--fairy-line),
    inset 0 0 0 4px rgba(0, 0, 0, .12);
}
html[data-fairy-skin] ._2H3hWW_footArea {
  border-top: none !important;
}
html[data-fairy-skin] ._2WTFBq_panel {
  border-radius: 14px;
  box-shadow:
    inset 0 0 0 2px var(--fairy-line),
    inset 0 0 0 4px rgba(0, 0, 0, .10);
}
html[data-fairy-skin] .Dc7zOa_header {
  border-bottom: none !important;
}
html[data-fairy-skin] .Dc7zOa_tab {
  border-radius: 12px !important;
}
html[data-fairy-skin] .RlGAzG_card {
  border-width: 2px !important;
  border-radius: 22px !important;
  border-color: var(--fairy-line) !important;
}

/* Workspace only — same 2px gray line and rounded treatment as the other
   framed regions, so the sidebar does not use a one-off border style. */
html[data-fairy-skin] ._9lTDKa_root {
  padding-left: 2px !important;
  padding-right: 2px !important;
  box-shadow: none !important;
}
html[data-fairy-skin] ._9lTDKa_listArea {
  position: relative;
  margin-right: 0 !important;
  border: none !important;
  outline: none !important;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: none !important;
}
/* A single 2px line only: no glow, no second inner edge, no double frame. */
html[data-fairy-skin] ._9lTDKa_listArea::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 20;
  box-sizing: border-box;
  border: 2px solid var(--fairy-line);
  border-radius: inherit;
  pointer-events: none;
}
html[data-fairy-skin] ._9lTDKa_list :is(button, [role="button"])[aria-current="true"],
html[data-fairy-skin] ._9lTDKa_list :is(button, [role="button"])[aria-selected="true"],
html[data-fairy-skin] ._9lTDKa_list :is(button, [role="button"])[data-active="true"] {
  background: linear-gradient(180deg, rgba(56, 96, 190, .62), rgba(36, 64, 132, .68)) !important;
  border: 1px solid rgba(196, 205, 218, .38) !important;
  border-radius: 9px !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .06) !important;
}
.fs-root .fs-btn {
  font-family: var(--fairy-display-font);
  font-weight: 700;
}

/* ---- the real sidebar brand, replaced through its slots ---- */
.fs-brand-mark {
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%;
  filter: drop-shadow(0 0 9px rgba(88, 126, 255, .55));
}
.fs-brand-mark .fs-orb { width: 100%; height: 100%; }
.fs-brand-mark .fs-gear,
.fs-brand-mark .fs-iris-spin,
.fs-brand-mark .fs-iris,
.fs-brand-mark .fs-pupil,
.fs-brand-mark .fs-highlight { animation: none !important; }
.fs-brand-copy {
  display: flex; flex-direction: column; gap: 4px;
  min-width: 0; line-height: 1;
  text-align: left;
}
.fs-brand-title {
  font-family: var(--fairy-display-font);
  font-size: 22px; font-weight: 900; line-height: 1; letter-spacing: .012em;
  color: #f2f7ff;
}
.fs-brand-tag {
  font-family: var(--fairy-display-font);
  font-size: 8px; font-weight: 600; line-height: 1.2; letter-spacing: .12em;
  color: rgba(157, 181, 224, .70); white-space: nowrap;
  text-transform: uppercase;
}
html[data-fairy-skin] ._2H3hWW_brandName { height: auto !important; }

html[data-fairy-skin] ._2H3hWW_brandIdentity {
  height: 36px !important;
  overflow: visible !important;
}
/* Expanded sidebar: give the Fairy core more presence without changing the row. */
html[data-fairy-skin] ._2H3hWW_root:not(._2H3hWW_collapsed) ._2H3hWW_brandIdentity {
  height: 40px !important;
}
html[data-fairy-skin] ._2H3hWW_root:not(._2H3hWW_collapsed) ._2H3hWW_brandMark {
  width: 38px !important;
  height: 38px !important;
}

/* The shell owns the two brand single-slots, so the animated core is painted
   into the shipped cell: the whale stays in the tree but is hidden, and the
   core plus its halo replace it. */
html[data-fairy-skin] ._2H3hWW_brandMark {
  position: relative;
  width: 30px !important; height: 30px !important;
  flex: none;
  border-radius: 50%;
  corner-shape: round;
  overflow: visible;
  /* The static core doubles as the first paint and as the fallback when the
     live SVG cannot mount; the live core covers it pixel for pixel. */
  background: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgNjAwIj48Y2lyY2xlIGN4PSIzMDAiIGN5PSIzMDAiIHI9IjI3MCIgZmlsbD0iIzM5NzhlZCIgb3BhY2l0eT0iLjM1Ii8+PGNpcmNsZSBjeD0iMzAwIiBjeT0iMzAwIiByPSIyNjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzM5NzhlZCIgc3Ryb2tlLXdpZHRoPSIxNCIvPjxjaXJjbGUgY3g9IjMwMCIgY3k9IjMwMCIgcj0iMjY2IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iNiIvPjxjaXJjbGUgY3g9IjMwMCIgY3k9IjMwMCIgcj0iMjIwIiBmaWxsPSIjMTkzNDk5Ii8+PHBhdGggZD0iTTMwMCA1MCAzMzggMTA1IDI2MiAxMDVaTTU1MCAzMDAgNDk1IDMzOCA0OTUgMjYyWk0zMDAgNTUwIDI2MiA0OTUgMzM4IDQ5NVpNNTAgMzAwIDEwNSAyNjIgMTA1IDMzOFoiIGZpbGw9IiMxOTM0OTkiLz48Y2lyY2xlIGN4PSIzMDAiIGN5PSIzMDAiIHI9IjE4MCIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjMwMCIgY3k9IjMwMCIgcj0iMTMyIiBmaWxsPSIjYjRjNGVlIi8+PGNpcmNsZSBjeD0iMzAwIiBjeT0iMzAwIiByPSI5NiIgZmlsbD0iIzQyODVlOCIvPjxjaXJjbGUgY3g9IjMwMCIgY3k9IjMwMCIgcj0iNjAiIGZpbGw9IiMxNzMwODIiLz48Y2lyY2xlIGN4PSIzNzIiIGN5PSIzNzIiIHI9IjQyIiBmaWxsPSIjZmZmIi8+PC9zdmc+") center / contain no-repeat;
}
/* Only the static core needs a box glow; the live core carries a drop shadow
   that follows its own outline. */
html[data-fairy-skin] ._2H3hWW_brandMark:not(:has(> .fs-brand-live)) {
  box-shadow: 0 0 5px rgba(92, 130, 255, .36);
}
html[data-fairy-skin] ._2H3hWW_brandMark > :not(.fs-brand-live) { display: none !important; }
/* The logo row and its brand button clip their overflow, which used to slice
   the halo flat above and below the mark. Open the chain so the glow can fade
   naturally instead of ending on a straight edge. */
html[data-fairy-skin] ._2H3hWW_root:not(._2H3hWW_collapsed) ._2H3hWW_logoRow,
html[data-fairy-skin] ._2H3hWW_root:not(._2H3hWW_collapsed) ._2H3hWW_brand,
html[data-fairy-skin] ._2H3hWW_root:not(._2H3hWW_collapsed) ._2H3hWW_brandIdentity {
  overflow: visible !important;
}
/* A drop shadow follows the orb's own alpha, so the halo is a clean circle
   instead of a box shadow squeezed into a square cell. */
.fs-brand-live {
  position: relative;
  display: block;
  width: 100%; height: 100%;
  filter: drop-shadow(0 0 4px rgba(126, 156, 255, .55));
}
/* The tiny cell gets rotation only: gear, iris and a slow pupil pulse. */
.fs-brand-live .fs-gear { animation: fs-gear-spin 18s linear infinite !important; }
.fs-brand-live .fs-iris-spin { animation: fs-iris-spin 24s linear infinite !important; }
.fs-brand-live .fs-iris { animation: fs-iris-pulse 8s ease-in-out infinite !important; }
.fs-brand-live .fs-orb { position: relative; display: block; width: 100%; height: 100%; overflow: visible; }
html[data-fairy-skin] ._2H3hWW_brandMark.has-live-core {
  background: none !important;
  box-shadow: none !important;
}

/* Keep the enlarged core winning over the 30px fallback above. */
html[data-fairy-skin] ._2H3hWW_root:not(._2H3hWW_collapsed) ._2H3hWW_brandMark {
  width: 38px !important;
  height: 38px !important;
}

html[data-fairy-skin] ._2H3hWW_brandName {
  display: flex !important;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  height: auto !important;
  overflow: visible !important;
}
html[data-fairy-skin] ._2H3hWW_brandName > [data-slot="sidebar.brand.name"] { display: none !important; }
html[data-fairy-skin] ._2H3hWW_brandName::before {
  content: "Fairy";
  font-family: var(--fairy-display-font);
  font-size: 22px; font-weight: 900; line-height: 1; letter-spacing: .012em;
  color: #f2f7ff;
}
html[data-fairy-skin] ._2H3hWW_brandName::after {
  content: "空洞深潜系统";
  font-family: var(--fairy-display-font);
  font-size: 8px; font-weight: 600; line-height: 1.2; letter-spacing: .12em;
  color: rgba(157, 181, 224, .70);
  white-space: nowrap;
}

html[data-fairy-skin] body:has(.Dc7zOa_root[data-phase="hero"]) .Dc7zOa_headerUtilities { opacity: 0; pointer-events: none; }

/* ---- HOLLOW DEEP DIVE SYSTEM hero, only in the no-session state ---- */
.fs-hero {
  position: fixed;
  /* The stage is glued to the conversation column, not to the window: opening
     the right task panel or collapsing the left sidebar moves it. client.js
     writes these two properties from better-sidebar's [data-dsh-center-col]. */
  left: var(--fairy-stage-left, var(--dsh-sidebar-width, 280px));
  right: var(--fairy-stage-right, 0px);
  top: var(--dsh-windows-titlebar-height, 0px);
  bottom: 0;
  z-index: 2147482100;
  display: none;
  overflow: hidden;
  pointer-events: none;
}
html[data-fairy-skin] body:has(.Dc7zOa_root[data-phase="hero"]) .fs-hero { display: block; }
/* A real chat keeps the same large core as the new-conversation screen;
   only the caption copy is dropped. The chat viewport is shortened below the
   core instead of replacing it with a second, smaller icon. */
html[data-fairy-skin] body:has(.xz4KEq_root) .fs-hero {
  display: block !important;
}
html[data-fairy-skin] body:has(.xz4KEq_root) .fs-hero-copy {
  display: none !important;
}
/* A live chat gets a compact core that sits below the session header rather
   than the poster-sized one used on the new-conversation screen. The size is
   proportional to the window, so maximizing or restoring the window scales the
   icon with the console instead of leaving a fixed slab in the middle. */
html[data-fairy-skin] body:has(.xz4KEq_root) {
  --fairy-orb-size: clamp(150px, min(19vw, 25vh), 320px);
  /* The header (title row + 对话/轨迹 tabs) is 76px tall by default; start the
     core just under that rule instead of inside it. */
  --fairy-orb-top: 90px;
  /* The chat port starts 72px under the core, so the dissolve happens below
     the icon instead of disappearing behind it. */
  --fairy-chat-top: calc(var(--fairy-orb-size) + 86px);
  --fairy-chat-fade: 88px;
}
/* The band is a margin on the scrollport instead of padding inside the
   scrolled content: the chat engine measures that content and re-anchors the
   view when it is pushed from the inside. With the port itself shortened, the
   engine sees an ordinary, smaller viewport. */
html[data-fairy-skin] body:has(.xz4KEq_root) .Dc7zOa_scrollBody {
  margin-top: var(--fairy-chat-top);
}
/* A veil, not a mask: masking the scrollport made the chat engine re-anchor
   and snap the view back. This layer lives beside the scroller, in the
   conversation body, so scrolling stays untouched while a line dissolves into
   the console as it reaches the core. */
html[data-fairy-skin] body:has(.xz4KEq_root) .Dc7zOa_body::after {
  content: "";
  position: absolute;
  left: 0; right: 0;
  top: calc(var(--fairy-chat-top) - 64px);
  height: calc(var(--fairy-chat-fade) + 64px);
  z-index: 8;
  pointer-events: none;
  background: linear-gradient(180deg,
    rgba(5, 7, 14, 0) 0%,
    rgba(5, 7, 14, .55) 34%,
    rgba(5, 7, 14, .94) 42%,
    rgba(5, 7, 14, .78) 60%,
    rgba(5, 7, 14, .36) 82%,
    rgba(5, 7, 14, 0) 100%);
}
/* The app paints its own DeepSeek fish and headline copy on the new-session
   screen; the console already stands a Fairy core and its own caption in that
   spot. Match readable suffixes so the rules survive the nightly re-hash, and
   let :has() limit the hit to the headline that actually owns the fish — the
   workspace picker beside it stays untouched. */
html[data-fairy-skin] body:has([data-phase="hero"]) [class*="_fishHitbox"],
html[data-fairy-skin] body:has([data-phase="hero"]) [class*="_headline"]:has([class*="_fishHitbox"]) {
  display: none !important;
}
/* The ambient bloom is a single circle painted by .fs-orb-glow. A gradient
   that reaches transparent before its own box edge cannot show a square cut. */
/* One bloom, one circle, no blur filter: the gradient is already soft and
   fades to nothing well inside its own box, so nothing can crop it square. */
.fs-orb-glow {
  position: absolute;
  left: 50%;
  top: calc(var(--fairy-orb-top) + var(--fairy-orb-size) / 2);
  width: calc(var(--fairy-orb-size) * 3);
  height: calc(var(--fairy-orb-size) * 3);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  corner-shape: round;
  background: radial-gradient(circle closest-side,
    rgba(96, 152, 255, .30) 0%,
    rgba(58, 108, 235, .16) 34%,
    rgba(34, 74, 200, .06) 58%,
    transparent 86%);
  pointer-events: none;
}
.fs-hero-orb {
  position: absolute;
  left: 50%; top: var(--fairy-orb-top);
  width: var(--fairy-orb-size); height: var(--fairy-orb-size);
  transform: translateX(-50%);
  filter: drop-shadow(0 0 30px rgba(78, 150, 255, .72));
}

.fs-hero-orb .fs-orb { position: relative; width: 100%; height: 100%; }

/* The same core geometry, stacked into a main layer and two chromatic ghosts.
   Short clipped bursts reproduce the video's scan-tear/RGB-split glitch. */
.fs-core-anim {
  position: relative;
  width: 100%; height: 100%;
  isolation: isolate;
  --fs-glitch-shift: 6px;
}
.fs-core-layer { position: absolute; inset: 0; pointer-events: none; }
.fs-core-layer .fs-orb { width: 100%; height: 100%; }
.fs-core-main {
  z-index: 3;
  animation: fs-core-glitch-main 7.2s steps(1, end) infinite;
}
.fs-core-main .fs-orb { animation: fs-core-breathe 4.8s ease-in-out infinite; }
.fs-core-ghost { z-index: 2; opacity: 0; mix-blend-mode: screen; }
.fs-core-red {
  filter: saturate(1.8) hue-rotate(-45deg) brightness(1.12);
  animation: fs-core-ghost-red 7.2s steps(1, end) infinite;
}
.fs-core-cyan {
  filter: saturate(1.8) hue-rotate(45deg) brightness(1.12);
  animation: fs-core-ghost-cyan 7.2s steps(1, end) infinite;
}
.fs-core-scan {
  position: absolute; inset: -4%;
  z-index: 4;
  pointer-events: none;
  opacity: 0;
  background: repeating-linear-gradient(0deg, rgba(198, 224, 255, .22) 0 1px, transparent 1px 4px);
  mix-blend-mode: screen;
  animation: fs-core-scan 7.2s steps(1, end) infinite;
}
/* Both the hero and the sidebar cell receive the same phase from the
   client-side epoch, so their bursts hit on the same frame. */
.fs-core-main,
.fs-core-red,
.fs-core-cyan,
.fs-core-scan {
  animation-delay: var(--fs-glitch-phase, 0ms);
}
/* The 38px sidebar cell reads as noise if it gets the full-size glitch.
   Keep its timing synced, but use a small shift and no scan overlay. */
.fs-brand-core {
  --fs-glitch-shift: 1.4px;
}
.fs-brand-core .fs-core-scan { display: none; }
@keyframes fs-core-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}
@keyframes fs-core-glitch-main {
  0%, 7%, 12%, 35%, 40%, 63%, 68%, 100% { transform: none; clip-path: none; opacity: 1; }
  8% { transform: translate(calc(var(--fs-glitch-shift) * -1), 0) skewX(1.2deg); clip-path: inset(12% 0 54% 0); }
  8.8% { transform: translate(var(--fs-glitch-shift), -1px); clip-path: inset(37% 0 33% 0); }
  9.6% { transform: translate(calc(var(--fs-glitch-shift) * -.6), 0) skewX(-1deg); clip-path: inset(63% 0 12% 0); }
  10.4% { transform: translate(calc(var(--fs-glitch-shift) * .35), 0); clip-path: inset(80% 0 3% 0); }
  36% { transform: translate(calc(var(--fs-glitch-shift) * -.8), 1px); clip-path: inset(22% 0 42% 0); }
  37.2% { transform: translate(calc(var(--fs-glitch-shift) * .9), 0); clip-path: inset(52% 0 18% 0); }
  38.4% { transform: translate(calc(var(--fs-glitch-shift) * -.4), -1px); clip-path: inset(72% 0 6% 0); }
  64% { transform: translate(calc(var(--fs-glitch-shift) * -.5), 0) skewX(.8deg); clip-path: inset(8% 0 62% 0); }
  65.2% { transform: translate(calc(var(--fs-glitch-shift) * .7), 1px); clip-path: inset(44% 0 26% 0); }
  66.4% { transform: translate(calc(var(--fs-glitch-shift) * -.3), 0); clip-path: inset(68% 0 9% 0); }
}
@keyframes fs-core-ghost-red {
  0%, 7.4%, 11.6%, 35.2%, 40%, 63.2%, 68%, 100% { opacity: 0; transform: none; clip-path: none; }
  8%, 8.8%, 9.6%, 36.2%, 37.4%, 64.4%, 65.6% {
    opacity: .55;
    transform: translate(calc(var(--fs-glitch-shift) * -1.35), 0);
    clip-path: inset(16% 0 48% 0);
  }
  10.4%, 38.6%, 66.8% {
    opacity: .36;
    transform: translate(calc(var(--fs-glitch-shift) * .8), 0);
    clip-path: inset(58% 0 12% 0);
  }
}
@keyframes fs-core-ghost-cyan {
  0%, 7.4%, 11.6%, 35.2%, 40%, 63.2%, 68%, 100% { opacity: 0; transform: none; clip-path: none; }
  8%, 8.8%, 9.6%, 36.2%, 37.4%, 64.4%, 65.6% {
    opacity: .55;
    transform: translate(calc(var(--fs-glitch-shift) * 1.35), 0);
    clip-path: inset(28% 0 38% 0);
  }
  10.4%, 38.6%, 66.8% {
    opacity: .36;
    transform: translate(calc(var(--fs-glitch-shift) * -.8), 0);
    clip-path: inset(68% 0 6% 0);
  }
}
@keyframes fs-core-scan {
  0%, 7%, 12%, 35%, 40%, 63%, 68%, 100% { opacity: 0; }
  8%, 9.6%, 36.2%, 38.4%, 64.4%, 66.4% { opacity: .32; }
  10.4% { opacity: .16; }
}
.fs-hero-copy {
  position: absolute; left: 50%; top: 62%;
  width: min(980px, 86%);
  transform: translate(-50%, -50%);
  text-align: center;
}
/* H.D.D. nameplate: the boot screen sets the line in a heavy, tightly
   tracked grotesque (Segoe UI Black), not the earlier hairline heading.
   The reflection below is part of the mark, so it stays legible. */
.fs-hero-title,
.fs-hero-reflection {
  font-family: var(--fairy-display-font);
  font-size: clamp(34px, 4.3vw, 64px);
  font-weight: 900;
  letter-spacing: .004em;
  line-height: 1;
  white-space: nowrap;
  font-synthesis: none;
}
.fs-hero-title {
  color: #f8fbff;
  text-shadow:
    0 0 30px rgba(92, 142, 255, .36),
    0 0 84px rgba(52, 100, 255, .16),
    0 1px 0 rgba(0, 0, 0, .42);
}
.fs-hero-rule {
  display: flex; align-items: center; gap: 16px;
  margin-top: 11px;
}
.fs-hero-rule span {
  flex: 1; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(178, 204, 255, .50) 9%, rgba(214, 230, 255, .76) 50%, rgba(178, 204, 255, .50) 91%, transparent);
  box-shadow: 0 0 9px rgba(90, 126, 255, .26);
}
.fs-hero-rule em {
  flex: none;
  font-style: normal;
  font-size: 12px; line-height: 1;
  letter-spacing: .5em;
  padding-left: .5em;
  color: rgba(203, 220, 250, .78);
  white-space: nowrap;
  text-shadow: 0 0 12px rgba(82, 122, 255, .22);
}
.fs-hero-reflection {
  position: absolute; left: 0; right: 0; top: 100%;
  margin-top: 5px;
  color: rgba(158, 188, 248, .22);
  transform: scaleY(-1);
  filter: blur(.7px);
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, .92), rgba(0, 0, 0, .48) 30%, transparent 64%);
  -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, .92), rgba(0, 0, 0, .48) 30%, transparent 64%);
}

/* A single small core above an open chat, independent of header slots. */
.fs-chat-orb {
  position: fixed;
  /* Same stage as the hero core: centre of the conversation column, not of
     the window, so the compact chat core tracks the right task panel too. */
  left: calc(
    var(--fairy-stage-left, var(--dsh-sidebar-width, 280px)) +
    (100vw - var(--fairy-stage-left, var(--dsh-sidebar-width, 280px)) - var(--fairy-stage-right, 0px)) / 2
  );
  top: calc(var(--dsh-windows-titlebar-height, 0px) + 8px);
  width: 32px; height: 32px;
  transform: translateX(-50%);
  z-index: 2147482100;
  display: none;
  pointer-events: none;
  filter: drop-shadow(0 0 8px rgba(88, 126, 255, .55));
}
html[data-fairy-skin] body:has(.xz4KEq_root) .fs-chat-orb {
  display: block;
}
.fs-chat-orb .fs-orb { width: 100%; height: 100%; }
.fs-chat-orb .fs-gear,
.fs-chat-orb .fs-iris-spin,
.fs-chat-orb .fs-iris,
.fs-chat-orb .fs-pupil,
.fs-chat-orb .fs-highlight { animation: none !important; }

/* Chat header: icon-only Fairy core, no H.D.D. wordmark. */
.fs-header-orb {
  display: inline-flex;
  width: 24px; height: 24px;
  flex: none;
  align-items: center; justify-content: center;
  align-self: center;
  margin-inline: 2px 4px;
  pointer-events: none;
  filter: drop-shadow(0 0 6px rgba(88, 126, 255, .48));
}
.fs-header-orb .fs-orb { width: 100%; height: 100%; }
.fs-header-orb .fs-gear,
.fs-header-orb .fs-iris-spin,
.fs-header-orb .fs-iris,
.fs-header-orb .fs-pupil,
.fs-header-orb .fs-highlight { animation: none !important; }
@keyframes fs-aura {
  0%, 100% { opacity: .72; transform: scale(.97); }
  50% { opacity: 1; transform: scale(1.04); }
}
@keyframes fs-halo {
  0%, 100% { opacity: .8; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.03); }
}
@keyframes fs-core {
  0%, 100% { opacity: .92; }
  50% { opacity: 1; }
}
@keyframes fs-sweep {
  0% { transform: rotate(0); opacity: 0; }
  8% { opacity: .4; }
  68% { opacity: .18; }
  92%, 100% { opacity: 0; }
}
@keyframes fs-orbit { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes fs-gear-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes fs-iris-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes fs-iris-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .85; transform: scale(1.04); }
}
@keyframes fs-pupil-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
@keyframes fs-highlight-twinkle {
  0%, 100% { opacity: .9; }
  50% { opacity: 1; }
}
@keyframes fs-highlight-jump {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(4px, 4px); }
}


@media (max-height: 820px) and (min-width: 861px) {
  .fs-hero-copy { top: 60%; }
  .fs-hero-title,
  .fs-hero-reflection { font-size: clamp(30px, 3.7vw, 52px); }
  .fs-hero-reflection { mask-image: linear-gradient(to bottom, rgba(0, 0, 0, .9), rgba(0, 0, 0, .42) 26%, transparent 58%); -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, .9), rgba(0, 0, 0, .42) 26%, transparent 58%); }
}
@media (max-width: 860px) {
  :root[data-fairy-skin] { --fairy-orb-size: 120px; --fairy-orb-top: 38px; }
  .fs-hero-copy { top: 60%; width: 94%; }
  .fs-hero-title,
  .fs-hero-reflection { font-size: clamp(22px, 4.6vw, 34px); }
  .fs-hero-rule { margin-top: 8px; gap: 10px; }
  .fs-hero-rule em { font-size: 9px; letter-spacing: .34em; padding-left: .34em; }
  .fs-hero-reflection { mask-image: linear-gradient(to bottom, rgba(0, 0, 0, .9), rgba(0, 0, 0, .4) 28%, transparent 60%); -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, .9), rgba(0, 0, 0, .4) 28%, transparent 60%); }
}
@media (prefers-reduced-motion: reduce) {
  .fs-aura, .fs-orb .fs-gear, .fs-orb .fs-iris-spin,
  .fs-orb .fs-iris, .fs-orb .fs-pupil, .fs-orb .fs-highlight, .fs-orb .fs-lid,
  .fs-halo::before, .fs-halo::after {
    animation: none !important;
  }
  .fs-cinema { transition-duration: 1ms !important; }
}
`

    /* ------------------------------------------------------------------
     * Every paint rule below is addressed by a compiled CSS-module class
     * name, and DSH re-hashes those on each release: 0.2.1-rc.2 shipped
     * ._2H3hWW_brandMark, 0.2.1-rc.3 ships .wtg9ga_brandMark. Rather than
     * bumping forty selectors by hand per update, resolve them at runtime:
     * read the live class inventory, match on the readable name suffix,
     * and vote by package so common names (root/header/column) stay in the
     * package they came from. Unresolvable selectors are left alone, which
     * only costs that one rule instead of the whole skin.
     * ------------------------------------------------------------------ */
    /* Six characters, optionally with the dash some builders emit: mP3x-q_frame. */
    const HASHED = /^[A-Za-z0-9-]{6}$/
    const SELECTOR_CLASS = /\._?([A-Za-z0-9-]{6})_([A-Za-z][A-Za-z0-9]*)/g
    const CLASS_TOKEN = /^([A-Za-z0-9-]{6})_([A-Za-z][A-Za-z0-9]*)$/
    const CLASS_TOKEN_INVERTED = /^_([A-Za-z][A-Za-z0-9]*)_([A-Za-z0-9]{4,10})_(\d+)$/
    /* A compiled prefix mixes letter case or letter and digit; plain words do not. */
    const isHashed = (prefix) => HASHED.test(prefix)
      && ((/[A-Z]/.test(prefix) && /[a-z]/.test(prefix)) || (/[0-9]/.test(prefix) && /[A-Za-z]/.test(prefix)))

    function splitToken(token) {
      const forward = CLASS_TOKEN.exec(token)
      if (forward !== null) return { prefix: forward[1], name: forward[2] }
      const inverted = CLASS_TOKEN_INVERTED.exec(token)
      if (inverted !== null) return { prefix: '', name: inverted[1] }
      return null
    }

    /* Every class the running app actually ships, read from its stylesheets. */
    function liveClassTokens() {
      const tokens = new Set()
      const visit = (rules) => {
        for (const rule of rules) {
          if (typeof rule.selectorText === 'string') {
            for (const match of rule.selectorText.matchAll(/\.(-?[_A-Za-z][_A-Za-z0-9-]*)/g)) tokens.add(match[1])
          }
          else if (rule.cssRules !== undefined) {
            try { visit(rule.cssRules) }
            catch { /* unreadable group */ }
          }
        }
      }
      for (const sheet of document.styleSheets) {
        try { visit(sheet.cssRules) }
        catch { /* cross-origin sheet */ }
      }
      if (tokens.size === 0) {
        for (const node of document.querySelectorAll('[class]')) for (const value of node.classList) tokens.add(value)
      }
      return tokens
    }

    function indexClasses(tokens) {
      const byName = new Map()
      for (const token of tokens) {
        const parts = splitToken(token)
        if (parts === null) continue
        let bucket = byName.get(parts.name)
        if (bucket === undefined) byName.set(parts.name, bucket = new Set())
        bucket.add(token)
      }
      return byName
    }

    function legacyGroups(css) {
      const groups = new Map()
      for (const match of css.matchAll(SELECTOR_CLASS)) {
        const prefix = match[1]
        if (!isHashed(prefix)) continue
        let bucket = groups.get(prefix)
        if (bucket === undefined) groups.set(prefix, bucket = new Set())
        bucket.add(match[2])
      }
      return groups
    }

    /* Current prefixes ranked by how many of this old package's names they host. */
    function rankedPrefixes(byName, groups, prefix) {
      const members = groups.get(prefix)
      if (members === undefined) return []
      const scores = new Map()
      for (const member of members) {
        const candidates = byName.get(member)
        if (candidates === undefined) continue
        for (const token of candidates) {
          const parts = splitToken(token)
          if (parts === null || parts.prefix === '') continue
          scores.set(parts.prefix, (scores.get(parts.prefix) ?? 0) + 1)
        }
      }
      return [...scores.entries()].sort((left, right) => right[1] - left[1]).map(([candidate]) => candidate)
    }

    function resolveClass(byName, groups, prefix, name) {
      const candidates = byName.get(name)
      if (candidates === undefined || candidates.size === 0) return null
      if (candidates.size === 1) return [...candidates][0]
      /*
       * Walk the package ranking instead of the single best prefix: a
       * package can be split across bundles (rc.3 moved the session rows
       * out of the rail), and a name that the top prefix no longer owns
       * usually belongs to the next one down.
       */
      for (const candidate of rankedPrefixes(byName, groups, prefix)) {
        for (const token of candidates) if (token.startsWith(candidate + '_')) return token
      }
      if (candidates.size > 4) return null
      return [...candidates][0]
    }

    function rewriteCss(css, byName, groups) {
      const body = css.replace(SELECTOR_CLASS, (match, prefix, name) => {
        if (!isHashed(prefix)) return match
        const token = resolveClass(byName, groups, prefix, name)
        return token === null ? match : '.' + token
      })
      /*
       * Fallback only: layout's frame and sidebar column usually resolve by
       * name, but if a release renames them the shell still paints.
       */
      const sidebarRoot = resolveClass(byName, groups, '2H3hWW', 'root')
      return body
        .replace(/\.BynINW_frame\b/g, ':is([data-slot="root"], #root)')
        .replace(/\.BynINW_sidebarCol\b/g, sidebarRoot === null ? '.fs-unmapped-sidebar-col' : '.' + sidebarRoot)
    }

    let skinIndex = { byName: new Map(), groups: new Map() }

    function refreshSkinIndex() {
      skinIndex = { byName: indexClasses(liveClassTokens()), groups: legacyGroups(CSS) }
      return skinIndex
    }

    function skinNode(prefix, name) {
      const token = resolveClass(skinIndex.byName, skinIndex.groups, prefix, name)
      if (token !== null) {
        const node = document.querySelector('.' + token)
        if (node !== null) return node
      }
      for (const node of document.querySelectorAll('[class]')) {
        for (const value of node.classList) if (value.endsWith('_' + name)) return node
      }
      return null
    }

    function skinNodes(prefix, name) {
      const token = resolveClass(skinIndex.byName, skinIndex.groups, prefix, name)
      return token === null ? [] : Array.from(document.querySelectorAll('.' + token))
    }

    /*
     * Fairy core geometry adapted from MaxiumZero/TZFairy (local personal use).
     * 600×600: blue/white outer eye, toothed gear ring, layered iris, dark pupil
     * and the offset highlight. The gear and iris rotate; the pupil and highlight
     * breathe, matching the reference instead of the earlier generic ring.
     */
    const FAIRY_SVG = h(
      'svg',
      {
        className: 'fs-orb',
        viewBox: '0 0 600 600',
        xmlns: 'http://www.w3.org/2000/svg',
        'aria-hidden': 'true',
        focusable: 'false',
        shapeRendering: 'geometricPrecision',
      },
      h(
        'defs',
        null,
        h(
          'filter',
          { id: 'fairyCoreGlow', x: '-30%', y: '-30%', width: '160%', height: '160%' },
          h('feGaussianBlur', { stdDeviation: '10', result: 'blur' }),
          h('feComposite', { in: 'SourceGraphic', in2: 'blur', operator: 'over' }),
        ),
        h('clipPath', { id: 'fairyEyeClip' }, h('circle', { cx: '300', cy: '300', r: '180' })),
      ),
      h('circle', {
        className: 'fs-core-base',
        cx: '300',
        cy: '300',
        r: '270',
        fill: '#3978ed',
        opacity: '0.35',
      }),
      h(
        'g',
        { className: 'fs-gear' },
        h('circle', { cx: '300', cy: '300', r: '220', fill: '#193499' }),
        h('path', {
          d: 'M 300 50 L 338 105 L 262 105 Z M 550 300 L 495 338 L 495 262 Z M 300 550 L 262 495 L 338 495 Z M 50 300 L 105 262 L 105 338 Z',
          fill: '#193499',
        }),
      ),
      h('circle', {
        className: 'fs-ring-blue',
        cx: '300',
        cy: '300',
        r: '266',
        fill: 'none',
        stroke: '#3978ed',
        strokeWidth: '14',
      }),
      h('circle', {
        className: 'fs-ring-white',
        cx: '300',
        cy: '300',
        r: '266',
        fill: 'none',
        stroke: '#ffffff',
        strokeWidth: '6',
      }),
      h('circle', { cx: '300', cy: '300', r: '180', fill: '#ffffff' }),
      h('circle', { cx: '300', cy: '300', r: '132', fill: '#b4c4ee' }),
      h(
        'g',
        { className: 'fs-iris-spin' },
        h('circle', {
          className: 'fs-iris',
          cx: '300',
          cy: '300',
          r: '96',
          fill: '#4285e8',
        }),
      ),
      h('circle', {
        className: 'fs-pupil',
        cx: '300',
        cy: '300',
        r: '60',
        fill: '#173082',
      }),
      h('circle', {
        className: 'fs-highlight',
        cx: '372',
        cy: '372',
        r: '42',
        fill: '#ffffff',
        filter: 'url(#fairyCoreGlow)',
      }),
      h(
        'g',
        { clipPath: 'url(#fairyEyeClip)' },
        h(
          'g',
          { className: 'fs-lid', transform: 'translate(0 -380)' },
          h('path', { d: 'M 110 104 H 490 V 296 Q 402 346 300 330 Q 198 346 110 296 Z', fill: '#193499' }),
        ),
      ),
    )

    /*
     * The sidebar cell belongs to the official brand slot, so the core is
     * painted into that cell instead of registered as a second occupant. The
     * gear, iris and pupil keep the same animations as the hero orb.
     */
    const BRAND_ORB_SVG = '<svg class="fs-orb" viewBox="0 0 600 600" focusable="false" shape-rendering="geometricPrecision"><defs><clipPath id="fairyEyeClip"><circle cx="300" cy="300" r="180"></circle></clipPath></defs><circle cx="300" cy="300" r="270" fill="#3978ed" opacity="0.35"></circle><g class="fs-gear"><circle cx="300" cy="300" r="220" fill="#193499"></circle><path d="M 300 50 L 338 105 L 262 105 Z M 550 300 L 495 338 L 495 262 Z M 300 550 L 262 495 L 338 495 Z M 50 300 L 105 262 L 105 338 Z" fill="#193499"></path></g><circle cx="300" cy="300" r="266" fill="none" stroke="#3978ed" stroke-width="14"></circle><circle cx="300" cy="300" r="266" fill="none" stroke="#ffffff" stroke-width="6"></circle><circle cx="300" cy="300" r="180" fill="#ffffff"></circle><circle cx="300" cy="300" r="132" fill="#b4c4ee"></circle><g class="fs-iris-spin"><circle class="fs-iris" cx="300" cy="300" r="96" fill="#4285e8"></circle></g><circle class="fs-pupil" cx="300" cy="300" r="60" fill="#173082"></circle><circle class="fs-highlight" cx="372" cy="372" r="42" fill="#ffffff"></circle><g clip-path="url(#fairyEyeClip)"><g class="fs-lid" transform="translate(0 -380)"><path d="M 110 104 H 490 V 296 Q 402 346 300 330 Q 198 346 110 296 Z" fill="#193499"></path></g></g></svg>'

    const BRAND_ORB_LAYERS = '<span class="fs-core-anim fs-brand-core">'
      + '<span class="fs-core-layer fs-core-ghost fs-core-red">' + BRAND_ORB_SVG + '</span>'
      + '<span class="fs-core-layer fs-core-ghost fs-core-cyan">' + BRAND_ORB_SVG + '</span>'
      + '<span class="fs-core-layer fs-core-main">' + BRAND_ORB_SVG + '</span>'
      + '</span>'

    function paintBrandCore() {
      const mark = skinNode('2H3hWW', 'brandMark')
      if (mark === null || mark.querySelector(':scope > .fs-brand-live') !== null) return
      const live = document.createElement('span')
      live.className = 'fs-brand-live'
      live.setAttribute('aria-hidden', 'true')
      live.innerHTML = BRAND_ORB_SVG
      mark.classList.add('has-live-core')
      mark.appendChild(live)
    }

    function FairyBrandMark({ size }) {
      const edge = Math.max(18, Math.min(Number(size) || 28, 34))
      return h(
        'span',
        {
          className: 'fs-brand-mark',
          style: { width: `${edge}px`, height: `${edge}px` },
          'aria-hidden': 'true',
        },
        FAIRY_SVG,
      )
    }

    function FairyBrandName({ t }) {
      return h(
        'span',
        { className: 'fs-brand-copy' },
        h('span', { className: 'fs-brand-title' }, 'Fairy'),
        h('span', { className: 'fs-brand-tag' }, t('brandTag')),
      )
    }

    function FairyCoreAnimated() {
      const phase = React.useRef(null)
      if (phase.current === null) phase.current = coreGlitchPhase()
      return h(
        'div',
        {
          className: 'fs-core-anim',
          'aria-hidden': 'true',
          style: { '--fs-glitch-phase': phase.current },
        },
        h('div', { className: 'fs-core-layer fs-core-ghost fs-core-red' }, FAIRY_SVG),
        h('div', { className: 'fs-core-layer fs-core-ghost fs-core-cyan' }, FAIRY_SVG),
        h('div', { className: 'fs-core-layer fs-core-main' }, FAIRY_SVG),
        h('div', { className: 'fs-core-scan' }),
      )
    }

    function FairyHero({ t }) {
      return h(
        'div',
        { className: 'fs-hero', 'aria-hidden': 'true' },
        h('div', { className: 'fs-orb-glow', 'aria-hidden': 'true' }),
        h('div', { className: 'fs-halo', 'aria-hidden': 'true' }),
        h(
          'div',
          { className: 'fs-hero-orb' },
          h(FairyCoreAnimated),
        ),
        h(
          'div',
          { className: 'fs-hero-copy' },
          h('div', { className: 'fs-hero-title' }, 'HOLLOW DEEP DIVE SYSTEM'),
          h(
            'div',
            { className: 'fs-hero-rule' },
            h('span'),
            h('em', null, t('heroSubtitle')),
            h('span'),
          ),
          h('div', { className: 'fs-hero-reflection' }, 'HOLLOW DEEP DIVE SYSTEM'),
        ),
      )
    }

    function FairyHeaderOrb() {
      return h(
        'span',
        {
          className: 'fs-header-orb',
          role: 'img',
          'aria-label': 'Fairy',
          title: 'Fairy',
        },
        FAIRY_SVG,
      )
    }

    function FairyChatOrb() {
      return h(
        'div',
        { className: 'fs-chat-orb', 'aria-hidden': 'true' },
        FAIRY_SVG,
      )
    }

    function FairySplash({ t, locale }) {
      const videoRef = React.useRef(null)
      const started = React.useRef(false)
      const timers = React.useRef([])
      const [phase, setPhase] = React.useState(SPLASH_ON_LAUNCH ? 'boot' : 'done')
      const [videoMounted, setVideoMounted] = React.useState(SPLASH_ON_LAUNCH)
      const [videoLeaving, setVideoLeaving] = React.useState(false)
      const [controlsReady, setControlsReady] = React.useState(false)
      const [muted, setMuted] = React.useState(false)
      const [soundBlocked, setSoundBlocked] = React.useState(false)
      const [replayToken, setReplayToken] = React.useState(0)
      const [, setLocaleRevision] = React.useState(0)
      const splashOver = phase === 'done'

      /*
       * The Windows caption buttons are native chrome painted by Electron, not
       * DOM. Their colors come from the Desktop preload, which measures these
       * two custom properties on <body> and forwards them over the
       * dsh-desktop:windows-appearance IPC. Override them for the splash so the
       * caption bar and the three buttons become transparent over the video,
       * then restore the exact prior inline values so the app keeps its own
       * theme afterwards.
       */
      React.useLayoutEffect(() => {
        if (splashOver) return undefined
        const body = document.body
        const read = (name) => ({
          value: body.style.getPropertyValue(name),
          priority: body.style.getPropertyPriority(name),
        })
        const previousFill = read('--dsw-specific-sidebar-fill')
        const previousLabel = read('--dsw-alias-label-primary')
        const previousSecondary = read('--dsw-alias-label-secondary')
        const root = document.documentElement
        root.setAttribute('data-fairy-splash-caption', '')
        body.style.setProperty('--dsw-specific-sidebar-fill', 'transparent', 'important')
        body.style.setProperty('--dsw-alias-label-primary', '#eaf1ff', 'important')
        body.style.setProperty('--dsw-alias-label-secondary', '#c7d6ff', 'important')
        return () => {
          root.removeAttribute('data-fairy-splash-caption')
          if (previousFill.value) body.style.setProperty('--dsw-specific-sidebar-fill', previousFill.value, previousFill.priority)
          else body.style.removeProperty('--dsw-specific-sidebar-fill')
          if (previousLabel.value) body.style.setProperty('--dsw-alias-label-primary', previousLabel.value, previousLabel.priority)
          else body.style.removeProperty('--dsw-alias-label-primary')
          if (previousSecondary.value) body.style.setProperty('--dsw-alias-label-secondary', previousSecondary.value, previousSecondary.priority)
          else body.style.removeProperty('--dsw-alias-label-secondary')
        }
      }, [splashOver])

      React.useEffect(() => {
        if (!locale || typeof locale.subscribe !== 'function') return undefined
        return locale.subscribe(() => setLocaleRevision((value) => value + 1))
      }, [locale])

      const later = React.useCallback((fn, delay) => {
        const id = window.setTimeout(fn, delay)
        timers.current.push(id)
        return id
      }, [])

      /*
       * The film ends straight into the console: the intro choreography
       * (backdrop, greeting card, docking orb) is gone, so this only fades the
       * video out and unmounts it. The fade is deliberately short — 280ms in
       * CSS — so the black overlay does not linger over the ready console.
       */
      const finishBoot = React.useCallback(() => {
        if (started.current) return
        started.current = true
        setVideoLeaving(true)
        later(() => {
          setVideoMounted(false)
          setPhase('done')
        }, 300)
      }, [later])

      React.useEffect(() => () => {
        for (const id of timers.current) window.clearTimeout(id)
        timers.current = []
      }, [])

      React.useEffect(() => {
        const root = document.documentElement
        if (phase === 'done') root.setAttribute('data-fairy-splash-done', '')
        else root.removeAttribute('data-fairy-splash-done')
        return () => root.removeAttribute('data-fairy-splash-done')
      }, [phase])

      React.useEffect(() => {
        if (!SPLASH_ENABLED) return undefined
        const replay = () => {
          for (const id of timers.current) window.clearTimeout(id)
          timers.current = []
          started.current = false
          setPhase('boot')
          setVideoMounted(true)
          setVideoLeaving(false)
          setControlsReady(false)
          setMuted(false)
          setSoundBlocked(false)
          setReplayToken((value) => value + 1)
        }
        window.addEventListener('fairy-splash:replay', replay)
        return () => window.removeEventListener('fairy-splash:replay', replay)
      }, [])

      React.useEffect(() => {
        if (phase !== 'boot') return undefined
        const onKey = (event) => {
          if (event.key === 'Escape') finishBoot()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [phase, finishBoot])

      React.useEffect(() => {
        if (!videoMounted) return undefined
        const video = videoRef.current
        if (!video) return undefined
        let disposed = false

        const controlsTimer = window.setTimeout(() => setControlsReady(true), 850)
        const watchdog = window.setTimeout(() => {
          if (!disposed) finishBoot()
        }, 30000)

        const onEnded = () => finishBoot()
        const onError = () => finishBoot()
        video.addEventListener('ended', onEnded)
        video.addEventListener('error', onError)

        const play = async () => {
          video.volume = 0.9
          try {
            await video.play()
          }
          catch {
            if (disposed) return
            video.muted = true
            setMuted(true)
            setSoundBlocked(true)
            try {
              await video.play()
            }
            catch {
              if (!disposed) finishBoot()
            }
          }
        }
        play()

        return () => {
          disposed = true
          window.clearTimeout(controlsTimer)
          window.clearTimeout(watchdog)
          video.removeEventListener('ended', onEnded)
          video.removeEventListener('error', onError)
          video.pause()
        }
      }, [videoMounted, finishBoot, replayToken])

      const enableSound = () => {
        const video = videoRef.current
        if (!video) return
        video.muted = false
        video.volume = 0.9
        setMuted(false)
        setSoundBlocked(false)
        const played = video.play()
        if (played && typeof played.catch === 'function') {
          played.catch(() => {
            video.muted = true
            setMuted(true)
            setSoundBlocked(true)
          })
        }
      }

      return h(
        'div',
        { className: 'fs-root' },
        videoMounted && h(
          'div',
          { className: 'fs-cinema' + (videoLeaving ? ' is-leaving' : '') },
          h(
            'video',
            {
              key: replayToken,
              ref: videoRef,
              src: VIDEO_URL,
              poster: POSTER_URL,
              preload: 'auto',
              playsInline: true,
              autoPlay: true,
              muted: muted,
              'aria-label': t('videoLabel'),
            },
          ),
          h(
            'div',
            { className: 'fs-controls' + (controlsReady ? ' is-ready' : '') },
            soundBlocked && !videoLeaving && h(
              'button',
              { type: 'button', className: 'fs-btn', onClick: enableSound },
              t('sound'),
            ),
            !videoLeaving && h(
              'button',
              { type: 'button', className: 'fs-btn', onClick: finishBoot },
              t('skip'),
            ),
          ),
        ),

        h(FairyHero, { t }),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        let locale
        try { locale = ctx.get ? ctx.get('locale') : undefined } catch { locale = undefined }
        try {
        /*
         * A throwing effect takes the whole plugin down, and a failed client
         * entry aborts the web boot — a blank window instead of a lost skin.
         * Contain every effect so a future host change costs that one feature
         * and nothing else.
         */
        const effect = (fn, label) => ctx.effect(() => {
          try {
            return fn()
          }
          catch (error) {
            console.warn('[fairy-splash] ' + label + ' failed', error)
          }
        }, label)

        effect(() => {
          const style = document.createElement('style')
          style.setAttribute('data-fairy-splash', '')
          let applied = ''
          const paint = () => {
            refreshSkinIndex()
            const next = rewriteCss(CSS, skinIndex.byName, skinIndex.groups)
            if (next === applied) return
            applied = next
            style.textContent = next
          }
          paint()
          document.head.appendChild(style)
          const timer = window.setInterval(paint, 1500)
          return () => {
            window.clearInterval(timer)
            style.remove()
          }
        }, 'fairy-splash: skin stylesheet')

        effect(
          () => locale && locale.register('fairy-splash', {
            zh: {
              greetingMorning: '早安，主人。H.D.D. 系统已就绪，Fairy 随时听你差遣。',
              greetingNoon: '午安，主人。H.D.D. 系统已就绪，Fairy 随时听你差遣。',
              greetingAfternoon: '下午好，主人。H.D.D. 系统已就绪，Fairy 随时听你差遣。',
              greetingEvening: '晚上好，主人。H.D.D. 系统已就绪，Fairy 随时听你差遣。',
              online: '在线',
              sound: '开启声音',
              skip: '跳过',
              videoLabel: 'H.D.D. 开机动画',
              ariaFairy: 'Fairy 已上线，正在进入 H.D.D. 核心',
              brandTag: '空洞深潜系统',
              heroSubtitle: '空 洞 深 潜 系 统',
              replay: '重播开屏动画',
            },
            en: {
              greetingMorning: 'Good morning, Master. H.D.D. is online — Fairy is at your service.',
              greetingNoon: 'Good afternoon, Master. H.D.D. is online — Fairy is at your service.',
              greetingAfternoon: 'Good afternoon, Master. H.D.D. is online — Fairy is at your service.',
              greetingEvening: 'Good evening, Master. H.D.D. is online — Fairy is at your service.',
              online: 'Online',
              sound: 'Sound',
              skip: 'Skip',
              videoLabel: 'H.D.D. boot animation',
              ariaFairy: 'Fairy is online and entering the H.D.D. core',
              brandTag: 'HOLLOW DEEP DIVE',
              heroSubtitle: 'HOLLOW DEEP DIVE SYSTEM',
              replay: 'Replay boot animation',
            },
          }),
          'fairy-splash: copy',
        )

        const t = locale ? locale.bind('fairy-splash') : ((key) => key)

        effect(() => {
          if (!document.body) return undefined
          const root = document.documentElement
          const body = document.body
          const hadDark = body.hasAttribute('data-ds-dark-theme')
          root.setAttribute('data-fairy-skin', '')
          body.setAttribute('data-ds-dark-theme', '')
          const keepDark = new MutationObserver(() => {
            if (!body.hasAttribute('data-ds-dark-theme')) body.setAttribute('data-ds-dark-theme', '')
          })
          keepDark.observe(body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
          return () => {
            keepDark.disconnect()
            root.removeAttribute('data-fairy-skin')
            if (!hadDark) body.removeAttribute('data-ds-dark-theme')
          }
        }, 'fairy-splash: dark H.D.D. skin')

        effect(() => {
          // One crisp SVG in the shell's brand cell; only its gear and iris
          // rotate. No glitch layers, no RGB ghosts, no scanlines.
          let observer
          let watched
          const paint = () => {
            paintBrandCore()
            const mark = skinNode('2H3hWW', 'brandMark')
            if (mark === null || mark === watched) return
            observer?.disconnect()
            watched = mark
            observer = new MutationObserver(() => paintBrandCore())
            observer.observe(mark, { childList: true })
          }
          paint()
          const timer = window.setInterval(paint, 900)
          return () => {
            window.clearInterval(timer)
            observer?.disconnect()
            observer = undefined
            watched = undefined
            for (const node of document.querySelectorAll('.fs-brand-live')) node.remove()
            for (const mark of skinNodes('2H3hWW', 'brandMark')) mark.classList.remove('has-live-core')
          }
        }, 'fairy-splash: rotating brand')

        effect(() => {
          // Align the workspace list's right edge to the New Session button's
          // right edge at runtime. The sidebar nests the two in different
          // containers, so a fixed margin drifts when the window is resized.
          let raf = 0
          let observer
          let buttonObserver
          let button
          const align = () => {
            const nextButton = skinNode('2H3hWW', 'newSession')
            const list = skinNode('9lTDKa', 'listArea')
            if (nextButton === null || list === null) return
            if (nextButton !== button) {
              buttonObserver?.disconnect()
              button = nextButton
              buttonObserver = new ResizeObserver(schedule)
              buttonObserver.observe(button)
            }
            const target = button.getBoundingClientRect()
            const current = list.getBoundingClientRect()
            if (target.width < 80 || current.width < 80) return
            const delta = current.right - target.right
            if (Math.abs(delta) < 0.5) return
            const margin = Number.parseFloat(list.style.getPropertyValue('margin-right')) || 0
            list.style.setProperty('margin-right', `${margin + delta}px`, 'important')
          }
          const schedule = () => {
            window.cancelAnimationFrame(raf)
            raf = window.requestAnimationFrame(align)
          }
          schedule()
          const sidebar = skinNode('2H3hWW', 'root')
          observer = new ResizeObserver(schedule)
          if (sidebar !== null) observer.observe(sidebar)
          window.addEventListener('resize', schedule)
          const timer = window.setInterval(schedule, 1200)
          return () => {
            window.clearInterval(timer)
            window.cancelAnimationFrame(raf)
            window.removeEventListener('resize', schedule)
            observer?.disconnect()
            buttonObserver?.disconnect()
            for (const list of skinNodes('9lTDKa', 'listArea')) list.style.removeProperty('margin-right')
          }
        }, 'fairy-splash: align workspace to new session')

        effect(
          () => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
            name: 'shell.overlay',
            id: 'fairy-splash',
            order: 80,
          }, (props) => h(FairySplash, { ...props, t, locale }))),
          'fairy-splash: overlay',
        )


        // The sidebar brand is replaced visually through the scoped skin CSS:
        // the single-slot brand entries are owned by the shell and cannot be
        // re-registered safely from a bundle, so an additive attempt would
        // abort the whole plugin. CSS keeps the shell's own structure intact.
        }
        catch (error) {
          console.error('[fairy-splash] apply failed', error)
        }
      },
    }
    }
    catch (error) {
      console.error('[fairy-splash] factory failed', error)
      return { inject: [], apply() {} }
    }
  },
})
