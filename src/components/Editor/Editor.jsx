import { useState, useRef } from 'react'
import { Briefcase, GraduationCap, User, Wrench, FolderGit2, ChevronDown, ChevronRight, Upload, Loader2, Plus, Trash2, Sparkles } from 'lucide-react'
import { cleanResumeFormattingWithAI, parseResumeFromImage } from '../../utils/aiParser'
import { createEducationItem, createExperienceItem, createProjectItem, normalizeResumeData } from '../../utils/resumeData'
import './Editor.css'

const Section = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className={`editor-section glass-panel ${isOpen ? 'is-open' : ''}`}>
      <button className="section-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="section-title-wrap">
          <Icon className="section-icon" size={20} />
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronDown size={20} className="text-secondary" /> : <ChevronRight size={20} className="text-secondary" />}
      </button>
      {isOpen && <div className="section-body">{children}</div>}
    </div>
  )
}

function Editor({ resumeData, setResumeData, aiConfig, setIsSettingsOpen }) {
  const [isParsing, setIsParsing] = useState(false)
  const [isCleaningImportedResume, setIsCleaningImportedResume] = useState(false)
  const [cleanupStatusMessage, setCleanupStatusMessage] = useState('')
  const fileInputRef = useRef(null)
  const experienceOptions = resumeData.experience.map((exp, index) => ({
    id: exp.id,
    label: exp.company || exp.role || `Experience ${index + 1}`,
  }))

  const updateArrayItem = (section, index, field, value) => {
    setResumeData((prev) => {
      const nextItems = [...prev[section]]
      nextItems[index] = { ...nextItems[index], [field]: value }
      return { ...prev, [section]: nextItems }
    })
  }

  const addArrayItem = (section, factory) => {
    setResumeData((prev) => ({
      ...prev,
      [section]: [...prev[section], factory()],
    }))
  }

  const removeArrayItem = (section, index) => {
    setResumeData((prev) => ({
      ...prev,
      [section]: prev[section].filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    
    // Clear the input value so selecting the same file again triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (!file) return
    
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

    setIsParsing(true)
    setCleanupStatusMessage('')
    
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const parsedData = await parseResumeFromImage(reader.result, file.type, aiConfig)
          setResumeData(normalizeResumeData(parsedData))
          setCleanupStatusMessage('Imported resume data. If any lines still look merged, use AI Cleanup below.')
        } catch (err) {
          alert("Error parsing resume: " + err.message)
        } finally {
          setIsParsing(false)
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
      }
      reader.readAsDataURL(file)
    } catch (e) {
      setIsParsing(false)
      alert("Error reading file")
    }
  }

  const handleAiCleanup = async () => {
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

    setIsCleaningImportedResume(true)
    setCleanupStatusMessage('')

    try {
      const result = await cleanResumeFormattingWithAI(resumeData, aiConfig)
      setResumeData(normalizeResumeData(result.cleanedResume))
      setCleanupStatusMessage(result.assistantMessage || 'Cleaned up parsed resume formatting and structure.')
    } catch (err) {
      alert('Error cleaning parsed resume: ' + err.message)
    } finally {
      setIsCleaningImportedResume(false)
    }
  }

  const updatePersonal = (e) => {
    const { name, value } = e.target
    setResumeData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [name]: value }
    }))
  }

  const handleSkillsChange = (e) => {
    setResumeData(prev => ({
      ...prev,
      skills: e.target.value
    }))
  }

  return (
    <div className="editor-container">
      <div className="import-section glass-panel" style={{ padding: '16px', marginBottom: '8px' }}>
        <input 
          type="file" 
          accept="image/png, image/jpeg, image/webp" 
          ref={fileInputRef} 
          style={{display: 'none'}} 
          onChange={handleFileUpload} 
        />
        <button 
          className="btn-primary" 
          style={{width: '100%', justifyContent: 'center'}}
          onClick={() => fileInputRef.current?.click()}
          disabled={isParsing}
        >
          {isParsing ? <><Loader2 className="spin" size={18}/> Analyzing Resume...</> : <><Upload size={18} /> Auto-Fill from Image (AI)</>}
        </button>
        <button
          type="button"
          className="section-add-button editor-ai-cleanup-button"
          onClick={handleAiCleanup}
          disabled={isParsing || isCleaningImportedResume}
        >
          {isCleaningImportedResume ? <><Loader2 className="spin" size={16} /> Cleaning Layout...</> : <><Sparkles size={16} /> Clean Up Parsed Resume with AI</>}
        </button>
        <p className="editor-helper-text">
          Use this after image import if headers, bullets, or section lines were merged together.
        </p>
        {cleanupStatusMessage && (
          <div className="editor-cleanup-status">
            {cleanupStatusMessage}
          </div>
        )}
      </div>

      <Section title="Personal Info" icon={User} defaultOpen>
        <div className="input-group">
          <label>Full Name</label>
          <input type="text" name="name" value={resumeData.personalInfo.name} onChange={updatePersonal} placeholder="Jane Doe" />
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>Email</label>
            <input type="email" name="email" value={resumeData.personalInfo.email} onChange={updatePersonal} placeholder="jane@email.com" />
          </div>
          <div className="input-group">
            <label>Phone</label>
            <input type="text" name="phone" value={resumeData.personalInfo.phone} onChange={updatePersonal} placeholder="+1 555 123 4567" />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>Location</label>
            <input type="text" name="location" value={resumeData.personalInfo.location} onChange={updatePersonal} placeholder="San Francisco, CA" />
          </div>
          <div className="input-group">
            <label>LinkedIn</label>
            <input type="text" name="linkedin" value={resumeData.personalInfo.linkedin} onChange={updatePersonal} placeholder="linkedin.com/in/janedoe" />
          </div>
        </div>
        <div className="input-group">
          <label>Website / Portfolio</label>
          <input type="text" name="website" value={resumeData.personalInfo.website} onChange={updatePersonal} placeholder="janedoe.dev" />
        </div>
        <div className="input-group">
          <label>Professional Summary</label>
          <textarea name="summary" value={resumeData.personalInfo.summary} onChange={updatePersonal} rows={4} placeholder="Results-driven professional with experience in..." />
        </div>
      </Section>

      <Section title="Experience" icon={Briefcase}>
        {resumeData.experience.length === 0 && (
          <div className="section-empty-state">No experience added yet. Add jobs, internships, or freelance work here.</div>
        )}
        {resumeData.experience.map((exp, index) => (
          <div key={exp.id} className="item-card">
            <div className="item-card__toolbar">
              <span className="item-card__title">Experience {index + 1}</span>
              <button type="button" className="item-card__remove" onClick={() => removeArrayItem('experience', index)}>
                <Trash2 size={14} /> Remove
              </button>
            </div>
            <div className="input-group">
              <label>Role</label>
              <input type="text" value={exp.role} onChange={(e) => updateArrayItem('experience', index, 'role', e.target.value)} placeholder="Senior Frontend Engineer" />
            </div>
            <div className="input-group">
              <label>Company</label>
              <input type="text" value={exp.company} onChange={(e) => updateArrayItem('experience', index, 'company', e.target.value)} placeholder="Acme Technologies" />
            </div>
            <div className="input-row">
              <div className="input-group">
                <label>Start Date</label>
                <input type="text" value={exp.startDate} onChange={(e) => updateArrayItem('experience', index, 'startDate', e.target.value)} placeholder="Jan 2022" />
              </div>
              <div className="input-group">
                <label>End Date</label>
                <input type="text" value={exp.endDate} onChange={(e) => updateArrayItem('experience', index, 'endDate', e.target.value)} placeholder="Present" />
              </div>
            </div>
            <div className="input-group">
              <label>Project Name</label>
              <input type="text" value={exp.projectName || ''} onChange={(e) => updateArrayItem('experience', index, 'projectName', e.target.value)} placeholder="Jupiter - Bankline" />
            </div>
            <div className="input-row">
              <div className="input-group">
                <label>Client</label>
                <input type="text" value={exp.client || ''} onChange={(e) => updateArrayItem('experience', index, 'client', e.target.value)} placeholder="NatWest" />
              </div>
              <div className="input-group">
                <label>Testing Platform</label>
                <input type="text" value={exp.testingPlatform || ''} onChange={(e) => updateArrayItem('experience', index, 'testingPlatform', e.target.value)} placeholder="Web" />
              </div>
            </div>
            <div className="input-group">
              <label>Description (bullet points)</label>
              <textarea value={exp.description} onChange={(e) => updateArrayItem('experience', index, 'description', e.target.value)} rows={4} placeholder="- Improved page speed by 35%&#10;- Built reusable design system components&#10;- Collaborated with product and backend teams" />
            </div>
          </div>
        ))}
        <button type="button" className="section-add-button" onClick={() => addArrayItem('experience', createExperienceItem)}>
          <Plus size={16} /> Add Experience
        </button>
      </Section>

      <Section title="Education" icon={GraduationCap}>
        {resumeData.education.length === 0 && (
          <div className="section-empty-state">No education added yet. Add your degree, institution, or certification.</div>
        )}
        {resumeData.education.map((edu, index) => (
          <div key={edu.id} className="item-card">
            <div className="item-card__toolbar">
              <span className="item-card__title">Education {index + 1}</span>
              <button type="button" className="item-card__remove" onClick={() => removeArrayItem('education', index)}>
                <Trash2 size={14} /> Remove
              </button>
            </div>
            <div className="input-group">
              <label>Degree</label>
              <input type="text" value={edu.degree} onChange={(e) => updateArrayItem('education', index, 'degree', e.target.value)} placeholder="B.Tech in Computer Science" />
            </div>
            <div className="input-group">
              <label>Institution</label>
              <input type="text" value={edu.institution} onChange={(e) => updateArrayItem('education', index, 'institution', e.target.value)} placeholder="University of California" />
            </div>
            <div className="input-group">
              <label>Year</label>
              <input type="text" value={edu.year} onChange={(e) => updateArrayItem('education', index, 'year', e.target.value)} placeholder="2024" />
            </div>
          </div>
        ))}
        <button type="button" className="section-add-button" onClick={() => addArrayItem('education', createEducationItem)}>
          <Plus size={16} /> Add Education
        </button>
      </Section>

      <Section title="Skills" icon={Wrench}>
         <div className="input-group">
          <label>Skills (Comma separated)</label>
          <textarea value={resumeData.skills} onChange={handleSkillsChange} rows={3} placeholder="React, Node.js, Python..." />
        </div>
      </Section>

      <Section title="Projects" icon={FolderGit2}>
        {resumeData.projects.length === 0 && (
          <div className="section-empty-state">No projects added yet. Add portfolio projects, research, or case studies.</div>
        )}
        {resumeData.projects.map((proj, index) => (
          <div key={proj.id} className="item-card">
            <div className="item-card__toolbar">
              <span className="item-card__title">Project {index + 1}</span>
              <button type="button" className="item-card__remove" onClick={() => removeArrayItem('projects', index)}>
                <Trash2 size={14} /> Remove
              </button>
            </div>
            <div className="input-group">
              <label>Project Name</label>
              <input type="text" value={proj.name} onChange={(e) => updateArrayItem('projects', index, 'name', e.target.value)} placeholder="AI Resume Builder" />
            </div>
            <div className="input-group">
              <label>Project Link</label>
              <input type="text" value={proj.link} onChange={(e) => updateArrayItem('projects', index, 'link', e.target.value)} placeholder="github.com/janedoe/resume-builder" />
            </div>
            <div className="input-group">
              <label>Attach to Experience</label>
              <select
                value={proj.relatedExperienceId || ''}
                onChange={(e) => updateArrayItem('projects', index, 'relatedExperienceId', e.target.value)}
              >
                <option value="">Standalone Project</option>
                {experienceOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>What You Worked On</label>
              <textarea value={proj.description} onChange={(e) => updateArrayItem('projects', index, 'description', e.target.value)} rows={3} placeholder="Built a multi-model resume builder with AI parsing, ATS optimization, and theme selection." />
            </div>
          </div>
        ))}
        <button type="button" className="section-add-button" onClick={() => addArrayItem('projects', createProjectItem)}>
          <Plus size={16} /> Add Project
        </button>
      </Section>
    </div>
  )
}

export default Editor
