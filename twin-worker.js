/* VIC'TORY Trail · jumeau local : découpe le parcours d'une course en montées, descentes et portions roulantes,
   puis cherche dans les tracés des sorties de l'utilisateur les portions au profil le plus proche (dans les deux sens).
   Tourne dans un Web Worker pour ne pas bloquer l'appli. */
'use strict';
const STEP = 50, N = 25, SCALES = [0.85, 0.92, 1, 1.08, 1.15];

function hav(a, b, c, d) { const R = 6371000, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.min(1, Math.sqrt(x))); }
function resample(dist, vals, step) { // vals : tableau de colonnes
  const tot = dist[dist.length - 1], n = Math.floor(tot / step) + 1, out = vals.map(() => new Float64Array(n)); let j = 0;
  for (let i = 0; i < n; i++) { const x = i * step; while (j < dist.length - 2 && dist[j + 1] < x) j++; const a = dist[j], b = dist[j + 1] ?? a, f = b > a ? (x - a) / (b - a) : 0;
    vals.forEach((v, k) => { const va = v[j], vb = v[j + 1] ?? va; out[k][i] = (va == null || vb == null || Number.isNaN(va) || Number.isNaN(vb)) ? NaN : va + (vb - va) * f; }); }
  return out;
}
function smooth(v, w) { const o = new Float64Array(v.length); for (let i = 0; i < v.length; i++) { let s = 0, c = 0; for (let k = Math.max(0, i - w); k <= Math.min(v.length - 1, i + w); k++) if (!Number.isNaN(v[k])) { s += v[k]; c++; } o[i] = c ? s / c : NaN; } return o; }

function splitSections(el, H = 50, minLen = 700) {
  const piv = [0]; let trend = 0, hi = 0, lo = 0, ext = 0;
  for (let i = 1; i < el.length; i++) {
    if (trend === 0) { if (el[i] > el[hi]) hi = i; if (el[i] < el[lo]) lo = i; if (el[hi] - el[lo] > H) { trend = hi > lo ? 1 : -1; const first = trend === 1 ? lo : hi; if (first) piv.push(first); ext = trend === 1 ? hi : lo; } continue; }
    if (trend === 1) { if (el[i] >= el[ext]) ext = i; else if (el[ext] - el[i] > H) { piv.push(ext); trend = -1; ext = i; } }
    else { if (el[i] <= el[ext]) ext = i; else if (el[i] - el[ext] > H) { piv.push(ext); trend = 1; ext = i; } }
  }
  if (piv[piv.length - 1] !== el.length - 1) piv.push(el.length - 1);
  let S = []; for (let i = 1; i < piv.length; i++) S.push([piv[i - 1], piv[i]]);
  let ch = true; while (ch && S.length > 1) { ch = false; for (let i = 0; i < S.length; i++) { if ((S[i][1] - S[i][0]) * STEP < minLen) { const j = i > 0 ? i - 1 : i + 1, a = Math.min(i, j), b = Math.max(i, j); S.splice(a, 2, [S[a][0], S[b][1]]); ch = true; break; } } }
  return S.map(([a, b]) => { let up = 0, dn = 0; for (let i = a + 1; i <= b; i++) { const d = el[i] - el[i - 1]; if (d > 0) up += d; else dn -= d; }
    const L = (b - a) * STEP, dz = el[b] - el[a], gr = L ? dz / L * 100 : 0;
    return { a, b, k0: a * STEP / 1000, k1: b * STEP / 1000, L, dz: Math.round(dz), up: Math.round(up), dn: Math.round(dn), gr: Math.round(gr * 10) / 10, kind: gr >= 4 ? 'montee' : gr <= -4 ? 'descente' : 'roulant' }; });
}

