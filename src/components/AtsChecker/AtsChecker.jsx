import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Sparkles, Loader2, Info, Undo2, RefreshCw, ScanSearch } from 'lucide-react'
import { analyzeResumeAtsWithAI, chatWithResumeAI, optimizeResumeWithAI } from '../../utils/aiParser'
import { normalizeResumeData } from '../../utils/resumeData'
import './AtsChecker.css'

function AtsChecker({
  resumeData,
  jobDescription,
  setJobDescription,
  setResumeData,
  aiConfig,
  setIsSettingsOpen,
  previousAiResumeData,
  onSaveAiSnapshot,
  onRevertAiEdit,
}) {
  const [score, setScore] = useState(0)
  const [missing, setMissing] = useState([])
  const [matched, setMatched] = useState([])
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isAnalyzingAts, setIsAnalyzingAts] = useState(false)
  const [applyingFixIndex, setApplyingFixIndex] = useState(null)
  const [tweaksSummary, setTweaksSummary] = useState(null)
  const [aiAtsReview, setAiAtsReview] = useState(null)
  const hasAiScore = typeof aiAtsReview?.scoreEstimate === 'number'
  const displayScore = hasAiScore ? aiAtsReview.scoreEstimate : score
  const scoreLabel = hasAiScore ? 'AI ATS Compatibility' : 'ATS Compatibility'
  const scoreSubtext = hasAiScore
    ? 'Updated from the latest AI review'
    : score >= 80 ? 'Excellent match!' : score >= 50 ? 'Good start' : 'Needs improvement'

  const getProviderConfigState = () => {
    const providerLabel = aiConfig.provider === 'ollama'
      ? (aiConfig.ollamaConnectionMode === 'local' ? 'Ollama Local Bridge' : 'Ollama Cloud')
      : 'Google Gemini'
    const key = aiConfig.provider === 'ollama'
      ? (aiConfig.ollamaConnectionMode === 'local' ? 'local-bridge' : aiConfig.ollamaApiKey)
      : aiConfig.geminiKey

    return { providerLabel, key }
  }

  // Basic stopwords to ignore
  const stopWords = new Set(['the', 'and', 'a', 'to', 'of', 'in', 'for', 'is', 'on', 'that', 'by', 'this', 'with', 'i', 'you', 'it', 'not', 'or', 'be', 'are', 'from', 'at', 'as', 'your', 'all', 'have', 'new', 'more', 'an', 'was', 'we', 'will', 'home', 'can', 'us', 'about', 'if', 'page', 'my', 'has', 'search', 'free', 'but', 'our', 'one', 'other', 'do', 'no', 'information', 'time', 'they', 'site', 'he', 'up', 'may', 'what', 'which', 'their', 'news', 'out', 'use', 'any', 'there', 'see', 'only', 'so', 'his', 'when', 'contact', 'here', 'business', 'who', 'web', 'also', 'now', 'help', 'get', 'pm', 'view', 'online', 'c', 'e', 'first', 'am', 'been', 'would', 'how', 'were', 'me', 's', 'services', 'some', 'these', 'click', 'its', 'like', 'service', 'x', 'than', 'find', 'price', 'date', 'back', 'top', 'people', 'had', 'list', 'name', 'just', 'over', 'state', 'year', 'day', 'into', 'email', 'two', 'health', 'n', 'world', 're', 'next', 'used', 'go', 'b', 'work', 'last', 'most', 'products', 'music', 'buy', 'data', 'make', 'them', 'should', 'product', 'system', 'post', 'her', 'city', 't', 'add', 'policy', 'number', 'such', 'please', 'available', 'copyright', 'support', 'message', 'after', 'best', 'software', 'then', 'jan', 'good', 'video', 'well', 'd', 'where', 'info', 'rights', 'public', 'books', 'high', 'school', 'through', 'm', 'each', 'links', 'she', 'review', 'years', 'order', 'very', 'privacy', 'book', 'items', 'company', 'read', 'group', 'sex', 'need', 'many', 'user', 'say', 'does'])

  useEffect(() => {
    if (!jobDescription.trim()) {
      setScore(0)
      setMissing([])
      setMatched([])
      setAiAtsReview(null)
      return
    }

    // 1. Gather all resume text
    const resumeText = [
      resumeData.personalInfo.summary,
      resumeData.skills,
      ...resumeData.experience.map(e => `${e.role} ${e.description}`),
      ...resumeData.projects.map(p => `${p.name} ${p.description}`)
    ].join(' ').toLowerCase()

    // 2. Tokenize job description into keywords (excluding stopwords & short words)
    const jdTokens = jobDescription.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
    
    // Unique keywords expected by Job Description
    const expectedKeywords = [...new Set(jdTokens)]

    if (expectedKeywords.length === 0) {
      setScore(0)
      return
    }

    // 3. Find matches
    const matchedWords = []
    const missingWords = []

    expectedKeywords.forEach(keyword => {
      // Basic includes check, ideally would use whole word matching boundaries \b
      if (resumeText.includes(keyword)) {
        matchedWords.push(keyword)
      } else {
        missingWords.push(keyword)
      }
    })

    const newScore = Math.round((matchedWords.length / expectedKeywords.length) * 100)

    setScore(newScore)
    setMatched(matchedWords.slice(0, 10)) // show top 10
    setMissing(missingWords.slice(0, 10)) // show top 10
  }, [resumeData, jobDescription])

  useEffect(() => {
    setAiAtsReview(null)
  }, [resumeData, jobDescription])

  const handleOptimize = async (mode = 'optimize') => {
    if (!jobDescription.trim()) return;
    
    const { providerLabel, key } = getProviderConfigState()
    if (!key || !key.trim()) {
      alert(`Please configure your ${providerLabel} API Key in the settings first.`);
      setIsSettingsOpen(true);
      return;
    }

    const sourceResumeData = mode === 'alternative' && previousAiResumeData
      ? previousAiResumeData
      : resumeData

    if (mode !== 'alternative' || !previousAiResumeData) {
      onSaveAiSnapshot(resumeData)
    }

    setIsOptimizing(true);
    setTweaksSummary(null);

    try {
      const result = await optimizeResumeWithAI(sourceResumeData, jobDescription, aiConfig);
      if (result.optimizedResume) {
        setResumeData(normalizeResumeData(result.optimizedResume));
      }
      if (result.tweaksSummary) {
        setTweaksSummary(result.tweaksSummary);
      }
    } catch (err) {
      alert("Error optimizing resume: " + err.message);
    } finally {
      setIsOptimizing(false);
    }
  }

  const runAiAtsReview = async (targetResumeData = resumeData) => {
    const result = await analyzeResumeAtsWithAI(targetResumeData, jobDescription, aiConfig)
    setAiAtsReview(result)
    return result
  }

  const handleAiAtsReview = async () => {
    if (!jobDescription.trim()) return

    const { providerLabel, key } = getProviderConfigState()

    if (!key || !key.trim()) {
      alert(`Please configure your ${providerLabel} API Key in the settings first.`)
      setIsSettingsOpen(true)
      return
    }

    setIsAnalyzingAts(true)

    try {
      await runAiAtsReview(resumeData)
    } catch (err) {
      alert('Error running AI ATS review: ' + err.message)
    } finally {
      setIsAnalyzingAts(false)
    }
  }

  const handleApplyAtsFix = async (fixText, index) => {
    const { providerLabel, key } = getProviderConfigState()

    if (!key || !key.trim()) {
      alert(`Please configure your ${providerLabel} API Key in the settings first.`)
      setIsSettingsOpen(true)
      return
    }

    onSaveAiSnapshot(resumeData)
    setApplyingFixIndex(index)

    try {
      const result = await chatWithResumeAI(
        resumeData,
        `Apply this ATS improvement to my resume while keeping all details truthful and only changing what is needed: ${fixText}`,
        aiConfig,
        jobDescription
      )

      const updatedResume = normalizeResumeData(result.updatedResume)
      setResumeData(updatedResume)
      setTweaksSummary(result.assistantMessage || 'Applied ATS recommendation.')

      const remainingActionItems = aiAtsReview?.actionItems?.filter((_, actionIndex) => actionIndex !== index) || []
      setAiAtsReview((previousReview) => previousReview ? {
        ...previousReview,
        actionItems: remainingActionItems,
      } : previousReview)

      try {
        await runAiAtsReview(updatedResume)
      } catch {
        setAiAtsReview((previousReview) => previousReview ? {
          ...previousReview,
          actionItems: remainingActionItems,
        } : previousReview)
      }
    } catch (err) {
      alert('Error applying ATS fix: ' + err.message)
    } finally {
      setApplyingFixIndex(null)
    }
  }

  const handleRevert = () => {
    onRevertAiEdit()
    setTweaksSummary(null)
  }

  return (
    <div className="ats-checker glass-panel">
      <div className="ats-score-container">
        <div className="score-ring">
          <svg viewBox="0 0 36 36" className="circular-chart">
            <path className="circle-bg"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path className="circle"
              strokeDasharray={`${displayScore}, 100`}
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <text x="18" y="20.35" className="percentage">{displayScore}%</text>
          </svg>
        </div>
        <div className="score-text">
          <h3>{scoreLabel}</h3>
          <p>{scoreSubtext}</p>
          {hasAiScore && (
            <span className="score-text__meta">Keyword score: {score}%</span>
          )}
        </div>
      </div>

      <div className="jd-input">
        <label>Paste Job Description Here</label>
        <textarea 
          placeholder="We are looking for a Senior React Engineer..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={4}
        />
      </div>

      {jobDescription.trim().length > 0 && (
        <div className="keyword-analysis">
          <div className="ats-action-grid">
            <button 
              className="btn-primary" 
              style={{width: '100%', justifyContent: 'center', marginBottom: '8px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}
              onClick={() => handleOptimize()}
              disabled={isOptimizing}
            >
              {isOptimizing ? <><Loader2 className="spin" size={18}/> Tailoring Resume...</> : <><Sparkles size={18} /> Auto-Optimize for this Job</>}
            </button>
            <button
              className="btn-icon ats-secondary-btn"
              onClick={handleAiAtsReview}
              disabled={isAnalyzingAts}
              title="Run AI ATS Review"
            >
              {isAnalyzingAts ? <><Loader2 className="spin" size={16} /> Reviewing...</> : <><ScanSearch size={16} /> AI ATS Review</>}
            </button>
          </div>
          
          {previousAiResumeData && !isOptimizing && (
            <div style={{display: 'flex', gap: '8px', marginBottom: '12px'}}>
              <button onClick={handleRevert} className="btn-icon" style={{flex: 1, borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', width: 'auto'}} title="Undo Changes">
                <Undo2 size={16} style={{marginRight: '6px'}} /> Revert
              </button>
              <button onClick={() => handleOptimize('alternative')} className="btn-icon" style={{flex: 1, borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', width: 'auto'}} title="Generate Alternative">
                <RefreshCw size={16} style={{marginRight: '6px'}} /> Alternative
              </button>
            </div>
          )}

          {tweaksSummary && (
            <div className="tweaks-summary glass-panel" style={{padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '12px'}}>
               <h4 style={{fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', marginBottom: '4px'}}>
                 <Info size={14}/> Optimization Summary
               </h4>
               <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{tweaksSummary}</p>
            </div>
          )}

          {aiAtsReview && (
            <div className="ai-ats-review glass-panel">
              <div className="ai-ats-review__header">
                <h4><Info size={14} /> AI ATS Review</h4>
                {typeof aiAtsReview.scoreEstimate === 'number' && (
                  <span className="ai-ats-review__score">AI Est. {aiAtsReview.scoreEstimate}%</span>
                )}
              </div>
              <p className="ai-ats-review__summary">{aiAtsReview.summary}</p>

              {aiAtsReview.strengths.length > 0 && (
                <div className="analysis-section">
                  <h4 className="success-text"><CheckCircle size={14} /> Strengths</h4>
                  <ul className="ai-ats-review__list">
                    {aiAtsReview.strengths.map((item, index) => (
                      <li key={`strength-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiAtsReview.gaps.length > 0 && (
                <div className="analysis-section">
                  <h4 className="warning-text"><AlertCircle size={14} /> Gaps</h4>
                  <ul className="ai-ats-review__list">
                    {aiAtsReview.gaps.map((item, index) => (
                      <li key={`gap-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiAtsReview.actionItems.length > 0 && (
                <div className="analysis-section">
                  <h4 style={{ color: '#93c5fd' }}><Sparkles size={14} /> Recommended Fixes</h4>
                  <div className="ai-ats-review__actions">
                    {aiAtsReview.actionItems.map((item, index) => (
                      <div key={`action-${index}`} className="ai-ats-review__action-card">
                        <p>{item}</p>
                        <button
                          type="button"
                          className="btn-icon ai-ats-review__apply-btn"
                          onClick={() => handleApplyAtsFix(item, index)}
                          disabled={applyingFixIndex !== null}
                        >
                          {applyingFixIndex === index ? <><Loader2 size={14} className="spin" /> Applying...</> : <><Sparkles size={14} /> Apply with AI</>}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="analysis-section">
            <h4 className="success-text"><CheckCircle size={14} /> Keywords Matched</h4>
            <div className="keyword-tags">
              {matched.length > 0 ? matched.map((word, i) => (
                <span key={i} className="tag tag-success">{word}</span>
              )) : <span className="text-secondary text-sm">No matches found.</span>}
            </div>
          </div>
          
          <div className="analysis-section">
            <h4 className="warning-text"><AlertCircle size={14} /> Missing Keywords</h4>
            <div className="keyword-tags">
              {missing.length > 0 ? missing.map((word, i) => (
                <span key={i} className="tag tag-warning">{word}</span>
              )) : <span className="text-secondary text-sm">Perfect match!</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AtsChecker
