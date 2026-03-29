import { useState, useEffect, useRef } from 'react'
import { FileDown, Loader2, Menu, X, Settings, Trash2 } from 'lucide-react'
import './App.css'
import Editor from './components/Editor/Editor'
import Preview from './components/Preview/Preview'
import AtsChecker from './components/AtsChecker/AtsChecker'
import ResumeChat from './components/ResumeChat/ResumeChat'
import ThemeStudio from './components/ThemeStudio/ThemeStudio'
import { testOllamaConnection } from './utils/aiParser'
import { cloneResumeData, createEmptyResumeData } from './utils/resumeData'
import { defaultResumeTheme } from './utils/resumeThemes'
import {
  defaultOllamaTextModel,
  defaultOllamaVisionModel,
  normalizePresetModel,
  ollamaTextModelPresets,
  ollamaVisionModelPresets,
} from './utils/ollamaModels'

const sanitizePdfFileName = (name) => {
  const trimmedName = name?.trim() || 'resume'
  const safeName = trimmedName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
  return safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`
}

const blobToBase64 = async (blob) => {
  const arrayBuffer = await blob.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(arrayBuffer)
  const chunkSize = 0x8000

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function App() {
  const [resumeData, setResumeData] = useState(createEmptyResumeData)

  const [jobDescription, setJobDescription] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [previousAiResumeData, setPreviousAiResumeData] = useState(null)
  const [selectedTheme, setSelectedTheme] = useState(() => localStorage.getItem('resumeTheme') || defaultResumeTheme)
  const [isTestingOllama, setIsTestingOllama] = useState(false)
  const [ollamaTestStatus, setOllamaTestStatus] = useState(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const resumeExportRef = useRef(null)
  
  // AI Config States
  const [aiProvider, setAiProvider] = useState(() => {
    const savedProvider = localStorage.getItem('aiProvider')
    return savedProvider === 'deepseek' ? 'ollama' : (savedProvider || 'gemini')
  })
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('geminiApiKey') || '')
  const [ollamaApiKey, setOllamaApiKey] = useState(() => localStorage.getItem('ollamaApiKey') || '')
  const [ollamaConnectionMode, setOllamaConnectionMode] = useState(() => localStorage.getItem('ollamaConnectionMode') || 'local')
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(() => localStorage.getItem('ollamaBaseUrl') || 'http://localhost:11434')
  const [ollamaCustomTextModel, setOllamaCustomTextModel] = useState(() => localStorage.getItem('ollamaCustomTextModel') || '')
  const [ollamaCustomVisionModel, setOllamaCustomVisionModel] = useState(() => localStorage.getItem('ollamaCustomVisionModel') || '')
  const [ollamaTextModel, setOllamaTextModel] = useState(() =>
    normalizePresetModel(localStorage.getItem('ollamaTextModel'), ollamaTextModelPresets, defaultOllamaTextModel)
  )
  const [ollamaVisionModel, setOllamaVisionModel] = useState(() =>
    normalizePresetModel(localStorage.getItem('ollamaVisionModel'), ollamaVisionModelPresets, defaultOllamaVisionModel)
  )

  useEffect(() => {
    localStorage.setItem('aiProvider', aiProvider)
    localStorage.setItem('geminiApiKey', geminiKey)
    localStorage.setItem('ollamaApiKey', ollamaApiKey)
    localStorage.setItem('ollamaConnectionMode', ollamaConnectionMode)
    localStorage.setItem('ollamaBaseUrl', ollamaBaseUrl)
    localStorage.setItem('ollamaCustomTextModel', ollamaCustomTextModel)
    localStorage.setItem('ollamaCustomVisionModel', ollamaCustomVisionModel)
    localStorage.setItem('ollamaTextModel', ollamaTextModel)
    localStorage.setItem('ollamaVisionModel', ollamaVisionModel)
    localStorage.removeItem('deepSeekApiKey')
  }, [aiProvider, geminiKey, ollamaApiKey, ollamaConnectionMode, ollamaBaseUrl, ollamaCustomTextModel, ollamaCustomVisionModel, ollamaTextModel, ollamaVisionModel])

  useEffect(() => {
    localStorage.setItem('resumeTheme', selectedTheme)
  }, [selectedTheme])

  const handleReset = () => {
    if (window.confirm("Are you sure you want to completely reset all your resume data? This cannot be undone.")) {
      setResumeData(createEmptyResumeData());
      setPreviousAiResumeData(null);
      setJobDescription('');
    }
  }

  const saveAiSnapshot = (sourceResumeData = resumeData) => {
    setPreviousAiResumeData(cloneResumeData(sourceResumeData))
  }

  const revertAiEdit = () => {
    if (!previousAiResumeData) return

    setResumeData(cloneResumeData(previousAiResumeData))
    setPreviousAiResumeData(null)
  }

  const handlePrint = async () => {
    const resumeNode = resumeExportRef.current?.querySelector('.resume-preview')
    let exportShell = null

    if (!resumeNode || isExportingPdf) {
      return
    }

    setIsExportingPdf(true)

    try {
      const fileName = sanitizePdfFileName(resumeData.personalInfo.name)
      const [{ default: html2pdf }, { Capacitor }] = await Promise.all([
        import('html2pdf.js'),
        import('@capacitor/core'),
      ])
      const exportClone = resumeNode.cloneNode(true)
      exportClone.style.width = '210mm'
      exportClone.style.minHeight = '297mm'
      exportClone.style.margin = '0'
      exportClone.style.borderRadius = '0'
      exportClone.style.boxShadow = 'none'

      exportShell = document.createElement('div')
      exportShell.style.position = 'fixed'
      exportShell.style.left = '-99999px'
      exportShell.style.top = '0'
      exportShell.style.width = '210mm'
      exportShell.style.background = '#ffffff'
      exportShell.appendChild(exportClone)
      document.body.appendChild(exportShell)

      const pdfWorker = html2pdf()
        .set({
          margin: 0,
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
          },
          pagebreak: {
            mode: ['css', 'legacy'],
          },
        })
        .from(exportClone)

      if (Capacitor.isNativePlatform()) {
        const [{ Filesystem, Directory }, { Share }] = await Promise.all([
          import('@capacitor/filesystem'),
          import('@capacitor/share'),
        ])
        const pdfBlob = await pdfWorker.outputPdf('blob')
        const pdfBase64 = await blobToBase64(pdfBlob)
        const { uri } = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache,
          recursive: true,
        })

        await Share.share({
          title: fileName,
          text: 'Exported resume PDF',
          url: uri,
          dialogTitle: 'Export PDF',
        })
      } else {
        await pdfWorker.save()
      }
    } catch (err) {
      alert(`Error exporting PDF: ${err.message}`)
    } finally {
      if (exportShell?.parentNode) {
        exportShell.parentNode.removeChild(exportShell)
      }
      setIsExportingPdf(false)
    }
  }

  const resetOllamaModelsToRecommended = () => {
    setOllamaTextModel(defaultOllamaTextModel)
    setOllamaVisionModel(defaultOllamaVisionModel)
    setOllamaCustomTextModel('')
    setOllamaCustomVisionModel('')
  }

  const handleTestOllamaConnection = async () => {
    setIsTestingOllama(true)
    setOllamaTestStatus(null)

    try {
      const result = await testOllamaConnection({
        provider: 'ollama',
        ollamaConnectionMode,
        ollamaBaseUrl,
        ollamaApiKey,
        ollamaTextModel,
        ollamaCustomTextModel,
      })

      setOllamaTestStatus({
        type: 'success',
        message: result.message,
      })
    } catch (err) {
      setOllamaTestStatus({
        type: 'error',
        message: err.message,
      })
    } finally {
      setIsTestingOllama(false)
    }
  }

  const selectedOllamaTextPreset = ollamaTextModelPresets.find((model) => model.id === ollamaTextModel)
  const selectedOllamaVisionPreset = ollamaVisionModelPresets.find((model) => model.id === ollamaVisionModel)

  return (
    <div className="app-container">
      {/* Header - Hidden on Print */}
      <header className="app-header glass-panel no-print">
        <div className="logo">
          <div className="logo-icon">ATS</div>
          <h1>ResumePro <span>Builder</span></h1>
        </div>
        
        <div className="header-actions">
          <button className="btn-icon" onClick={handleReset} title="Reset Entire Resume" style={{color: '#ef4444'}}>
            <Trash2 size={20} />
          </button>
          <button className="btn-icon" onClick={() => setIsSettingsOpen(true)} title="Settings (AI Provider & API Keys)">
            <Settings size={20} />
          </button>
          <button className="btn-primary" onClick={handlePrint} disabled={isExportingPdf}>
            {isExportingPdf ? <Loader2 size={18} className="spin" /> : <FileDown size={18} />}
            <span>{isExportingPdf ? 'Exporting PDF...' : 'Export PDF'}</span>
          </button>
          <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <main className="app-main">
        {/* Sidebar/Editor - Hidden on Print */}
        <aside className={`app-sidebar no-print ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-content">
            <h2 className="section-title">Job Match (ATS)</h2>
            <AtsChecker 
              resumeData={resumeData} 
              setResumeData={setResumeData}
              jobDescription={jobDescription} 
              setJobDescription={setJobDescription} 
              aiConfig={{ provider: aiProvider, geminiKey, ollamaApiKey, ollamaConnectionMode, ollamaBaseUrl, ollamaTextModel, ollamaVisionModel, ollamaCustomTextModel, ollamaCustomVisionModel }}
              setIsSettingsOpen={setIsSettingsOpen}
              previousAiResumeData={previousAiResumeData}
              onSaveAiSnapshot={saveAiSnapshot}
              onRevertAiEdit={revertAiEdit}
            />

            <ResumeChat
              resumeData={resumeData}
              setResumeData={setResumeData}
              jobDescription={jobDescription}
              aiConfig={{ provider: aiProvider, geminiKey, ollamaApiKey, ollamaConnectionMode, ollamaBaseUrl, ollamaTextModel, ollamaVisionModel, ollamaCustomTextModel, ollamaCustomVisionModel }}
              setIsSettingsOpen={setIsSettingsOpen}
              canRevertAiEdit={Boolean(previousAiResumeData)}
              onSaveAiSnapshot={saveAiSnapshot}
              onRevertAiEdit={revertAiEdit}
            />

            <ThemeStudio
              resumeData={resumeData}
              jobDescription={jobDescription}
              selectedTheme={selectedTheme}
              onThemeChange={setSelectedTheme}
              aiConfig={{ provider: aiProvider, geminiKey, ollamaApiKey, ollamaConnectionMode, ollamaBaseUrl, ollamaTextModel, ollamaVisionModel, ollamaCustomTextModel, ollamaCustomVisionModel }}
              setIsSettingsOpen={setIsSettingsOpen}
            />
            
            <h2 className="section-title" style={{marginTop: '2rem'}}>Editor</h2>
            <Editor resumeData={resumeData} setResumeData={setResumeData} aiConfig={{ provider: aiProvider, geminiKey, ollamaApiKey, ollamaConnectionMode, ollamaBaseUrl, ollamaTextModel, ollamaVisionModel, ollamaCustomTextModel, ollamaCustomVisionModel }} setIsSettingsOpen={setIsSettingsOpen} />
          </div>
        </aside>
        {mobileMenuOpen && (
          <button
            type="button"
            className="sidebar-backdrop no-print"
            aria-label="Close sidebar"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Preview Area - Takes full width on print */}
        <section className="app-preview" onClick={() => mobileMenuOpen && setMobileMenuOpen(false)}>
          <div className="preview-container" ref={resumeExportRef}>
            <Preview data={resumeData} theme={selectedTheme} />
          </div>
        </section>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h2>Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)}><X size={20}/></button>
            </div>
            <div className="modal-body">
              <label>AI Provider</label>
              <select 
                value={aiProvider} 
                onChange={(e) => setAiProvider(e.target.value)}
                style={{ width: '100%', marginTop: '8px', marginBottom: '16px', padding: '10px', background: 'var(--bg-input)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px' }}
              >
                <option value="gemini">Google Gemini (2.5 Flash)</option>
                <option value="ollama">Ollama Cloud</option>
              </select>

              {aiProvider === 'gemini' ? (
                <>
                  <label>Google Gemini API Key</label>
                  <input 
                    type="password" 
                    placeholder="AIzaSy..." 
                    value={geminiKey} 
                    onChange={(e) => setGeminiKey(e.target.value)} 
                    style={{ width: '100%', marginTop: '8px' }}
                  />
                </>
              ) : (
                <>
                  <label>Ollama Connection</label>
                  <select
                    value={ollamaConnectionMode}
                    onChange={(e) => setOllamaConnectionMode(e.target.value)}
                    style={{ width: '100%', marginTop: '8px', marginBottom: '12px', padding: '10px', background: 'var(--bg-input)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                  >
                    <option value="local">Local Bridge (Recommended)</option>
                    <option value="cloud">Direct Cloud API</option>
                  </select>
                  {ollamaConnectionMode === 'local' ? (
                    <>
                      <label>Ollama Base URL</label>
                      <input
                        type="text"
                        placeholder="http://localhost:11434"
                        value={ollamaBaseUrl}
                        onChange={(e) => setOllamaBaseUrl(e.target.value)}
                        style={{ width: '100%', marginTop: '8px', marginBottom: '12px' }}
                      />
                      <p className="modal-helper-text" style={{ marginTop: '-4px', marginBottom: '12px' }}>
                        Recommended for browser use. Run `ollama serve` and `ollama signin`, then the app can use cloud models through your local Ollama app.
                      </p>
                    </>
                  ) : (
                    <>
                      <label>Ollama API Key</label>
                      <input 
                        type="password" 
                        placeholder="sk-..." 
                        value={ollamaApiKey} 
                        onChange={(e) => setOllamaApiKey(e.target.value)} 
                        style={{ width: '100%', marginTop: '8px', marginBottom: '12px' }}
                      />
                    </>
                  )}
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={resetOllamaModelsToRecommended}
                    style={{
                      width: '100%',
                      height: 'auto',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      marginBottom: '12px',
                      border: '1px solid rgba(79, 172, 254, 0.22)',
                      background: 'rgba(79, 172, 254, 0.08)',
                      color: '#b9e6ff'
                    }}
                  >
                    Reset to Recommended Models
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={handleTestOllamaConnection}
                    disabled={isTestingOllama}
                    style={{
                      width: '100%',
                      height: 'auto',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      marginBottom: '12px',
                      border: '1px solid rgba(16, 185, 129, 0.22)',
                      background: 'rgba(16, 185, 129, 0.08)',
                      color: '#9ff0cb'
                    }}
                  >
                    {isTestingOllama ? <><Loader2 size={16} className="spin" /> Testing Connection...</> : 'Test Ollama Connection'}
                  </button>
                  {ollamaTestStatus && (
                    <p
                      className="modal-helper-text"
                      style={{
                        marginTop: '-4px',
                        marginBottom: '12px',
                        color: ollamaTestStatus.type === 'success' ? '#86efac' : '#fca5a5'
                      }}
                    >
                      {ollamaTestStatus.message}
                    </p>
                  )}
                  <label>Ollama Text Model</label>
                  <select
                    value={ollamaTextModel}
                    onChange={(e) => setOllamaTextModel(e.target.value)}
                    style={{ width: '100%', marginTop: '8px', marginBottom: '12px' }}
                  >
                    {ollamaTextModelPresets.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}{model.recommended ? ' (Recommended)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="modal-helper-text" style={{ marginTop: '-4px', marginBottom: '12px' }}>
                    {selectedOllamaTextPreset?.recommended ? 'Recommended for chat, ATS optimization, and theme suggestions. ' : 'Used for chat, ATS optimization, and theme suggestions. '}
                    {selectedOllamaTextPreset?.tagline}
                  </p>
                  <label>Custom Text Model Override</label>
                  <input
                    type="text"
                    placeholder="Leave blank to use selected preset"
                    value={ollamaCustomTextModel}
                    onChange={(e) => setOllamaCustomTextModel(e.target.value)}
                    style={{ width: '100%', marginTop: '8px', marginBottom: '12px' }}
                  />
                  <label>Ollama Vision Model</label>
                  <select
                    value={ollamaVisionModel}
                    onChange={(e) => setOllamaVisionModel(e.target.value)}
                    style={{ width: '100%', marginTop: '8px' }}
                  >
                    {ollamaVisionModelPresets.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}{model.recommended ? ' (Recommended)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="modal-helper-text" style={{ marginTop: '8px' }}>
                    {selectedOllamaVisionPreset?.recommended ? 'Recommended for image import and resume parsing. ' : 'Used for image import and resume parsing. '}
                    {selectedOllamaVisionPreset?.tagline}
                  </p>
                  <label>Custom Vision Model Override</label>
                  <input
                    type="text"
                    placeholder="Leave blank to use selected preset"
                    value={ollamaCustomVisionModel}
                    onChange={(e) => setOllamaCustomVisionModel(e.target.value)}
                    style={{ width: '100%', marginTop: '8px' }}
                  />
                </>
              )}
              <p className="modal-helper-text">Required to use AI features. Your keys, connection settings, and preferred models stay in browser local storage.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
