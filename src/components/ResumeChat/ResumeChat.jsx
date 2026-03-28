import { useState } from 'react'
import { Bot, Loader2, MessageSquarePlus, RotateCcw, Send, Sparkles } from 'lucide-react'
import { chatWithResumeAI } from '../../utils/aiParser'
import { normalizeResumeData } from '../../utils/resumeData'
import './ResumeChat.css'

const starterPrompts = [
  'Rewrite my summary for a frontend engineer role.',
  'Shorten the second experience entry into 3 stronger bullet points.',
  'Add AWS and Docker to skills only if they are supported by my experience.',
]

function ResumeChat({
  resumeData,
  setResumeData,
  jobDescription,
  aiConfig,
  setIsSettingsOpen,
  canRevertAiEdit,
  onSaveAiSnapshot,
  onRevertAiEdit,
}) {
  const [instruction, setInstruction] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 'assistant-intro',
      role: 'assistant',
      text: 'Tell me what to change in your resume and I will update the fields directly.',
    },
  ])

  const handleSend = async (messageText = instruction) => {
    const trimmedInstruction = messageText.trim()

    if (!trimmedInstruction || isSending) return

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

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: trimmedInstruction,
      },
    ])
    setInstruction('')
    onSaveAiSnapshot()
    setIsSending(true)

    try {
      const result = await chatWithResumeAI(resumeData, trimmedInstruction, aiConfig, jobDescription)

      setResumeData(normalizeResumeData(result.updatedResume))
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: result.assistantMessage || 'I updated the resume based on your request.',
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: `I could not apply that change: ${err.message}`,
          isError: true,
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="resume-chat glass-panel">
      <div className="resume-chat__header">
        <div>
          <h3><Bot size={18} /> Resume Assistant</h3>
          <p>Ask your active AI model to edit sections for you.</p>
        </div>
        {canRevertAiEdit && (
          <button className="resume-chat__revert" onClick={onRevertAiEdit} type="button">
            <RotateCcw size={14} />
            Revert AI Edit
          </button>
        )}
      </div>

      <div className="resume-chat__messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`resume-chat__bubble resume-chat__bubble--${message.role}${message.isError ? ' resume-chat__bubble--error' : ''}`}
          >
            {message.text}
          </div>
        ))}
        {isSending && (
          <div className="resume-chat__bubble resume-chat__bubble--assistant">
            <Loader2 size={15} className="spin" /> Updating your resume...
          </div>
        )}
      </div>

      <div className="resume-chat__prompts">
        {starterPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="resume-chat__prompt-chip"
            onClick={() => handleSend(prompt)}
            disabled={isSending}
          >
            <MessageSquarePlus size={13} />
            {prompt}
          </button>
        ))}
      </div>

      <div className="resume-chat__composer">
        <label htmlFor="resume-chat-input">
          <Sparkles size={14} />
          Chat instructions
        </label>
        <textarea
          id="resume-chat-input"
          rows={4}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Example: Rewrite my summary to emphasize React performance work and make my first job bullet more metrics-driven."
        />
        <button
          className="btn-primary resume-chat__send"
          onClick={() => handleSend()}
          disabled={isSending || !instruction.trim()}
          type="button"
        >
          {isSending ? <><Loader2 size={16} className="spin" /> Applying...</> : <><Send size={16} /> Send to AI</>}
        </button>
      </div>
    </div>
  )
}

export default ResumeChat