function prepAct(a) {
  const t = a.track.filter(p => p[0] != null && p[2] != null); if (t.length < 20) return null;
  const d = [0]; for (let i = 1; i < t.length; i++) d.push(d[i - 1] + hav(t[i - 1][0], t[i - 1][1], t[i][0], t[i][1]));
  if (d[d.length - 1] < 1500) return null;
  const [el, la, lo] = resample(d, [t.map(p => p[2]), t.map(p => p[0]), t.map(p => p[1])], STEP);
  return { id: a.id, name: a.name, date: a.date, el: smooth(el, 2), la, lo };
}

function matchSection(prof, L, ud, acts) {
  let rng = -Infinity, mn = Infinity; for (const x of prof) { if (x > rng) rng = x; if (x < mn) mn = x; } rng -= mn;
  const tol = 12 + 0.1 * rng; let best = null;
  for (const A of acts) {
    const n = A.el.length;
    for (const rev of [false, true]) {
      const E = rev ? A.el.slice().reverse() : A.el;
      const cu = new Float64Array(n + 1), cd = new Float64Array(n + 1), nn = new Int32Array(n + 1);
      for (let i = 1; i < n; i++) { const d = E[i] - E[i - 1]; cu[i] = cu[i - 1] + (d > 0 && !Number.isNaN(d) ? d : 0); cd[i] = cd[i - 1] + (d < 0 && !Number.isNaN(d) ? -d : 0); }
      for (let i = 0; i < n; i++) nn[i + 1] = nn[i] + (Number.isNaN(E[i]) ? 1 : 0);
      for (const s of SCALES) {
        const w = Math.round(L * s / STEP); if (w < 4 || w >= n) continue;
        const sp = Math.exp(-0.5 * (Math.log(s) / 0.15) ** 2);
        for (let st = 0; st < n - w; st += 2) {
          if (nn[st + w + 1] - nn[st]) continue;
          let e2 = 0; const b0 = E[st];
          for (let k = 0; k < N; k++) { const x = E[st + Math.round(k * w / (N - 1))] - b0 - prof[k]; e2 += x * x; }
          const err = Math.sqrt(e2 / N); let sc = Math.exp(-0.5 * (err / tol) ** 2) * sp;
          if (ud) { const uw = cu[st + w] - cu[st], dw = cd[st + w] - cd[st]; sc *= Math.exp(-0.5 * ((uw - ud[0]) / (0.12 * ud[0] + 30)) ** 2) * Math.exp(-0.5 * ((dw - ud[1]) / (0.12 * ud[1] + 30)) ** 2); }
          if (!best || sc > best.sc) { let i0 = st, i1 = st + w; if (rev) { i0 = n - 1 - (st + w); i1 = n - 1 - st; } best = { sc, err, act: A, i0, i1, rev }; }
        }
      }
    }
  }
  if (!best) return null;
  const A = best.act, m = (best.i0 + best.i1) >> 1;
  return { sc: best.sc, actId: A.id, name: A.name, date: A.date, k0: best.i0 * STEP / 1000, k1: best.i1 * STEP / 1000, rev: best.rev, lat: A.la[m], lon: A.lo[m] };
}

self.onmessage = e => {
  const { profile, acts } = e.data;
  const d = profile.map(p => p[0] * 1000), [el0] = resample(d, [profile.map(p => p[1])], STEP), el = smooth(el0, 2);
  const secs = splitSections(Array.from(el));
  const A = acts.map(prepAct).filter(Boolean);
  const out = [];
  secs.forEach((s, i) => {
    const offs = []; for (let k = 0; k < N; k++) offs.push(el[s.a + Math.round(k * (s.b - s.a) / (N - 1))] - el[s.a]);
    const long = s.L > 4000 && s.kind === 'roulant';
    out.push(Object.assign({}, s, { m: A.length ? matchSection(offs, s.L, long ? [s.up, s.dn] : null, A) : null }));
    self.postMessage({ progress: (i + 1) / secs.length });
  });
  self.postMessage({ done: true, sections: out, nActs: A.length });
};
