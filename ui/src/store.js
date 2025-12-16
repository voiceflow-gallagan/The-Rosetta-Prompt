import { create } from 'zustand'

function resolveApiBase() {
  const runtime = (typeof window !== 'undefined' && window.__ROSETTA_PROMPT__?.API_BASE) || ''
  const buildtime = process.env.REACT_APP_API_BASE || ''

  // Prefer runtime (env.js), then build-time env, then same-origin proxy path.
  let base = (runtime || buildtime || '/api').trim()

  // Common deployment footgun: static env.js fallback is localhost, but the app
  // is running on a non-localhost domain. In that case, prefer same-origin proxy.
  if (typeof window !== 'undefined') {
    const host = window.location?.hostname
    const isLocalHost = host === 'localhost' || host === '127.0.0.1'
    if (!isLocalHost && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(base)) {
      base = '/api'
    }
  }

  // Normalize trailing slash (so `${base}/path` doesn't double-slash or miss slash)
  return base.endsWith('/') ? base.slice(0, -1) : base
}

const API_BASE = resolveApiBase()

async function fetchJson(url, options) {
  const response = await fetch(url, options)
  const contentType = response.headers.get('content-type') || ''

  // If the backend/proxy returns an HTML error page (common), surface it clearly.
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '')
    const snippet = text.slice(0, 200).replace(/\s+/g, ' ').trim()
    throw new Error(
      `Unexpected response from API (${response.status} ${response.statusText}) at ${url}. ` +
        `Expected JSON but got "${contentType || 'unknown'}". ` +
        (snippet ? `Body starts with: ${JSON.stringify(snippet)}` : '')
    )
  }

  if (!response.ok) {
    // Even when JSON, FastAPI returns structured errors. Include status for clarity.
    const err = await response.json().catch(() => ({}))
    throw new Error(`API request failed (${response.status} ${response.statusText}) at ${url}: ${JSON.stringify(err)}`)
  }

  return response.json()
}

export const useStore = create((set, get) => ({
  // UI State
  screen: 'input', // 'input' | 'processing' | 'results'

  // Input State
  prompt: '',
  selectedProviders: [],
  availableProviders: [],
  providersLoaded: false,

  // Processing State
  logs: [],
  currentStep: '',
  progress: 0,

  // Results State
  results: null,
  selectedCard: null,
  showPopup: false,

  // Actions
  setPrompt: (prompt) => set({ prompt }),

  toggleProvider: (provider) =>
    set((state) => ({
      selectedProviders: state.selectedProviders.includes(provider)
        ? state.selectedProviders.filter((p) => p !== provider)
        : [...state.selectedProviders, provider]
    })),

  selectAllProviders: () =>
    set((state) => ({
      selectedProviders: [...state.availableProviders]
    })),

  addLog: (log) =>
    set((state) => ({
      logs: [...state.logs, { id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, timestamp: new Date(), ...log }]
    })),

  setScreen: (screen) => set({ screen }),

  selectCard: (provider) => set({ selectedCard: provider, showPopup: true }),

  closePopup: () => set({ showPopup: false, selectedCard: null }),

  reset: () =>
    set({
      screen: 'input',
      logs: [],
      currentStep: '',
      progress: 0,
      results: null,
      selectedCard: null,
      showPopup: false
    }),

  // Fetch available providers from API
  fetchProviders: async () => {
    // Preferred order - major providers first
    const preferredOrder = ['openai', 'anthropic', 'google', 'mistral', 'meta', 'kimi', 'deepseek']

    const sortByPreference = (providers) => {
      return providers.sort((a, b) => {
        const aIndex = preferredOrder.indexOf(a.toLowerCase())
        const bIndex = preferredOrder.indexOf(b.toLowerCase())
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1
        return aIndex - bIndex
      })
    }

    try {
      const data = await fetchJson(`${API_BASE}/providers`)
      const providers = sortByPreference(data.providers || [])
      set({
        availableProviders: providers,
        selectedProviders: providers, // Select all by default
        providersLoaded: true
      })
    } catch (error) {
      console.error('Failed to fetch providers:', error)
      // Fallback to default providers
      const fallback = ['openai', 'anthropic', 'google', 'kimi']
      set({
        availableProviders: fallback,
        selectedProviders: fallback,
        providersLoaded: true
      })
    }
  },

  // API Call with simulated agent thinking
  optimizePrompt: async () => {
    const { prompt, selectedProviders, addLog } = get()

    if (!prompt.trim() || selectedProviders.length === 0) return

    set({ screen: 'processing', logs: [], progress: 0 })

    // Simulate agent thinking phases
    addLog({ type: 'system', message: 'Initializing Rosetta Prompt Engine...' })
    await sleep(400)

    addLog({ type: 'agent', message: 'Analyzing input prompt structure...' })
    set({ currentStep: 'Analyzing prompt', progress: 10 })
    await sleep(600)

    addLog({ type: 'thinking', message: `Detected prompt type: System instruction` })
    addLog({ type: 'thinking', message: `Identified key elements: role definition, behavioral constraints` })
    set({ progress: 20 })
    await sleep(400)

    addLog({ type: 'agent', message: `Spawning ${selectedProviders.length} parallel optimization agents...` })
    set({ currentStep: 'Spawning agents', progress: 30 })
    await sleep(300)

    for (const provider of selectedProviders) {
      addLog({ type: 'spawn', message: `[${provider.toUpperCase()}] Agent initialized`, provider })
    }
    await sleep(500)

    addLog({ type: 'agent', message: 'Loading provider-specific guidelines...' })
    set({ currentStep: 'Loading guidelines', progress: 40 })

    for (const provider of selectedProviders) {
      await sleep(200)
      addLog({ type: 'tool', message: `[${provider.toUpperCase()}] Reading docs/${provider}/prompting.md`, provider })
    }
    set({ progress: 50 })

    addLog({ type: 'agent', message: 'Applying provider-specific transformations...' })
    set({ currentStep: 'Optimizing prompts', progress: 60 })
    await sleep(400)

    for (const provider of selectedProviders) {
      await sleep(300)
      addLog({ type: 'thinking', message: `[${provider.toUpperCase()}] Applying ${getProviderTechnique(provider)}...`, provider })
    }
    set({ progress: 75 })

    addLog({ type: 'system', message: 'Calling optimization API...' })
    set({ currentStep: 'Finalizing', progress: 85 })

    try {
      const data = await fetchJson(`${API_BASE}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          providers: selectedProviders,
          options: { preserve_structure: true, verbose_changelog: false }
        })
      })

      set({ progress: 95 })
      addLog({ type: 'success', message: 'Optimization complete!' })

      for (const provider of selectedProviders) {
        const result = data.optimized[provider]
        if (result?.success) {
          addLog({ type: 'result', message: `[${provider.toUpperCase()}] ${result.changes.length} transformations applied`, provider })
        } else {
          addLog({ type: 'error', message: `[${provider.toUpperCase()}] ${result?.error || 'Failed'}`, provider })
        }
      }

      await sleep(800)
      set({ results: data, progress: 100, screen: 'results' })
    } catch (error) {
      addLog({ type: 'error', message: `API Error: ${error.message}` })
      set({ currentStep: 'Error', progress: 0 })
    }
  }
}))

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getProviderTechnique(provider) {
  const techniques = {
    openai: 'structured system message format',
    anthropic: 'XML tag structuring',
    google: 'task/format/context pattern',
    kimi: 'structured output formatting'
  }
  return techniques[provider] || 'provider-specific optimization'
}
