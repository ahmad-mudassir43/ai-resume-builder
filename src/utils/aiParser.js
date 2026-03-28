const cleanJsonString = (textResponse) => {
  let cleanJsonStr = textResponse.trim();

  if (cleanJsonStr.startsWith('\`\`\`json')) {
    cleanJsonStr = cleanJsonStr.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
  } else if (cleanJsonStr.startsWith('\`\`\`')) {
    cleanJsonStr = cleanJsonStr.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
  }

  return cleanJsonStr;
};

const extractJsonPayload = (textResponse) => {
  const cleanText = cleanJsonString(textResponse)
  const firstBraceIndex = cleanText.search(/[\{\[]/)

  if (firstBraceIndex === -1) {
    return cleanText
  }

  const openingChar = cleanText[firstBraceIndex]
  const closingChar = openingChar === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let isEscaped = false

  for (let index = firstBraceIndex; index < cleanText.length; index += 1) {
    const char = cleanText[index]

    if (inString) {
      if (isEscaped) {
        isEscaped = false
      } else if (char === '\\') {
        isEscaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === openingChar) {
      depth += 1
    } else if (char === closingChar) {
      depth -= 1
      if (depth === 0) {
        return cleanText.slice(firstBraceIndex, index + 1)
      }
    }
  }

  return cleanText.slice(firstBraceIndex)
}

const escapeControlCharactersInStrings = (jsonText) => {
  let result = ''
  let inString = false
  let isEscaped = false

  for (let index = 0; index < jsonText.length; index += 1) {
    const char = jsonText[index]

    if (inString) {
      if (isEscaped) {
        result += char
        isEscaped = false
        continue
      }

      if (char === '\\') {
        result += char
        isEscaped = true
        continue
      }

      if (char === '"') {
        result += char
        inString = false
        continue
      }

      if (char === '\n') {
        result += '\\n'
        continue
      }

      if (char === '\r') {
        result += '\\r'
        continue
      }

      if (char === '\t') {
        result += '\\t'
        continue
      }

      const charCode = char.charCodeAt(0)
      if (charCode < 32) {
        result += `\\u${charCode.toString(16).padStart(4, '0')}`
        continue
      }
    } else if (char === '"') {
      inString = true
    }

    result += char
  }

  return result
}

const parseJsonResponse = (textResponse) => {
  const extractedJson = extractJsonPayload(textResponse)

  try {
    return JSON.parse(extractedJson)
  } catch {
    return JSON.parse(escapeControlCharactersInStrings(extractedJson))
  }
}

const parseScoreEstimate = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)))
  }

  if (typeof value === 'string') {
    const match = value.match(/-?\d+(\.\d+)?/)
    if (!match) {
      return null
    }

    const parsedNumber = Number(match[0])
    if (Number.isFinite(parsedNumber)) {
      return Math.max(0, Math.min(100, Math.round(parsedNumber)))
    }
  }

  return null
}

const isNonEmptyValue = (value) => {
  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  return value !== null && value !== undefined
}

const mergeNamedFields = (originalItem = {}, cleanedItem = {}, fieldNames = []) => {
  const mergedItem = {
    ...originalItem,
    ...cleanedItem,
  }

  fieldNames.forEach((fieldName) => {
    if (!isNonEmptyValue(cleanedItem?.[fieldName]) && isNonEmptyValue(originalItem?.[fieldName])) {
      mergedItem[fieldName] = originalItem[fieldName]
    }
  })

  return mergedItem
}

const mergeResumeCleanupResult = (originalResume = {}, cleanedResume = {}) => {
  const originalPersonalInfo = originalResume.personalInfo || {}
  const cleanedPersonalInfo = cleanedResume.personalInfo || {}
  const normalizedCleanedSkills = typeof cleanedResume.skills === 'string'
    ? cleanedResume.skills
    : Array.isArray(cleanedResume.skills)
      ? cleanedResume.skills
        .map((skill) => typeof skill === 'string' ? skill.trim() : '')
        .filter(Boolean)
        .join(', ')
      : ''

  const experienceFieldNames = ['id', 'company', 'role', 'startDate', 'endDate', 'projectName', 'client', 'testingPlatform', 'description']
  const educationFieldNames = ['id', 'institution', 'degree', 'year']
  const projectFieldNames = ['id', 'name', 'description', 'link', 'relatedExperienceId']

  const mergeArrayById = (originalItems = [], cleanedItems = [], fieldNames = []) => {
    const cleanedById = new Map(cleanedItems.map((item) => [item?.id, item]))
    const mergedItems = originalItems.map((originalItem) => {
      const cleanedItem = originalItem?.id ? cleanedById.get(originalItem.id) : null
      return cleanedItem
        ? mergeNamedFields(originalItem, cleanedItem, fieldNames)
        : originalItem
    })

    cleanedItems.forEach((cleanedItem) => {
      if (!cleanedItem?.id || !originalItems.some((originalItem) => originalItem?.id === cleanedItem.id)) {
        mergedItems.push(cleanedItem)
      }
    })

    return mergedItems
  }

  return {
    personalInfo: mergeNamedFields(originalPersonalInfo, cleanedPersonalInfo, ['name', 'email', 'phone', 'location', 'linkedin', 'website', 'summary']),
    skills: isNonEmptyValue(normalizedCleanedSkills) ? normalizedCleanedSkills : (originalResume.skills || ''),
    experience: mergeArrayById(originalResume.experience || [], cleanedResume.experience || [], experienceFieldNames),
    education: mergeArrayById(originalResume.education || [], cleanedResume.education || [], educationFieldNames),
    projects: mergeArrayById(originalResume.projects || [], cleanedResume.projects || [], projectFieldNames),
  }
}

