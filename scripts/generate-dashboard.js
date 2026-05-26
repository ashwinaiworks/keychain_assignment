#!/usr/bin/env node
// scripts/generate-dashboard.js
// Reads test-results/results.json produced by Playwright's JSON reporter
// and writes dashboard.html — a standalone visual summary with Chart.js charts.
//
// Usage:
//   npm run dashboard          — generate after npm test
//   npm run test:dashboard     — run tests then generate in one command

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const INPUT  = path.join(ROOT, 'test-results', 'results.json');
const OUTPUT = path.join(ROOT, 'dashboard.html');

// ─── load results ────────────────────────────────────────────────────────────

if (!fs.existsSync(INPUT)) {
  console.error('❌  test-results/results.json not found.');
  console.error('   Run "npm test" first, then "npm run dashboard".');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ─── flatten all tests from all suites (recursive) ───────────────────────────

function flattenTests(suites) {
  const tests = [];
  for (const suite of (suites || [])) {
    for (const spec of (suite.specs || [])) {
      const lastResult = (spec.tests && spec.tests[0] && spec.tests[0].results)
        ? spec.tests[0].results[spec.tests[0].results.length - 1]
        : {};
      const status   = lastResult.status   ?? 'skipped';
      const duration = lastResult.duration  ?? 0;

      // Playwright embeds tags as @word in the test/suite title
      const combined = (spec.title + ' ' + (suite.title || '')).replace(/\s+/g, ' ');
      const tagMatches = combined.match(/@\w+/g) || [];
      const tags = [...new Set(tagMatches)];

      const featureTags = tags.filter(t => t !== '@api' && t !== '@ui' && t !== '@smoke');
      const layerTag    = tags.find(t => t === '@api' || t === '@ui') || '';
      const isSmoke     = tags.includes('@smoke');

      tests.push({
        title:       spec.title,
        suite:       suite.title || '',
        status,
        duration,
        featureTags,
        layerTag,
        isSmoke,
        error:       (lastResult.error && lastResult.error.message) ? lastResult.error.message : null,
      });
    }
    tests.push(...flattenTests(suite.suites));
  }
  return tests;
}

const allTests = flattenTests(raw.suites);

// ─── aggregate stats ─────────────────────────────────────────────────────────

const total   = allTests.length;
const passed  = allTests.filter(t => t.status === 'passed').length;
const failed  = allTests.filter(t => t.status === 'failed' || t.status === 'timedOut').length;
const skipped = allTests.filter(t => t.status === 'skipped').length;
const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
const totalMs  = (raw.stats && raw.stats.duration) ? raw.stats.duration
                 : allTests.reduce((s, t) => s + t.duration, 0);
const totalSec = (totalMs / 1000).toFixed(1);

// Per-feature pass/fail
const featureOrder = ['@auth', '@articles', '@comments', '@favourites', '@feed', '@profile'];
const featureMap   = {};
for (const tag of featureOrder) featureMap[tag] = { tag, total: 0, passed: 0, failed: 0 };

for (const t of allTests) {
  for (const tag of t.featureTags) {
    if (!featureMap[tag]) featureMap[tag] = { tag, total: 0, passed: 0, failed: 0 };
    featureMap[tag].total++;
    if (t.status === 'passed')                          featureMap[tag].passed++;
    if (t.status === 'failed' || t.status === 'timedOut') featureMap[tag].failed++;
  }
}
const featureRows = Object.values(featureMap).filter(f => f.total > 0);

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusBadge(status) {
  const map = {
    passed:   ['badge-pass',    'PASS'],
    failed:   ['badge-fail',    'FAIL'],
    timedOut: ['badge-timeout', 'TIMEOUT'],
    skipped:  ['badge-skip',    'SKIP'],
  };
  const [cls, label] = map[status] || ['badge-skip', status.toUpperCase()];
  return `<span class="badge ${cls}">${label}</span>`;
}

function durationLabel(ms) {
  return ms >= 1000 ? (ms / 1000).toFixed(2) + 's' : ms + 'ms';
}

function tagPills(tags) {
  return tags.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join(' ');
}

// ─── table rows ───────────────────────────────────────────────────────────────

const tableRows = allTests.map((t, i) => {
  const rowClass   = (t.status === 'failed' || t.status === 'timedOut') ? 'row-fail' : '';
  const clickAttr  = t.error ? `onclick="toggleError(${i})"` : '';
  const cursorAttr = t.error ? 'style="cursor:pointer"' : '';
  const errorRow   = t.error
    ? `<tr class="error-row" id="err-${i}"><td colspan="5"><pre class="error-pre">${escapeHtml(t.error)}</pre></td></tr>`
    : '';
  return `
    <tr class="${rowClass}" ${clickAttr} ${cursorAttr}>
      <td>${statusBadge(t.status)}</td>
      <td class="test-title">${escapeHtml(t.title)}</td>
      <td>${tagPills(t.featureTags)}</td>
      <td><span class="layer-tag">${escapeHtml(t.layerTag)}</span></td>
      <td class="dur">${durationLabel(t.duration)}</td>
    </tr>${errorRow}`;
}).join('\n');

// ─── chart data ───────────────────────────────────────────────────────────────

const overallData    = JSON.stringify([passed, failed, skipped]);
const featureLabels  = JSON.stringify(featureRows.map(f => f.tag));
const featurePassed  = JSON.stringify(featureRows.map(f => f.passed));
const featureFailed  = JSON.stringify(featureRows.map(f => f.failed));

// ─── timestamp ────────────────────────────────────────────────────────────────

const now       = new Date();
const timestamp = now.toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});

