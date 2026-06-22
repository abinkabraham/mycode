#!/usr/bin/env node

/**
 * PR Review Bot
 * Analyzes a pull request and posts a structured review comment via the GitHub API.
 */

const https = require('https');
const { execSync } = require('child_process');

// ── Config from environment ───────────────────────────────────────────────────
const {
  GITHUB_TOKEN,
  PR_NUMBER,
  REPO_OWNER,
  REPO_NAME,
  PR_TITLE   = '',
  PR_BODY    = '',
  PR_AUTHOR  = '',
  BASE_SHA,
  HEAD_SHA,
  BASE_REF   = 'main',
  HEAD_REF   = '',
} = process.env;

if (!GITHUB_TOKEN || !PR_NUMBER || !REPO_OWNER || !REPO_NAME) {
  console.error('Missing required environment variables.');
  process.exit(1);
}

// ── GitHub API helper ─────────────────────────────────────────────────────────
function githubRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'pr-review-bot/1.0',
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Git diff analysis ─────────────────────────────────────────────────────────
function getDiffStats() {
  try {
    const diffStat = execSync(`git diff --stat ${BASE_SHA}..${HEAD_SHA}`, { encoding: 'utf8' });
    const nameOnly = execSync(`git diff --name-only ${BASE_SHA}..${HEAD_SHA}`, { encoding: 'utf8' });
    const diff     = execSync(`git diff ${BASE_SHA}..${HEAD_SHA}`, { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });
    return { diffStat: diffStat.trim(), files: nameOnly.trim().split('\n').filter(Boolean), diff };
  } catch (e) {
    console.warn('git diff failed:', e.message);
    return { diffStat: '', files: [], diff: '' };
  }
}

