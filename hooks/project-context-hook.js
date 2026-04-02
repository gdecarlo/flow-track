import fs from 'node:fs/promises'
import path from 'node:path'

const PROJECT_CONTEXT_RELATIVE_PATH = path.join('context', 'project.md')
const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.vue', '.css', '.scss', '.sass', '.less',
  '.html', '.json', '.yml', '.yaml', '.toml', '.ini', '.env', '.sh', '.ps1', '.bat', '.cmd',
  '.py', '.rb', '.go', '.rs', '.java', '.cs', '.php', '.sql'
])
const CODE_BASENAMES = new Set([
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'vite.config.js',
  'vite.config.ts'
])

async function readJsonFromStdin() {
  const chunks = []

  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim()
  return raw ? JSON.parse(raw) : {}
}

function normalizeFilePath(filePath, cwd) {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    return null
  }

  if (filePath.startsWith('untitled:') || filePath.startsWith('vscode-userdata:')) {
    return null
  }

  return path.normalize(path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath))
}

function canonicalizePath(filePath) {
  if (!filePath) {
    return null
  }

  return process.platform === 'win32' ? filePath.toLowerCase() : filePath
}

function extractPathsFromPatch(patchText) {
  const matches = patchText.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)
  return Array.from(matches, (match) => match[1].trim())
}

function collectFileCandidates(value, collector) {
  if (!value) {
    return
  }

  if (typeof value === 'string') {
    return
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectFileCandidates(entry, collector))
    return
  }

  if (typeof value !== 'object') {
    return
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if ((key === 'filePath' || key === 'path') && typeof nestedValue === 'string') {
      collector.add(nestedValue)
      continue
    }

    if (key === 'files' && Array.isArray(nestedValue)) {
      nestedValue.forEach((entry) => {
        if (typeof entry === 'string') {
          collector.add(entry)
        } else {
          collectFileCandidates(entry, collector)
        }
      })
      continue
    }

    if (key === 'input' && typeof nestedValue === 'string' && nestedValue.includes('*** Begin Patch')) {
      extractPathsFromPatch(nestedValue).forEach((filePath) => collector.add(filePath))
      continue
    }

    collectFileCandidates(nestedValue, collector)
  }
}

function getTouchedFiles(payload) {
  const candidates = new Set()
  collectFileCandidates(payload.tool_input, candidates)

  return Array.from(candidates)
}

function toRelativePath(filePath, cwd) {
  return path.relative(cwd, filePath).split(path.sep).join('/')
}

function isProjectContextFile(filePath, cwd) {
  return canonicalizePath(filePath) === canonicalizePath(path.normalize(path.resolve(cwd, PROJECT_CONTEXT_RELATIVE_PATH)))
}

function isCodeFile(filePath, cwd) {
  if (!filePath || isProjectContextFile(filePath, cwd)) {
    return false
  }

  const extension = path.extname(filePath).toLowerCase()
  const basename = path.basename(filePath).toLowerCase()

  return CODE_EXTENSIONS.has(extension) || CODE_BASENAMES.has(basename)
}

async function resolveGitDirectory(cwd) {
  const gitPath = path.join(cwd, '.git')

  try {
    const stats = await fs.stat(gitPath)
    if (stats.isDirectory()) {
      return gitPath
    }

    if (stats.isFile()) {
      const content = await fs.readFile(gitPath, 'utf8')
      const match = content.match(/^gitdir:\s*(.+)$/im)
      if (match) {
        return path.resolve(cwd, match[1].trim())
      }
    }
  } catch {
    return null
  }

  return null
}

async function getStateFilePath(cwd) {
  const gitDirectory = await resolveGitDirectory(cwd)
  if (gitDirectory) {
    return path.join(gitDirectory, 'copilot-hooks', 'project-context-state.json')
  }

  return path.join(cwd, '.github', 'hooks', '.project-context-state.json')
}

