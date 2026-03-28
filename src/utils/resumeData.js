export const createEmptyResumeData = () => ({
  personalInfo: {
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    website: '',
    summary: '',
  },
  experience: [],
  education: [],
  skills: '',
  projects: [],
})

export const cloneResumeData = (resumeData) => JSON.parse(JSON.stringify(resumeData))

export const createExperienceItem = () => ({
  id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  company: '',
  role: '',
  startDate: '',
  endDate: '',
  projectName: '',
  client: '',
  testingPlatform: '',
  description: '',
})

export const createEducationItem = () => ({
  id: `edu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  institution: '',
  degree: '',
  year: '',
})

export const createProjectItem = () => ({
  id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  description: '',
  link: '',
  relatedExperienceId: '',
})

const normalizeArray = (value) => (Array.isArray(value) ? value : [])

const labeledFieldPatterns = [
  { key: 'projectName', pattern: /^project\s*:\s*(.+)$/i },
  { key: 'client', pattern: /^client\s*:\s*(.+)$/i },
  { key: 'testingPlatform', pattern: /^(testing platforms?|platforms?)\s*:\s*(.+)$/i },
]

const extractExperienceDetails = (experienceItem = {}) => {
  const normalizedExperience = {
    ...createExperienceItem(),
    ...experienceItem,
  }

  const lines = String(normalizedExperience.description || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const remainingLines = []

  lines.forEach((line) => {
    const matchedPattern = labeledFieldPatterns.find(({ pattern }) => pattern.test(line))

    if (!matchedPattern) {
      if (!/^responsibilities\s*:?$/i.test(line)) {
        remainingLines.push(line)
      }
      return
    }

    const match = line.match(matchedPattern.pattern)
    const extractedValue = match?.[match.length - 1]?.trim() || ''

    if (extractedValue && !normalizedExperience[matchedPattern.key]) {
      normalizedExperience[matchedPattern.key] = extractedValue
      return
    }

    if (!/^responsibilities\s*:?$/i.test(line)) {
      remainingLines.push(line)
    }
  })

  normalizedExperience.description = remainingLines.join('\n')

  return normalizedExperience
}

export const normalizeResumeData = (resumeData = {}) => {
  const emptyResume = createEmptyResumeData()
  const personalInfo = resumeData.personalInfo || {}
  const experience = normalizeArray(resumeData.experience).map(extractExperienceDetails)
  const experienceIds = new Set(experience.map((item) => item?.id).filter(Boolean))
  const projects = normalizeArray(resumeData.projects).map((project) => ({
    ...createProjectItem(),
    ...project,
    relatedExperienceId: experienceIds.has(project?.relatedExperienceId)
      ? project.relatedExperienceId
      : '',
  }))

  return {
    personalInfo: {
      ...emptyResume.personalInfo,
      ...personalInfo,
    },
    experience,
    education: normalizeArray(resumeData.education),
    skills: typeof resumeData.skills === 'string' ? resumeData.skills : '',
    projects,
  }
}