function getCommitMessages() {
  try {
    return execSync(`git log --oneline ${BASE_SHA}..${HEAD_SHA}`, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

// ── Analysis helpers ──────────────────────────────────────────────────────────
const PATTERNS = {
  // Security
  hardcodedSecret: /(?:password|secret|api_?key|token)\s*=\s*["'][^"']{6,}["']/gi,
  consoleLog:      /console\.(log|debug|info)\s*\(/g,
  todoFixme:       /\b(TODO|FIXME|HACK|XXX)\b/g,
  noErrorHandling: /catch\s*\(\s*\w+\s*\)\s*\{\s*\}/g,
  // Node / JS
  evalUse:         /\beval\s*\(/g,
  requireSync:     /require\s*\(\s*["'](?:fs|path)["']\s*\)/g,
  // General
  longLine:        /^.{121,}$/gm,
  debugBreakpoint: /debugger\s*;/g,
};

function analyzeCode(diff, files) {
  const issues   = [];
  const suggestions = [];

  // File-type stats
  const ext = (f) => f.split('.').pop().toLowerCase();
  const byExt = files.reduce((acc, f) => { acc[ext(f)] = (acc[ext(f)] || 0) + 1; return acc; }, {});

  // Pattern checks
  if (PATTERNS.hardcodedSecret.test(diff)) {
    issues.push('**Possible hardcoded secret detected** — use environment variables or a secrets manager instead.');
  }

  const consoleLogs = (diff.match(PATTERNS.consoleLog) || []).length;
  if (consoleLogs > 0) {
    suggestions.push(`${consoleLogs} \`console.log/debug/info\` call(s) found — remove debug logging before merging to production.`);
  }

  const todos = (diff.match(PATTERNS.todoFixme) || []).length;
  if (todos > 0) {
    suggestions.push(`${todos} TODO/FIXME comment(s) found — track these in your issue tracker if intentional.`);
  }

  if (PATTERNS.noErrorHandling.test(diff)) {
    issues.push('Empty `catch` block(s) detected — errors should be logged or handled explicitly.');
  }

  if (PATTERNS.evalUse.test(diff)) {
    issues.push('`eval()` usage detected — this is a security risk; consider safer alternatives.');
  }

  if (PATTERNS.debugBreakpoint.test(diff)) {
    issues.push('`debugger` statement found — remove before merging.');
  }

  const longLines = (diff.match(PATTERNS.longLine) || []).length;
  if (longLines > 5) {
    suggestions.push(`${longLines} lines exceed 120 characters — consider wrapping for readability.`);
  }

  // PR description check
  if (!PR_BODY || PR_BODY.trim().length < 30) {
    suggestions.push('PR description is missing or very short — adding context helps reviewers understand the intent.');
  }

  // Large diff check
  const addedLines   = (diff.match(/^\+[^+]/gm) || []).length;
  const removedLines = (diff.match(/^-[^-]/gm) || []).length;
  if (addedLines > 500) {
    suggestions.push(`This PR adds **${addedLines} lines** — large PRs are harder to review. Consider splitting into smaller, focused changes.`);
  }

  // Test coverage hint
  const hasTests = files.some((f) => /test|spec/i.test(f));
  const hasSrc   = files.some((f) => /\.(js|ts|jsx|tsx|py|go|java|rb|cs)$/.test(f));
  if (hasSrc && !hasTests) {
    suggestions.push('No test files detected in this PR — consider adding or updating tests.');
  }

  return { issues, suggestions, addedLines, removedLines, byExt };
}

function severity(issues) {
  if (issues.length === 0) return '✅ No blocking issues found';
  if (issues.length <= 2)  return '⚠️ Minor issues — please review';
  return '🚨 Multiple issues found — requires attention';
}

// ── Build the structured comment ──────────────────────────────────────────────
function buildComment({ files, diffStat, commits, issues, suggestions, addedLines, removedLines, byExt }) {
  const fileList = files.length
    ? files.slice(0, 20).map((f) => `- \`${f}\``).join('\n') + (files.length > 20 ? `\n- _…and ${files.length - 20} more_` : '')
    : '_No changed files detected._';

  const issueSection = issues.length
    ? issues.map((i) => `- ${i}`).join('\n')
    : '_No issues detected._';

  const suggestionSection = suggestions.length
    ? suggestions.map((s) => `- ${s}`).join('\n')
    : '_No suggestions at this time._';

  const extSummary = Object.entries(byExt)
    .map(([e, n]) => `\`${e}\` ×${n}`)
    .join(', ') || '_unknown_';

  const commitLines = commits
    ? commits.split('\n').map((c) => `- \`${c}\``).join('\n')
    : '_No commits listed._';

  return `## 🤖 Automated PR Review

> **Bot analysis for PR #${PR_NUMBER}** by @${PR_AUTHOR} · branch \`${HEAD_REF}\` → \`${BASE_REF}\`

---

### 📋 Summary

| Field | Value |
|-------|-------|
| Title | ${PR_TITLE || '_No title_'} |
| Author | @${PR_AUTHOR} |
| Files changed | ${files.length} |
| Lines added | +${addedLines} |
| Lines removed | -${removedLines} |
| File types | ${extSummary} |

<details>
<summary>📁 Changed files (${files.length})</summary>

${fileList}

</details>

<details>
<summary>📝 Commits in this PR</summary>

${commitLines}

</details>

---

### 🔍 Issues Found

${severity(issues)}

${issueSection}

---

### 💡 Suggestions

${suggestionSection}

---

### 📊 Diff Stats

\`\`\`
${diffStat || 'No diff stats available.'}
\`\`\`

---

<sub>🤖 This comment was generated automatically by the PR Review Bot. It complements — but does not replace — human code review.</sub>`;
}

// ── Find and delete previous bot comments ─────────────────────────────────────
async function deletePreviousBotComments() {
  const res = await githubRequest('GET', `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${PR_NUMBER}/comments?per_page=100`);
  if (res.status !== 200 || !Array.isArray(res.body)) return;

  for (const comment of res.body) {
    if (comment.body && comment.body.startsWith('## 🤖 Automated PR Review')) {
      await githubRequest('DELETE', `/repos/${REPO_OWNER}/${REPO_NAME}/issues/comments/${comment.id}`);
      console.log(`Deleted previous bot comment: ${comment.id}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Reviewing PR #${PR_NUMBER} in ${REPO_OWNER}/${REPO_NAME}`);

  const { diffStat, files, diff } = getDiffStats();
  const commits = getCommitMessages();
  const { issues, suggestions, addedLines, removedLines, byExt } = analyzeCode(diff, files);

  const comment = buildComment({ files, diffStat, commits, issues, suggestions, addedLines, removedLines, byExt });

  // Remove stale bot comments before posting a fresh one
  await deletePreviousBotComments();

  const res = await githubRequest(
    'POST',
    `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${PR_NUMBER}/comments`,
    { body: comment }
  );

  if (res.status === 201) {
    console.log(`Review comment posted: ${res.body.html_url}`);
  } else {
    console.error('Failed to post comment:', res.status, JSON.stringify(res.body));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
