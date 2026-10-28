window.__ModuleLoader__.load({
  id: 'dsh-fairy-voice',
  factory(require) {
    try {
    const React = require('react')
    const h = React.createElement

    const STATUS_URL = '/fairy-voice/status'
    const SAY_URL = '/fairy-voice/say'
    const STORAGE_AUTO = 'dsh.fairyVoice.autoRead.v1'
    const MAX_CHUNK = 70
    const MAX_FIRST_CHUNK = 24
    const SETTLE_MS = 1100
    const TICK = String.fromCharCode(96)

    const BUTTON_STYLE = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '24px',
      height: '24px',
      padding: '0',
      border: 'none',
      background: 'transparent',
      color: 'inherit',
      opacity: '0.72',
      cursor: 'pointer',
      borderRadius: '6px',
    }

    function readAutoRead() {
      try {
        return window.localStorage.getItem(STORAGE_AUTO) !== '0'
      }
      catch (error) {
        return true
      }
    }

    function writeAutoRead(value) {
      try {
        window.localStorage.setItem(STORAGE_AUTO, value ? '1' : '0')
      }
      catch (error) {
        /* storage may be unavailable */
      }
    }

    const STORAGE_VOLUME = 'dsh.fairyVoice.volume.v1'

    function readVolume() {
      try {
        const raw = Number(window.localStorage.getItem(STORAGE_VOLUME))
        if (!Number.isFinite(raw)) return 1
        return Math.min(1, Math.max(0, raw))
      }
      catch (error) {
        return 1
      }
    }

    function writeVolume(value) {
      try {
        window.localStorage.setItem(STORAGE_VOLUME, String(value))
      }
      catch (error) {
        /* storage may be unavailable */
      }
    }

    let volume = readVolume()

    const STORAGE_ON = 'dsh.fairyVoice.enabled.v1'

    function readVoiceOn() {
      try {
        return window.localStorage.getItem(STORAGE_ON) !== '0'
      }
      catch (error) {
        return true
      }
    }

    function writeVoiceOn(value) {
      try {
        window.localStorage.setItem(STORAGE_ON, value ? '1' : '0')
      }
      catch (error) {
        /* storage may be unavailable */
      }
    }

    let voiceEnabled = readVoiceOn()

    let statusCache = { at: 0, value: { ready: false, starting: false } }

    async function readStatus(force) {
      const now = Date.now()
      if (!force && now - statusCache.at < 8000) return statusCache.value
      try {
        const response = await fetch(STATUS_URL, { cache: 'no-store' })
        if (!response.ok) throw new Error('status-' + response.status)
        const value = await response.json()
        statusCache = { at: now, value }
        return value
      }
      catch (error) {
        statusCache = { at: now, value: { ready: false, starting: false, offline: true } }
        return statusCache.value
      }
    }

    const INLINE_CODE = new RegExp(TICK + '[^' + TICK + ']*' + TICK, 'g')
    const FENCED_CODE = new RegExp(TICK + TICK + TICK + '[\\s\\S]*?' + TICK + TICK + TICK, 'g')

    function stripMarkdown(source) {
      let text = String(source || '')
      text = text.replace(FENCED_CODE, ' ')
      text = text.replace(INLINE_CODE, ' ')
      text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      text = text.replace(/https?:\/\/\S+/g, ' ')
      text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '')
      text = text.replace(/^\s{0,3}>\s?/gm, '')
      text = text.replace(/^\s{0,3}[-*+]\s+/gm, '')
      text = text.replace(/^\s{0,3}\d+[.)]\s+/gm, '')
      text = text.replace(/^\s*\|.*\|\s*$/gm, ' ')
      text = text.replace(/[*_~#]+/g, '')
      text = text.replace(/[ \t]+/g, ' ')
      text = text.replace(/\n{3,}/g, '\n\n')
      return text.trim()
    }

    function sentenceChunks(text) {
      const cleaned = stripMarkdown(text).replace(/\s+/g, ' ')
      if (cleaned.length === 0) return []
      const parts = cleaned.split(/(?<=[。！？!?；;…])/u)
      const chunks = []
      let current = ''
      for (const part of parts) {
        const piece = part.trim()
        if (piece.length === 0) continue
        const limit = chunks.length === 0 ? MAX_FIRST_CHUNK : MAX_CHUNK
        if (current.length + piece.length > limit && current.length > 0) {
          chunks.push(current)
          current = ''
        }
        const nextLimit = chunks.length === 0 ? MAX_FIRST_CHUNK : MAX_CHUNK
        if (piece.length > nextLimit) {
          let rest = piece
          while (rest.length > nextLimit) {
            let cut = rest.lastIndexOf('，', nextLimit)
            if (cut < nextLimit / 2) cut = nextLimit
            chunks.push(rest.slice(0, cut + 1))
            rest = rest.slice(cut + 1)
          }
          current = rest
        }
        else {
          current += piece
        }
      }
      if (current.trim().length > 0) chunks.push(current)
      return chunks.filter((chunk) => chunk.trim().length > 0)
    }

    function cleanNodeText(node) {
      try {
        const clone = node.cloneNode(true)
        for (const junk of clone.querySelectorAll('button, svg, style, script, [aria-hidden="true"]')) junk.remove()
        const value = typeof clone.innerText === 'string' && clone.innerText.length > 0
          ? clone.innerText
          : (clone.textContent || '')
        return value.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
      }
      catch (error) {
        return ''
      }
    }

    const isReplyNode = (node) => {
      if (node === null) return false
      const kind = node.getAttribute('data-chat-flow-kind')
      const part = node.getAttribute('data-chat-group-part')
      return kind === 'assistant-step' || part === 'response' || part === 'assistant'
    }

    /*
     * The action row is mounted inside the assistant message in rc.3, so the
     * old sibling walk started one element too late and always came back empty
     * — the play button then did nothing. Read the node that owns the button
     * first, then walk back, then fall back to document order.
     */
    function speechTextFrom(anchor) {
      if (!anchor) return ''
      const owner = anchor.closest('[data-chat-flow-kind], [data-chat-group-part]')
      if (isReplyNode(owner)) {
        const own = cleanNodeText(owner)
        if (own.length > 0) return own
      }

      const tail = anchor.closest('[data-turn-tail]')
      const wrapper = tail !== null ? tail.parentElement : owner
      let node = wrapper === null ? null : wrapper.previousElementSibling
      let guard = 0
      while (node !== null && guard < 400) {
        guard += 1
        const kind = node.getAttribute('data-chat-flow-kind')
        const part = node.getAttribute('data-chat-group-part')
        if (kind === 'user' || kind === 'user-message' || part === 'user') break
        if (isReplyNode(node)) {
          const text = cleanNodeText(node)
          if (text.length > 0) return text
        }
        node = node.previousElementSibling
      }

      const steps = Array.from(document.querySelectorAll('[data-chat-flow-kind="assistant-step"]'))
      const before = steps.filter((step) => step.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING)
      const pick = before.length > 0 ? before[before.length - 1] : steps[steps.length - 1]
      if (pick !== undefined) {
        const text = cleanNodeText(pick)
        if (text.length > 0) return text
      }
      console.warn('[fairy-voice] no reply text found for the action row')
      return ''
    }

    /* ---------------- playback ---------------- */

    let active = null

    function isPlaying() {
      return active !== null && active.state !== 'idle'
    }

    function emitState(state) {
      window.dispatchEvent(new CustomEvent('fairy-voice-state', { detail: { state } }))
    }

    function stopSpeaking() {
      const token = active
      active = null
      if (token === null) return
      token.stopped = true
      try {
        token.controller.abort()
      }
      catch (error) {
        /* ignore */
      }
      try {
        if (token.audio) token.audio.pause()
      }
      catch (error) {
        /* ignore */
      }
      if (typeof token.notify === 'function') token.notify('idle')
      emitState('idle')
    }

    async function waitForReady(maxMs) {
      const deadline = Date.now() + maxMs
      for (;;) {
        const status = await readStatus(true)
        if (status.ready) return true
        if (Date.now() > deadline) return false
        await new Promise((resolve) => window.setTimeout(resolve, 3000))
      }
    }

    async function fetchChunk(text, controller) {
      const response = await fetch(SAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error('tts-' + response.status)
      return await response.blob()
    }

    function playBlob(blob, token) {
      return new Promise((resolve) => {
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.volume = volume
        token.audio = audio
        let done = false
        const finish = () => {
          if (done) return
          done = true
          URL.revokeObjectURL(url)
          resolve()
        }
        audio.onended = finish
        audio.onerror = finish
        audio.play().catch(finish)
        window.setTimeout(finish, 180000)
      })
    }

    async function speak(text, notify) {
      if (!voiceEnabled) return
      stopSpeaking()
      const chunks = sentenceChunks(text)
      if (chunks.length === 0) return
      const token = { stopped: false, controller: new AbortController(), audio: null, state: 'loading', notify: notify || null }
      active = token
      const setState = (value) => {
        if (token.stopped) return
        token.state = value
        if (typeof token.notify === 'function') token.notify(value)
        emitState(value)
      }
      setState('loading')

      const ready = await waitForReady(90000)
      if (token.stopped) return
      if (!ready) {
        console.warn('[fairy-voice] local speech service is not ready')
        setState('error')
        if (active === token) active = null
        return
      }

      const pending = new Map()
      const ensure = (index) => {
        if (index >= chunks.length || pending.has(index)) return
        pending.set(index, fetchChunk(chunks[index], token.controller).catch(() => null))
      }
      ensure(0)
      ensure(1)
      for (let index = 0; index < chunks.length; index += 1) {
        const blob = await pending.get(index)
        pending.delete(index)
        ensure(index + 2)
        if (blob === null || blob === undefined) {
          if (!token.stopped) {
            setState('error')
            if (active === token) active = null
          }
          return
        }
        if (token.stopped) return
        setState('playing')
        await playBlob(blob, token)
        if (token.stopped) return
      }
      if (active === token) active = null
      setState('idle')
    }

    /* ---------------- auto read ---------------- */

    const watcher = {
      timer: null,
      running: false,
      runKey: '',
      key: null,
      text: '',
      changedAt: 0,
      grew: false,
      lastSpokenKey: null,
      auto: readAutoRead(),
    }

    function lastAnswerNode() {
      const nodes = document.querySelectorAll('[data-chat-flow-kind="assistant-step"]')
      if (nodes.length === 0) return null
      return nodes[nodes.length - 1]
    }

    function answerKeyOf(node) {
      if (!node) return ''
      return node.getAttribute('data-chat-flow-key') || node.getAttribute('data-chat-anchor-key') || ''
    }

    function speakLatest() {
      const node = lastAnswerNode()
      if (node === null) return
      const key = answerKeyOf(node)
      if (key === '') return
      if (key === watcher.lastSpokenKey) return
      const text = cleanNodeText(node)
      if (text.length < 2) return
      watcher.lastSpokenKey = key
      if (!watcher.auto) return
      if (isPlaying()) return
      void speak(text, null)
    }

    /*
     * Auto read only ever fires for a reply that was produced while this view
     * was watching it. Switching conversations cannot trigger it:
     * 1. A run ends: [data-chat-running] disappears and the answer on screen is
     *    still the one that run was writing (same flow key). Opening another
     *    conversation changes the key, so the run-end check fails.
     * 2. Fallback when the run flag is missing: the same answer node grows
     *    while watched, then settles. Old content that appears whole never grows.
     */
    function tick() {
      const node = lastAnswerNode()
      const key = answerKeyOf(node)
      const running = document.querySelector('[data-chat-running="true"]') !== null

      if (running && key !== '') watcher.runKey = key
      const finished = watcher.running && !running
      watcher.running = running
      if (finished) {
        const finishedKey = watcher.runKey
        window.setTimeout(() => {
          if (!watcher.auto) return
          if (answerKeyOf(lastAnswerNode()) !== finishedKey) return
          speakLatest()
        }, 300)
      }

      if (node === null) return
      const text = cleanNodeText(node)
      const now = Date.now()
      if (key !== watcher.key) {
        watcher.key = key
        watcher.text = text
        watcher.changedAt = now
        watcher.grew = false
        return
      }
      if (text !== watcher.text) {
        if (text.length > watcher.text.length) watcher.grew = true
        watcher.text = text
        watcher.changedAt = now
        return
      }
      if (!watcher.grew) return
      if (running) return
      if (now - watcher.changedAt < SETTLE_MS) return
      if (key === '') return
      if (key === watcher.lastSpokenKey) return
      watcher.grew = false
      watcher.lastSpokenKey = key
      if (watcher.auto && !isPlaying()) void speak(text, null)
    }

    function startWatcher() {
      if (watcher.timer !== null) return
      const node = lastAnswerNode()
      watcher.running = document.querySelector('[data-chat-running="true"]') !== null
      watcher.key = answerKeyOf(node)
      watcher.text = cleanNodeText(node)
      watcher.lastSpokenKey = watcher.key
      watcher.timer = window.setInterval(tick, 500)
      void readStatus(false)
    }

    function stopWatcher() {
      if (watcher.timer !== null) {
        window.clearInterval(watcher.timer)
        watcher.timer = null
      }
    }

    /* ---------------- icons ---------------- */

    function icon(paths) {
      return h('svg', {
        width: 16,
        height: 16,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
      }, paths.map((d, index) => h('path', { key: index, d })))
    }

    const playIcon = () => icon(['M8 5.4v13.2L19 12z'])
    const stopIcon = () => icon(['M7 7h10v10H7z'])

    /* ---------------- components ---------------- */

    function VoiceAction() {
      const [state, setState] = React.useState(active === null ? 'idle' : active.state)
      const ref = React.useRef(null)
      React.useEffect(() => {
        const listener = (event) => setState(event.detail && event.detail.state ? event.detail.state : 'idle')
        window.addEventListener('fairy-voice-state', listener)
        return () => window.removeEventListener('fairy-voice-state', listener)
      }, [])
      const busy = state === 'loading' || state === 'playing'
      const label = busy ? '停止朗读' : '朗读这条回复'
      return h('button', {
        ref,
        type: 'button',
        title: label,
        'aria-label': label,
        'data-fairy-voice-action': '',
        style: BUTTON_STYLE,
        onMouseEnter: (event) => { event.currentTarget.style.opacity = '1' },
        onMouseLeave: (event) => { event.currentTarget.style.opacity = '0.72' },
        onClick: () => {
          if (busy) {
            stopSpeaking()
            return
          }
          const text = speechTextFrom(ref.current)
          if (text.length === 0) return
          void speak(text, null)
        },
      }, busy ? stopIcon() : playIcon())
    }

    function StatusDot() {
      const [status, setStatus] = React.useState(statusCache.value)
      React.useEffect(() => {
        let mounted = true
        const refresh = () => {
          void readStatus(true).then((value) => {
            if (mounted) setStatus(value)
          })
        }
        refresh()
        const timer = window.setInterval(refresh, 15000)
        return () => {
          mounted = false
          window.clearInterval(timer)
        }
      }, [])
      const color = status.ready ? '#4ade80' : status.starting ? '#facc15' : '#f87171'
      const title = status.ready ? 'Fairy 本地语音已就绪' : status.starting ? 'Fairy 语音模型加载中' : 'Fairy 语音服务未启动'
      return h('span', {
        title,
        'aria-label': title,
        style: { display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: color, marginRight: '6px', flex: '0 0 auto' },
      })
    }

    function VoiceToggle() {
      const [auto, setAuto] = React.useState(watcher.auto)
      return h('button', {
        type: 'button',
        title: auto ? '自动朗读已开启，点击关闭' : '自动朗读已关闭，点击开启',
        'aria-label': auto ? '关闭自动朗读' : '开启自动朗读',
        'data-fairy-voice-toggle': '',
        onClick: () => {
          const next = !auto
          watcher.auto = next
          writeAutoRead(next)
          setAuto(next)
          if (!next) stopSpeaking()
        },
        style: Object.assign({}, BUTTON_STYLE, {
          width: 'auto',
          gap: '4px',
          padding: '0 8px',
          height: '26px',
          fontSize: '12px',
          opacity: auto ? '1' : '0.6',
        }),
      }, h(StatusDot, null), h('span', null, auto ? '语音开' : '语音关'))
    }

    /*
     * The composer rail panel: the auto-read switch and its volume live on the
     * right edge of the grey composer band instead of inside the input capsule.
     * Plain DOM rather than a slot, because the seat is where we want it and no
     * slot points there; the panel re-attaches itself if the shell rebuilds the
     * seat on a session switch.
     */
    function ensureRailStyle() {
      /* Replace instead of skipping: a style element injected by an older build
         would otherwise survive the reload and keep painting the glass. */
      const stale = document.getElementById('fairy-voice-rail-style')
      if (stale !== null) stale.remove()
      const style = document.createElement('style')
      style.id = 'fairy-voice-rail-style'
      style.textContent = [
        '[data-fairy-voice-rail]{position:fixed;left:0;top:0;width:124px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:stretch;gap:0;padding:4px 10px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,#31363e 0%,#282d34 54%,#22262d 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 6px 14px rgba(0,0,0,.26);color:#e6ecf5;font-size:12px;line-height:1.4;z-index:9000;pointer-events:auto}',
        '[data-fairy-voice-rail] .fv-row{flex:1 1 0;display:flex;align-items:center;justify-content:space-between;gap:7px;width:100%;min-height:0;color:#c9d3e0}',
        '[data-fairy-voice-rail] .fv-label{display:inline-flex;align-items:center;gap:5px;color:#c9d3e0;white-space:nowrap}',
        '[data-fairy-voice-rail] .fv-dot{width:6px;height:6px;border-radius:50%;background:#f87171;display:inline-block;flex:0 0 auto}',
        '[data-fairy-voice-rail] .fv-pill{min-width:38px;height:18px;padding:0 7px;border-radius:999px;border:1px solid rgba(122,162,255,.34);background:linear-gradient(180deg,rgba(57,120,237,.30),rgba(9,18,52,.50));color:#eaf2ff;font:11px/1 "Segoe UI","Noto Sans SC",sans-serif;cursor:pointer;transition:border-color 160ms ease,background 160ms ease,color 160ms ease}',
        '[data-fairy-voice-rail] .fv-pill:hover{border-color:rgba(150,190,255,.55)}',
        '[data-fairy-voice-rail] .fv-pill.is-off{border-color:rgba(120,140,175,.28);background:linear-gradient(180deg,rgba(40,52,78,.35),rgba(8,14,30,.45));color:#8ea4c6}',
        '[data-fairy-voice-rail] .fv-slider{flex:1;min-width:0}',
        '[data-fairy-voice-rail] input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:999px;outline:none;cursor:pointer;background:linear-gradient(90deg,rgba(120,170,255,.85),rgba(58,96,200,.35))}',
        '[data-fairy-voice-rail] input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:11px;border-radius:50%;background:#dbe7ff;box-shadow:0 0 6px rgba(122,168,255,.85);cursor:pointer}',
        '[data-fairy-voice-rail] input[type=range]::-moz-range-thumb{width:11px;height:11px;border:none;border-radius:50%;background:#dbe7ff;cursor:pointer}',
      ].join('\n')
      document.head.appendChild(style)
    }

    function buildRailPanel() {
      const host = document.createElement('div')
      host.setAttribute('data-fairy-voice-rail', '')
      /* Hidden until the first placement, otherwise it flashes at 0,0 on mount. */
      host.style.visibility = 'hidden'

      const row = (label, control, dot) => {
        const line = document.createElement('div')
        line.className = 'fv-row'
        const name = document.createElement('span')
        name.className = 'fv-label'
        if (dot) name.appendChild(dot)
        name.appendChild(document.createTextNode(label))
        line.appendChild(name)
        line.appendChild(control)
        return line
      }

      /* Master switch: voice output as a whole. Off means nothing is spoken at
         all, including the reply that is already streaming. */
      const dot = document.createElement('i')
      dot.className = 'fv-dot'
      const master = document.createElement('button')
      master.type = 'button'
      master.className = 'fv-pill'
      const masterLine = row('语音', master, dot)

      master.addEventListener('click', () => {
        voiceEnabled = !voiceEnabled
        writeVoiceOn(voiceEnabled)
        if (!voiceEnabled) stopSpeaking()
        syncMaster()
      })

      /* Volume: the only continuous control, so it owns the line's remaining
         width instead of a pill. */
      const slider = document.createElement('input')
      slider.type = 'range'
      slider.className = 'fv-slider'
      slider.min = '0'
      slider.max = '100'
      slider.step = '1'
      slider.value = String(Math.round(volume * 100))
      slider.title = '语音音量'
      slider.setAttribute('aria-label', '语音音量')
      const volumeLine = row('音量', slider)

      /* Auto-read: whether finished replies are spoken on their own. */
      const auto = document.createElement('button')
      auto.type = 'button'
      auto.className = 'fv-pill'
      auto.setAttribute('data-fairy-voice-toggle', '')
      const autoLine = row('自动朗读', auto)

      const syncMaster = () => {
        master.textContent = voiceEnabled ? '开' : '关'
        master.classList.toggle('is-off', !voiceEnabled)
        master.title = voiceEnabled ? '语音已开启，点击关闭' : '语音已关闭，点击开启'
        master.setAttribute('aria-label', master.title)
        host.style.opacity = voiceEnabled ? '1' : '.72'
      }

      const syncAuto = () => {
        const on = watcher.auto
        auto.textContent = on ? '开' : '关'
        auto.classList.toggle('is-off', !on)
        auto.title = on ? '自动朗读已开启，点击关闭' : '自动朗读已关闭，点击开启'
        auto.setAttribute('aria-label', auto.title)
      }

      const syncVolume = () => {
        slider.value = String(Math.round(volume * 100))
        volumeLine.title = '音量 ' + Math.round(volume * 100) + '%'
      }

      const syncStatus = () => {
        void readStatus(false).then((value) => {
          dot.style.background = value.ready ? '#4ade80' : value.starting ? '#facc15' : '#f87171'
        })
      }

      auto.addEventListener('click', () => {
        const next = !watcher.auto
        watcher.auto = next
        writeAutoRead(next)
        syncAuto()
        if (!next) stopSpeaking()
      })

      slider.addEventListener('input', () => {
        volume = Math.min(1, Math.max(0, Number(slider.value) / 100))
        writeVolume(volume)
        syncVolume()
        const playing = active === null ? null : active.audio
        if (playing !== null) playing.volume = volume
      })

      host.appendChild(masterLine)
      host.appendChild(volumeLine)
      host.appendChild(autoLine)

      syncMaster()
      syncAuto()
      syncVolume()
      syncStatus()
      const timer = window.setInterval(syncStatus, 15000)

      return {
        host,
        baseHeight: 0,
        lastKey: '',
        syncToggle: syncAuto,
        stop() {
          window.clearInterval(timer)
          host.remove()
        },
      }
    }

    function installRailPanel() {
      ensureRailStyle()
      let panel = null
      let lastAuto = null
      /*
       * The card claims its own room instead of trusting padding on the seat:
       * the composer wrapper is nested, so shrinking the seat never reached the
       * capsule. The first seat child that contains the capsule gets a right
       * margin, and the card is then centred on the capsule itself — centred on
       * the seat it floated above the capsule's midpoint and sat over the send
       * button.
       */
      const CARD = '[class*="GRgSLq_card"], [class*="RlGAzG_card"]'
      /*
       * One layout for both screens: the new-conversation composer reserves the
       * same right-hand column as a live chat, so the voice card sits in the
       * same place and the capsule keeps the same width. Parity over per-state
       * tidying — a composer that jumps width when the first message is sent
       * reads as a bug.
       */
      const claimRoom = (seat) => {
        const capsule = seat.querySelector(CARD)
        if (capsule === null) return null
        seat.setAttribute('data-fv-slot', '')
        return capsule
      }
      const place = (seat, capsule) => {
        /*
         * Approval prompts replace the composer with their own card. The voice
         * rail is sized from the capsule, so against that card it stretched and
         * collided; hide it while a prompt owns the area.
         */
        /*
         * A hidden approval container stays mounted in some views, so existence
         * alone is not proof of a prompt: it has to be measurably on screen.
         * Treating a zero-height node as "approval open" is what made the card
         * vanish for good.
         */
        const approval = (seat === null ? document : seat).querySelector('[class*="_approval"], [class*="_approvalCard"]')
        const promptOpen = approval !== null && approval.getBoundingClientRect().height > 40
        /*
         * The ask-your-question card (options with buttons) takes the composer's
         * place the same way an approval does. While it is up the capsule either
         * disappears or stays mounted at zero size, and a zero-sized capsule used
         * to drag the rail into the window's top-left corner. Treat both as
         * "someone else owns the area" and hide, exactly like approvals.
         */
        const askCard = document.querySelector('[class*="_question"], [class*="_questions"]')
        const asking = askCard !== null && askCard.getBoundingClientRect().height > 40
        /*
         * The boot film paints its own full-screen layer, but the card lives on
         * <body> at a high z-index now and surfaced over it. The splash marks
         * <html data-fairy-splash-caption> for exactly as long as it is up.
         */
        const booting = document.documentElement.hasAttribute('data-fairy-splash-caption')
        const hide = () => {
          panel.host.style.display = 'none'
          /* Force a re-place when the composer comes back. */
          panel.lastKey = ''
        }
        if (promptOpen || asking || booting) {
          hide()
          return
        }
        panel.host.style.display = ''
        if (capsule === null || !panel.host.isConnected) {
          hide()
          return
        }
        const seatBox = seat.getBoundingClientRect()
        const capsuleBox = capsule.getBoundingClientRect()
        /*
         * A capsule that is mounted but laid out at zero size (display:none while
         * a prompt owns the area, or a wrapper that has not been measured yet)
         * must never be used as an anchor: its rect is 0,0 and the card lands in
         * the top-left corner. Hide until a real box is back.
         */
        if (capsuleBox.width < 80 || capsuleBox.height < 24) {
          hide()
          return
        }
        /*
         * Bottom edges are locked together and the height is captured once:
         * when the composer grows upward for a multi-line draft, the card keeps
         * its size and its bottom, so it does not stretch or drift. Three equal
         * bands split that height (each row is flex:1).
         */
        /*
         * Positioned in viewport coordinates and appended to <body>, so the card
         * no longer depends on which wrapper the shell happens to mount the
         * composer in — that mismatch is what threw it to the top of the screen
         * on the new-session view. Both edges match the capsule; 10px of air to
         * its right, clamped so it never leaves the window.
         */
        const height = Math.max(48, Math.round(capsuleBox.height))
        const top = Math.round(capsuleBox.top)
        const left = Math.max(0, Math.min(Math.round(capsuleBox.right + 10), window.innerWidth - 134))
        const key = top + ':' + left + ':' + height
        if (panel.lastKey === key && panel.host.style.visibility === 'visible') return
        panel.lastKey = key
        panel.host.style.height = height + 'px'
        panel.host.style.top = top + 'px'
        panel.host.style.left = left + 'px'
        panel.host.style.visibility = 'visible'
      }
      const attach = () => {
        const seat = document.querySelector('[class*="_composerSeat"], [class*="_composerStack"]')
        if (panel === null) panel = buildRailPanel()
        if (!panel.host.isConnected) document.body.appendChild(panel.host)
        // The capsule can be found even when the host element is unknown, since
        // the card now lives on <body> and is positioned in viewport space.
        const capsule = seat === null ? document.querySelector(CARD) : claimRoom(seat)
        place(seat, capsule)
        if (lastAuto !== watcher.auto) {
          lastAuto = watcher.auto
          panel.syncToggle()
        }
      }
      attach()

      /*
       * Switching a conversation rebuilds the composer, which drops the card
       * with it. The 1.2s poll alone left a visible hole until the next tick, so
       * the shell is watched directly: the observer only fires the cheap
       * "is the card still attached?" check, and real work happens at most once
       * per 120ms. A slow poll stays as the safety net.
       */
      let lastRun = 0
      let queued = 0
      const kick = () => {
        if (queued !== 0) return
        queued = window.requestAnimationFrame(() => {
          queued = 0
          if (panel !== null && panel.host.isConnected) return
          const now = Date.now()
          if (now - lastRun < 100) return
          lastRun = now
          attach()
        })
      }
      const observer = new MutationObserver(kick)
      observer.observe(document.body, { childList: true, subtree: true })
      /*
       * Resizing the app moved the capsule but the card kept its old viewport
       * position until the next poll, which read as the card vanishing for a
       * second. Both the window resize and the capsule's own box changes now
       * trigger an immediate re-place.
       */
      const relocate = () => {
        const seat = document.querySelector('[class*="_composerSeat"], [class*="_composerStack"]')
        const capsule = seat === null ? document.querySelector(CARD) : claimRoom(seat)
        place(seat, capsule)
      }
      window.addEventListener('resize', relocate)
      let boxObserver = null
      const watchCapsule = () => {
        const capsule = document.querySelector(CARD)
        if (capsule === null || typeof ResizeObserver !== 'function') return
        if (boxObserver !== null) boxObserver.disconnect()
        boxObserver = new ResizeObserver(relocate)
        boxObserver.observe(capsule)
      }
      watchCapsule()
      const repin = window.setInterval(watchCapsule, 2000)
      const timer = window.setInterval(attach, 1200)

      return () => {
        window.clearInterval(timer)
        window.clearInterval(repin)
        window.removeEventListener('resize', relocate)
        if (boxObserver !== null) boxObserver.disconnect()
        observer.disconnect()
        if (queued !== 0) window.cancelAnimationFrame(queued)
        if (panel !== null) panel.stop()
      }
    }

    /* ---------------- plugin ---------------- */

    function mount(ctx, label, name, definition, component) {
      try {
        ctx.effect(
          () => ctx.slots.inject(name, () => ctx.slots.register(Object.assign({ name }, definition), component)),
          label,
        )
      }
      catch (error) {
        console.warn('[fairy-voice] slot registration failed: ' + name, error)
      }
    }

    function apply(ctx) {
      try {
      mount(ctx, 'fairy-voice: message action', 'conversation.chat.assistant-actions', { id: 'fairy-voice-action', order: 30 }, VoiceAction)
      ctx.effect(() => installRailPanel(), 'fairy-voice: composer rail panel')

      ctx.effect(() => {
        startWatcher()
        return () => {
          stopWatcher()
          stopSpeaking()
        }
      }, 'fairy-voice: auto read watcher')
      }
      catch (error) {
        console.error('[fairy-voice] apply failed', error)
      }
    }

    return { apply, inject: ['slots'] }
    }
    catch (error) {
      console.error('[fairy-voice] factory failed', error)
      return { inject: [], apply() {} }
    }
  },
})
