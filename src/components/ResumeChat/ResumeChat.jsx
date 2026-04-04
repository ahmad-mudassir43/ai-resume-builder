import { useState } from 'react'
import { Bot, Loader2, MessageSquarePlus, RotateCcw, Send, Sparkles } from 'lucide-react'
import { chatWithResumeAI, getGuidedResumeQuestion } from '../../utils/aiParser'
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
  const [isGuidedMode, setIsGuidedMode] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 'assistant-intro',
      role: 'assistant',
      text: 'Tell me what to change in your resume and I will update the fields directly.',
    },
  ])

  const toggleGuidedMode = () => {
    if (!isGuidedMode) {
      setIsGuidedMode(true)
      const firstQuestion = getGuidedResumeQuestion(resumeData)
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-guided-${Date.now()}`,
          role: 'assistant',
          text: `Welcome to the Guided Resume Builder! I'll help you fill out your resume step-by-step. ${firstQuestion.question}`,
          isGuided: true
        }
      ])
    } else {
      setIsGuidedMode(false)
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-guided-exit-${Date.now()}`,
          role: 'assistant',
          text: "Switching back to standard chat mode. You can still ask me to make any changes!",
        }
      ])
    }
  }

  const handleApplySuggestion = (suggestion, messageId) => {
    // Re-normalize data after manual update
    const updatedResume = { ...resumeData }
    // Note: Simple path traversal for dot notation
    const keys = suggestion.field.split('.')
    let current = updatedResume
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = suggestion.enhanced
    
    setResumeData(normalizeResumeData(updatedResume))
    
    // Update message to show it was accepted
    setMessages((prev) => prev.map(m => 
      m.id === messageId ? { ...m, suggestionAccepted: true } : m
    ))
  }

  const handleRejectSuggestion = (messageId) => {
    setMessages((prev) => prev.map(m => 
      m.id === messageId ? { ...m, suggestionRejected: true } : m
    ))
  }

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
    if (!isGuidedMode) onSaveAiSnapshot()
    setIsSending(true)

    try {
      const result = await chatWithResumeAI(resumeData, trimmedInstruction, aiConfig, jobDescription, isGuidedMode)

      setResumeData(normalizeResumeData(result.updatedResume))
      
      const nextQuestion = isGuidedMode ? getGuidedResumeQuestion(result.updatedResume) : null
      const responseText = isGuidedMode 
        ? `${result.assistantMessage} ${nextQuestion.question}`
        : result.assistantMessage

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: responseText,
          suggestion: result.hasSuggestion ? result.suggestion : null
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
            className={`resume-chat__bubble resume-chat__bubble--${message.role}${message.isError ? ' resume-chat__bubble--error' : ''}${message.isGuided ? ' resume-chat__bubble--guided' : ''}`}
          >
            <div className="resume-chat__bubble-text">{message.text}</div>
            
            {message.suggestion && !message.suggestionAccepted && !message.suggestionRejected && (
              <div className="resume-chat__suggestion">
                <div className="resume-chat__suggestion-header">
                  <Sparkles size={12} /> AI Enhancement Suggested
                </div>
                <div className="resume-chat__suggestion-comparison">
                  <div className="resume-chat__suggestion-item resume-chat__suggestion-item--original">
                    <label>Original</label>
                    <p>{message.suggestion.original}</p>
                  </div>
                  <div className="resume-chat__suggestion-item resume-chat__suggestion-item--enhanced">
                    <label>AI Enhanced</label>
                    <p>{message.suggestion.enhanced}</p>
                  </div>
                </div>
                <div className="resume-chat__suggestion-actions">
                  <button 
                    className="btn-suggestion btn-suggestion--accept"
                    onClick={() => handleApplySuggestion(message.suggestion, message.id)}
                  >
                    Use Enhanced
                  </button>
                  <button 
                    className="btn-suggestion btn-suggestion--reject"
                    onClick={() => handleRejectSuggestion(message.id)}
                  >
                    Keep Mine
                  </button>
                </div>
              </div>
            )}
            
            {message.suggestionAccepted && (
              <div className="resume-chat__suggestion-status resume-chat__suggestion-status--accepted">
                 Updated with AI enhanced version!
              </div>
            )}
          </div>
        ))}
        {isSending && (
          <div className="resume-chat__bubble resume-chat__bubble--assistant">
            <Loader2 size={15} className="spin" /> Thinking...
          </div>
        )}
      </div>

      <div className="resume-chat__prompts">
        <button
          type="button"
          className={`resume-chat__prompt-chip resume-chat__prompt-chip--builder ${isGuidedMode ? 'active' : ''}`}
          onClick={toggleGuidedMode}
          disabled={isSending}
        >
          {isGuidedMode ? <><RotateCcw size={13} /> Exit Guided Mode</> : <><Sparkles size={13} /> Start Guided Builder</>}
        </button>
        {!isGuidedMode && starterPrompts.map((prompt) => (
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
