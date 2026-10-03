'use strict';
/* =========================================================
   CHARTS — graphiques SVG légers, sans dépendance
   ========================================================= */

let chartSeq = 0;

/**
 * Courbe avec aire. points: [{ date: 'YYYY-MM-DD', value: Number }]
 * opts: { unit, target, targetLabel, height, empty, decimals }
 */
function lineChart(points, opts) {
  opts = opts || {};
  if (!points.length) return `<div class="chart-empty">${esc(opts.empty || 'Pas encore de données')}</div>`;
  const id = 'g' + (++chartSeq);
  const W = 340, H = opts.height || 180, pl = 40, pr = 14, pt = 16, pb = 28;
  const vals = points.map(p => p.value);
  if (opts.target != null) vals.push(opts.target);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min -= 1; max += 1; }
  const padV = (max - min) * 0.12;
  min -= padV; max += padV;
  if (opts.min != null) min = Math.max(opts.min, min);
  const iw = W - pl - pr, ih = H - pt - pb;
  const x = i => points.length === 1 ? pl + iw / 2 : pl + i * iw / (points.length - 1);
  const y = v => pt + (max - v) / (max - min) * ih;
  const dec = opts.decimals == null ? 1 : opts.decimals;

  let grid = '';
  for (let g = 0; g <= 3; g++) {
    const v = min + (max - min) * g / 3;
    const yy = y(v).toFixed(1);
    grid += `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" class="c-grid"/>` +
      `<text x="${pl - 6}" y="${yy}" class="c-ylab" text-anchor="end" dominant-baseline="middle">${fmtNum(v, max - min >= 6 ? 0 : 1)}</text>`;
  }

  const coords = points.map((p, i) => [x(i), y(p.value)]);
  const line = coords.map((c, i) => (i ? 'L' : 'M') + c[0].toFixed(1) + ' ' + c[1].toFixed(1)).join(' ');
  const area = points.length > 1
    ? `<path d="${line} L${coords[coords.length - 1][0].toFixed(1)} ${pt + ih} L${coords[0][0].toFixed(1)} ${pt + ih} Z" fill="url(#${id})"/>`
    : '';

  let target = '';
  if (opts.target != null) {
    const ty = y(opts.target).toFixed(1);
    target = `<line x1="${pl}" x2="${W - pr}" y1="${ty}" y2="${ty}" class="c-target"/>` +
      `<text x="${W - pr}" y="${(+ty - 5).toFixed(1)}" class="c-tlab" text-anchor="end">${esc(opts.targetLabel || 'Objectif')}</text>`;
  }

  const dots = coords.map((c, i) => {
    const last = i === coords.length - 1;
    return `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${last ? 4.5 : 2.6}" class="${last ? 'c-dot-last' : 'c-dot'}"/>`;
  }).join('');

  const lastC = coords[coords.length - 1];
  const lastLab = `<text x="${Math.min(lastC[0], W - pr - 4).toFixed(1)}" y="${(lastC[1] - 10).toFixed(1)}" class="c-vlab" text-anchor="${points.length === 1 ? 'middle' : 'end'}">${fmtNum(points[points.length - 1].value, dec)}${opts.unit ? ' ' + esc(opts.unit) : ''}</text>`;

  const idxs = points.length <= 2 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const xl = [...new Set(idxs)].map(i => {
    const anchor = points.length === 1 ? 'middle' : i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle';
    return `<text x="${x(i).toFixed(1)}" y="${H - 8}" class="c-xlab" text-anchor="${anchor}">${fmtDateShort(points[i].date)}</text>`;
  }).join('');

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Graphique')}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--red)" stop-opacity=".35"/><stop offset="1" stop-color="var(--red)" stop-opacity="0"/>
    </linearGradient></defs>
    ${grid}${target}${area}<path d="${line}" class="c-line"/>${dots}${lastLab}${xl}
  </svg>`;
}

/** Mini-courbe pour les cartes. */
function sparkline(values) {
  if (values.length < 2) return '<div class="spark-empty"></div>';
  const W = 100, H = 30;
  let min = Math.min(...values), max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const pts = values.map((v, i) => `${(i * W / (values.length - 1)).toFixed(1)},${(H - 3 - (v - min) / (max - min) * (H - 6)).toFixed(1)}`);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${pts.join(' ')}"/></svg>`;
}
