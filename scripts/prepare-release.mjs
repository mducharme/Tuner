#!/usr/bin/env node
import { execSync } from 'node:child_process'
/**
 * CalVer bump (YYYY.M.patch), CHANGELOG prepend, release notes for GitHub.
 * One run = one package (tuner-core | tuner-cli).
 *
 * Env: RELEASE_PACKAGE — package directory name under packages/
 * Writes GITHUB_OUTPUT: version, tag, package
 */
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const pkgName = process.env.RELEASE_PACKAGE
if (pkgName !== 'tuner-core' && pkgName !== 'tuner-cli') {
  console.error('RELEASE_PACKAGE must be tuner-core or tuner-cli')
  process.exit(1)
}

const pkgJsonPath = path.join(root, 'packages', pkgName, 'package.json')
const changelogPath = path.join(root, 'CHANGELOG.md')
const releaseNotesPath = path.join(root, 'release-notes.md')
const tagPrefix = pkgName

/**
 * @param {string} currentVersion
 * @param {string} isoDate YYYY-MM-DD
 */
function nextCalVer(currentVersion, isoDate) {
  const [yStr, mStr] = isoDate.split('-')
  const y = Number(yStr)
  const m = Number(mStr)
  const parts = String(currentVersion)
    .split('.')
    .map((x) => Number(x))
  const [maj, min, pat] = [
    Number.isFinite(parts[0]) ? parts[0] : 0,
    Number.isFinite(parts[1]) ? parts[1] : 0,
    Number.isFinite(parts[2]) ? parts[2] : 0,
  ]
  let patch = 1
  if (maj === y && min === m) {
    patch = pat + 1
  }
  return `${y}.${m}.${patch}`
}

function lastReleaseTag() {
  try {
    const out = execSync(`git tag -l '${tagPrefix}-*' --sort=-v:refname`, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    const lines = out.split('\n').filter(Boolean)
    return lines[0] ?? null
  } catch {
    return null
  }
}

/**
 * @param {string | null} tag
 */
function commitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : null
  const cmd = range
    ? `git log ${range} --no-merges --pretty=format:- %s (%h)`
    : 'git log --no-merges --pretty=format:- %s (%h)'
  let body = execSync(cmd, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
  if (!body) {
    body = '- _(no commits listed — first release or empty range)_'
  }
  return body
}

const isoDate = new Date().toISOString().slice(0, 10)

/** Log range captured before any file writes. */
const prevTag = lastReleaseTag()
const commitList = commitsSince(prevTag)

const raw = readFileSync(pkgJsonPath, 'utf8')
const pkg = JSON.parse(raw)
const previousVersion = pkg.version
const nextVersion = nextCalVer(previousVersion, isoDate)

const changelogSection = `## [${nextVersion}] - ${isoDate} — **${pkgName}**\n\n${commitList}\n\n`

let changelog = readFileSync(changelogPath, 'utf8')
const firstReleaseHeading = changelog.search(/^## /m)
if (firstReleaseHeading === -1) {
  console.error('CHANGELOG.md: no ## release heading found')
  process.exit(1)
}
changelog =
  changelog.slice(0, firstReleaseHeading) +
  changelogSection +
  changelog.slice(firstReleaseHeading)
writeFileSync(changelogPath, changelog)

pkg.version = nextVersion
writeFileSync(pkgJsonPath, `${JSON.stringify(pkg, null, 2)}\n`)

const releaseTitle = `${pkgName} ${nextVersion}`
const releaseBody = `${changelogSection.trim()}\n\n_Previous version: \`${previousVersion}\`. Tag: \`${tagPrefix}-${nextVersion}\`._\n`
writeFileSync(releaseNotesPath, releaseBody)

const tag = `${tagPrefix}-${nextVersion}`

const ghOut = process.env.GITHUB_OUTPUT
if (ghOut) {
  const lines = [
    `version=${nextVersion}`,
    `tag=${tag}`,
    `package=${pkgName}`,
    `release_title=${releaseTitle}`,
  ]
  appendFileSync(ghOut, `${lines.join('\n')}\n`)
}

console.log(
  `Prepared ${pkgName} ${previousVersion} → ${nextVersion} (tag ${tag})`,
)
