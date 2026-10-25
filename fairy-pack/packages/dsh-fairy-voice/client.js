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

    function speechTextFrom(anchor) {
      if (!anchor) return ''
      const tail = anchor.closest('[data-turn-tail]')
      const wrapper = tail !== null ? tail.parentElement : anchor.closest('[data-chat-flow-kind]')
      if (!wrapper) return ''
      let node = wrapper.previousElementSibling
      let guard = 0
      while (node !== null && guard < 400) {
        guard += 1
        const kind = node.getAttribute('data-chat-flow-kind')
        const part = node.getAttribute('data-chat-group-part')
        if (kind === 'user' || kind === 'user-message' || part === 'user') break
        if (kind === 'assistant-step' || part === 'response') {
          const text = cleanNodeText(node)
          if (text.length > 0) return text
        }
        node = node.previousElementSibling
      }
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
      mount(ctx, 'fairy-voice: composer toggle', 'conversation.input.left', { id: 'fairy-voice-toggle', order: 60 }, VoiceToggle)

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
