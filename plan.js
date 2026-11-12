/* VIC'TORY Trail · moteur d'entraînement
   - tests de vitesse critique (VC) : 12 min et 3 min à fond, sur piste ou sur tapis incliné
   - zones d'allure, de FC et de vitesse de montée
   - programme séance par séance jusqu'à la course objectif, placé selon les disponibilités */
(function (root) {
  'use strict';

  /* ---------- tests ---------- */
  // Modèle distance-temps : D = VC × t + D'. Deux efforts maximaux (12 min et 3 min) suffisent.
  function critical(d12, d3, t12, t3) {
    t12 = t12 || 720; t3 = t3 || 180;
    if (!(d12 > 0 && d3 > 0) || d12 <= d3) throw new Error('La distance des 12 min doit être plus grande que celle des 3 min.');
    const cs = (d12 - d3) / (t12 - t3), dp = d12 - cs * t12;
    if (cs < 1.2 || cs > 7.5) throw new Error('Résultat hors normes : vérifie les distances.');
    return { cs, dprime: Math.max(0, dp), v3: d3 / t3, v12: d12 / t12 };
  }
  function flatTest(o) { // o : {d12, d3 (m), hr12?}
    const r = critical(o.d12, o.d3);
    return { cs: r.cs, cs_kmh: r.cs * 3.6, dprime: Math.round(r.dprime), v3_kmh: r.v3 * 3.6, lthr: o.hr12 ? Math.round(o.hr12 * 0.98) : null, hr12: o.hr12 || null };
  }
  function uphillTest(o) { // o : {v12, v3 (km/h sur le tapis), grade (%), hr12?}
    const g = o.grade / 100, k = g / Math.sqrt(1 + g * g);
    const r = critical(o.v12 / 3.6 * 720, o.v3 / 3.6 * 180);
    return { cs: r.cs, cs_kmh: r.cs * 3.6, grade: o.grade, vam: Math.round(r.cs * k * 3600), vam3: Math.round(r.v3 * k * 3600), dprime_v: Math.round(r.dprime * k), lthr: o.hr12 ? Math.round(o.hr12 * 0.98) : null, hr12: o.hr12 || null };
  }
  // meilleure distance couverte sur une fenêtre de t secondes dans un tracé [lat, lon, alt, t, fc]
  function bestWindows(track, hav) {
    const P = track.filter(p => p[3] != null && p[0] != null); if (P.length < 30) return null;
    const d = [0]; for (let i = 1; i < P.length; i++) d.push(d[i - 1] + hav({ lat: P[i - 1][0], lon: P[i - 1][1] }, { lat: P[i][0], lon: P[i][1] }));
    function best(w, from) {
      let b = null, j = from || 0;
      for (let i = from || 0; i < P.length; i++) { while (j < P.length - 1 && P[j][3] - P[i][3] < w) j++; if (P[j][3] - P[i][3] < w * 0.97) break;
        const dist = (d[j] - d[i]) * w / (P[j][3] - P[i][3]); if (!b || dist > b.d) { let hs = 0, hn = 0; for (let k = i; k <= j; k++) if (P[k][4]) { hs += P[k][4]; hn++; } b = { d: dist, i, j, hr: hn ? Math.round(hs / hn) : null }; } }
      return b;
    }
    const b12 = best(720); if (!b12) return null;
    const b3 = best(180, b12.j + 1) || best(180);
    return { d12: Math.round(b12.d), hr12: b12.hr, d3: b3 ? Math.round(b3.d) : null };
  }

  /* ---------- zones ---------- */
  const PZ = [[0, 0.70], [0.70, 0.82], [0.82, 0.92], [0.92, 1.00], [1.00, 1.15]]; // fractions de la VC
  const ZNAMES = ['Récupération', 'Endurance', 'Tempo', 'Seuil', 'Au-dessus du seuil'];
  function paceZones(csKmh) { return PZ.map(([a, b]) => [csKmh * a, csKmh * b]); }
  function hrZonesLT(lthr) { // zones de Friel, en % de la FC de seuil
    const f = [0.85, 0.90, 0.95, 1.00].map(x => Math.round(lthr * x));
    return [[0, f[0] - 1], [f[0], f[1] - 1], [f[1], f[2] - 1], [f[2], f[3] - 1], [f[3], Math.round(lthr * 1.08)]];
  }
  function vamZones(vam) { return PZ.map(([a, b]) => [Math.round(vam * a / 10) * 10, Math.round(vam * b / 10) * 10]); }
  const paceTxt = kmh => { if (!kmh) return '–'; const s = Math.round(3600 / kmh); return Math.floor(s / 60) + '′' + String(s % 60).padStart(2, '0'); };

  /* ---------- programme ---------- */
  const DAY = 864e5;
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  function monday(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; }
  const r5 = m => Math.max(5, Math.round(m / 5) * 5);

  // pas d'une séance : {t: libellé, min, z: 1..5, up: true si en montée, reps, rec:{min, z, t}}
  const S = (t, min, z, extra) => Object.assign({ t, min: min < 3 ? Math.round(min * 4) / 4 : Math.round(min), z }, extra || {});
  const WU = (m) => S('Échauffement', m || 20, 2, { note: 'progressif, avec 3 accélérations de 20 s à la fin' });
  const CD = (m) => S('Retour au calme', m || 10, 1);

  function quality(kind, phase, wk, total, opt) {
    // wk : rang de la semaine dans la phase (0, 1, 2…) pour progresser
    const up = opt.up, steps = [], k = Math.min(wk, opt.lvl === 1 ? 1 : 3);
    let title, dplus = 0;
    if (kind === 'cotes_courtes') { const n = 8 + 2 * k; title = 'Côtes courtes'; steps.push(WU(), S('Côte', 0.5, 5, { up: true, reps: n, rec: { min: 1.5, z: 1, t: 'descente en trottinant' }, note: 'pente 8 à 12 %, foulée dynamique' }), CD()); dplus = n * 40; }
    else if (kind === 'fartlek') { const n = 6 + 2 * k; title = 'Fartlek'; steps.push(WU(), S('Accélération', 1, 4, { reps: n, rec: { min: 1, z: 1, t: 'trot' } }), CD()); }
    else if (kind === 'seuil') { const plan = [[3, 8], [3, 10], [2, 15], [3, 12]][k]; title = 'Seuil ' + plan[0] + ' × ' + plan[1] + ' min'; steps.push(WU(), S('Bloc au seuil', plan[1], 4, { reps: plan[0], rec: { min: 2, z: 1, t: 'trot' } }), CD()); }
    else if (kind === 'vma') { const n = [8, 10, 10, 12][k]; title = 'Au-dessus du seuil · 2 × ' + n + ' × 30/30'; steps.push(WU(), S('30 s vite / 30 s trot', n, 5, { reps: 2, rec: { min: 3, z: 1, t: 'trot entre les séries' }, note: 'en minutes : ' + n + ' répétitions de 30 s / 30 s' }), CD()); }
    else if (kind === 'cotes_longues') { const plan = [[5, 4], [6, 4], [5, 6], [4, 8]][k]; title = 'Côtes longues ' + plan[0] + ' × ' + plan[1] + ' min'; steps.push(WU(), S('Montée au seuil', plan[1], 4, { up: true, reps: plan[0], rec: { min: plan[1] * 0.75, z: 1, t: 'redescente active' }, note: up ? 'sur tapis : 12 à 15 %' : 'pente régulière 8 à 15 %, bâtons si tu cours avec' }), CD()); dplus = Math.round(plan[0] * plan[1] * (opt.vam || 900) * 0.95 / 60); }
    else if (kind === 'tempo') { const m = [30, 40, 45, 50][k]; title = 'Tempo vallonné ' + m + ' min'; steps.push(WU(), S('Continu', m, 3, { note: 'terrain vallonné, effort constant plutôt qu\'allure constante' }), CD()); dplus = m * 8; }
    else if (kind === 'seuil_long') { const plan = [[2, 15], [2, 20], [3, 15], [2, 25]][k]; title = 'Seuil long ' + plan[0] + ' × ' + plan[1] + ' min'; steps.push(WU(), S('Bloc', plan[1], 3, { reps: plan[0], rec: { min: 4, z: 1, t: 'trot' }, note: 'haut de la zone 3, bas de la zone 4' }), CD()); }
    else if (kind === 'rappel') { title = 'Rappel de rythme'; steps.push(WU(), S('Accélération', 2, 4, { reps: 6, rec: { min: 2, z: 1, t: 'trot' } }), CD()); }
    const min = steps.reduce((s, x) => s + (x.min + (x.rec ? x.rec.min : 0)) * (x.reps || 1) - (x.rec && x.reps ? x.rec.min : 0), 0);
    return { kind: /cotes/.test(kind) ? 'cotes' : kind === 'vma' ? 'vma' : kind === 'tempo' || kind === 'fartlek' ? 'tempo' : kind === 'rappel' ? 'tempo' : 'seuil', title, minutes: r5(min), steps, dplus };
  }
  const RENFO = [S('Gainage (planche, latéral, dorsal)', 8, 1, { note: '3 × 40 s chacun' }), S('Squats, fentes marchées, montées sur marche', 10, 1, { note: '3 tours, 12 répétitions' }), S('Excentrique des quadriceps', 6, 1, { note: 'descente lente sur une jambe : prépare les descentes' }), S('Mollets et pieds', 6, 1, { note: 'montées sur pointes, sautillements, équilibre' })];
  const TEST_FLAT = [S('Échauffement en zone 2', 25, 2), S('Effort maximal 12 min', 12, 5, { note: 'le plus loin possible, allure régulière : note la distance' }), S('Récupération en zone 2', 30, 2), S('Effort maximal 3 min', 3, 5, { note: 'à fond : note la distance' }), S('Retour au calme', 5, 1)];
  const TEST_UP = [S('Échauffement en zone 2', 25, 2), S('Effort maximal 12 min sur tapis à 15-20 %', 12, 5, { up: true, note: 'note la vitesse moyenne et la pente' }), S('Récupération en zone 2', 30, 2), S('Effort maximal 3 min, même pente', 3, 5, { up: true, note: 'note la vitesse moyenne' }), S('Retour au calme', 5, 1)];

  function levelOf(p) {
    const L = p.level || {}, y = +L.years || 0, h = +L.hours || 0;
    return y >= 3 && h >= 7 ? 3 : y >= 1 && h >= 3 ? 2 : 1;
  }

  /* o = {profile, tests:{flat, up}, race, h0 (heures/sem. récentes), eff (km-effort de la course), raceHours,
          adapt (0.8–1.05), from (Date)} */
  function generate(o) {
    const p = o.profile, av = p.availability || {}, tr = p.terrain || {}, lvl = levelOf(p);
    const days = (av.days && av.days.length ? av.days : [2, 3, 5, 6, 7]).slice().sort((a, b) => a - b);
    const longDay = days.includes(av.long_day) ? av.long_day : (days.includes(7) ? 7 : days.includes(6) ? 6 : days[days.length - 1]);
    const wdMax = +av.weekday_min || 75, longMax = +av.long_h || 4;
    const maxSessions = [0, 4, 5, 6][lvl];
    const race = o.race, start = o.from || new Date(), w0 = monday(start);
    const end = race ? new Date(race.race_date + 'T12:00:00') : new Date(+w0 + 16 * 7 * DAY);
    const nW = Math.max(1, Math.round((monday(end) - w0) / (7 * DAY)) + 1);
    const eff = o.eff || 60, H0 = Math.max(2.5, +o.h0 || +(p.level && p.level.hours) || 3);
    const availH = (days.length - 1) * wdMax / 60 + longMax;
    let Hp = eff < 45 ? 7 : eff < 90 ? 9 : eff < 160 ? 11 : 13; Hp = Math.min(Hp, Math.max(H0 * 1.6, H0 + 2.5), availH);
    const raceH = o.raceHours || eff / 7;
    const hasFlat = !!(o.tests && o.tests.flat), hasUp = !!(o.tests && o.tests.up), canUp = tr.treadmill || tr.mountain;
    const out = [];
    const phaseIx = {};
    let needFlat = !hasFlat, needUp = !hasUp && !!tr.treadmill;
    for (let i = 0; i < nW; i++) {
      const toRace = race ? nW - 1 - i : 99, ws = new Date(+w0 + 7 * i * DAY);
      let ph, f;
      if (race && toRace === 0) { ph = 'Course'; f = 0.35; }
      else if (race && toRace <= 2) { ph = 'Affûtage'; f = toRace === 1 ? 0.55 : 0.72; }
      else if (toRace <= 9) { ph = 'Spécifique'; f = 1; }
      else if (toRace <= 19) { ph = 'Développement'; f = 0.78 + 0.22 * (19 - toRace) / 10; }
      else { ph = 'Base'; f = 0.7; }
      const rec = i >= 3 && (race ? toRace > 4 && toRace % 4 === 3 : i % 4 === 3); // jamais d'allègement dans les 3 premières semaines
      phaseIx[ph] = (phaseIx[ph] == null ? 0 : phaseIx[ph] + (rec ? 0 : 1));
      let H = (ph === 'Base' || ph === 'Développement') ? H0 + (Hp * f - H0) * Math.min(1, (i + 1) / Math.max(4, nW - 9)) : Hp * f;
      if (rec) H *= 0.7; if (i === 0 && o.adapt) H *= o.adapt;
      H = Math.max(2, H);
      const wk = { ws, ph, rec, H, sess: [] };
      const put = (dow, s) => { const d = new Date(+ws + (dow - 1) * DAY); if (d < new Date(start.getFullYear(), start.getMonth(), start.getDate())) return; out.push(Object.assign({ day: ymd(d), phase: ph + (rec ? ' · récup' : '') }, s)); };

      if (ph === 'Course') {
        const rd = new Date(race.race_date + 'T12:00:00'), rdow = (rd.getDay() + 6) % 7 + 1;
        [[rdow - 5, 'ef', 'Footing + lignes droites', 40], [rdow - 3, 'tempo', 'Rappel 4 × 1 min', 35], [rdow - 1, 'shake', 'Déblocage 20 min', 20]].forEach(([dw, k, t, m]) => { if (dw >= 1) put(dw, { kind: k, title: t, minutes: m, dplus: 0, steps: k === 'tempo' ? [WU(15), S('Accélération', 1, 4, { reps: 4, rec: { min: 1.5, z: 1, t: 'trot' } }), CD(10)] : [S('Footing', m - (k === 'ef' ? 5 : 0), 1), ...(k === 'ef' ? [S('Lignes droites', 5, 4, { note: '4 × 20 s, relâché' })] : [])] }); });
        put(rdow, { kind: 'race', title: race.name, minutes: Math.round(raceH * 60), dplus: race.dplus || 0, steps: [S('Course', Math.round(raceH * 60), 2, { note: 'ta stratégie de course : onglet Stratégie' })] });
        continue;
      }
      // placement : sortie longue, 1 ou 2 séances de qualité, renfo, footings
      const free = days.filter(d => d !== longDay);
      const nQ = rec || ph === 'Affûtage' ? 1 : (ph === 'Base' ? (lvl === 3 ? 2 : 1) : (lvl === 1 ? 1 : 2));
      const dist = (a, b) => Math.min(Math.abs(a - b), 7 - Math.abs(a - b));
      // jours de qualité : les plus éloignés possible de la sortie longue et l'un de l'autre
      let qDays = [];
      if (nQ === 1) { const c = free.slice().sort((a, b) => dist(b, longDay) - dist(a, longDay) || a - b); if (c.length) qDays = [c[0]]; }
      else { let best = null; for (let x = 0; x < free.length; x++) for (let y = x + 1; y < free.length; y++) { const a = free[x], b = free[y], sc = Math.min(dist(a, b), dist(a, longDay), dist(b, longDay)) * 10 + dist(a, longDay) + dist(b, longDay); if (!best || sc > best[0]) best = [sc, a, b]; }
        qDays = best ? [best[1], best[2]] : free.slice(0, 1); }
      let rest = free.filter(d => !qDays.includes(d));
      const nSess = Math.min(maxSessions, days.length);
      const nEF = Math.max(0, nSess - 1 - qDays.length);
      const renfoDay = rest.length ? rest.slice().sort((a, b) => dist(b, longDay) - dist(a, longDay))[0] : null;
      const efDays = rest.filter(d => d !== renfoDay).slice(0, Math.max(0, nEF - (renfoDay ? 0 : 0)));

      // qualité
      const ix = phaseIx[ph] || 0, qs = [];
      const pick = (slot) => {
        if (ph === 'Base') return slot === 0 ? (canUp ? 'cotes_courtes' : 'fartlek') : 'tempo';
        if (ph === 'Développement') return slot === 0 ? 'seuil' : (canUp && ix % 2 ? 'cotes_longues' : 'vma');
        if (ph === 'Spécifique') return slot === 0 ? (canUp ? 'cotes_longues' : 'seuil_long') : (ix % 2 ? 'seuil_long' : 'tempo');
        return 'rappel';
      };
      qDays.forEach((d, s) => qs.push([d, rec ? Object.assign(quality(pick(0), ph, 0, H, { lvl, up: tr.treadmill && !tr.mountain, vam: o.tests && o.tests.up && o.tests.up.vam }), { title: 'Rappel léger' }) : quality(pick(s), ph, ix, H, { lvl, up: tr.treadmill && !tr.mountain, vam: o.tests && o.tests.up && o.tests.up.vam })]));
      // tests : semaine 1 si absents, puis toutes les 8 semaines hors affûtage
      // seuls les jours à venir comptent pour placer un test
      const today0 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const open = qs.filter(([d]) => new Date(+ws + (d - 1) * DAY) >= today0);
      // un seul test par semaine ; nouveau test toutes les 8 semaines, jamais dans les 5 dernières avant la course
      const okRe = i >= 8 && toRace > 5 && !rec;
      const TF = { kind: 'test', title: 'Test vitesse critique (piste)', minutes: 75, dplus: 0, steps: TEST_FLAT }, TU = { kind: 'test', title: 'Test vitesse critique en montée (tapis)', minutes: 75, dplus: 0, steps: TEST_UP };
      if (okRe && i % 8 === 0) needFlat = true; if (okRe && i % 8 === 1 && tr.treadmill) needUp = true;
      if (open[0]) { if (needFlat) { open[0][1] = TF; needFlat = false; } else if (needUp) { open[0][1] = TU; needUp = false; } }
      qs.forEach(([d, s]) => put(d, s));
      const qMin = qs.reduce((a, [, s]) => a + s.minutes, 0);

      // sortie longue
      const specL = Math.min(longMax, Math.max(1.5, raceH * (lvl === 3 ? 0.4 : 0.33)));
      let lh = ph === 'Spécifique' ? specL : ph === 'Développement' ? Math.min(longMax, H * 0.32 + 0.5) : ph === 'Affûtage' ? specL * (toRace === 2 ? 0.6 : 0.4) : Math.min(longMax, H * 0.3);
      if (rec) lh *= 0.7; lh = Math.max(1, Math.round(lh * 4) / 4);
      const dpw = Math.round(H * (o.dph || 250) * 0.8 / 50) * 50;
      put(longDay, { kind: 'long', title: ph === 'Spécifique' ? 'Sortie longue spécifique' : 'Sortie longue', minutes: Math.round(lh * 60), dplus: Math.round(dpw * 0.55 / 50) * 50,
        steps: ph === 'Spécifique' ? [S('Endurance', lh * 60 * 0.85, 2, { note: 'terrain proche de la course, montées en marche active, descentes travaillées' }), S('Fin au tempo', lh * 60 * 0.15, 3, { note: 'teste ta nutrition de course : ' + (lh >= 2.5 ? '60 à 90' : '40 à 60') + ' g de glucides par heure' })] : [S('Endurance', lh * 60, 2, { note: 'conversation possible ; marche en côte si la FC dépasse la zone 2' })] });
      // dos à dos (confirmés, phase spécifique)
      const b2bDay = longDay === 7 ? 6 : longDay === 6 ? 7 : null;
      if (lvl === 3 && ph === 'Spécifique' && !rec && b2bDay && days.includes(b2bDay) && !qDays.includes(b2bDay)) {
        const m = Math.min(wdMax * 1.5, Math.round(lh * 60 * 0.5));
        put(b2bDay, { kind: 'ef', title: 'Dos à dos : endurance sur jambes fatiguées', minutes: r5(m), dplus: Math.round(dpw * 0.2 / 50) * 50, steps: [S('Endurance', m, 2, { note: 'au lendemain ou la veille de la sortie longue' })] });
        rest = rest.filter(d => d !== b2bDay);
      }
      // renfo
      if (renfoDay && ph !== 'Affûtage') put(renfoDay, { kind: 'renfo', title: tr.gym ? 'Renforcement (salle)' : 'Renforcement', minutes: 30, dplus: 0, steps: RENFO });
      // footings : ce qu'il reste du volume
      const left = Math.max(0, H * 60 - qMin - lh * 60 - (renfoDay ? 15 : 0));
      const efs = rest.filter(d => d !== renfoDay && !out.some(s => s.day === ymd(new Date(+ws + (d - 1) * DAY)))).slice(0, nEF);
      efs.forEach((d, k) => { const m = Math.min(wdMax, Math.max(30, left / Math.max(1, efs.length))); put(d, { kind: tr.bike && k === efs.length - 1 && efs.length > 1 ? 'cross' : 'ef', title: tr.bike && k === efs.length - 1 && efs.length > 1 ? 'Vélo en endurance' : 'Footing en endurance', minutes: r5(m), dplus: tr.mountain ? Math.round(dpw * 0.25 / Math.max(1, efs.length) / 50) * 50 : 0, steps: [S(tr.bike && k === efs.length - 1 && efs.length > 1 ? 'Vélo' : 'Footing', m, 2, { note: 'facile, nez fermé' })] }); });
    }
    return out;
  }

  root.VTPlan = { flatTest, uphillTest, bestWindows, paceZones, hrZonesLT, vamZones, paceTxt, generate, levelOf, ZNAMES, PZ };
})(typeof window !== 'undefined' ? window : globalThis);
