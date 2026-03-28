import './Preview.css'
import { Mail, Phone, MapPin, Globe, Link as LinkIcon } from 'lucide-react'

function Preview({ data, theme = 'classic' }) {
  const { personalInfo, experience, education, skills, projects } = data

  const skillsList = skills.split(',').map(s => s.trim()).filter(Boolean)
  const standaloneProjects = projects.filter((project) => !project.relatedExperienceId)
  const getBulletLines = (value) => {
    const seen = new Set()

    return (value || '')
      .split('\n')
      .map((line) => {
        const leadingWhitespace = line.match(/^\s*/)?.[0].length || 0
        const trimmedLine = line.trim()
        const markerMatch = trimmedLine.match(/^([\-•*o]|[a-zA-Z0-9]+[.)])\s+/)
        const cleanedText = trimmedLine.replace(/^([\-•*o]|[a-zA-Z0-9]+[.)])\s+/, '').trim()
        const markerLevel = /^[a-zA-Z0-9]+[.)]\s+/.test(trimmedLine) ? 1 : 0
        const indentLevel = Math.min(3, Math.floor(leadingWhitespace / 2) + markerLevel)

        return {
          text: cleanedText,
          indentLevel,
          key: `${cleanedText.toLowerCase()}-${indentLevel}`,
        }
      })
      .filter((line) => line.text)
      .filter((line) => {
        if (seen.has(line.key)) {
          return false
        }
        seen.add(line.key)
        return true
      })
      .filter(Boolean)
  }
  const formatDateRange = (startDate, endDate) => {
    if (startDate && endDate) return `${startDate} - ${endDate}`
    if (startDate) return startDate
    if (endDate) return endDate
    return ''
  }
  const getExperienceMeta = (exp) => ([
    exp.projectName ? { label: 'Project', value: exp.projectName, highlight: true } : null,
    exp.client ? { label: 'Client', value: exp.client } : null,
    exp.testingPlatform ? { label: 'Platform', value: exp.testingPlatform } : null,
  ].filter(Boolean))

  return (
    <div className={`resume-preview theme-${theme}`}>
      <header className="resume-header">
        <h1 className="resume-name">{personalInfo.name}</h1>
        <div className="resume-contact">
          {personalInfo.email && <div className="contact-item"><Mail size={12} /><span>{personalInfo.email}</span></div>}
          {personalInfo.phone && <div className="contact-item"><Phone size={12} /><span>{personalInfo.phone}</span></div>}
          {personalInfo.location && <div className="contact-item"><MapPin size={12} /><span>{personalInfo.location}</span></div>}
          {personalInfo.linkedin && <div className="contact-item"><LinkIcon size={12} /><span>{personalInfo.linkedin}</span></div>}
          {personalInfo.website && <div className="contact-item"><Globe size={12} /><span>{personalInfo.website}</span></div>}
        </div>
        {personalInfo.summary && (
          <div className="resume-summary">
            {personalInfo.summary}
          </div>
        )}
      </header>

      <div className="resume-body">
        {experience.length > 0 && (
          <section className="resume-section">
            <h2 className="section-title">Experience</h2>
            <div className="section-content">
              {experience.map(exp => (
                <div key={exp.id} className="experience-item">
                  {getExperienceMeta(exp).length > 0 && (
                    <div className="experience-meta-row">
                      {getExperienceMeta(exp).map((meta) => (
                        <div
                          key={`${exp.id}-${meta.label}`}
                          className={`experience-meta-chip${meta.highlight ? ' experience-meta-chip--highlight' : ''}`}
                        >
                          <span className="experience-meta-chip__label">{meta.label}</span>
                          <span className="experience-meta-chip__value">{meta.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="item-header">
                    <h3 className="item-title">{exp.role}</h3>
                    {formatDateRange(exp.startDate, exp.endDate) && (
                      <span className="item-dates">{formatDateRange(exp.startDate, exp.endDate)}</span>
                    )}
                  </div>
                  <h4 className="item-subtitle">{exp.company}</h4>
                  {exp.description && (
                    <ul className="item-bullets">
                      {getBulletLines(exp.description).map((bullet, i) => (
                        <li
                          key={i}
                          className={bullet.indentLevel > 0 ? `sub-bullet indent-${bullet.indentLevel}` : ''}
                        >
                          {bullet.text}
                        </li>
                      ))}
                    </ul>
                  )}

                  {projects.some((project) => project.relatedExperienceId === exp.id) && (
                    <div className="experience-projects">
                      <h3 className="experience-projects__title">Projects</h3>
                      <div className="experience-projects__list">
                        {projects
                          .filter((project) => project.relatedExperienceId === exp.id)
                          .map((proj) => (
                            <div key={proj.id} className="project-inline-item">
                              <div className="item-header">
                                <h4 className="item-title project-inline-item__title">{proj.name}</h4>
                                {proj.link && <span className="item-dates">{proj.link}</span>}
                              </div>
                              {proj.description && (
                                <p className="item-desc">{proj.description}</p>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {standaloneProjects.length > 0 && (
          <section className="resume-section">
            <h2 className="section-title">Projects</h2>
            <div className="section-content">
              {standaloneProjects.map((proj) => (
                <div key={proj.id} className="experience-item">
                  <div className="item-header">
                    <h3 className="item-title">{proj.name}</h3>
                    {proj.link && <span className="item-dates">{proj.link}</span>}
                  </div>
                  {proj.description && (
                    <p className="item-desc">{proj.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {education.length > 0 && (
          <section className="resume-section">
            <h2 className="section-title">Education</h2>
            <div className="section-content">
              {education.map(edu => (
                <div key={edu.id} className="education-item">
                  <div className="item-header">
                    <h3 className="item-title">{edu.degree}</h3>
                    <span className="item-dates">{edu.year}</span>
                  </div>
                  <h4 className="item-subtitle">{edu.institution}</h4>
                </div>
              ))}
            </div>
          </section>
        )}

        {skillsList.length > 0 && (
          <section className="resume-section">
            <h2 className="section-title">Skills</h2>
            <div className="section-content skills-container">
              {skillsList.map((skill, i) => (
                <span key={i} className="skill-badge">{skill}</span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default Preview