// ─── full HTML ────────────────────────────────────────────────────────────────

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Conduit Test Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f0f2f5;
      color: #1a1a2e;
      min-height: 100vh;
    }

    /* header */
    header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      padding: 24px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    header h1 { font-size: 1.6rem; font-weight: 700; letter-spacing: -0.5px; }
    header h1 span { color: #4fc3f7; }
    .header-meta { font-size: 0.8rem; opacity: 0.7; text-align: right; line-height: 1.8; }

    /* layout */
    main { max-width: 1200px; margin: 0 auto; padding: 28px 24px 60px; }

    /* stat cards */
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: #fff;
      border-radius: 12px;
      padding: 22px 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
      text-align: center;
    }
    .stat-card .label {
      font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.5px; color: #888; margin-bottom: 8px;
    }
    .stat-card .value { font-size: 2.4rem; font-weight: 800; line-height: 1; }
    .stat-card.card-total .value { color: #1a1a2e; }
    .stat-card.card-pass  .value { color: #2e7d32; }
    .stat-card.card-fail  .value { color: #c62828; }
    .stat-card.card-skip  .value { color: #e65100; }
    .stat-card .sub { font-size: 0.7rem; color: #aaa; margin-top: 6px; }

    /* section title */
    .section-title {
      font-size: 1rem; font-weight: 700; color: #444;
      margin-bottom: 16px;
    }

    /* charts */
    .chart-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }
    .chart-card {
      background: #fff;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    }
    .chart-card canvas { max-height: 260px; }

    /* results table */
    .table-card {
      background: #fff;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
      overflow-x: auto;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    thead th {
      text-align: left; padding: 10px 12px;
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.4px; color: #777;
      border-bottom: 2px solid #f0f2f5;
    }
    tbody tr { border-bottom: 1px solid #f5f5f5; }
    tbody tr:hover:not(.error-row) { background: #fafafa; }
    tbody td { padding: 10px 12px; vertical-align: top; }
    .row-fail td { background: #fff5f5; }
    .test-title { max-width: 440px; word-break: break-word; }

    /* error row */
    .error-row { display: none; }
    .error-row.open { display: table-row; }
    .error-pre {
      background: #1a1a2e; color: #f48fb1;
      font-size: 0.75rem; padding: 14px 16px;
      border-radius: 6px; white-space: pre-wrap; word-break: break-word;
      margin: 4px 0 8px;
    }

    /* badges */
    .badge {
      display: inline-block; padding: 3px 10px;
      border-radius: 20px; font-size: 0.7rem; font-weight: 700;
      letter-spacing: 0.4px;
    }
    .badge-pass    { background: #e8f5e9; color: #2e7d32; }
    .badge-fail    { background: #ffebee; color: #c62828; }
    .badge-timeout { background: #fff3e0; color: #e65100; }
    .badge-skip    { background: #f3e5f5; color: #6a1b9a; }

    /* tag pills */
    .tag-pill {
      display: inline-block; padding: 2px 8px;
      border-radius: 12px; font-size: 0.68rem; font-weight: 600;
      background: #e3f2fd; color: #1565c0; margin: 1px 2px;
    }
    .layer-tag { font-size: 0.72rem; color: #999; font-weight: 600; }
    .dur { font-variant-numeric: tabular-nums; color: #666; white-space: nowrap; }

    /* footer */
    footer {
      text-align: center; padding: 24px;
      font-size: 0.78rem; color: #aaa;
    }
    footer a { color: #4fc3f7; text-decoration: none; }
    footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>

<header>
  <h1>Conduit <span>Test Dashboard</span></h1>
  <div class="header-meta">
    <div>Generated: ${timestamp}</div>
    <div>Finished in ${totalSec}s &nbsp;·&nbsp; ${total} tests</div>
  </div>
</header>

<main>

  <!-- stat cards -->
  <div class="stat-grid">
    <div class="stat-card card-total">
      <div class="label">Total</div>
      <div class="value">${total}</div>
      <div class="sub">test cases</div>
    </div>
    <div class="stat-card card-pass">
      <div class="label">Passed</div>
      <div class="value">${passed}</div>
      <div class="sub">${passRate}% pass rate</div>
    </div>
    <div class="stat-card card-fail">
      <div class="label">Failed</div>
      <div class="value">${failed}</div>
      <div class="sub">${failed === 0 ? 'all clear' : 'needs attention'}</div>
    </div>
    <div class="stat-card card-skip">
      <div class="label">Skipped</div>
      <div class="value">${skipped}</div>
      <div class="sub">intentional skips</div>
    </div>
  </div>

  <!-- charts -->
  <div class="chart-row">

    <div class="chart-card">
      <div class="section-title">Overall result split</div>
      <canvas id="overallChart"></canvas>
    </div>

    <div class="chart-card">
      <div class="section-title">Results by feature</div>
      <canvas id="featureChart"></canvas>
    </div>

  </div>

  <!-- results table -->
  <div class="table-card">
    <div class="section-title">All tests</div>
    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>Test name</th>
          <th>Feature</th>
          <th>Layer</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </div>

</main>

<footer>
  Full Playwright report &rarr;
  <a href="playwright-report/index.html" target="_blank">playwright-report/index.html</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  Generated by <code>npm run dashboard</code>
</footer>

<script>
  // overall doughnut
  new Chart(document.getElementById('overallChart'), {
    type: 'doughnut',
    data: {
      labels: ['Passed', 'Failed', 'Skipped'],
      datasets: [{
        data: ${overallData},
        backgroundColor: ['#4CAF50', '#F44336', '#9E9E9E'],
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 6,
      }],
    },
    options: {
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              var total = ctx.dataset.data.reduce(function(a,b){return a+b;}, 0);
              var pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return ' ' + ctx.label + ': ' + ctx.parsed + ' (' + pct + '%)';
            },
          },
        },
      },
      cutout: '60%',
    },
  });

  // feature stacked bar
  new Chart(document.getElementById('featureChart'), {
    type: 'bar',
    data: {
      labels: ${featureLabels},
      datasets: [
        {
          label: 'Passed',
          data: ${featurePassed},
          backgroundColor: '#4CAF50',
          borderRadius: 4,
        },
        {
          label: 'Failed',
          data: ${featureFailed},
          backgroundColor: '#F44336',
          borderRadius: 4,
        },
      ],
    },
    options: {
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
      },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } },
      },
    },
  });

  // expandable error rows on click
  function toggleError(i) {
    var row = document.getElementById('err-' + i);
    if (row) row.classList.toggle('open');
  }
<\/script>

</body>
</html>`;

// ─── write ────────────────────────────────────────────────────────────────────

fs.writeFileSync(OUTPUT, html, 'utf8');

const rel = path.relative(process.cwd(), OUTPUT);
console.log('✅  Dashboard written → ' + rel);
console.log('   ' + total + ' tests · ' + passed + ' passed · ' + failed + ' failed · ' + skipped + ' skipped');
console.log('   Pass rate: ' + passRate + '%   Duration: ' + totalSec + 's');
console.log('\n   open ' + rel);
