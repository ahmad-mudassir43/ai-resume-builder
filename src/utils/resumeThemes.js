export const resumeThemes = [
  {
    id: 'classic',
    name: 'Classic',
    tagline: 'Clean and familiar for general applications.',
  },
  {
    id: 'executive',
    name: 'Executive',
    tagline: 'Sharp serif styling for leadership and business roles.',
  },
  {
    id: 'modern',
    name: 'Modern',
    tagline: 'Tech-forward layout with stronger accent color.',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    tagline: 'Quiet, understated presentation with low visual noise.',
  },
]

export const defaultResumeTheme = resumeThemes[0].id

export const getResumeTheme = (themeId) =>
  resumeThemes.find((theme) => theme.id === themeId) || resumeThemes[0]