const getOllamaConfig = (aiConfig) => {
  const mode = aiConfig.ollamaConnectionMode || 'local'
  const baseUrl = mode === 'local'
    ? `${(aiConfig.ollamaBaseUrl || 'http://localhost:11434').replace(/\/$/, '')}/api/chat`
    : 'https://ollama.com/api/chat'

  const headers = {
    'Content-Type': 'application/json',
  }

  if (mode === 'cloud') {
    headers.Authorization = `Bearer ${aiConfig.ollamaApiKey}`
  }

  return { mode, baseUrl, headers }
}

const buildOllamaNetworkError = (mode, originalError) => {
  if (mode === 'local') {
    return new Error(`Could not reach your local Ollama server. Make sure Ollama is running at http://localhost:11434, then try again. Original error: ${originalError.message}`)
  }

  return new Error(`Could not reach the Ollama Cloud API from the browser. This is often a network or browser restriction issue. Try switching to Ollama Local Bridge mode or check your internet connection. Original error: ${originalError.message}`)
}

export const testOllamaConnection = async (aiConfig) => {
  const { mode, baseUrl, headers } = getOllamaConfig(aiConfig)
  const textModel = aiConfig.ollamaCustomTextModel?.trim() || aiConfig.ollamaTextModel || 'gpt-oss:20b-cloud'
  let response

  try {
    response = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: textModel,
        messages: [{ role: 'user', content: 'Reply with exactly {"status":"ok"}' }],
        format: 'json',
        stream: false,
        options: { temperature: 0 }
      })
    })
  } catch (err) {
    throw buildOllamaNetworkError(mode, err)
  }

  if (!response.ok) {
    let errorMessage = 'Failed to communicate with Ollama'
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch {
      // Ignore parse failures and keep generic error
    }
    throw new Error(errorMessage)
  }

  const data = await response.json()
  const content = data.message?.content || ''

  try {
    const parsed = parseJsonResponse(content)
    if (parsed.status === 'ok') {
      return {
        ok: true,
        message: mode === 'local'
          ? 'Connected to your local Ollama server successfully.'
          : 'Connected to Ollama Cloud successfully.',
      }
    }
  } catch {
    // Ignore and fall back to generic success check
  }

  return {
    ok: true,
    message: mode === 'local'
      ? 'Local Ollama responded successfully.'
      : 'Ollama Cloud responded successfully.',
  }
}

