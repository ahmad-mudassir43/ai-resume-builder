export const ollamaTextModelPresets = [
  {
    id: 'gpt-oss:20b-cloud',
    name: 'GPT-OSS 20B Cloud',
    tagline: 'Balanced default for resume editing and ATS tailoring through Ollama Cloud.',
    recommended: true,
  },
  {
    id: 'gpt-oss:120b-cloud',
    name: 'GPT-OSS 120B Cloud',
    tagline: 'Higher quality reasoning for premium cloud use.',
    recommended: false,
  },
  {
    id: 'gpt-oss:20b',
    name: 'GPT-OSS 20B Local',
    tagline: 'Good fallback when you want a local-only text model.',
    recommended: false,
  },
]

export const ollamaVisionModelPresets = [
  {
    id: 'gemma3:12b-cloud',
    name: 'Gemma 3 12B Cloud',
    tagline: 'Recommended vision model for resume image parsing through Ollama Cloud.',
    recommended: true,
  },
  {
    id: 'gemma3:27b-cloud',
    name: 'Gemma 3 27B Cloud',
    tagline: 'Higher-capacity vision model when available.',
    recommended: false,
  },
  {
    id: 'gemma3:12b',
    name: 'Gemma 3 12B Local',
    tagline: 'Good fallback when you want a local-only vision model.',
    recommended: false,
  },
]

export const defaultOllamaTextModel = ollamaTextModelPresets[0].id
export const defaultOllamaVisionModel = ollamaVisionModelPresets[0].id

export const normalizePresetModel = (value, presets, fallback) =>
  presets.some((preset) => preset.id === value) ? value : fallback
