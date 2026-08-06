#!/usr/bin/env node
/**
 * The state of CI, the open pull requests, and GitHub's own health — in one call.
 *
 * Answering "is the build green and did it deploy" took roughly fifteen curl-plus-parse round
 * trips in one session: list runs, find the run id, list its jobs, find the failing job, fetch its
 * log, then check whether GitHub Pages was even up. Each one is cheap; together they are the second
 * largest token sink after finding code.
 *
 * Reads only, unauthenticated (this repo is public). `--log` fetches the tail of the failing job,
 * which is the one thing worth spending a bigger response on.
 *
 *   node scripts/agent/ci.mjs               # runs + PRs + GitHub status
 *   node scripts/agent/ci.mjs --log         # also tail the most recent failing job
 *   node scripts/agent/ci.mjs --branch=foo
 */
import { spawnSync } from 'node:child_process';

const REPO = 'lucasbegellb-design/knight-s-gauntlet';
const API = `https://api.github.com/repos/${REPO}`;

const args = process.argv.slice(2);
const wantLog = args.includes('--log');
const branch = args.find((a) => a.startsWith('--branch='))?.slice('--branch='.length);

/**
 * Fetched through `curl`, not Node's `fetch`.
 *
 * This environment routes outbound HTTPS through an agent proxy configured via HTTPS_PROXY, and
 * Node's built-in fetch ignores those variables — so every request goes out direct and comes back
 * 403 while the identical curl succeeds. Shelling out is the boring, working option.
 */
function get(url, { accept = 'application/vnd.github+json' } = {}) {
  const result = spawnSync('curl', ['-sSL', '-H', `accept: ${accept}`, url], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`curl failed for ${url}: ${(result.stderr || '').trim()}`);
  return result.stdout;
}

function json(url) {
  const body = get(url);
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(`non-JSON response from ${url}: ${body.slice(0, 120)}`);
  }
  if (parsed?.message && !Array.isArray(parsed) && parsed.workflow_runs === undefined && parsed.jobs === undefined) {
    throw new Error(`${parsed.message} (${url})`);
  }
  return parsed;
}

const icon = (conclusion, status) => {
  if (status !== 'completed') return '…';
  return { success: '✓', skipped: '–', failure: '✗', cancelled: '⊘', timed_out: '⏱' }[conclusion] ?? '?';
};

try {
  const runsUrl = `${API}/actions/runs?per_page=6${branch ? `&branch=${encodeURIComponent(branch)}` : ''}`;
  const { workflow_runs: runs } = json(runsUrl);

  console.log('## workflow runs');
  for (const run of runs) {
    console.log(
      `  ${icon(run.conclusion, run.status)} #${run.run_number} ${run.head_sha.slice(0, 7)} ` +
        `[${run.head_branch}] ${run.display_title.slice(0, 52)}`,
    );
  }

  // Pull-request data deliberately isn't fetched here: the agent proxy in this environment returns
  // 403 for /pulls, and the sanctioned path is the GitHub MCP tool (`pull_request_read`). Trying
  // it anyway would just spend a request to fail.

  // Pages stalls are routinely a GitHub-side incident rather than a repo problem, and checking
  // takes one request. Skipping this check is how an agent ends up rewriting a correct workflow.
  try {
    const status = JSON.parse(get('https://www.githubstatus.com/api/v2/summary.json', { accept: 'application/json' }));
    const pages = status.components.find((c) => c.name === 'Pages');
    const actions = status.components.find((c) => c.name === 'Actions');
    console.log(`\n## github status: ${status.status.description}`);
    console.log(`  Pages: ${pages?.status ?? '?'} · Actions: ${actions?.status ?? '?'}`);
    for (const incident of status.incidents.slice(0, 2)) console.log(`  ! ${incident.name} (${incident.status})`);
  } catch {
    console.log('\n## github status: unavailable');
  }

  const broken = runs.find((r) => r.conclusion === 'failure');
  if (wantLog && broken) {
    const { jobs } = json(`${API}/actions/runs/${broken.id}/jobs`);
    const failing = jobs.find((j) => j.conclusion === 'failure');
    console.log(`\n## failing job: ${failing?.name} (run #${broken.run_number})`);
    for (const step of failing?.steps ?? []) {
      if (step.conclusion && step.conclusion !== 'success' && step.conclusion !== 'skipped') {
        console.log(`  ✗ step: ${step.name}`);
      }
    }
    const text = get(`${API}/actions/jobs/${failing?.id}/logs`, { accept: 'text/plain' });
    const errors = text.split('\n').filter((l) => /##\[error\]|error TS|FAIL |Timeout reached/.test(l));
    console.log((errors.length > 0 ? errors : text.split('\n').slice(-12)).slice(0, 12).map((l) => `  ${l.slice(0, 200)}`).join('\n'));
  } else if (broken && !wantLog) {
    console.log(`\n  (run #${broken.run_number} failed — rerun with --log for its error lines)`);
  }
} catch (error) {
  console.error(`ci.mjs: ${error.message}`);
  process.exit(1);
}