const getTextResponseFromProvider = async (promptText, aiConfig, temperature = 0.2) => {
  const provider = aiConfig.provider || 'gemini';

  if (provider === 'ollama') {
    const { mode, baseUrl, headers } = getOllamaConfig(aiConfig)
    const textModel = aiConfig.ollamaCustomTextModel?.trim() || aiConfig.ollamaTextModel || 'gpt-oss:20b-cloud'
    let response

    try {
      response = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: textModel,
          messages: [{ role: 'user', content: promptText }],
          format: 'json',
          stream: false,
          options: { temperature }
        })
      });
    } catch (err) {
      throw buildOllamaNetworkError(mode, err)
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.message || 'Failed to communicate with Ollama Cloud API');
    }

    const data = await response.json();
    return data.message?.content;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${aiConfig.geminiKey}`;
  const payload = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: { temperature }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to communicate with Gemini API');
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
};

export const parseResumeFromImage = async (base64Image, mimeType, aiConfig) => {
  const provider = aiConfig.provider || 'gemini';

  const promptText = `
    You are an expert AI resume parsing assistant.
    I am providing you with an image of a resume.
    Extract the text and completely fill out the following JSON structure accurately.
    Extract whatever information you can find. If a field is missing on the resume, leave it blank or return an empty array for lists.
    CRITICAL RULE: NEVER inject filler text or dummy data (like 'E-commerce Platform'). Only extract exactly what is visible in the image.
    Return ONLY raw JSON, with no markdown, backticks (\`\`\`), or extra text surrounding it.
    
    Data Structure required:
    {
      "personalInfo": {
        "name": "", 
        "email": "", 
        "phone": "", 
        "location": "", 
        "linkedin": "", 
        "website": "", 
        "summary": "Full professional summary string."
      },
      "experience": [
        {
          "id": "generate a simple random id or index string like 'exp1'",
          "company": "",
          "role": "",
          "startDate": "",
          "endDate": "",
          "projectName": "",
          "client": "",
          "testingPlatform": "",
          "description": "A single string containing the job details. Use line breaks (\\n) for separate bullet points if present."
        }
      ],
      "education": [
        {
           "id": "generate simple id like 'edu1'",
           "institution": "",
           "degree": "",
           "year": ""
        }
      ],
      "skills": "Comma separated string of all explicit technical/soft skills found (e.g. 'React, Java, Team Leadership, Photoshop')",
      "projects": [
        {
          "id": "proj1",
          "name": "",
          "description": "",
          "link": ""
        }
      ]
    }
  `;

  // Strip the standard data URI prefix (e.g., 'data:image/png;base64,') if present
  const base64Data = base64Image.split(',')[1] || base64Image;

  let textResponse = '';

  if (provider === 'ollama') {
    const { mode, baseUrl, headers } = getOllamaConfig(aiConfig)
    const visionModel = aiConfig.ollamaCustomVisionModel?.trim() || aiConfig.ollamaVisionModel || 'gemma3:12b-cloud'
    let response

    try {
      response = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: visionModel,
          messages: [{
            role: 'user',
            content: promptText,
            images: [base64Data]
          }],
          format: 'json',
          stream: false,
          options: { temperature: 0.1 }
        })
      });
    } catch (err) {
      throw buildOllamaNetworkError(mode, err)
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.message || 'Failed to communicate with Ollama Cloud API');
    }

    const data = await response.json();
    textResponse = data.message?.content;
  } else {
    // Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${aiConfig.geminiKey}`;
    const payload = {
      contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: mimeType, data: base64Data } }] }],
      generationConfig: { temperature: 0.1 }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to communicate with Gemini API');
    }

    const data = await response.json();
    textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  }

  if (!textResponse) {
    throw new Error('No text returned from AI API.');
  }

  try {
    const parsedObj = parseJsonResponse(textResponse);
    return parsedObj;
  } catch (err) {
    console.error("Raw response:", textResponse);
    throw new Error('Failed to parse AI response into valid JSON: ' + err.message);
  }
};

export const optimizeResumeWithAI = async (currentResumeData, jobDescription, aiConfig) => {
  const promptText = `
    You are an expert AI Applicant Tracking System (ATS) Optimizer and Resume Writer.
    I am providing you with the user's current resume data in JSON format, as well as a target Job Description.
    
    Your goal is to optimize the resume text to better match the Job Description and achieve an 80%+ ATS match score.
    EXTREMELY CRITICAL RULES - YOU MUST FOLLOW THESE OR FAIL:
    1. STRICT TRUTHFULNESS: DO NOT fabricate or invent new jobs, projects, roles, or degrees.
    2. DO NOT hallucinate years of experience or metrics that do not exist in the current resume.
    3. DO NOT add standalone projects (like 'E-commerce website') if they are not explicitly present in the user's data.
    4. You may rewrite the "summary" to strongly align with the JD, but strictly based on the user's actual background.
    5. You may creatively rephrase the bullet points in the "description" of existing "experience" and "projects" to highlight matching keywords found in the JD. Map their actual duties to the JD keywords where logically sound.
    6. Appending skills: You may append relevant matching keywords (e.g. 'Agile', 'Jira', 'REST APIs') to the "skills" string ONLY IF it's highly highly probable they used them based on their explicit experience descriptions. If you're not sure, don't add it. Do not lie.
    
    You must return a JSON object with TWO root keys:
    1. "optimizedResume": This must be the exactly matching JSON structure of their resume data.
    2. "tweaksSummary": A brief, user-friendly string (1-2 sentences) explaining exactly what you modified, what skills were appended, and how it was tailored.

    Return ONLY raw JSON, with no markdown, backticks (\`\`\`), or extra text surrounding it.
    
    === JOB DESCRIPTION ===
    ${jobDescription}

    === CURRENT RESUME ===
    ${JSON.stringify(currentResumeData, null, 2)}
  `;

  let textResponse = '';

  textResponse = await getTextResponseFromProvider(promptText, aiConfig, 0.2);

  if (!textResponse) throw new Error('No text returned from AI API.');

  try {
    return parseJsonResponse(textResponse);
  } catch (err) {
    console.error("Raw response:", textResponse);
    throw new Error('Failed to parse AI response into valid JSON: ' + err.message);
  }
};

