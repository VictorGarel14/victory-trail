/* VIC'TORY Trail : lecture des fichiers FIT (montres Coros, Garmin, Suunto…) et GPX, résumé d'une sortie,
   profil d'une course. Tout se fait dans le téléphone : le fichier n'est envoyé nulle part pour être lu. */
(function (root) {
  'use strict';
  var FIT_EPOCH = 631065600; // 1989-12-31T00:00:00Z
  var SEMI = 180 / 2147483648;

  /* ---------- FIT ---------- */
  function parseFIT(buf) {
    var dv = new DataView(buf), n = buf.byteLength;
    if (n < 14) throw new Error('Fichier FIT trop court');
    var hs = dv.getUint8(0);
    var sig = String.fromCharCode(dv.getUint8(8), dv.getUint8(9), dv.getUint8(10), dv.getUint8(11));
    if (sig !== '.FIT') throw new Error('Ce fichier n\'est pas un fichier FIT');
    var end = Math.min(n, hs + dv.getUint32(4, true));
    var defs = {}, p = hs, lastTs = 0;
    var out = { records: [], sessions: [], laps: 0, sport: null, start: null };
    function rd(off, size, base, le) {
      var bt = base & 0x1f;
      if (size === 1) { var v = bt === 1 ? dv.getInt8(off) : dv.getUint8(off); return (bt === 1 ? v === 0x7f : v === 0xff) ? null : v; }
      if (size === 2) { var w = (bt === 3) ? dv.getInt16(off, le) : dv.getUint16(off, le); return (bt === 3 ? w === 0x7fff : w === 0xffff) ? null : w; }
      if (size === 4) {
        if (bt === 8) { var f = dv.getFloat32(off, le); return isFinite(f) ? f : null; }
        var x = (bt === 5) ? dv.getInt32(off, le) : dv.getUint32(off, le);
        return (bt === 5 ? x === 0x7fffffff : x === 0xffffffff) ? null : x;
      }
      return null;
    }
    while (p < end) {
      var h = dv.getUint8(p++);
      if (h & 0x80) { // en-tête d'horodatage compressé (message de données)
        var lt = (h >> 5) & 3, off5 = h & 0x1f, d = defs[lt];
        if (!d) throw new Error('FIT illisible (définition manquante)');
        var ts = (lastTs & ~0x1f) + off5; if (off5 < (lastTs & 0x1f)) ts += 0x20; lastTs = ts;
        p = readData(d, p, ts); continue;
      }
      var local = h & 0x0f;
      if (h & 0x40) { // définition
        var le = dv.getUint8(p + 1) === 0, gm = dv.getUint16(p + 2, le), nf = dv.getUint8(p + 4); p += 5;
        var fields = [], size = 0;
        for (var i = 0; i < nf; i++) { fields.push([dv.getUint8(p), dv.getUint8(p + 1), dv.getUint8(p + 2)]); size += dv.getUint8(p + 1); p += 3; }
        if (h & 0x20) { var nd = dv.getUint8(p++); for (var j = 0; j < nd; j++) { size += dv.getUint8(p + 1); p += 3; } }
        defs[local] = { le: le, gm: gm, fields: fields, size: size };
      } else {
        var dd = defs[local]; if (!dd) throw new Error('FIT illisible (définition manquante)');
        p = readData(dd, p, null);
      }
    }
    function readData(d, at, cts) {
      var o = {}, q = at;
      for (var k = 0; k < d.fields.length; k++) {
        var f = d.fields[k], bsz = { 0: 1, 1: 1, 2: 1, 3: 2, 4: 2, 5: 4, 6: 4, 8: 4, 10: 1, 11: 2, 12: 4, 13: 1 }[f[2] & 0x1f] || f[1];
        o[f[0]] = (f[1] % bsz === 0 && bsz <= 4) ? rd(q, bsz, f[2], d.le) : null; q += f[1];
      }
      q = at + d.size;
      if (o[253] != null) lastTs = o[253]; else if (cts != null) o[253] = cts;
      if (d.gm === 20) {
        var alt = o[78] != null ? o[78] / 5 - 500 : (o[2] != null ? o[2] / 5 - 500 : null);
        out.records.push({
          t: o[253] != null ? o[253] + FIT_EPOCH : null,
          lat: o[0] != null ? o[0] * SEMI : null, lon: o[1] != null ? o[1] * SEMI : null,
          alt: alt, hr: o[3] || null, d: o[5] != null ? o[5] / 100 : null
        });
      } else if (d.gm === 18) {
        out.sessions.push({
          start: o[2] != null ? o[2] + FIT_EPOCH : null, sport: o[5], sub: o[6],
          elapsed: o[7] != null ? o[7] / 1000 : null, timer: o[8] != null ? o[8] / 1000 : null,
          dist: o[9] != null ? o[9] / 100 : null, up: o[22], down: o[23], avgHr: o[16], maxHr: o[17]
        });
      } else if (d.gm === 19) out.laps++;
      return q;
    }
    var s = out.sessions[0] || {};
    var SPORTS = { 1: 'run', 2: 'bike', 5: 'swim', 11: 'walk', 17: 'hike', 10: 'gym', 4: 'gym' };
    out.sport = s.sub === 3 || s.sub === 32 ? 'trail' : (SPORTS[s.sport] || 'other');
    if (s.sport === 1 && s.sub !== 3) out.sport = 'run';
    out.start = s.start || (out.records[0] && out.records[0].t) || null;
    return out;
  }

  /* ---------- GPX ---------- */
  function parseGPX(text) {
    var doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('Ce fichier n\'est pas un GPX valide');
    var pts = doc.getElementsByTagName('trkpt'); if (!pts.length) pts = doc.getElementsByTagName('rtept');
    var recs = [];
    for (var i = 0; i < pts.length; i++) {
      var e = pts[i], el = e.getElementsByTagName('ele')[0], tm = e.getElementsByTagName('time')[0];
      var hrEl = e.getElementsByTagNameNS('*', 'hr')[0];
      recs.push({ lat: +e.getAttribute('lat'), lon: +e.getAttribute('lon'), alt: el ? +el.textContent : null,
        t: tm ? Date.parse(tm.textContent) / 1000 : null, hr: hrEl ? +hrEl.textContent : null, d: null });
    }
    var nm = doc.getElementsByTagName('name')[0];
    return { records: recs, sessions: [], sport: 'trail', start: recs[0] && recs[0].t, name: nm ? nm.textContent.trim() : '' };
  }

  /* ---------- outils ---------- */
  function hav(a, b) {
    var R = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r;
    var s = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  function withDistance(recs) {
    var d = 0, prev = null, hasD = recs.some(function (r) { return r.d != null; });
    recs.forEach(function (r) {
      if (!hasD) { if (prev && r.lat != null && prev.lat != null) d += hav(prev, r); r.d = d; }
      else if (r.d == null) r.d = prev ? prev.d : 0;
      if (r.lat != null) prev = r; else if (!prev) prev = r;
    });
    return recs;
  }
  // D+ / D− avec un seuil de 3 m pour gommer le bruit de l'altimètre
  function climb(alts) {
    var up = 0, dn = 0, ref = null;
    alts.forEach(function (a) { if (a == null) return; if (ref == null) { ref = a; return; } var x = a - ref; if (x >= 3) { up += x; ref = a; } else if (x <= -3) { dn -= x; ref = a; } });
    return { up: Math.round(up), dn: Math.round(dn) };
  }
  function zoneOf(hr, zones) { for (var i = zones.length - 1; i >= 0; i--) if (hr >= zones[i][0]) return i; return 0; }
  function r5(x) { return Math.round(x * 1e5) / 1e5; }

  /* ---------- résumé d'une sortie ---------- */
  function summarize(f, opt) {
    opt = opt || {};
    var recs = withDistance(f.records.filter(function (r) { return r.t != null || r.lat != null; }));
    var s = f.sessions[0] || {};
    var t0 = f.start || (recs[0] && recs[0].t), tN = recs.length ? recs[recs.length - 1].t : null;
    var moving = 0, zs = opt.zones ? opt.zones.map(function () { return 0; }) : null, hrs = [], maxHr = 0;
    for (var i = 1; i < recs.length; i++) {
      var a = recs[i - 1], b = recs[i]; if (a.t == null || b.t == null) continue;
      var dt = b.t - a.t; if (dt <= 0 || dt > 60) continue;
      var v = (b.d - a.d) / dt; if (v > 0.4) moving += dt;
      if (b.hr) { hrs.push([b.hr, dt]); if (b.hr > maxHr) maxHr = b.hr; if (zs) zs[zoneOf(b.hr, opt.zones)] += dt; }
    }
    var hw = hrs.reduce(function (x, h) { return x + h[1]; }, 0);
    var avgHr = hw ? Math.round(hrs.reduce(function (x, h) { return x + h[0] * h[1]; }, 0) / hw) : null;
    var c = climb(recs.map(function (r) { return r.alt; }));
    var dist = s.dist != null ? s.dist : (recs.length ? recs[recs.length - 1].d : 0);
    // tracé simplifié : un point tous les ~25 m, 1 500 points au plus
    var step = Math.max(25, dist / 1500), track = [], lastD = -1e9;
    recs.forEach(function (r, k) {
      if (r.lat == null) return;
      if (r.d - lastD >= step || k === recs.length - 1) {
        track.push([r5(r.lat), r5(r.lon), r.alt != null ? Math.round(r.alt) : null, (r.t != null && t0 != null) ? Math.round(r.t - t0) : null, opt.noHr ? null : (r.hr || null)]);
        lastD = r.d;
      }
    });
    return {
      sport: f.sport || 'trail', start_at: t0 ? new Date(t0 * 1000).toISOString() : null,
      distance_m: Math.round(dist * 10) / 10,
      moving_s: Math.round(s.timer != null ? s.timer : moving) || null,
      elapsed_s: Math.round(s.elapsed != null ? s.elapsed : (t0 != null && tN != null ? tN - t0 : 0)) || null,
      elev_gain: s.up != null ? s.up : c.up, elev_loss: s.down != null ? s.down : c.dn,
      avg_hr: opt.noHr ? null : (s.avgHr || avgHr), max_hr: opt.noHr ? null : (s.maxHr || maxHr || null),
      zone_s: opt.noHr || !zs ? null : zs.map(Math.round), track: track.length > 1 ? track : null
    };
  }

  /* ---------- profil d'une course (GPX du parcours) ---------- */
  function courseProfile(f) {
    var recs = withDistance(f.records.filter(function (r) { return r.lat != null; }));
    if (recs.length < 2) throw new Error('Le GPX ne contient pas de tracé');
    var total = recs[recs.length - 1].d, prof = [], route = [], next = 0, j = 0, n = 0;
    while (next <= total) {
      while (j < recs.length - 1 && recs[j + 1].d < next) j++;
      var a = recs[j], b = recs[Math.min(j + 1, recs.length - 1)], k = b.d > a.d ? (next - a.d) / (b.d - a.d) : 0;
      var alt = a.alt != null && b.alt != null ? a.alt + (b.alt - a.alt) * k : (a.alt != null ? a.alt : 0);
      prof.push([Math.round(next / 10) / 100, Math.round(alt)]);
      // tracé tous les 200 m (carte, météo, position en direct)
      if (n++ % 2 === 0) route.push([r5(a.lat + (b.lat - a.lat) * k), r5(a.lon + (b.lon - a.lon) * k), Math.round(next / 10) / 100]);
      next += 100;
    }
    var last = recs[recs.length - 1]; route.push([r5(last.lat), r5(last.lon), Math.round(total / 10) / 100]);
    var c = climb(recs.map(function (r) { return r.alt; }));
    return { km: Math.round(total / 10) / 100, dplus: c.up, dminus: c.dn, profile: prof, route: route, name: f.name || '' };
  }

  async function fileHash(buf) {
    var h = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(h)).slice(0, 12).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
  }

  async function readFile(file) {
    var buf = await file.arrayBuffer(), name = file.name || '';
    var isGpx = /\.gpx$/i.test(name) || new TextDecoder().decode(buf.slice(0, 200)).indexOf('<gpx') >= 0;
    var f = isGpx ? parseGPX(new TextDecoder().decode(buf)) : parseFIT(buf);
    f.kind = isGpx ? 'gpx' : 'fit';
    f.hash = await fileHash(buf); f.buf = buf; f.fileName = name;
    return f;
  }

  root.VTParse = { parseFIT: parseFIT, parseGPX: parseGPX, summarize: summarize, courseProfile: courseProfile, readFile: readFile, hav: hav };
})(typeof window !== 'undefined' ? window : globalThis);