async function loadState(cwd) {
  const stateFilePath = await getStateFilePath(cwd)

  try {
    const content = await fs.readFile(stateFilePath, 'utf8')
    return {
      stateFilePath,
      state: JSON.parse(content)
    }
  } catch {
    return {
      stateFilePath,
      state: {
        lastCodeChangeAt: null,
        lastProjectUpdateAt: null,
        pendingFiles: []
      }
    }
  }
}

async function saveState(stateFilePath, state) {
  await fs.mkdir(path.dirname(stateFilePath), { recursive: true })
  await fs.writeFile(stateFilePath, JSON.stringify(state, null, 2), 'utf8')
}

function unique(items) {
  return Array.from(new Set(items))
}

function isStateDirty(state) {
  if (!state.lastCodeChangeAt) {
    return false
  }

  if (!state.lastProjectUpdateAt) {
    return true
  }

  return new Date(state.lastProjectUpdateAt).getTime() < new Date(state.lastCodeChangeAt).getTime()
}

async function handlePostToolUse(payload) {
  const cwd = payload.cwd || process.cwd()
  const timestamp = payload.timestamp || new Date().toISOString()
  const touchedFiles = getTouchedFiles(payload)
    .map((filePath) => normalizeFilePath(filePath, cwd))
    .filter(Boolean)

  const touchedProjectContext = touchedFiles.some((filePath) => isProjectContextFile(filePath, cwd))
  const touchedCodeFiles = touchedFiles.filter((filePath) => isCodeFile(filePath, cwd))

  if (touchedFiles.length === 0 || (!touchedProjectContext && touchedCodeFiles.length === 0)) {
    process.stdout.write(JSON.stringify({ continue: true }))
    return
  }

  const { stateFilePath, state } = await loadState(cwd)

  if (touchedCodeFiles.length > 0) {
    state.lastCodeChangeAt = timestamp
    state.pendingFiles = unique([
      ...state.pendingFiles,
      ...touchedCodeFiles.map((filePath) => toRelativePath(filePath, cwd))
    ])
  }

  if (touchedProjectContext) {
    state.lastProjectUpdateAt = timestamp
  }

  if (!isStateDirty(state)) {
    state.pendingFiles = []
  }

  await saveState(stateFilePath, state)

  if (touchedCodeFiles.length === 0 || !isStateDirty(state)) {
    process.stdout.write(JSON.stringify({ continue: true }))
    return
  }

  process.stdout.write(JSON.stringify({
    continue: true,
    systemMessage: 'Se modificó código. Antes de cerrar la sesión, actualiza context/project.md con el impacto de los cambios.',
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `Sigue pendiente actualizar context/project.md. Archivos detectados: ${state.pendingFiles.join(', ')}`
    }
  }))
}

async function handleStop(payload) {
  const cwd = payload.cwd || process.cwd()
  const { stateFilePath, state } = await loadState(cwd)

  if (!isStateDirty(state)) {
    await saveState(stateFilePath, {
      lastCodeChangeAt: state.lastCodeChangeAt,
      lastProjectUpdateAt: state.lastProjectUpdateAt,
      pendingFiles: []
    })
    process.stdout.write(JSON.stringify({ continue: true }))
    return
  }

  if (payload.stop_hook_active) {
    process.stdout.write(JSON.stringify({
      continue: true,
      systemMessage: 'Sigue pendiente actualizar context/project.md antes de considerar cerrada la sesión.'
    }))
    return
  }

  const pendingSummary = state.pendingFiles.length > 0
    ? ` Archivos pendientes de documentar: ${state.pendingFiles.join(', ')}.`
    : ''

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'Stop',
      decision: 'block',
      reason: `Actualiza context/project.md antes de terminar la sesión.${pendingSummary}`
    }
  }))
}

async function main() {
  const payload = await readJsonFromStdin()

  switch (payload.hookEventName) {
    case 'PostToolUse':
      await handlePostToolUse(payload)
      break
    case 'Stop':
      await handleStop(payload)
      break
    default:
      process.stdout.write(JSON.stringify({ continue: true }))
      break
  }
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || error}\n`)
  process.exit(1)
})