export const cleanResumeFormattingWithAI = async (currentResumeData, aiConfig) => {
  const promptText = `
    You are an expert resume formatting and structure editor.
    I am providing parsed resume JSON that may contain OCR/layout issues from an imported resume image.

    Your job is to clean and reorganize the existing information into a professional resume structure.

    CRITICAL RULES:
    1. DO NOT invent any new jobs, projects, dates, companies, degrees, skills, links, metrics, or achievements.
    2. Only reorganize, split, normalize, and rewrite lightly for structure and readability.
    3. Fix cases where multiple details were merged into one line.
    4. Move obvious misplaced content into the correct existing field when the intent is clear.
    5. Convert dense experience/project text into concise bullet-style lines separated by "\\n".
    6. Preserve all real information already present unless it is an exact duplicate or obvious OCR noise.
    6a. Never remove the skills section or drop existing skills unless the content is obvious OCR garbage.
    7. Keep section ownership correct:
       - jobs/internships/freelance roles stay in "experience"
       - standalone work stays in "projects"
    8. If an experience entry includes labeled details like "Project:", "Client:", or "Testing Platform:", move them into dedicated experience fields named projectName, client, and testingPlatform instead of leaving them in the description body.
    9. Do not attach projects to experience unless relatedExperienceId is already present and valid.
    10. Return ONLY a JSON object with exactly these keys:
       {
         "cleanedResume": { ...full updated resume JSON... },
         "assistantMessage": "Short explanation of what formatting/structure was improved."
       }
    11. Return ONLY raw JSON, with no markdown, backticks, or extra text.

    === CURRENT RESUME JSON ===
    ${JSON.stringify(currentResumeData, null, 2)}
  `

  const textResponse = await getTextResponseFromProvider(promptText, aiConfig, 0.2)

  if (!textResponse) {
    throw new Error('No text returned from AI API.')
  }

  try {
    const parsedResponse = parseJsonResponse(textResponse)
    const cleanedResume = parsedResponse.cleanedResume || parsedResponse

    return {
      cleanedResume: mergeResumeCleanupResult(currentResumeData, cleanedResume),
      assistantMessage: parsedResponse.assistantMessage || 'I cleaned up the imported resume formatting.',
    }
  } catch (err) {
    console.error("Raw response:", textResponse)
    throw new Error('Failed to parse AI formatting cleanup response: ' + err.message)
  }
}

export const chatWithResumeAI = async (currentResumeData, instruction, aiConfig, jobDescription = '') => {
  const currentDate = new Date().toISOString().slice(0, 10)
  const promptText = `
    You are an expert AI Resume Editor.
    I am providing you with the user's current resume data in JSON format, a specific Natural Language instruction from the user on what they want to change, and an optional target Job Description for extra context.
    
    USER INSTRUCTION: "${instruction}"
    TARGET JOB DESCRIPTION CONTEXT: "${jobDescription || 'None provided'}"
    TODAY'S DATE: "${currentDate}"
    
    CRITICAL RULES:
    1. Apply the user's specific instruction to the resume data.
    2. DO NOT change ANY other fields that the user did not explicitly or implicitly ask to change.
    3. NEVER invent employers, projects, degrees, dates, awards, or metrics that are not already supported by the resume data or the user's explicit instruction.
    4. If the user asks for stronger phrasing, improve wording while staying truthful.
    5. If the user says they now have a larger total amount of experience, or implies they are still in their most recent role, update the most recent relevant experience entry so its endDate becomes "Present" unless the user explicitly gives a different end date.
    6. If the user says they worked on a new responsibility, tool, feature, or achievement, add that information to the most relevant existing experience description by default unless they explicitly ask to create a new project or a new job entry.
    7. When adding new work details to an experience description, append them as concise bullet-style lines and preserve existing content.
    8. Prefer updating the latest experience entry when the user gives a general career update without naming a company.
    5. Return ONLY a JSON object with exactly these keys:
       {
         "updatedResume": { ...full updated resume JSON... },
         "assistantMessage": "Short explanation of what changed."
       }
    9. Return ONLY raw JSON, with no markdown, backticks (\`\`\`), or extra text surrounding it.
    
    === CURRENT RESUME JSON ===
    ${JSON.stringify(currentResumeData, null, 2)}
  `;

  let textResponse = '';

  textResponse = await getTextResponseFromProvider(promptText, aiConfig, 0.3);

  if (!textResponse) throw new Error('No text returned from AI API.');

  try {
    const parsedResponse = parseJsonResponse(textResponse);

    if (parsedResponse.updatedResume) {
      return parsedResponse;
    }

    return {
      updatedResume: parsedResponse,
      assistantMessage: 'I updated the resume based on your instruction.',
    };
  } catch (err) {
    console.error("Raw response:", textResponse);
    throw new Error('Failed to parse AI response into valid JSON: ' + err.message);
  }
};

