import { useState } from 'react'
import { Loader2, Palette, Sparkles, Wand2 } from 'lucide-react'
import { suggestResumeTheme } from '../../utils/aiParser'
import { resumeThemes } from '../../utils/resumeThemes'
import './ThemeStudio.css'

function ThemeStudio({
  resumeData,
  jobDescription,
  selectedTheme,
  onThemeChange,
  aiConfig,
  setIsSettingsOpen,
}) {
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [suggestionReason, setSuggestionReason] = useState('')

  const handleSuggestTheme = async () => {
    const providerLabel = aiConfig.provider === 'ollama'
      ? (aiConfig.ollamaConnectionMode === 'local' ? 'Ollama Local Bridge' : 'Ollama Cloud')
      : 'Google Gemini'
    const key = aiConfig.provider === 'ollama'
      ? (aiConfig.ollamaConnectionMode === 'local' ? 'local-bridge' : aiConfig.ollamaApiKey)
      : aiConfig.geminiKey
    if (!key || !key.trim()) {
      alert(`Please configure your ${providerLabel} API Key in the settings first.`)
      setIsSettingsOpen(true)
      return
    }

    setIsSuggesting(true)

    try {
      const result = await suggestResumeTheme(resumeData, jobDescription, aiConfig)
      onThemeChange(result.themeKey)
      setSuggestionReason(result.reason)
    } catch (err) {
      setSuggestionReason(`Could not get an AI theme suggestion: ${err.message}`)
    } finally {
      setIsSuggesting(false)
    }
  }

  return (
    <div className="theme-studio glass-panel">
      <div className="theme-studio__header">
        <div>
          <h3><Palette size={18} /> Theme Studio</h3>
          <p>Switch resume styles instantly or let the model recommend one.</p>
        </div>
        <button
          type="button"
          className="theme-studio__suggest-btn"
          onClick={handleSuggestTheme}
          disabled={isSuggesting}
        >
          {isSuggesting ? <><Loader2 size={15} className="spin" /> Thinking...</> : <><Wand2 size={15} /> AI Suggest</>}
        </button>
      </div>

      <div className="theme-studio__grid">
        {resumeThemes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className={`theme-card ${selectedTheme === theme.id ? 'is-active' : ''}`}
            onClick={() => onThemeChange(theme.id)}
          >
            <div className={`theme-card__preview theme-card__preview--${theme.id}`}>
              <span />
              <span />
              <span />
            </div>
            <div className="theme-card__content">
              <strong>{theme.name}</strong>
              <span>{theme.tagline}</span>
            </div>
          </button>
        ))}
      </div>

      {suggestionReason && (
        <div className="theme-studio__note">
          <h4><Sparkles size={14} /> AI Recommendation</h4>
          <p>{suggestionReason}</p>
        </div>
      )}
    </div>
  )
}

export default ThemeStudio