export const suggestResumeTheme = async (resumeData, jobDescription, aiConfig) => {
  const promptText = `
    You are an expert resume design strategist.
    Choose the best resume theme from this fixed list only:
    - classic
    - executive
    - modern
    - minimal

    Consider the user's resume content and optional job description.
    Return ONLY raw JSON with exactly these keys:
    {
      "themeKey": "one of classic/executive/modern/minimal",
      "reason": "One short sentence explaining why this theme fits."
    }

    === JOB DESCRIPTION ===
    ${jobDescription || 'None provided'}

    === RESUME JSON ===
    ${JSON.stringify(resumeData, null, 2)}
  `;

  const textResponse = await getTextResponseFromProvider(promptText, aiConfig, 0.2);

  if (!textResponse) {
    throw new Error('No text returned from AI API.');
  }

  try {
    const parsedResponse = parseJsonResponse(textResponse);
    const validThemeKeys = new Set(['classic', 'executive', 'modern', 'minimal']);
    const themeKey = validThemeKeys.has(parsedResponse.themeKey) ? parsedResponse.themeKey : 'classic';

    return {
      themeKey,
      reason: parsedResponse.reason || 'This theme best matches the tone of your resume.',
    };
  } catch (err) {
    console.error("Raw response:", textResponse);
    throw new Error('Failed to parse AI theme suggestion: ' + err.message);
  }
};

export const analyzeResumeAtsWithAI = async (resumeData, jobDescription, aiConfig) => {
  const currentDate = new Date().toISOString().slice(0, 10)
  const reviewRequestId = `ats-review-${Date.now()}`
  const promptText = `
    You are an expert ATS resume reviewer.
    Review the user's resume against the target job description and return a practical ATS-focused assessment.
    Recompute this review fresh from the provided inputs. Do not reuse any earlier score.

    Rules:
    1. Be strict, specific, and truthful.
    2. Do not invent background, metrics, tools, or qualifications not present in the resume.
    3. Focus on ATS relevance, keyword alignment, clarity, missing evidence, and section quality.
    4. Return ONLY raw JSON with exactly this structure:
    {
      "summary": "1-2 sentence ATS verdict.",
      "scoreEstimate": 0,
      "strengths": ["short bullet", "short bullet", "short bullet"],
      "gaps": ["short bullet", "short bullet", "short bullet"],
      "actionItems": ["specific fix", "specific fix", "specific fix"]
    }
    5. scoreEstimate must be a single integer from 0 to 100 that reflects this exact resume and this exact job description.
    6. Keep arrays concise: 3 to 5 items each.

    === REVIEW METADATA ===
    Today: ${currentDate}
    Review Request ID: ${reviewRequestId}

    === JOB DESCRIPTION ===
    ${jobDescription}

    === RESUME JSON ===
    ${JSON.stringify(resumeData, null, 2)}
  `

  const textResponse = await getTextResponseFromProvider(promptText, aiConfig, 0.2)

  if (!textResponse) {
    throw new Error('No text returned from AI API.')
  }

  try {
    const parsedResponse = parseJsonResponse(textResponse)
    const parsedScoreEstimate = parseScoreEstimate(parsedResponse.scoreEstimate)

    return {
      summary: parsedResponse.summary || 'No ATS summary returned.',
      scoreEstimate: Number.isFinite(parsedScoreEstimate) ? parsedScoreEstimate : null,
      strengths: Array.isArray(parsedResponse.strengths) ? parsedResponse.strengths.slice(0, 5) : [],
      gaps: Array.isArray(parsedResponse.gaps) ? parsedResponse.gaps.slice(0, 5) : [],
      actionItems: Array.isArray(parsedResponse.actionItems) ? parsedResponse.actionItems.slice(0, 5) : [],
    }
  } catch (err) {
    console.error("Raw response:", textResponse)
    throw new Error('Failed to parse AI ATS analysis: ' + err.message)
  }
}
