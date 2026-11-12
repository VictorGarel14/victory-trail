/* VIC'TORY Trail · carnet d'ultra-trail multi-utilisateurs (Supabase). */
(function () {
'use strict';

/* ---------- configuration ---------- */
const SB_URL = 'https://vvmfutlpcdgufuowcvte.supabase.co';
const SB_KEY = 'sb_publishable_5vrAEcRUk75_ucJlDecVxA__k8E9iwi';
const CHANGES = [
  { v: '0.4.0', date: '2026-11-12', name: 'Forme', items: [
    'Forme du jour : forme (42 jours), fatigue (7 jours) et fraîcheur, calculées à partir de tes zones cardio ou de ton ressenti',
    'Courbe de forme et de fatigue sur 120 jours dans Progrès',
    'Plan jusqu\'à ta course A : phases (base, développement, spécifique, affûtage), heures, D+ et sortie longue semaine par semaine',
    'Une semaine sur quatre allégée, et une limite d\'heures par semaine selon ta vie',
    'Jumeau local : chaque montée et descente de ta course retrouvée dans tes propres sorties, avec le taux de parcours couvert'
  ] },
  { v: '0.3.0', date: '2026-11-12', name: 'En direct', items: [
    'Le jour de la course : bouton « Je suis à… » pour pointer chaque ravito en un geste',
    'Partage de ta position GPS tant que l\'appli est ouverte (l\'écran reste allumé)',
    'Heures d\'arrivée recalculées à chaque pointage : en avance ou en retard sur le prévu',
    'Ton équipe pointe aussi : « Je l\'ai vu passer », depuis son lien, sans compte',
    'Carte en direct avec ta dernière position sur la page équipe, mise à jour chaque minute',
    'Lien de suivi de ta montre (Coros, Garmin) ou de l\'organisation, à portée de clic pour l\'équipe'
  ] },
  { v: '0.2.0', date: '2026-11-12', name: 'Jour J', items: [
    'Nutrition : glucides, eau et sodium par heure, besoins calculés pour chaque portion entre deux ravitos',
    'À chaque point : ce que tu prends, ou ce que ton équipe doit te tendre (visible sur son lien)',
    'Matériel : liste à cocher, avec la liste type du matériel obligatoire des ultras UTMB',
    'Météo sur le parcours à l\'heure de passage prévue, à partir de J−15',
    'Bilan après course : temps réel contre prévu à chaque point, rempli depuis le fichier de ta montre',
    'Les bilans recalent les estimations de tes prochaines courses',
    'Page équipe : vos rendez-vous en gros, avec ce qu\'il faut tendre'
  ] },
  { v: '0.1.0', date: '2026-11-12', name: 'Bêta', items: [
    'Création de compte par code reçu par e-mail',
    'Profil cardio : FC max, FC de repos et 5 zones',
    'Import des sorties depuis les fichiers FIT (Coros, Garmin, Suunto…) et GPX, ou saisie à la main',
    'Courses objectifs avec le parcours GPX, les points de passage et les heures estimées',
    'Lien pour l\'équipe d\'assistance, sans compte',
    'Progrès : volume, dénivelé et temps dans chaque zone',
    'Export de toutes mes données et suppression du compte'
  ] }
];
const APPV = CHANGES[0].v;
const ZN = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'], ZL = ['Récup', 'Endurance', 'Tempo', 'Seuil', 'VMA'];
const ZC = ['var(--z1)', 'var(--z2)', 'var(--z3)', 'var(--z4)', 'var(--z5)'];
const SPORT = { trail: 'Trail', run: 'Course à pied', hike: 'Randonnée', walk: 'Marche', bike: 'Vélo', gym: 'Renfo', swim: 'Natation', other: 'Autre' };
const TZS = ['Europe/Paris', 'Indian/Reunion', 'Europe/London', 'Atlantic/Canary', 'Africa/Johannesburg', 'America/New_York', 'America/Denver', 'America/Los_Angeles', 'Asia/Tokyo', 'Pacific/Auckland', 'Australia/Sydney'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

const sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'vtr-auth' } });
const S = { user: null, profile: null, races: [], acts: [], loaded: false };
const $ = id => document.getElementById(id);
const root = $('root');

/* ---------- utilitaires ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = { get(k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set(k, v) { try { localStorage.setItem(k, v) } catch (e) {} }, del(k) { try { localStorage.removeItem(k) } catch (e) {} } };
const fr = n => n == null ? '–' : Math.round(n).toLocaleString('fr-FR');
const km1 = m => m == null ? '–' : (m / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: m >= 100000 ? 0 : 1 });
function hm(s, long) { if (s == null) return '–'; s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return long ? (h ? h + ' h ' + String(m).padStart(2, '0') : m + ' min') : h + ' h ' + String(m).padStart(2, '0'); }
function hms(s) { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); }
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const pd = s => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => ymd(new Date());
const dayDiff = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
const fmtD = s => { const d = pd(s); return d.getDate() + ' ' + MOIS[d.getMonth()] + ' ' + d.getFullYear(); };
const fmtDs = s => { const d = pd(s); return JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()]; };
const localDay = iso => ymd(new Date(iso));
function weekStart(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const w = (x.getDay() + 6) % 7; x.setDate(x.getDate() - w); return x; }
const parseHM = v => { const m = String(v || '').trim().match(/^(\d{1,3})\s*[h:]\s*(\d{1,2})?$/i); return m ? (+m[1]) * 3600 + (+(m[2] || 0)) * 60 : null; };
const vcmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
function toast(t, ms) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), ms || 2600); }
function randToken() { const a = new Uint8Array(24); crypto.getRandomValues(a); return btoa(String.fromCharCode.apply(null, a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
const effortOf = a => (a.distance_m || 0) / 1000 + (a.elev_gain || 0) / 100;
const isFoot = a => ['trail', 'run', 'hike', 'walk'].includes(a.sport);
function zonesFrom(max, rest) {
  if (!max) return null;
  // % de FC max : 72 / 82 / 87 / 92
  const b = [0.72, 0.82, 0.87, 0.92].map(p => Math.round(max * p));
  return [[0, b[0] - 1], [b[0], b[1] - 1], [b[1], b[2] - 1], [b[2], b[3] - 1], [b[3], max]];
}
// décalage d'un fuseau à une date (minutes)
function tzOffset(tz, d) {
  try { const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(d).reduce((o, x) => (o[x.type] = x.value, o), {});
    return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - d.getTime()) / 6e4; } catch (e) { return 0; }
}
function raceStart(r) { // instant réel du départ
  const [y, m, d] = r.race_date.split('-').map(Number), [hh, mm] = (r.start_time || '07:00').split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm); return new Date(guess - tzOffset(r.tz || 'Europe/Paris', new Date(guess)) * 6e4);
}
function wallClock(r, secs) { // heure locale de la course après « secs » secondes
  const [y, m, d] = r.race_date.split('-').map(Number), [hh, mm] = (r.start_time || '07:00').split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh, mm) + secs * 1000);
  return JOURS[t.getUTCDay()] + ' ' + String(t.getUTCHours()).padStart(2, '0') + ':' + String(t.getUTCMinutes()).padStart(2, '0');
}

/* ---------- données ---------- */
const ACT_COLS = 'id,source,start_at,sport,name,distance_m,moving_s,elapsed_s,elev_gain,elev_loss,avg_hr,max_hr,zone_s,rpe,note';
function cacheKey() { return 'vtr-cache-' + (S.user && S.user.id); }
function saveCache() { LS.set(cacheKey(), JSON.stringify({ p: S.profile, r: S.races, a: S.acts })); }
function loadCache() { try { const c = JSON.parse(LS.get(cacheKey()) || 'null'); if (c) { S.profile = c.p; S.races = c.r || []; S.acts = c.a || []; return true; } } catch (e) {} return false; }
async function loadAll() {
  const [p, r, a] = await Promise.all([
    sb.from('profiles').select('*').eq('id', S.user.id).maybeSingle(),
    sb.from('races').select('*').order('race_date'),
    sb.from('activities').select(ACT_COLS).order('start_at', { ascending: false }).limit(1000)
  ]);
  if (p.error || r.error || a.error) throw (p.error || r.error || a.error);
  S.profile = p.data || { id: S.user.id, display_name: '', onboarded: false };
  S.races = r.data || []; S.acts = a.data || []; S.loaded = true; saveCache();
}
async function saveProfile(patch) {
  const { data, error } = await sb.from('profiles').update(patch).eq('id', S.user.id).select().single();
  if (error) throw error; S.profile = data; saveCache(); return data;
}
const zones = () => (S.profile && S.profile.zones) || zonesFrom(S.profile && S.profile.hr_max, S.profile && S.profile.hr_rest);
const hrOK = () => !!(S.profile && S.profile.health_consent_at);
const nextRace = () => S.races.filter(r => r.race_date >= today()).sort((a, b) => a.race_date.localeCompare(b.race_date))[0] || null;

/* ---------- feuille ---------- */
const dlg = $('sheet');
function sheet(w, t, html) { $('shW').textContent = w || ''; $('shT').textContent = t || ''; $('shB').innerHTML = html; if (!dlg.open) dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', ''); }
$('shX').onclick = () => dlg.close(); dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

/* ---------- icônes ---------- */
const IC = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20l6-12 4 7 3-5 5 10z"/></svg>',
  acts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
  races: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  prog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>'
};

/* ---------- squelette ---------- */
function shell(tab, html) {
  const nr = nextRace(), j = nr ? dayDiff(today(), nr.race_date) : null;
  root.innerHTML = '<header class="top"><div class="wrap in"><a class="brand" href="#/"><img src="icons/logo.svg" alt=""><b>VIC<i>\'</i>TORY</b></a>' +
    (nr ? '<span class="jx">' + esc(nr.name.length > 14 ? nr.name.slice(0, 13) + '…' : nr.name) + ' <b>J−' + j + '</b></span>' : '') + '</div></header>' +
    '<main class="wrap fade" id="main">' + html + '</main>' +
    '<nav class="tabs" aria-label="Navigation"><div class="in">' +
    [['', 'today', 'Aujourd\'hui'], ['seances', 'acts', 'Séances'], ['courses', 'races', 'Courses'], ['progres', 'prog', 'Progrès'], ['profil', 'me', 'Profil']]
      .map(([h, i, l]) => '<a href="#/' + h + '"' + (tab === i ? ' class="on" aria-current="page"' : '') + '>' + IC[i] + l + '</a>').join('') + '</div></nav>';
}

/* ---------- connexion ---------- */
function vLogin(msg) {
  const em = LS.get('vtr-email') || '';
  root.innerHTML = '<div class="auth"><div class="box fade"><img class="logo" src="icons/logo.svg" alt=""><h1>VIC<i>\'</i>TORY<br>TRAIL</h1><p class="base">Impossible is just a distance</p><p class="sig">continuer à rêver, juste assez pour tenir debout</p>' +
    '<form id="f1"><label class="f" for="em">Ton adresse e-mail</label><input class="in-f" id="em" type="email" autocomplete="email" inputmode="email" required value="' + esc(em) + '">' +
    '<label class="check"><input type="checkbox" id="cg" required> <span>J\'accepte les <a href="#/confidentialite">règles de confidentialité</a> : mes données restent à moi, je peux les exporter ou tout supprimer à tout moment.</span></label>' +
    '<div class="btns"><button class="btn grad" type="submit">Recevoir mon code</button></div></form>' +
    '<form id="f2" hidden><p class="muted" id="sent"></p><label class="f" for="cd">Code reçu par e-mail</label><input class="in-f code" id="cd" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required>' +
    '<div class="btns"><button class="btn grad" type="submit">Entrer</button><button class="btn ghost" type="button" id="bk">Changer d\'adresse</button></div></form>' +
    '<p class="err" id="er" role="alert">' + esc(msg || '') + '</p><p class="note" style="text-align:center">Pas de mot de passe : un code à usage unique à chaque nouvel appareil.</p></div></div>';
  let mail = '';
  const E = t => { $('er').textContent = t || ''; };
  if (LS.get('vtr-cg')) $('cg').checked = true;
  $('f1').onsubmit = async ev => {
    ev.preventDefault(); E(''); mail = $('em').value.trim().toLowerCase(); const b = ev.target.querySelector('button'); b.disabled = true; b.textContent = 'Envoi…';
    const { error } = await sb.auth.signInWithOtp({ email: mail, options: { shouldCreateUser: true } });
    b.disabled = false; b.textContent = 'Recevoir mon code';
    if (error) return E(/rate/i.test(error.message) ? 'Trop de demandes : réessaie dans quelques minutes.' : 'Envoi impossible : ' + error.message);
    LS.set('vtr-email', mail); LS.set('vtr-cg', '1');
    $('f1').hidden = true; $('f2').hidden = false; $('sent').textContent = 'Code envoyé à ' + mail + '. Pense à regarder dans les spams.'; $('cd').focus();
  };
  $('bk').onclick = () => { $('f2').hidden = true; $('f1').hidden = false; E(''); };
  $('f2').onsubmit = async ev => {
    ev.preventDefault(); E(''); const b = ev.target.querySelector('button'); b.disabled = true; b.textContent = 'Vérification…';
    const { data, error } = await sb.auth.verifyOtp({ email: mail, token: $('cd').value.trim(), type: 'email' });
    b.disabled = false; b.textContent = 'Entrer';
    if (error) return E(/expired|invalid/i.test(error.message) ? 'Code incorrect ou expiré.' : error.message);
    S.user = data.user; boot();
  };
}

/* ---------- bienvenue (première connexion) ---------- */
function vOnboard(step) {
  step = step || 1; const p = S.profile || {};
  let h = '<div class="auth"><div class="box fade"><p class="muted" style="font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-size:.75rem">Bienvenue · étape ' + step + ' sur 3</p>';
  if (step === 1) h += '<h1 style="text-align:left;font-size:2rem">Comment tu t\'appelles ?</h1><form id="ob"><label class="f" for="nm">Prénom <small>(c\'est ce que verra ton équipe d\'assistance)</small></label><input class="in-f" id="nm" maxlength="60" required autocomplete="given-name" value="' + esc(p.display_name) + '"><div class="btns"><button class="btn grad">Continuer</button></div></form>';
  if (step === 2) h += '<h1 style="text-align:left;font-size:2rem">Ton cœur</h1><p class="muted">Avec ta fréquence cardiaque, l\'appli calcule tes zones et le temps passé dans chacune.</p><form id="ob">' +
    '<label class="check"><input type="checkbox" id="hc"' + (p.health_consent_at ? ' checked' : '') + '> <span>J\'accepte que ma fréquence cardiaque soit enregistrée. C\'est une donnée de santé : elle n\'est visible que par moi, et je peux retirer mon accord à tout moment (elle est alors effacée).</span></label>' +
    '<div class="grid2"><div><label class="f" for="hx">FC max <small>(bpm)</small></label><input class="in-f" id="hx" inputmode="numeric" pattern="[0-9]*" value="' + (p.hr_max || '') + '"></div><div><label class="f" for="hr">FC repos <small>(bpm)</small></label><input class="in-f" id="hr" inputmode="numeric" pattern="[0-9]*" value="' + (p.hr_rest || '') + '"></div></div>' +
    '<p class="note">Tu ne connais pas ta FC max ? Laisse vide : tu pourras la remplir plus tard (le plus haut relevé sur une sortie très dure est un bon repère).</p><p class="err" id="er"></p><div class="btns two"><button class="btn ghost" type="button" id="pv">Retour</button><button class="btn grad">Continuer</button></div></form>';
  if (step === 3) h += '<h1 style="text-align:left;font-size:2rem">Ton prochain objectif</h1><p class="muted">La course que tu prépares. Tu pourras ajouter le parcours GPX et les ravitos ensuite.</p><form id="ob">' +
    '<label class="f" for="rn">Nom de la course</label><input class="in-f" id="rn" maxlength="120" placeholder="Ex. Diagonale des Fous">' +
    '<div class="grid2"><div><label class="f" for="rd">Date</label><input class="in-f" id="rd" type="date" min="' + today() + '"></div><div><label class="f" for="rk">Distance <small>(km)</small></label><input class="in-f" id="rk" inputmode="decimal"></div></div>' +
    '<label class="f" for="rp">Dénivelé positif <small>(m)</small></label><input class="in-f" id="rp" inputmode="numeric" pattern="[0-9]*">' +
    '<p class="err" id="er"></p><div class="btns"><button class="btn grad">Terminer</button><button class="btn ghost" type="button" id="sk">Plus tard</button></div></form>';
  h += '</div></div>'; root.innerHTML = h;
  const f = $('ob'), E = t => { const e = $('er'); if (e) e.textContent = t || ''; };
  if ($('pv')) $('pv').onclick = () => vOnboard(step - 1);
  const finish = async () => { await saveProfile({ onboarded: true }); location.hash = '#/'; route(); };
  if ($('sk')) $('sk').onclick = () => finish().catch(e => E(e.message));
  f.onsubmit = async ev => {
    ev.preventDefault(); E('');
    try {
      if (step === 1) { await saveProfile({ display_name: $('nm').value.trim().slice(0, 60) }); return vOnboard(2); }
      if (step === 2) {
        const c = $('hc').checked, mx = +$('hx').value || null, rs = +$('hr').value || null;
        if (mx && (mx < 120 || mx > 230)) return E('FC max entre 120 et 230.'); if (rs && (rs < 30 || rs > 100)) return E('FC de repos entre 30 et 100.');
        await saveProfile({ health_consent_at: c ? (p.health_consent_at || new Date().toISOString()) : null, hr_max: c ? mx : null, hr_rest: c ? rs : null, zones: c ? zonesFrom(mx, rs) : null });
        return vOnboard(3);
      }
      const n = $('rn').value.trim(), d = $('rd').value;
      if (n || d) {
        if (!n || !d) return E('Indique au moins le nom et la date.');
        const { data, error } = await sb.from('races').insert({ name: n, race_date: d, km: +String($('rk').value).replace(',', '.') || null, dplus: +$('rp').value || null }).select().single();
        if (error) throw error; S.races.push(data);
      }
      await finish();
    } catch (e) { E(e.message || 'Erreur'); }
  };
}

/* ---------- graphiques ---------- */
function profileSVG(prof, cps, opt) {
  opt = opt || {}; if (!prof || prof.length < 2) return '';
  const W = 360, H = opt.h || 170, pl = 32, pb = 18, pt = 10;
  const kmMax = prof[prof.length - 1][0]; let lo = Infinity, hi = -Infinity; prof.forEach(p => { if (p[1] < lo) lo = p[1]; if (p[1] > hi) hi = p[1]; });
  const span = Math.max(100, hi - lo); lo = Math.floor((lo - span * .08) / 50) * 50; hi = lo + span * 1.2;
  const X = k => pl + (W - pl - 6) * k / kmMax, Y = a => pt + (H - pt - pb) * (1 - (a - lo) / (hi - lo));
  let d = 'M' + X(0) + ' ' + Y(prof[0][1]); const stp = Math.max(1, Math.floor(prof.length / 500));
  for (let i = stp; i < prof.length; i += stp) d += 'L' + X(prof[i][0]).toFixed(1) + ' ' + Y(prof[i][1]).toFixed(1);
  d += 'L' + X(kmMax) + ' ' + Y(prof[prof.length - 1][1]);
  let g = '<defs><linearGradient id="pg" x1="0" x2="1"><stop offset="0" stop-color="#FF2D8E"/><stop offset=".5" stop-color="#9B3DFF"/><stop offset="1" stop-color="#00E0C2"/></linearGradient><linearGradient id="pf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9B3DFF" stop-opacity=".45"/><stop offset="1" stop-color="#9B3DFF" stop-opacity="0"/></linearGradient></defs>';
  const st = Math.pow(10, Math.floor(Math.log10(hi - lo))) * ((hi - lo) / Math.pow(10, Math.floor(Math.log10(hi - lo))) > 4 ? 1 : .5);
  for (let a = Math.ceil(lo / st) * st; a < hi; a += st) g += '<line x1="' + pl + '" x2="' + W + '" y1="' + Y(a) + '" y2="' + Y(a) + '" stroke="#37303F"/><text x="' + (pl - 4) + '" y="' + (Y(a) + 3) + '" text-anchor="end">' + Math.round(a) + '</text>';
  const ks = kmMax > 100 ? 20 : kmMax > 40 ? 10 : kmMax > 15 ? 5 : kmMax > 6 ? 2 : 1;
  for (let k = 0; k <= kmMax; k += ks) g += '<text x="' + X(k) + '" y="' + (H - 5) + '" text-anchor="middle">' + k + (k === 0 ? ' km' : '') + '</text>';
  g += '<path d="' + d + 'L' + X(kmMax) + ' ' + (H - pb) + 'L' + X(0) + ' ' + (H - pb) + 'Z" fill="url(#pf)"/><path d="' + d + '" fill="none" stroke="url(#pg)" stroke-width="2" stroke-linejoin="round"/>';
  (cps || []).forEach(c => { if (c.km == null || c.km > kmMax) return; const x = X(c.km); g += '<line x1="' + x + '" x2="' + x + '" y1="' + pt + '" y2="' + (H - pb) + '" stroke="' + (c.crew ? '#00E0C2' : '#B3A9BF') + '" stroke-dasharray="3 3"/>'; });
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opt.label || 'Profil d\'altitude') + '">' + g + '</svg>';
}
function barsSVG(vals, labels, opt) {
  const W = 360, H = 160, pl = 26, pb = 18, pt = 8, n = vals.length, mx = Math.max(1, ...vals) * 1.15, bw = (W - pl) / n;
  const Y = v => pt + (H - pt - pb) * (1 - v / mx); let g = '';
  const st = mx > 40 ? 20 : mx > 16 ? 5 : mx > 6 ? 2 : 1; for (let v = 0; v < mx; v += st) g += '<line x1="' + pl + '" x2="' + W + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#37303F"/><text x="' + (pl - 4) + '" y="' + (Y(v) + 3) + '" text-anchor="end">' + v + '</text>';
  vals.forEach((v, i) => { const x = pl + i * bw; g += '<rect x="' + (x + bw * .2) + '" width="' + bw * .6 + '" y="' + Y(v) + '" height="' + (Y(0) - Y(v)) + '" rx="3" fill="' + (i === n - 1 ? 'url(#bg)' : '#4A4157') + '"/>'; if (labels[i]) g += '<text x="' + (x + bw / 2) + '" y="' + (H - 5) + '" text-anchor="middle">' + labels[i] + '</text>'; });
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opt.label) + '"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF2D8E"/><stop offset="1" stop-color="#9B3DFF"/></linearGradient></defs>' + g + '</svg>';
}
function zoneRows(zs) {
  const tot = zs.reduce((a, b) => a + b, 0) || 1, z = zones();
  return zs.map((s, i) => '<div class="zrow"><span style="color:' + ZC[i] + '">' + ZN[i] + '</span><div class="bar" title="' + ZL[i] + (z ? ' · ' + z[i][0] + '–' + z[i][1] + ' bpm' : '') + '"><i style="width:' + (100 * s / tot).toFixed(1) + '%;background:' + ZC[i] + '"></i></div><span style="text-align:right">' + hm(s, true) + '</span></div>').join('');
}

/* ---------- aujourd'hui ---------- */
function weekStats(offset) {
  const ws = weekStart(new Date()); ws.setDate(ws.getDate() - 7 * offset); const we = new Date(ws); we.setDate(we.getDate() + 7);
  const a = S.acts.filter(x => { const d = new Date(x.start_at); return d >= ws && d < we; });
  return { s: a.reduce((t, x) => t + (x.moving_s || x.elapsed_s || 0), 0), m: a.filter(isFoot).reduce((t, x) => t + (x.distance_m || 0), 0), dp: a.reduce((t, x) => t + (x.elev_gain || 0), 0), n: a.length };
}
function delta(v, ref, fmt) { if (!ref) return ''; const d = v - ref; return '<small class="' + (d >= 0 ? 'up' : 'down') + '">' + (d >= 0 ? '+' : '−') + fmt(Math.abs(d)) + ' vs moy.</small>'; }
function vToday() {
  const p = S.profile, nr = nextRace(), w = weekStats(0), prev = [1, 2, 3, 4].map(weekStats);
  const avg = k => prev.reduce((t, x) => t + x[k], 0) / 4;
  let h = '<div class="hd"><h1>Salut ' + esc(p.display_name || '') + '</h1><p>' + fmtDs(today()).replace(/^./, c => c.toUpperCase()) + '</p></div>';
  if (nr) {
    const j = dayDiff(today(), nr.race_date);
    h += '<a class="card hero" href="#/course/' + nr.id + '" style="display:block;text-decoration:none"><div class="lab">Objectif · course ' + nr.priority + '</div><h3>' + esc(nr.name) + '</h3><div class="big">' + (j === 0 ? 'Jour J' : 'J−' + j) + '</div><div class="row"><span>' + fmtD(nr.race_date) + '</span>' + (nr.km ? '<span>' + fr(nr.km) + ' km</span>' : '') + (nr.dplus ? '<span>' + fr(nr.dplus) + ' m D+</span>' : '') + '</div></a>';
  } else h += '<a class="card hero" href="#/course/nouvelle" style="display:block;text-decoration:none"><div class="lab">Pas encore d\'objectif</div><h3>Ajoute ta prochaine course</h3><div class="row"><span>Parcours, ravitos, heures de passage ›</span></div></a>';
  if (S.acts.length) h += '<div style="margin-top:12px">' + formCard(false) + '</div>';
  const P = planFor(), pw = P && P.weeks[0];
  h += '<h2 class="sec">Cette semaine</h2>' + (pw ? '<a class="card" href="#/plan" style="display:flex;justify-content:space-between;align-items:center;gap:10px;text-decoration:none;color:var(--ink);margin-bottom:10px"><span><b>Plan · ' + pw.ph + (pw.rec ? ' (récup)' : '') + '</b><br><span class="muted" style="font-size:.84rem">Objectif ' + pw.h.toLocaleString('fr-FR') + ' h · ' + fr(pw.dp) + ' m D+ · sortie longue ' + pw.lr.toLocaleString('fr-FR') + ' h</span></span><span style="color:var(--muted);font-size:1.3rem">›</span></a>' : '') + '<div class="stats"><div class="stat"><span>Temps</span><b>' + hm(w.s) + '</b>' + delta(w.s, avg('s'), x => hm(x, true)) + '</div><div class="stat"><span>Distance</span><b>' + km1(w.m) + ' km</b>' + delta(w.m, avg('m'), x => km1(x) + ' km') + '</div><div class="stat"><span>D+</span><b>' + fr(w.dp) + ' m</b>' + delta(w.dp, avg('dp'), x => fr(x) + ' m') + '</div></div><p class="note">Comparé à la moyenne des 4 semaines précédentes.</p>';
  const last = S.acts[0];
  h += '<h2 class="sec">Dernière sortie</h2>';
  h += last ? '<ul class="list">' + actLi(last) + '</ul>' : '<div class="empty"><b>Aucune séance</b>Importe les fichiers de ta montre (FIT ou GPX) pour remplir ton carnet.<div class="btns"><a class="btn" href="#/seances">Importer mes sorties</a></div></div>';
  h += '<p class="sig-foot">Chaque jour est un pas vers l\'impossible.</p>';
  shell('today', h);
}

/* ---------- séances ---------- */
function actLi(a) {
  const d = new Date(a.start_at);
  return '<li><a href="#/seance/' + a.id + '"><div class="dt"><b>' + d.getDate() + '</b><span>' + MOIS[d.getMonth()] + '</span></div><div class="li-main"><b>' + esc(a.name || SPORT[a.sport] || 'Séance') + '</b><small>' + esc(SPORT[a.sport] || '') + (a.avg_hr && hrOK() ? ' · ' + a.avg_hr + ' bpm' : '') + (a.rpe ? ' · RPE ' + a.rpe : '') + '</small></div><div class="li-side">' + (a.distance_m ? km1(a.distance_m) + ' km<br>' : '') + '<span class="muted">' + hm(a.moving_s || a.elapsed_s) + (a.elev_gain ? ' · ' + fr(a.elev_gain) + ' m' : '') + '</span></div></a></li>';
}
function vActs() {
  let h = '<div class="hd"><h1>Séances</h1><p>Tes sorties, depuis les fichiers de ta montre ou saisies à la main.</p></div>' +
    '<div class="btns two" style="margin-top:0"><label class="btn" for="imp" style="cursor:pointer">Importer FIT / GPX</label><button class="btn ghost" id="man">Saisir une séance</button></div>' +
    '<input type="file" id="imp" accept=".fit,.gpx,application/gpx+xml,application/octet-stream" multiple class="sr">' +
    '<p class="note">Sur Coros : appli › activité › ⋯ › Exporter › FIT. Sur Garmin Connect : ⚙ › Exporter l\'original. Plusieurs fichiers à la fois, c\'est possible.</p><div id="impst"></div>';
  if (!S.acts.length) h += '<div class="empty" style="margin-top:18px"><b>Ton carnet est vide</b>Importe ta première sortie.</div>';
  else {
    let cur = '';
    S.acts.forEach(a => { const d = new Date(a.start_at), k = MOIS[d.getMonth()] + ' ' + d.getFullYear(); if (k !== cur) { h += (cur ? '</ul>' : '') + '<h2 class="sec">' + k + '</h2><ul class="list">'; cur = k; } h += actLi(a); });
    h += '</ul>';
  }
  shell('acts', h);
  $('imp').onchange = e => importFiles([...e.target.files]);
  $('man').onclick = manualForm;
}
async function importFiles(files) {
  const st = $('impst'); let ok = 0, dup = 0, bad = [];
  st.innerHTML = '<p class="note">Lecture de ' + files.length + ' fichier' + (files.length > 1 ? 's' : '') + '…</p>';
  for (const file of files) {
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('fichier trop gros');
      const f = await VTParse.readFile(file);
      const sum = VTParse.summarize(f, { zones: zones(), noHr: !hrOK() });
      if (!sum.start_at) throw new Error('pas d\'horodatage');
      const row = Object.assign(sum, { source: f.kind, source_id: f.hash, name: f.name || defaultName(sum) });
      const { data, error } = await sb.from('activities').insert(row).select(ACT_COLS).single();
      if (error) { if (error.code === '23505') { dup++; continue; } throw error; }
      sb.storage.from('activity-files').upload(S.user.id + '/' + f.hash + '.' + f.kind, new Blob([f.buf]), { upsert: true }).catch(() => {});
      S.acts.push(data); ok++;
    } catch (e) { bad.push(file.name + ' (' + (e.message || 'illisible') + ')'); }
  }
  S.acts.sort((a, b) => b.start_at.localeCompare(a.start_at)); saveCache();
  vActs();
  $('impst').innerHTML = '<div class="card" style="margin-top:12px"><b>' + ok + ' séance' + (ok > 1 ? 's' : '') + ' ajoutée' + (ok > 1 ? 's' : '') + '</b>' + (dup ? '<p class="note">' + dup + ' déjà dans ton carnet.</p>' : '') + (bad.length ? '<p class="note" style="color:var(--red)">Non lu : ' + bad.map(esc).join(', ') + '</p>' : '') + '</div>';
}
function defaultName(s) {
  const h = new Date(s.start_at).getHours(), mom = h < 11 ? 'matinale' : h < 14 ? 'du midi' : h < 18 ? 'de l\'après-midi' : 'du soir';
  const sp = { trail: 'Sortie trail', run: 'Course', hike: 'Rando', walk: 'Marche', bike: 'Vélo', gym: 'Renfo', swim: 'Natation' }[s.sport] || 'Séance';
  return sp + ' ' + mom;
}
function manualForm(a) {
  a = a && a.id ? a : null;
  const d = a ? new Date(a.start_at) : new Date();
  sheet(a ? 'Modifier' : 'Nouvelle séance', a ? (a.name || 'Séance') : 'Saisie manuelle',
    '<form id="mf"><label class="f" for="mn">Titre</label><input class="in-f" id="mn" maxlength="160" value="' + esc(a ? a.name : '') + '" placeholder="Ex. Fractionné en côte">' +
    '<div class="grid2"><div><label class="f" for="md">Date</label><input class="in-f" id="md" type="date" value="' + ymd(d) + '" required></div><div><label class="f" for="ms">Sport</label><select class="in-f" id="ms">' + Object.keys(SPORT).map(k => '<option value="' + k + '"' + ((a ? a.sport : 'trail') === k ? ' selected' : '') + '>' + SPORT[k] + '</option>').join('') + '</select></div></div>' +
    '<div class="grid2"><div><label class="f" for="mt">Durée <small>(h:mm)</small></label><input class="in-f" id="mt" placeholder="1:15" value="' + (a && a.moving_s ? Math.floor(a.moving_s / 3600) + ':' + String(Math.floor(a.moving_s % 3600 / 60)).padStart(2, '0') : '') + '" required></div><div><label class="f" for="mk">Distance <small>(km)</small></label><input class="in-f" id="mk" inputmode="decimal" value="' + (a && a.distance_m ? (a.distance_m / 1000).toFixed(1) : '') + '"></div></div>' +
    '<div class="grid2"><div><label class="f" for="mp">D+ <small>(m)</small></label><input class="in-f" id="mp" inputmode="numeric" value="' + (a && a.elev_gain || '') + '"></div><div><label class="f" for="mr">Ressenti <small>(1 à 10)</small></label><input class="in-f" id="mr" type="number" min="1" max="10" value="' + (a && a.rpe || '') + '"></div></div>' +
    '<label class="f" for="mo">Note</label><textarea class="in-f" id="mo" rows="3" maxlength="2000">' + esc(a ? a.note : '') + '</textarea><p class="err" id="me"></p><div class="btns"><button class="btn">Enregistrer</button></div></form>');
  $('mf').onsubmit = async ev => {
    ev.preventDefault(); const t = parseHM($('mt').value.replace(':', 'h')); if (!t) return $('me').textContent = 'Durée au format 1:15';
    const row = { name: $('mn').value.trim() || null, sport: $('ms').value, moving_s: t, elapsed_s: a ? a.elapsed_s || t : t, distance_m: (+String($('mk').value).replace(',', '.') || 0) * 1000 || null, elev_gain: +$('mp').value || null, rpe: +$('mr').value || null, note: $('mo').value.trim() || null };
    if (!a) { row.source = 'manual'; row.source_id = randToken(); row.start_at = new Date($('md').value + 'T12:00:00').toISOString(); }
    const q = a ? sb.from('activities').update(row).eq('id', a.id) : sb.from('activities').insert(row);
    const { data, error } = await q.select(ACT_COLS).single();
    if (error) return $('me').textContent = error.message;
    S.acts = S.acts.filter(x => x.id !== data.id).concat(data).sort((x, y) => y.start_at.localeCompare(x.start_at)); saveCache(); dlg.close();
    location.hash = '#/seance/' + data.id; route();
  };
}
async function vAct(id) {
  const a = S.acts.find(x => x.id === id); if (!a) { location.hash = '#/seances'; return; }
  const d = new Date(a.start_at);
  let h = '<a class="back" href="#/seances">‹ Séances</a><div class="hd"><h1>' + esc(a.name || SPORT[a.sport]) + '</h1><p>' + JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()] + ' ' + d.getFullYear() + ' · ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' · ' + esc(SPORT[a.sport] || '') + '</p></div>';
  const pace = a.distance_m && a.moving_s ? a.moving_s / (a.distance_m / 1000) : null;
  h += '<div class="stats"><div class="stat"><span>Distance</span><b>' + km1(a.distance_m) + '</b><span>km</span></div><div class="stat"><span>Temps</span><b>' + hm(a.moving_s || a.elapsed_s) + '</b><span>en mouvement</span></div><div class="stat"><span>D+ / D−</span><b>' + fr(a.elev_gain) + '</b><span>' + (a.elev_loss != null ? '−' + fr(a.elev_loss) + ' m' : 'm') + '</span></div></div>';
  h += '<div class="stats" style="margin-top:10px"><div class="stat"><span>Allure</span><b>' + (pace ? Math.floor(pace / 60) + '′' + String(Math.round(pace % 60)).padStart(2, '0') : '–') + '</b><span>/km</span></div><div class="stat"><span>Km-effort</span><b>' + effortOf(a).toFixed(1) + '</b><span>km + D+/100</span></div><div class="stat"><span>FC moy. / max</span><b>' + (a.avg_hr && hrOK() ? a.avg_hr : '–') + '</b><span>' + (a.max_hr && hrOK() ? 'max ' + a.max_hr : 'bpm') + '</span></div></div>';
  h += '<div id="trk"><p class="note">Chargement du tracé…</p></div>';
  if (a.zone_s && hrOK() && a.zone_s.some(Boolean)) h += '<h2 class="sec">Temps dans les zones</h2><div class="card">' + zoneRows(a.zone_s) + '</div>';
  h += '<h2 class="sec">Ressenti</h2><div class="card"><div class="seg" id="rpe" role="group" aria-label="Ressenti de 1 à 10">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => '<button type="button" data-n="' + n + '"' + (a.rpe === n ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' + n + '</button>').join('') + '</div><label class="f" for="nt">Note</label><textarea class="in-f" id="nt" rows="3" maxlength="2000" placeholder="Jambes, météo, nutrition…">' + esc(a.note) + '</textarea><div class="btns"><button class="btn ghost" id="svn">Enregistrer la note</button></div></div>';
  h += '<div class="btns two"><button class="btn ghost" id="ed">Modifier</button><button class="btn danger" id="dl">Supprimer</button></div>';
  shell('acts', h);
  $('rpe').onclick = async e => { const b = e.target.closest('button'); if (!b) return; const n = +b.dataset.n; const { error } = await sb.from('activities').update({ rpe: n }).eq('id', a.id); if (error) return toast(error.message); a.rpe = n; saveCache(); $('rpe').querySelectorAll('button').forEach(x => { const on = +x.dataset.n === n; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); toast('Ressenti enregistré'); };
  $('svn').onclick = async () => { const v = $('nt').value.trim() || null; const { error } = await sb.from('activities').update({ note: v }).eq('id', a.id); if (error) return toast(error.message); a.note = v; saveCache(); toast('Note enregistrée'); };
  $('ed').onclick = () => manualForm(a);
  $('dl').onclick = async () => { if (!confirm('Supprimer cette séance de ton carnet ?')) return; const { error } = await sb.from('activities').delete().eq('id', a.id); if (error) return toast(error.message); S.acts = S.acts.filter(x => x.id !== a.id); saveCache(); location.hash = '#/seances'; };
  // tracé (chargé à la demande)
  let tr = a._track;
  if (tr === undefined) { const { data } = await sb.from('activities').select('track').eq('id', a.id).maybeSingle(); tr = a._track = data ? data.track : null; }
  const el = $('trk'); if (!el) return;
  if (!tr || tr.length < 2) { el.innerHTML = ''; return; }
  let dist = 0; const prof = tr.map((p, i) => { if (i) dist += VTParse.hav({ lat: tr[i - 1][0], lon: tr[i - 1][1] }, { lat: p[0], lon: p[1] }) / 1000; return [dist, p[2] == null ? 0 : p[2]]; });
  el.innerHTML = '<h2 class="sec">Parcours</h2><div id="map" role="img" aria-label="Carte du parcours"></div>' + (tr.some(p => p[2] != null) ? '<div class="card" style="margin-top:10px">' + profileSVG(prof, [], { h: 150 }) + '</div>' : '');
  drawMap(tr);
}
let leafP = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(); if (leafP) return leafP;
  leafP = new Promise((res, rej) => { const c = document.createElement('link'); c.rel = 'stylesheet'; c.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(c);
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; s.onload = res; s.onerror = () => { leafP = null; rej(new Error('carte indisponible')); }; document.head.appendChild(s); });
  return leafP;
}
function drawMap(tr) {
  loadLeaflet().then(() => {
    const el = $('map'); if (!el) return; const m = L.map(el, { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 16, attribution: '© OpenStreetMap · OpenTopoMap' }).addTo(m);
    const ll = tr.map(p => [p[0], p[1]]), line = L.polyline(ll, { color: '#FF2D8E', weight: 4 }).addTo(m);
    L.circleMarker(ll[0], { radius: 6, color: '#fff', fillColor: '#00E0C2', fillOpacity: 1 }).addTo(m);
    L.circleMarker(ll[ll.length - 1], { radius: 6, color: '#fff', fillColor: '#FF2D8E', fillOpacity: 1 }).addTo(m);
    m.fitBounds(line.getBounds(), { padding: [16, 16] });
  }).catch(() => { const el = $('map'); if (el) el.outerHTML = '<p class="note">Carte indisponible hors ligne.</p>'; });
}

/* ---------- courses : modèle de temps de passage ---------- */
// km-effort d'une portion : km + D+/100 + D−/400 ; temps total = objectif, ou estimé à partir des sorties
// (loi de Riegel, exposant 1,07), recalé par tes bilans de course passés
function refPace() {
  const ref = S.acts.filter(a => isFoot(a) && a.moving_s && a.distance_m > 6000 && Date.now() - Date.parse(a.start_at) < 120 * 864e5).map(a => ({ e: effortOf(a), t: a.moving_s })).sort((x, y) => x.t / x.e - y.t / y.e);
  if (ref.length < 3) return null;
  const best = ref.slice(0, Math.max(3, Math.ceil(ref.length / 3))); // le meilleur tiers de tes sorties récentes
  return { eM: best.reduce((s, x) => s + x.e, 0) / best.length, sp: best.reduce((s, x) => s + x.t / x.e, 0) / best.length };
}
function calib(exceptId) {
  const k = S.races.filter(r => r.id !== exceptId && r.result && r.result.finish_s && r.result.pred_s).map(r => r.result.finish_s / r.result.pred_s);
  if (!k.length) return 1; return Math.min(1.5, Math.max(0.7, k.reduce((a, b) => a + b, 0) / k.length));
}
function raceModel(r, opt) {
  opt = opt || {};
  const prof = r.profile, kmT = +r.km || (prof ? prof[prof.length - 1][0] : 0);
  const cum = []; let e = 0;
  if (prof && prof.length > 1) { cum.push([0, 0]); for (let i = 1; i < prof.length; i++) { const dk = prof[i][0] - prof[i - 1][0], da = prof[i][1] - prof[i - 1][1]; e += dk + (da > 0 ? da / 100 : -da / 400); cum.push([prof[i][0], e]); } }
  else { e = kmT + (+r.dplus || 0) / 100 + (+r.dplus || 0) / 400; cum.push([0, 0], [kmT, e]); }
  const effAt = k => { if (k <= 0) return 0; for (let i = 1; i < cum.length; i++) if (cum[i][0] >= k) { const a = cum[i - 1], b = cum[i], f = b[0] > a[0] ? (k - a[0]) / (b[0] - a[0]) : 0; return a[1] + (b[1] - a[1]) * f; } return cum[cum.length - 1][1]; };
  let total = opt.noGoal ? null : r.goal_s, how = 'objectif', raw = null;
  const rp = S.user ? refPace() : null;
  if (rp) raw = rp.sp * rp.eM * Math.pow(e / rp.eM, 1.07) * (1 + Math.min(0.12, e / 2000));
  if (!total && raw) { const c = calib(r.id); total = raw * c; how = c !== 1 ? 'estimation recalée' : 'estimation'; }
  const at = k => total ? total * effAt(k) / e : null;
  return { eff: e, total, how, effAt, kmT, raw, at };
}
const cpList = r => [{ name: 'Départ', km: 0, start: 1 }].concat((r.checkpoints || []).slice().sort((a, b) => a.km - b.km)).concat([{ name: 'Arrivée', km: +r.km || (r.profile ? r.profile[r.profile.length - 1][0] : 0), end: 1 }]);
function passTable(r, m) {
  if (!m.total) return '<p class="note">Ajoute un temps objectif, ou importe au moins 3 sorties de plus de 6 km, pour obtenir les heures de passage.</p>';
  const res = r.result && r.result.passes;
  return '<table class="tm"><thead><tr><th>Point</th><th class="r">Km</th><th class="r">' + (res ? 'Prévu' : 'Temps') + '</th><th class="r">' + (res ? 'Réel' : 'Heure') + '</th></tr></thead><tbody>' + cpList(r).map(c => {
    const t = m.at(c.km), real = res ? (c.start ? 0 : c.end ? r.result.finish_s : res[c.name]) : null;
    const d = real != null && t ? real - t : null;
    return '<tr' + (c.crew ? ' class="crew"' : '') + '><td><b>' + esc(c.name) + '</b>' + (c.give && !res ? '<div class="muted" style="font-size:.8rem">🎒 ' + esc(c.give) + '</div>' : '') + '</td><td class="r">' + (+c.km).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + '</td><td class="r">' + hm(t) + '</td><td class="r">' +
      (res ? (real != null ? hm(real) + (d != null && !c.start ? '<div style="font-size:.76rem;font-weight:800;color:' + (d <= 0 ? 'var(--turq)' : 'var(--pink)') + '">' + (d <= 0 ? '−' : '+') + hm(Math.abs(d), true) + '</div>' : '') : '–') : wallClock(r, t)) + '</td></tr>';
  }).join('') + '</tbody></table><p class="note">' + (m.how === 'objectif' ? 'Calé sur ton objectif de ' + hm(m.total) + '.' : (m.how === 'estimation recalée' ? 'Estimation recalée sur tes bilans de course passés : ' : 'Estimation à partir de tes meilleures sorties récentes : ') + hm(m.total) + '. Ajoute un objectif pour la remplacer.') + (res ? '' : ' Heures locales de la course (' + esc(r.tz) + ').') + '</p>';
}

/* ---------- nutrition ---------- */
const NUT0 = { carb: 60, water: 500, salt: 500 };
function nutritionHTML(r, m, crewView) {
  const n = Object.assign({}, NUT0, r.nutrition || {}), pts = cpList(r);
  if (!m.total) return '<p class="note">Les besoins se calculent à partir des heures de passage : ajoute un objectif.</p>';
  let h = crewView ? '' : '<div class="stats"><div class="stat"><span>Glucides</span><b>' + n.carb + ' g</b><span>par heure</span></div><div class="stat"><span>Eau</span><b>' + (n.water / 1000).toLocaleString('fr-FR') + ' L</b><span>par heure</span></div><div class="stat"><span>Sodium</span><b>' + (n.salt / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' g</b><span>par heure</span></div></div>';
  h += '<table class="tm" style="margin-top:10px"><thead><tr><th>Portion</th><th class="r">Durée</th><th class="r">Glucides</th><th class="r">Eau</th></tr></thead><tbody>';
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dt = m.at(b.km) - m.at(a.km), hh = dt / 3600;
    h += '<tr><td><b>' + esc(a.name) + ' → ' + esc(b.name) + '</b>' + (a.give ? '<div style="font-size:.8rem;color:var(--turq);font-weight:700">' + (a.crew ? 'L\'équipe tend' : 'Prendre') + ' : ' + esc(a.give) + '</div>' : '') + '</td><td class="r">' + hm(dt) + '</td><td class="r">' + fr(n.carb * hh) + ' g</td><td class="r">' + (n.water * hh / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' L</td></tr>';
  }
  const H = m.total / 3600;
  h += '</tbody></table><p class="note">Total : ' + fr(n.carb * H) + ' g de glucides (≈ ' + Math.round(n.carb * H / 25) + ' gels de 25 g), ' + (n.water * H / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' L d\'eau, ' + (n.salt * H / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' g de sodium.' + (crewView ? '' : ' Repères courants en ultra : 60 à 90 g de glucides par heure si ton ventre est entraîné ; teste-les à l\'entraînement.') + '</p>';
  return h;
}
function nutritionSheet(r) {
  const n = Object.assign({}, NUT0, r.nutrition || {}), cps = (r.checkpoints || []).slice().sort((a, b) => a.km - b.km);
  sheet('Nutrition', r.name, '<form id="nf"><div class="grid2" style="grid-template-columns:1fr 1fr 1fr"><div><label class="f" for="nc">Glucides <small>g/h</small></label><input class="in-f" id="nc" inputmode="numeric" value="' + n.carb + '"></div><div><label class="f" for="nw">Eau <small>ml/h</small></label><input class="in-f" id="nw" inputmode="numeric" value="' + n.water + '"></div><div><label class="f" for="ns">Sodium <small>mg/h</small></label><input class="in-f" id="ns" inputmode="numeric" value="' + n.salt + '"></div></div>' +
    (cps.length ? '<h2 class="sec">À chaque point</h2>' + cps.map((c, i) => '<label class="f" for="gv' + i + '">' + esc(c.name) + ' <small>km ' + c.km + (c.crew ? ' · équipe' : '') + '</small></label><input class="in-f gv" id="gv' + i + '" data-n="' + esc(c.name) + '" maxlength="140" value="' + esc(c.give || '') + '" placeholder="' + (c.crew ? 'Ex. 2 flasques de boisson, purée, frontale' : 'Ex. remplir les flasques, 2 gels') + '">').join('') : '<p class="note">Ajoute des points de passage (Modifier) pour préparer chaque ravito.</p>') +
    '<p class="err" id="ne"></p><div class="btns"><button class="btn">Enregistrer</button></div></form>');
  $('nf').onsubmit = async ev => {
    ev.preventDefault(); const v = id => Math.round(+$(id).value);
    const nut = { carb: v('nc'), water: v('nw'), salt: v('ns') };
    if (!(nut.carb >= 0 && nut.carb <= 150 && nut.water >= 0 && nut.water <= 1500 && nut.salt >= 0 && nut.salt <= 3000)) return $('ne').textContent = 'Valeurs hors limites.';
    const gv = {}; document.querySelectorAll('#nf .gv').forEach(x => gv[x.dataset.n] = x.value.trim());
    const cp = (r.checkpoints || []).map(c => Object.assign({}, c, { give: gv[c.name] || undefined }));
    if (await saveRace(r, { nutrition: nut, checkpoints: cp })) { dlg.close(); vRace(r.id); }
  };
}

/* ---------- matériel ---------- */
const GEAR_UTMB = ['Téléphone chargé, numéro de l\'organisation enregistré', 'Réserve d\'eau 1 L minimum', 'Gobelet personnel', 'Réserve alimentaire', 'Couverture de survie', 'Sifflet', 'Bande élastique adhésive', 'Veste imperméable avec capuche', 'Pantalon ou collant long', 'Couche chaude (manches longues)', 'Bonnet ou buff', 'Gants', 'Deux frontales et piles de rechange', 'Casquette ou bandana', 'Dossard et pièce d\'identité', 'Bâtons', 'Crème anti-frottements', 'Montre chargée, parcours chargé'];
let gearOpen = false;
function gearHTML(r) {
  const g = r.gear || [], done = g.filter(x => x.ok).length;
  return (g.length ? '<details' + (gearOpen ? ' open' : '') + ' id="gdet"><summary style="cursor:pointer;list-style:none;font-weight:800">' + done + ' / ' + g.length + ' prêts <span class="muted" style="font-weight:600">· ' + (done === g.length ? 'tout est prêt' : 'voir la liste') + '</span></summary><div class="zbar" style="height:8px;margin:8px 0 10px"><i style="display:block;width:' + (100 * done / g.length) + '%;background:var(--turq)"></i></div>' +
    g.map((x, i) => '<label class="check" style="margin-top:6px;padding:10px 12px"><input type="checkbox" class="gk" data-i="' + i + '"' + (x.ok ? ' checked' : '') + '> <span style="flex:1' + (x.ok ? ';color:var(--muted);text-decoration:line-through' : '') + '">' + esc(x.t) + '</span><button type="button" class="gd" data-i="' + i + '" aria-label="Retirer ' + esc(x.t) + '" style="border:0;background:none;color:var(--muted);font-size:1.1rem;cursor:pointer;padding:0 4px">✕</button></label>').join('') + '</details>'
    : '<p class="note" style="margin-top:0">Ta liste est vide. Pars de la liste type (matériel obligatoire des ultras UTMB) et adapte-la au règlement de ta course.</p><div class="btns"><button type="button" class="btn ghost" id="gtpl">Charger la liste type</button></div>') +
    '<form id="gf" class="grid2" style="grid-template-columns:1fr auto;margin-top:10px"><input class="in-f" id="gi" maxlength="120" placeholder="Ajouter un élément" aria-label="Ajouter un élément"><button class="btn" style="width:auto;min-height:48px">Ajouter</button></form>';
}
function bindGear(r) {
  const save = async g => { if (await saveRace(r, { gear: g })) $('gear').innerHTML = gearHTML(r), bindGear(r); };
  const el = $('gear'); if (!el) return;
  const det = $('gdet'); if (det) det.ontoggle = () => { gearOpen = det.open; };
  el.onchange = e => { const c = e.target.closest('.gk'); if (!c) return; const g = r.gear.map(x => Object.assign({}, x)); g[+c.dataset.i].ok = c.checked; save(g); };
  el.onclick = e => { const d = e.target.closest('.gd'); if (d) { e.preventDefault(); save(r.gear.filter((_, i) => i !== +d.dataset.i)); } if (e.target.id === 'gtpl') save(GEAR_UTMB.map(t => ({ t, ok: false }))); };
  $('gf').onsubmit = e => { e.preventDefault(); const t = $('gi').value.trim(); if (t) save((r.gear || []).concat({ t, ok: false })); };
}

/* ---------- météo (Open-Meteo, 16 jours) ---------- */
const WMO = c => c === 0 ? '☀️' : c <= 2 ? '🌤️' : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 57 ? '🌦️' : c <= 67 ? '🌧️' : c <= 77 ? '🌨️' : c <= 82 ? '🌧️' : c <= 86 ? '🌨️' : '⛈️';
function routeAt(r, k) { const rt = r.route; if (!rt || !rt.length) return null; let best = rt[0]; for (const p of rt) { if (Math.abs(p[2] - k) < Math.abs(best[2] - k)) best = p; } return best; }
async function weatherHTML(r, m) {
  const j = dayDiff(today(), r.race_date);
  if (!r.route) return '<p class="note">Ajoute le parcours GPX pour avoir la météo sur le tracé.</p>';
  if (j > 15) return '<p class="note">Prévisions disponibles à partir de J−15 (le ' + fmtD(ymd(new Date(pd(r.race_date) - 15 * 864e5))) + ').</p>';
  if (j < 0) return '';
  const pts = cpList(r).filter((c, i, a) => i === 0 || i === a.length - 1 || c.crew || a.length <= 6).slice(0, 8);
  const ll = pts.map(c => routeAt(r, c.km));
  const key = 'vtr-wx-' + r.id + '-' + today(); let js = null;
  try { const c = JSON.parse(LS.get(key) || 'null'); if (c && Date.now() - c.at < 3 * 36e5) js = c.d; } catch (e) {}
  if (!js) {
    const u = 'https://api.open-meteo.com/v1/forecast?latitude=' + ll.map(p => p[0]).join(',') + '&longitude=' + ll.map(p => p[1]).join(',') + '&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m&timezone=' + encodeURIComponent(r.tz) + '&forecast_days=16';
    const res = await fetch(u); if (!res.ok) throw new Error('météo indisponible'); js = await res.json(); if (!Array.isArray(js)) js = [js];
    LS.set(key, JSON.stringify({ at: Date.now(), d: js }));
  }
  const [hh0, mm0] = (r.start_time || '07:00').split(':').map(Number);
  return '<table class="tm"><thead><tr><th>Point</th><th class="r">Heure</th><th class="r">Ciel</th><th class="r">Temp.</th><th class="r">Pluie</th></tr></thead><tbody>' + pts.map((c, i) => {
    const t = m.total ? m.at(c.km) : 0, d = new Date(Date.UTC(...r.race_date.split('-').map((x, k) => k === 1 ? x - 1 : +x), hh0, mm0) + t * 1000);
    const iso = d.toISOString().slice(0, 13) + ':00', w = js[i] && js[i].hourly, ix = w ? w.time.indexOf(iso) : -1;
    if (ix < 0) return '<tr><td><b>' + esc(c.name) + '</b></td><td class="r">' + wallClock(r, t) + '</td><td class="r" colspan="3">pas encore prévu</td></tr>';
    return '<tr><td><b>' + esc(c.name) + '</b></td><td class="r">' + wallClock(r, t) + '</td><td class="r" style="font-size:1.2rem">' + WMO(w.weather_code[ix]) + '</td><td class="r">' + Math.round(w.temperature_2m[ix]) + '°<div class="muted" style="font-size:.74rem">ressenti ' + Math.round(w.apparent_temperature[ix]) + '°</div></td><td class="r">' + w.precipitation_probability[ix] + ' %<div class="muted" style="font-size:.74rem">vent ' + Math.round(w.wind_speed_10m[ix]) + ' km/h</div></td></tr>';
  }).join('') + '</tbody></table><p class="note">Prévisions Open-Meteo à l\'heure de passage prévue, mises à jour toutes les 3 h.</p>';
}

/* ---------- bilan ---------- */
function resultSheet(r) {
  const res = r.result || {}, cps = (r.checkpoints || []).slice().sort((a, b) => a.km - b.km);
  const f = s => s ? Math.floor(s / 3600) + 'h' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') : '';
  const sameDay = S.acts.filter(a => localDay(a.start_at) === r.race_date || localDay(a.start_at) === ymd(new Date(pd(r.race_date).getTime() + 864e5)));
  sheet('Bilan', r.name, '<form id="bf">' + (sameDay.length ? '<button type="button" class="btn ghost" id="bauto">Remplir depuis ma séance « ' + esc(sameDay[0].name || 'du jour') + ' »</button><p class="note">Les temps aux points sont lus sur le tracé de ta montre.</p>' : '<p class="note" style="margin-top:0">Astuce : importe le fichier de ta montre du jour de la course, les temps se rempliront tout seuls.</p>') +
    '<label class="f" for="bfin">Temps final <small>(ex. 21h12)</small></label><input class="in-f" id="bfin" value="' + f(res.finish_s) + '" required>' +
    cps.map((c, i) => '<label class="f" for="bp' + i + '">' + esc(c.name) + ' <small>km ' + c.km + ' · temps de course</small></label><input class="in-f bp" id="bp' + i + '" data-n="' + esc(c.name) + '" value="' + f(res.passes && res.passes[c.name]) + '" placeholder="facultatif">').join('') +
    '<label class="f" for="bnote">Ce que je retiens</label><textarea class="in-f" id="bnote" rows="3" maxlength="2000" placeholder="Nutrition, allure, ce qui a marché…">' + esc(res.note || '') + '</textarea><p class="err" id="be"></p><div class="btns"><button class="btn">Enregistrer le bilan</button></div></form>');
  if ($('bauto')) $('bauto').onclick = async () => {
    const a = sameDay[0]; let tr = a._track; if (tr === undefined) { const { data } = await sb.from('activities').select('track').eq('id', a.id).maybeSingle(); tr = a._track = data ? data.track : null; }
    if (!tr || tr.length < 2 || tr[tr.length - 1][3] == null) return $('be').textContent = 'Pas de tracé horodaté sur cette séance.';
    let d = 0; const cum = tr.map((p, i) => { if (i) d += VTParse.hav({ lat: tr[i - 1][0], lon: tr[i - 1][1] }, { lat: p[0], lon: p[1] }) / 1000; return [d, p[3]]; });
    const kmR = +r.km || d, scale = d / kmR; // la montre mesure rarement pile la distance officielle
    const tAt = k => { const x = k * scale; for (let i = 1; i < cum.length; i++) if (cum[i][0] >= x) return cum[i - 1][1] + (cum[i][1] - cum[i - 1][1]) * ((x - cum[i - 1][0]) / ((cum[i][0] - cum[i - 1][0]) || 1)); return cum[cum.length - 1][1]; };
    $('bfin').value = f(cum[cum.length - 1][1]); document.querySelectorAll('#bf .bp').forEach((x, i) => x.value = f(tAt(cps[i].km)));
    toast('Temps remplis depuis ta montre');
  };
  $('bf').onsubmit = async ev => {
    ev.preventDefault(); const fin = parseHM($('bfin').value); if (!fin) return $('be').textContent = 'Temps final au format 21h12.';
    const passes = {}; let bad = false; document.querySelectorAll('#bf .bp').forEach(x => { if (!x.value.trim()) return; const v = parseHM(x.value); if (!v) bad = true; else passes[x.dataset.n] = v; });
    if (bad) return $('be').textContent = 'Temps aux points au format 9h55.';
    const m = raceModel(r, { noGoal: true });
    if (await saveRace(r, { result: { finish_s: fin, pred_s: m.raw ? Math.round(m.raw) : null, passes, note: $('bnote').value.trim() || null, at: new Date().toISOString() } })) { dlg.close(); vRace(r.id); toast('Bilan enregistré'); }
  };
}

/* ---------- en direct ---------- */
function liveWindow(r, m) { const st = raceStart(r).getTime(), now = Date.now(); return now > st - 6 * 36e5 && now < st + (m.total || 40 * 3600) * 1600; }
function liveState(r, m, passes) {
  const st = raceStart(r).getTime();
  const ps = (passes || []).filter(p => p.km != null).map(p => Object.assign({}, p, { e: (Date.parse(p.at) - st) / 1000 })).filter(p => p.e > -1800).sort((a, b) => a.e - b.e);
  if (!ps.length || !m.total) return null;
  // le coureur avance toujours : la position retenue est le point le plus loin (le plus récent à égalité)
  const byKm = (a, b) => a.km - b.km || a.e - b.e;
  const last = ps.slice().sort(byKm).pop(), pts = ps.filter(p => p.by !== 'gps' && p.km > 0).sort(byKm);
  const ref = pts.length ? pts[pts.length - 1] : (last.km > 0 ? last : null);
  let ratio = 1; if (ref) { const pr = m.at(ref.km); if (pr > 600) { const w = Math.min(1, ref.km / Math.max(10, m.kmT * 0.3)); ratio = 1 + (Math.min(2, Math.max(0.6, ref.e / pr)) - 1) * w; } }
  const eta = k => k <= last.km ? null : last.e + (m.at(k) - m.at(last.km)) * ratio;
  return { last, ratio, eta, delta: ref ? ref.e - m.at(ref.km) : 0 };
}
function liveHTML(r, m, L, crewView) {
  if (!L) return '<p class="note" style="margin-top:0">' + (crewView ? 'Pas encore de pointage. Dès qu\'un passage est noté (par le coureur, par l\'équipe ou par son GPS), les heures se recalculent ici.' : 'Pas encore de pointage. Note tes passages ou partage ta position : ton équipe verra ses heures recalculées.') + '</p>';
  const p = L.last, who = { runner: crewView ? 'pointé par le coureur' : 'ton pointage', crew: 'pointé par l\'équipe', gps: 'position GPS' }[p.by];
  const ago = (Date.now() - Date.parse(p.at)) / 1000;
  const next = cpList(r).filter(c => c.km > p.km);
  let h = '<div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><div><div class="muted" style="font:800 .72rem var(--f);letter-spacing:.12em;text-transform:uppercase">Dernière position</div><b style="font:400 1.45rem var(--d);letter-spacing:.02em">' + (p.cp_name ? esc(p.cp_name) : 'km ' + (+p.km).toLocaleString('fr-FR', { maximumFractionDigits: 1 })) + '</b></div><div style="text-align:right"><b style="font:400 1.45rem var(--d)">' + wallClock(r, p.e) + '</b><div class="muted" style="font-size:.78rem">il y a ' + hm(Math.max(0, ago), true) + '</div></div></div>' +
    '<p class="note">' + who + ' · ' + (Math.abs(L.delta) < 120 ? 'dans les temps prévus' : '<b style="color:' + (L.delta < 0 ? 'var(--turq)' : 'var(--pink)') + '">' + (L.delta < 0 ? 'en avance de ' : 'en retard de ') + hm(Math.abs(L.delta), true) + '</b> sur le prévu') + '</p>';
  if (next.length) h += '<table class="tm" style="margin-top:6px"><thead><tr><th>Prochains points</th><th class="r">Prévu</th><th class="r">Recalculé</th></tr></thead><tbody>' + next.slice(0, 6).map(c => '<tr' + (c.crew ? ' class="crew"' : '') + '><td><b>' + esc(c.name) + '</b><div class="muted" style="font-size:.78rem">km ' + (+c.km).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + '</div></td><td class="r muted">' + wallClock(r, m.at(c.km)) + '</td><td class="r"><b>' + wallClock(r, L.eta(c.km)) + '</b></td></tr>').join('') + '</tbody></table>';
  return h;
}
async function loadPasses(r, token) {
  if (token) { const { data, error } = await sb.rpc('crew_passes', { token }); if (error) throw error; return data || []; }
  const { data, error } = await sb.from('race_passes').select('at,cp_name,km,by,lat,lon').eq('race_id', r.id).order('at', { ascending: false }).limit(400);
  if (error) throw error; return data || [];
}
function liveMap(r, L, elId) {
  if (!r.route) return;
  loadLeaflet().then(() => {
    const el = $(elId); if (!el) return; if (el._map) el._map.remove();
    const mp = L_map(el), ll = r.route.map(p => [p[0], p[1]]), line = window.L.polyline(ll, { color: '#9B3DFF', weight: 4, opacity: .8 }).addTo(mp);
    (r.checkpoints || []).forEach(c => { const p = routeAt(r, c.km); if (p) window.L.circleMarker([p[0], p[1]], { radius: 5, color: '#fff', weight: 2, fillColor: c.crew ? '#00E0C2' : '#B3A9BF', fillOpacity: 1 }).bindTooltip(c.name).addTo(mp); });
    if (L && L.last) { const p = L.last.lat != null ? [L.last.lat, L.last.lon] : (routeAt(r, L.last.km) || []).slice(0, 2); if (p.length) { window.L.circleMarker(p, { radius: 9, color: '#fff', weight: 3, fillColor: '#FF2D8E', fillOpacity: 1 }).addTo(mp); mp.setView(p, 13); el._map = mp; return; } }
    mp.fitBounds(line.getBounds(), { padding: [16, 16] }); el._map = mp;
  }).catch(() => { const el = $(elId); if (el) el.outerHTML = '<p class="note">Carte indisponible hors ligne.</p>'; });
}
function L_map(el) { const mp = window.L.map(el, { scrollWheelZoom: false }); window.L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 16, attribution: '© OpenStreetMap · OpenTopoMap' }).addTo(mp); return mp; }

// partage de position (seulement quand l'appli est ouverte, écran allumé)
const GPS = { watch: null, lock: null, lastSent: 0, lastKm: 0, race: null, sent: 0, err: '' };
function projectKm(r, lat, lon) {
  if (!r.route) return null; let best = null, bd = 1e9;
  for (const p of r.route) { if (p[2] < GPS.lastKm - 2 || p[2] > GPS.lastKm + 40) continue; const d = VTParse.hav({ lat, lon }, { lat: p[0], lon: p[1] }); if (d < bd) { bd = d; best = p; } }
  return best && bd < 1000 ? best[2] : null;
}
async function gpsStart(r) {
  if (!navigator.geolocation) { toast('Pas de GPS sur cet appareil'); return; }
  GPS.race = r; GPS.err = '';
  try { if ('wakeLock' in navigator) GPS.lock = await navigator.wakeLock.request('screen'); } catch (e) {}
  GPS.watch = navigator.geolocation.watchPosition(async pos => {
    const { latitude: lat, longitude: lon, accuracy } = pos.coords; if (accuracy > 150) return;
    const now = Date.now(); if (now - GPS.lastSent < 110e3) return;
    const km = projectKm(r, lat, lon); if (km != null) GPS.lastKm = km;
    GPS.lastSent = now;
    const { error } = await sb.from('race_passes').insert({ race_id: r.id, at: new Date(now).toISOString(), km, by: 'gps', lat: Math.round(lat * 1e5) / 1e5, lon: Math.round(lon * 1e5) / 1e5 });
    if (error) GPS.err = error.message; else GPS.sent++;
    const st = $('gpsst'); if (st) st.textContent = 'Position envoyée ' + GPS.sent + ' fois' + (km != null ? ' · km ' + km.toLocaleString('fr-FR') : '') + '.';
  }, e => { GPS.err = e.message; const st = $('gpsst'); if (st) st.textContent = 'GPS : ' + e.message; }, { enableHighAccuracy: true, maximumAge: 30000, timeout: 60000 });
}
function gpsStop() { if (GPS.watch != null) navigator.geolocation.clearWatch(GPS.watch); GPS.watch = null; if (GPS.lock) GPS.lock.release().catch(() => {}); GPS.lock = null; GPS.race = null; }
document.addEventListener('visibilitychange', async () => { if (!document.hidden && GPS.watch != null && !GPS.lock && 'wakeLock' in navigator) try { GPS.lock = await navigator.wakeLock.request('screen'); } catch (e) {} });

async function runnerLive(r, m) {
  const el = $('live'); if (!el) return;
  let passes = []; try { passes = await loadPasses(r); } catch (e) {}
  const L = liveState(r, m, passes), lastKm = L ? L.last.km : 0, next = cpList(r).filter(c => c.km > lastKm)[0];
  el.innerHTML = liveHTML(r, m, L) +
    '<div class="btns">' + (next ? '<button class="btn grad" id="ptn">Je suis à ' + esc(next.name) + '</button>' : '') + '<button class="btn ghost" id="pto">Pointer un autre point</button>' +
    '<button class="btn ' + (GPS.watch != null ? 'danger' : 'ghost') + '" id="gpsb">' + (GPS.watch != null ? 'Arrêter le partage de position' : 'Partager ma position') + '</button></div>' +
    '<p class="note" id="gpsst">' + (GPS.watch != null ? 'Position partagée tant que l\'appli reste ouverte, écran allumé.' : 'Sur téléphone, la position n\'est envoyée que si l\'appli reste ouverte, écran allumé. Pour un suivi continu, ajoute le lien de suivi de ta montre (Modifier).') + '</p>' +
    (r.live_url ? '<div class="btns"><a class="btn ghost" href="' + esc(r.live_url) + '" target="_blank" rel="noopener">Ouvrir mon suivi montre ↗</a></div>' : '');
  const point = async (name, km) => { const { error } = await sb.from('race_passes').insert({ race_id: r.id, cp_name: name, km, by: 'runner' }); if (error) return toast(error.message); toast('Passage à ' + name + ' noté'); GPS.lastKm = km; runnerLive(r, m); };
  if ($('ptn')) $('ptn').onclick = () => point(next.name, next.km);
  $('pto').onclick = () => {
    sheet('Pointer', r.name, '<ul class="list">' + cpList(r).map((c, i) => '<li><button type="button" class="it" data-i="' + i + '" style="width:100%;border:0;background:none;color:inherit;text-align:left;cursor:pointer"><div class="li-main"><b>' + esc(c.name) + '</b><small>km ' + c.km + '</small></div></button></li>').join('') + '</ul>');
    $('shB').onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; const c = cpList(r)[+b.dataset.i]; dlg.close(); point(c.name, c.km); };
  };
  $('gpsb').onclick = () => { if (GPS.watch != null) gpsStop(); else gpsStart(r); runnerLive(r, m); };
}

/* ---------- courses ---------- */
async function saveRace(r, patch) {
  const { data, error } = await sb.from('races').update(patch).eq('id', r.id).select().single();
  if (error) { toast(error.message); return false; } Object.assign(r, data); saveCache(); return true;
}
function vRaces() {
  const up = S.races.filter(r => r.race_date >= today()), past = S.races.filter(r => r.race_date < today()).reverse();
  const li = r => '<li><a href="#/course/' + r.id + '"><div class="dt"><b>' + pd(r.race_date).getDate() + '</b><span>' + MOIS[pd(r.race_date).getMonth()] + '</span></div><div class="li-main"><b>' + esc(r.name) + '</b><small>' + pd(r.race_date).getFullYear() + (r.km ? ' · ' + fr(r.km) + ' km' : '') + (r.dplus ? ' · ' + fr(r.dplus) + ' m D+' : '') + (r.result && r.result.finish_s ? ' · ' + hm(r.result.finish_s) : '') + '</small></div><div class="li-side"><span class="pill ' + r.priority.toLowerCase() + '">' + r.priority + '</span>' + (r.race_date >= today() ? '<br><span class="muted">J−' + dayDiff(today(), r.race_date) + '</span>' : '') + '</div></a></li>';
  let h = '<div class="hd"><h1>Courses</h1><p>Tes objectifs : A = la course de la saison, B = étape importante, C = préparation.</p></div><div class="btns" style="margin-top:0"><a class="btn" href="#/course/nouvelle">Ajouter une course</a></div>';
  h += up.length ? '<h2 class="sec">À venir</h2><ul class="list">' + up.map(li).join('') + '</ul>' : '<div class="empty" style="margin-top:18px"><b>Aucun objectif</b>Ajoute la course que tu prépares.</div>';
  if (past.length) h += '<h2 class="sec">Courues</h2><ul class="list">' + past.map(li).join('') + '</ul>';
  shell('races', h);
}
function vRace(id) {
  const r = S.races.find(x => x.id === id); if (!r) { location.hash = '#/courses'; return; }
  const m = raceModel(r), j = dayDiff(today(), r.race_date), past = j < 0;
  let h = '<a class="back" href="#/courses">‹ Courses</a><div class="card hero"><div class="lab">Course ' + r.priority + ' · ' + fmtD(r.race_date) + (r.start_time ? ' · ' + r.start_time.slice(0, 5) : '') + '</div><h3>' + esc(r.name) + '</h3><div class="big">' + (!past ? (j === 0 ? 'Jour J' : 'J−' + j) : r.result && r.result.finish_s ? hm(r.result.finish_s) : 'Courue') + '</div><div class="row">' + (r.km ? '<span>' + fr(r.km) + ' km</span>' : '') + (r.dplus ? '<span>' + fr(r.dplus) + ' m D+</span>' : '') + (r.goal_s ? '<span>objectif ' + hm(r.goal_s) + '</span>' : '') + '</div></div>';
  const live = !past && liveWindow(r, m);
  if (live) h += '<h2 class="sec">En direct</h2><div class="card" id="live"><p class="note" style="margin-top:0">Chargement…</p></div>';
  if (past) h += '<h2 class="sec">Bilan</h2><div class="card">' + (r.result && r.result.finish_s ? '<p style="margin:0">Temps final <b>' + hm(r.result.finish_s) + '</b>' + (m.total ? ', prévu ' + hm(m.total) : '') + '.</p>' + (r.result.note ? '<p class="note">« ' + esc(r.result.note) + ' »</p>' : '') + '<p class="note">Ton bilan recale les estimations de tes prochaines courses.</p><div class="btns"><button class="btn ghost" id="bil">Modifier le bilan</button></div>' : '<p style="margin:0">Comment ça s\'est passé ? Note ton temps : l\'appli compare au prévu et affine ses estimations pour la suite.</p><div class="btns"><button class="btn" id="bil">Faire mon bilan</button></div>') + '</div>';
  if (!past && j <= 15 && r.route) h += '<h2 class="sec">Météo sur le parcours</h2><div class="card" id="wx"><p class="note" style="margin-top:0">Chargement des prévisions…</p></div>';
  if (r.profile) h += '<h2 class="sec">Profil</h2><div class="card">' + profileSVG(r.profile, r.checkpoints, { label: 'Profil de ' + r.name }) + '<div class="legend"><span><i style="background:#00E0C2"></i>Assistance</span><span><i style="background:#B3A9BF"></i>Point de passage</span></div></div>';
  h += '<h2 class="sec">Temps de passage</h2><div class="card">' + passTable(r, m) + '</div>';
  if (!past) {
    h += '<h2 class="sec">Nutrition</h2><div class="card">' + nutritionHTML(r, m) + '<div class="btns"><button class="btn ghost" id="nut">Régler mes besoins et mes ravitos</button></div></div>';
    h += '<h2 class="sec">Matériel</h2><div class="card" id="gear">' + gearHTML(r) + '</div>';
    if (j > 15 && r.route) h += '<h2 class="sec">Météo</h2><div class="card"><p class="note" style="margin-top:0">Prévisions sur le parcours à partir de J−15 (le ' + fmtD(ymd(new Date(pd(r.race_date) - 15 * 864e5))) + ').</p></div>';
    h += '<h2 class="sec">Équipe d\'assistance</h2><div class="card">' + (r.crew_token
      ? '<p style="margin:0">Ton équipe suit tes heures de passage, ce qu\'elle doit te tendre et la météo, avec ce lien et sans compte. Elle voit ton prénom et la course, rien d\'autre.</p><div class="btns"><button class="btn" id="shr">Partager le lien</button><button class="btn ghost" id="cof">Désactiver le lien</button></div>'
      : '<p style="margin:0">Crée un lien pour que tes suiveurs voient tes heures de passage aux ravitos. Tu peux le désactiver quand tu veux.</p><div class="btns"><button class="btn" id="con">Créer le lien équipe</button></div>') + '</div>';
  }
  if (r.profile && !past) h += '<h2 class="sec">S\'entraîner sur le parcours</h2><a class="card" href="#/course/' + r.id + '/jumeau" style="display:flex;justify-content:space-between;align-items:center;text-decoration:none;color:var(--ink)"><span><b>Jumeau local</b><br><span class="muted" style="font-size:.84rem">Les montées et descentes de la course, retrouvées dans tes sorties</span></span><span style="color:var(--muted);font-size:1.3rem">›</span></a>';
  h += '<div class="btns two"><a class="btn ghost" href="#/course/' + r.id + '/modifier">Modifier</a><button class="btn danger" id="dl">Supprimer</button></div>';
  shell('races', h);
  if ($('wx')) weatherHTML(r, m).then(x => { if ($('wx')) $('wx').innerHTML = x; }).catch(() => { if ($('wx')) $('wx').innerHTML = '<p class="note" style="margin-top:0">Météo indisponible pour le moment.</p>'; });
  if (live) { runnerLive(r, m); liveTimer = setInterval(() => { if (!dlg.open) runnerLive(r, m); }, 60e3); }
  if ($('bil')) $('bil').onclick = () => resultSheet(r);
  if ($('nut')) $('nut').onclick = () => nutritionSheet(r);
  bindGear(r);
  const setTok = async t => { if (await saveRace(r, { crew_token: t })) vRace(id); };
  if ($('con')) $('con').onclick = () => setTok(randToken() + randToken().slice(0, 8));
  if ($('cof')) $('cof').onclick = () => { if (confirm('Désactiver le lien ? Ceux qui l\'ont ne verront plus rien.')) setTok(null); };
  if ($('shr')) $('shr').onclick = async () => {
    const u = location.origin + location.pathname + '#/equipe/' + r.crew_token;
    try { if (navigator.share) await navigator.share({ title: r.name + ' · suivi assistance', text: 'Mes heures de passage sur ' + r.name, url: u }); else { await navigator.clipboard.writeText(u); toast('Lien copié'); } }
    catch (e) { if (e && e.name === 'AbortError') return; try { await navigator.clipboard.writeText(u); toast('Lien copié'); } catch (_) { prompt('Lien à envoyer à ton équipe :', u); } }
  };
  $('dl').onclick = async () => { if (!confirm('Supprimer « ' + r.name + ' » ?')) return; const { error } = await sb.from('races').delete().eq('id', r.id); if (error) return toast(error.message); S.races = S.races.filter(x => x.id !== r.id); saveCache(); location.hash = '#/courses'; };
}
function vRaceForm(id) {
  const r = id ? S.races.find(x => x.id === id) : null; if (id && !r) { location.hash = '#/courses'; return; }
  let gpx = null, cps = (r ? r.checkpoints : []).map(c => Object.assign({}, c));
  const cpRows = () => cps.map((c, i) => '<div class="grid2" style="grid-template-columns:1fr 84px 44px;align-items:end;margin-top:8px" data-i="' + i + '"><div><input class="in-f cpn" aria-label="Nom du point ' + (i + 1) + '" value="' + esc(c.name) + '" placeholder="Nom du point" maxlength="60"></div><div><input class="in-f cpk" aria-label="Kilomètre du point ' + (i + 1) + '" inputmode="decimal" value="' + (c.km ?? '') + '" placeholder="km"></div><button type="button" class="x cpd" aria-label="Retirer le point ' + (i + 1) + '">✕</button><label class="check" style="grid-column:1/-1;margin-top:4px;padding:8px 12px"><input type="checkbox" class="cpc"' + (c.crew ? ' checked' : '') + '> <span>Mon équipe m\'attend ici</span></label></div>').join('');
  const g = r && r.goal_s ? Math.floor(r.goal_s / 3600) + 'h' + String(Math.floor(r.goal_s % 3600 / 60)).padStart(2, '0') : '';
  let h = '<a class="back" href="' + (r ? '#/course/' + r.id : '#/courses') + '">‹ ' + (r ? esc(r.name) : 'Courses') + '</a><div class="hd"><h1>' + (r ? 'Modifier' : 'Nouvelle course') + '</h1></div><form id="rf">' +
    '<label class="f" for="gp">Parcours GPX <small>(facultatif : distance, D+, profil, carte et météo)</small></label><input class="in-f" id="gp" type="file" accept=".gpx,application/gpx+xml"><p class="note" id="gpi">' + (r && r.profile ? 'Parcours enregistré. Importer un autre GPX le remplace.' : 'Le GPX se trouve en général sur le site de la course.') + '</p>' +
    '<label class="f" for="rn">Nom</label><input class="in-f" id="rn" required maxlength="120" value="' + esc(r ? r.name : '') + '">' +
    '<div class="grid2"><div><label class="f" for="rd">Date</label><input class="in-f" id="rd" type="date" required value="' + (r ? r.race_date : '') + '"></div><div><label class="f" for="rt">Heure de départ</label><input class="in-f" id="rt" type="time" value="' + (r && r.start_time ? r.start_time.slice(0, 5) : '') + '"></div></div>' +
    '<label class="f" for="tz">Fuseau horaire de la course</label><select class="in-f" id="tz">' + TZS.map(t => '<option' + ((r ? r.tz : 'Europe/Paris') === t ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>' +
    '<div class="grid2"><div><label class="f" for="rk">Distance <small>(km)</small></label><input class="in-f" id="rk" inputmode="decimal" value="' + (r && r.km != null ? r.km : '') + '"></div><div><label class="f" for="rp">D+ <small>(m)</small></label><input class="in-f" id="rp" inputmode="numeric" value="' + (r && r.dplus != null ? r.dplus : '') + '"></div></div>' +
    '<div class="grid2"><div><label class="f" for="rg">Objectif <small>(ex. 21h30)</small></label><input class="in-f" id="rg" value="' + g + '" placeholder="facultatif"></div><div><label class="f" for="rpr">Priorité</label><select class="in-f" id="rpr">' + ['A', 'B', 'C'].map(x => '<option' + ((r ? r.priority : 'A') === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div></div>' +
    '<label class="f" for="rl">Lien de suivi en direct <small>(montre ou organisation, facultatif)</small></label><input class="in-f" id="rl" type="url" inputmode="url" maxlength="500" placeholder="https://…" value="' + esc(r && r.live_url || '') + '"><p class="note">Coros : appli › Profil › Suivi en direct. Garmin : LiveTrack. Ou la page de suivi officielle de la course.</p>' +
    '<h2 class="sec">Points de passage</h2><p class="note" style="margin-top:-4px">Ravitos et points d\'assistance, avec leur kilomètre.</p><div id="cps">' + cpRows() + '</div><div class="btns"><button type="button" class="btn ghost" id="cpa">Ajouter un point</button></div>' +
    '<p class="err" id="er"></p><div class="btns"><button class="btn grad">Enregistrer</button></div></form>';
  shell('races', h);
  const readCps = () => { const old = {}; cps.forEach(c => old[c.name] = c.give); cps = [...document.querySelectorAll('#cps [data-i]')].map(el => { const n = el.querySelector('.cpn').value.trim(); return { name: n, km: +String(el.querySelector('.cpk').value).replace(',', '.'), crew: el.querySelector('.cpc').checked, give: old[n] || undefined }; }); };
  $('cpa').onclick = () => { readCps(); cps.push({ name: '', km: '', crew: false }); $('cps').innerHTML = cpRows(); };
  $('cps').onclick = e => { const b = e.target.closest('.cpd'); if (!b) return; readCps(); cps.splice(+b.closest('[data-i]').dataset.i, 1); $('cps').innerHTML = cpRows(); };
  $('gp').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const p = VTParse.courseProfile(VTParse.parseGPX(await f.text())); gpx = p; $('gpi').textContent = 'Parcours lu : ' + p.km.toLocaleString('fr-FR') + ' km, ' + fr(p.dplus) + ' m D+.'; $('rk').value = p.km; $('rp').value = p.dplus; if (!$('rn').value && p.name) $('rn').value = p.name.slice(0, 120); }
    catch (err) { gpx = null; $('gpi').textContent = 'GPX illisible : ' + err.message; }
  };
  $('rf').onsubmit = async ev => {
    ev.preventDefault(); readCps(); const E = t => $('er').textContent = t;
    const goal = $('rg').value.trim() ? parseHM($('rg').value) : null; if ($('rg').value.trim() && !goal) return E('Objectif au format 21h30.');
    const kmv = +String($('rk').value).replace(',', '.') || null;
    const bad = cps.find(c => !c.name || !(c.km >= 0) || (kmv && c.km > kmv)); if (bad) return E('Chaque point a besoin d\'un nom et d\'un kilomètre dans la course.');
    if (new Set(cps.map(c => c.name)).size < cps.length) return E('Deux points ne peuvent pas avoir le même nom.');
    const lu = $('rl').value.trim(); if (lu && !/^https:\/\/\S+$/.test(lu)) return E('Le lien de suivi doit commencer par https://');
    const row = { name: $('rn').value.trim(), race_date: $('rd').value, start_time: $('rt').value || null, tz: $('tz').value, km: kmv, dplus: +$('rp').value || null, goal_s: goal, priority: $('rpr').value, live_url: lu || null, checkpoints: cps.sort((a, b) => a.km - b.km) };
    if (gpx) { row.profile = gpx.profile; row.route = gpx.route; }
    const q = r ? sb.from('races').update(row).eq('id', r.id) : sb.from('races').insert(row);
    const { data, error } = await q.select().single(); if (error) return E(error.message);
    S.races = S.races.filter(x => x.id !== data.id).concat(data).sort((a, b) => a.race_date.localeCompare(b.race_date)); saveCache();
    location.hash = '#/course/' + data.id;
  };
}

/* ---------- page équipe (publique) ---------- */
async function vCrew(token) {
  root.innerHTML = '<div class="loading">Chargement…</div>';
  const { data, error } = await sb.rpc('crew_race', { token });
  if (error || !data) { root.innerHTML = '<div class="auth"><div class="box"><img class="logo" src="icons/logo.svg" alt=""><h1 style="font-size:1.8rem">Lien inactif</h1><p class="muted" style="text-align:center">Ce lien d\'assistance n\'existe pas ou a été désactivé. Demande le nouveau lien au coureur.</p></div></div>'; return; }
  const r = Object.assign({ checkpoints: [], id: 'crew-' + token.slice(0, 8) }, data), j = dayDiff(today(), r.race_date);
  const m = raceModel(r);
  const st = raceStart(r), dt = st - Date.now();
  const when = j > 1 ? 'Départ dans ' + j + ' jours' : dt > 0 ? 'Départ dans ' + hm(dt / 1000, true) : (m.total && -dt / 1000 < m.total * 1.4 ? 'Course en cours · ' + hm(-dt / 1000, true) + ' de course' : 'Course terminée');
  const crewPts = cpList(r).filter(c => c.crew);
  root.innerHTML = '<div class="crewtop"><div class="wrap"><div style="font:800 .74rem var(--f);letter-spacing:.14em;text-transform:uppercase;opacity:.9">Suivi assistance · ' + esc(r.runner || 'coureur') + '</div><h1 style="font:400 2rem/1.05 var(--d);margin:6px 0">' + esc(r.name) + '</h1><div style="font-weight:700">' + fmtD(r.race_date) + (r.start_time ? ' · départ ' + r.start_time.slice(0, 5) : '') + (r.km ? ' · ' + fr(r.km) + ' km' : '') + (r.dplus ? ' · ' + fr(r.dplus) + ' m D+' : '') + '</div><div style="font:400 1.5rem var(--d);margin-top:8px">' + when + '</div></div></div>' +
    '<main class="wrap fade" style="padding-bottom:40px">' +
    (liveWindow(r, m) ? '<h2 class="sec">En direct</h2><div class="card" id="clive"><p class="note" style="margin-top:0">Chargement…</p></div>' + (r.route ? '<div id="cmap" style="height:260px;border-radius:var(--r);overflow:hidden;border:1px solid var(--line);margin-top:10px" role="img" aria-label="Carte du parcours et dernière position"></div>' : '') + '<div class="btns"><button class="btn" id="seen">Je l\'ai vu passer</button>' + (r.live_url ? '<a class="btn ghost" href="' + esc(r.live_url) + '" target="_blank" rel="noopener">Suivre sa montre en direct ↗</a>' : '') + '</div>' : (r.live_url ? '<div class="btns"><a class="btn ghost" href="' + esc(r.live_url) + '" target="_blank" rel="noopener">Lien de suivi en direct ↗</a></div>' : '')) +
    (crewPts.length && m.total ? '<h2 class="sec">Vos rendez-vous</h2>' + crewPts.map(c => '<div class="card"><div style="display:flex;justify-content:space-between;gap:12px;align-items:baseline"><b style="font:400 1.3rem var(--d);letter-spacing:.02em">' + esc(c.name) + '</b><b style="font:400 1.5rem var(--d);color:var(--turq)">' + wallClock(r, m.at(c.km)) + '</b></div><div class="muted" style="font-size:.86rem">km ' + c.km + ' · après ' + hm(m.at(c.km)) + ' de course</div>' + (c.give ? '<p style="margin:8px 0 0"><b>À lui tendre :</b> ' + esc(c.give) + '</p>' : '') + '</div>').join('') : '') +
    (j <= 15 && j >= 0 && r.route ? '<h2 class="sec">Météo aux points</h2><div class="card" id="wx"><p class="note" style="margin-top:0">Chargement…</p></div>' : '') +
    (r.profile ? '<h2 class="sec">Profil</h2><div class="card">' + profileSVG(r.profile, r.checkpoints) + '<div class="legend"><span><i style="background:#00E0C2"></i>Assistance</span><span><i style="background:#B3A9BF"></i>Point de passage</span></div></div>' : '') +
    '<h2 class="sec">Heures de passage prévues</h2><div class="card">' + (m.total ? passTable(r, m) : '<p class="note">Pas encore de temps prévu.</p>') + '</div>' +
    (m.total ? '<h2 class="sec">Ses besoins</h2><div class="card">' + nutritionHTML(r, m, true) + '</div>' : '') +
    '<p class="note" style="text-align:center;margin-top:24px">Partagé via <b>VIC\'TORY Trail</b> · les heures sont des prévisions.</p></main>';
  if ($('wx')) weatherHTML(r, m).then(x => { if ($('wx')) $('wx').innerHTML = x; }).catch(() => { if ($('wx')) $('wx').innerHTML = '<p class="note" style="margin-top:0">Météo indisponible.</p>'; });
  if ($('clive')) {
    const draw = async () => { let ps = []; try { ps = await loadPasses(r, token); } catch (e) {} const L = liveState(r, m, ps); if ($('clive')) $('clive').innerHTML = liveHTML(r, m, L, true); liveMap(r, L, 'cmap'); };
    draw(); liveTimer = setInterval(() => { if (!dlg.open) draw(); }, 60e3);
    $('seen').onclick = () => {
      const opts = cpList(r);
      sheet('Je l\'ai vu passer', r.name, '<form id="sf"><label class="f" for="sp">Où ?</label><select class="in-f" id="sp">' + opts.map(c => '<option>' + esc(c.name) + '</option>').join('') + '</select><label class="f" for="sa">Quand ?</label><select class="in-f" id="sa"><option value="0">À l\'instant</option><option value="5">Il y a 5 min</option><option value="10">Il y a 10 min</option><option value="20">Il y a 20 min</option><option value="30">Il y a 30 min</option><option value="60">Il y a 1 h</option></select><p class="err" id="se"></p><div class="btns"><button class="btn">Noter le passage</button></div></form>');
      $('sf').onsubmit = async ev => { ev.preventDefault(); const at = new Date(Date.now() - (+$('sa').value) * 6e4).toISOString();
        const { error } = await sb.rpc('crew_add_pass', { token, cp: $('sp').value, seen_at: at }); if (error) return $('se').textContent = /hors course/.test(error.message) ? 'La course n\'a pas lieu à cette heure-là.' : error.message;
        dlg.close(); toast('Passage noté, heures recalculées'); draw(); };
    };
  }
}

/* ---------- forme : charge d'entraînement ---------- */
// charge d'une séance : heures par zone × [40, 60, 80, 100, 120] si la FC est connue, sinon heures × (ressenti × 10 + 10), sinon heures × 55
const ZW = [40, 60, 80, 100, 120];
function loadOf(a) {
  const h = (a.moving_s || a.elapsed_s || 0) / 3600;
  if (a.zone_s && a.zone_s.some(Boolean)) { const tot = a.zone_s.reduce((x, y) => x + y, 0) || 1; return a.zone_s.reduce((s, z, i) => s + z / tot * h * ZW[i], 0); }
  if (a.rpe) return h * (a.rpe * 10 + 10);
  return h * 55 * (a.elev_gain && a.distance_m ? Math.min(1.3, 1 + a.elev_gain / a.distance_m) : 1);
}
function fitness(days) {
  days = days || 120; const byDay = {}; S.acts.forEach(a => { const k = localDay(a.start_at); byDay[k] = (byDay[k] || 0) + loadOf(a); });
  const start = new Date(); start.setDate(start.getDate() - days - 90); // 90 jours de chauffe pour les moyennes
  let ctl = 0, atl = 0; const out = [];
  for (let d = new Date(start); d <= new Date(); d.setDate(d.getDate() + 1)) {
    const l = byDay[ymd(d)] || 0; ctl += (l - ctl) / 42; atl += (l - atl) / 7;
    out.push({ d: ymd(d), l, ctl, atl, tsb: ctl - atl });
  }
  return out.slice(-days);
}
function formMsg(f) {
  const t = f.tsb;
  if (f.ctl < 5) return ['Pas assez de séances', 'Importe quelques semaines de sorties pour mesurer ta forme.', 'var(--muted)'];
  if (t < -25) return ['Très fatigué', 'Grosse charge récente : une journée facile ou du repos sera utile.', 'var(--red)'];
  if (t < -10) return ['En charge', 'Tu travailles : c\'est là que la forme se construit, à condition de récupérer ensuite.', 'var(--yellow)'];
  if (t <= 5) return ['Équilibré', 'Charge et récupération s\'équilibrent.', 'var(--turq)'];
  return ['Frais', 'Bien reposé : bon moment pour une séance clé, ou c\'est l\'affûtage avant course.', 'var(--turq)'];
}
function linesSVG(F) {
  const W = 360, H = 150, pl = 26, pb = 18, pt = 8, n = F.length, mx = Math.max(10, ...F.map(f => Math.max(f.ctl, f.atl))) * 1.1;
  const X = i => pl + (W - pl - 4) * i / (n - 1), Y = v => pt + (H - pt - pb) * (1 - v / mx);
  const path = k => F.map((f, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(f[k]).toFixed(1)).join('');
  let g = ''; const st = mx > 80 ? 20 : mx > 40 ? 10 : 5; for (let v = 0; v < mx; v += st) g += '<line x1="' + pl + '" x2="' + W + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#37303F"/><text x="' + (pl - 4) + '" y="' + (Y(v) + 3) + '" text-anchor="end">' + v + '</text>';
  F.forEach((f, i) => { if (i % 30 === (n - 1) % 30) { const d = pd(f.d); g += '<text x="' + X(i) + '" y="' + (H - 4) + '" text-anchor="middle">' + d.getDate() + ' ' + MOIS[d.getMonth()].replace('.', '') + '</text>'; } });
  g += '<path d="' + path('atl') + '" fill="none" stroke="#FF2D8E" stroke-width="1.6" opacity=".85"/><path d="' + path('ctl') + '" fill="none" stroke="#00E0C2" stroke-width="2.4"/>';
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Forme (bleu-vert) et fatigue (rose) sur 120 jours">' + g + '</svg>';
}
function formCard(full) {
  const F = fitness(120), f = F[F.length - 1], [t, msg, col] = formMsg(f), w4 = F[F.length - 29] || F[0];
  let h = '<div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><div><div class="muted" style="font:800 .72rem var(--f);letter-spacing:.12em;text-transform:uppercase">Forme du jour</div><b style="font:400 1.6rem var(--d);letter-spacing:.02em;color:' + col + '">' + t + '</b></div><div style="text-align:right"><b style="font:400 1.6rem var(--d)">' + (f.tsb > 0 ? '+' : '') + Math.round(f.tsb) + '</b><div class="muted" style="font-size:.74rem">fraîcheur</div></div></div><p class="note">' + msg + '</p>';
  if (full) h += '<div class="stats" style="margin-top:10px"><div class="stat"><span>Forme</span><b style="color:var(--turq)">' + Math.round(f.ctl) + '</b><small class="' + (f.ctl >= w4.ctl ? 'up' : 'down') + '">' + (f.ctl >= w4.ctl ? '+' : '−') + Math.abs(Math.round(f.ctl - w4.ctl)) + ' en 4 sem.</small></div><div class="stat"><span>Fatigue</span><b style="color:var(--pink)">' + Math.round(f.atl) + '</b><span>7 jours</span></div><div class="stat"><span>Charge 7 j</span><b>' + Math.round(F.slice(-7).reduce((s, x) => s + x.l, 0)) + '</b><span>points</span></div></div><div style="margin-top:12px">' + linesSVG(F) + '</div><div class="legend"><span><i style="background:#00E0C2"></i>Forme (moyenne 42 j)</span><span><i style="background:#FF2D8E"></i>Fatigue (7 j)</span></div><p class="note">Charge d\'une séance : temps passé dans chaque zone cardio (ou ressenti, ou durée et dénivelé à défaut). Fraîcheur = forme − fatigue. Une forme qui monte de plus de 5 à 7 points par semaine augmente le risque de blessure.</p>';
  return h + '</div>';
}

/* ---------- plan jusqu'à la course A ---------- */
function planFor() {
  const races = S.races.filter(r => r.race_date >= today()).sort((a, b) => a.race_date.localeCompare(b.race_date));
  const goal = races.find(r => r.priority === 'A') || races[0]; if (!goal) return null;
  const ws0 = weekStart(new Date()), wr = weekStart(pd(goal.race_date)), nW = Math.round((wr - ws0) / (7 * 864e5)) + 1;
  const past4 = [1, 2, 3, 4].map(weekStats), H0 = Math.max(3, past4.reduce((s, x) => s + x.s, 0) / 4 / 3600);
  const m = raceModel(goal), eff = m.eff || 50;
  let Hp = eff < 60 ? 8 : eff < 120 ? 10 : eff < 200 ? 12 : 14;
  Hp = Math.min(Hp, Math.max(H0 * 1.8, H0 + 3)); const cap = S.profile && S.profile.week_hours; if (cap) Hp = Math.min(Hp, cap);
  const dph = goal.dplus && m.total ? goal.dplus / (m.total / 3600) : 250; // m de D+ par heure de course
  const weeks = [];
  for (let i = 0; i < nW; i++) {
    const toRace = nW - 1 - i, ws = new Date(ws0); ws.setDate(ws.getDate() + 7 * i);
    let ph, f;
    if (toRace === 0) { ph = 'Course'; f = 0.4; }
    else if (toRace <= 2) { ph = 'Affûtage'; f = toRace === 1 ? 0.55 : 0.7; }
    else if (toRace <= 9) { ph = 'Spécifique'; f = 1; }
    else if (toRace <= 19) { ph = 'Développement'; f = 0.75 + 0.25 * (19 - toRace) / 10; }
    else { ph = 'Base'; f = 0.65; }
    let h = ph === 'Base' || ph === 'Développement' ? H0 + (Hp * f - H0) * Math.min(1, (i + 1) / Math.max(4, nW - 9)) : Hp * f;
    const rec = toRace > 2 && toRace % 4 === 3; if (rec) h *= 0.7;
    h = Math.max(2, Math.round(h * 2) / 2);
    const lr = ph === 'Spécifique' ? Math.min(6, Math.max(2, (m.total || 4 * 3600) / 3600 * 0.35)) : ph === 'Développement' ? Math.min(4.5, h * 0.3) : Math.min(2.5, h * 0.3);
    weeks.push({ ws, ph, rec, h, dp: Math.round(h * dph * 0.8 / 50) * 50, lr: Math.round(lr * 2) / 2, toRace });
  }
  return { goal, weeks, H0, Hp };
}
const PH_TXT = {
  'Base': 'Construire l\'endurance : beaucoup de facile (Z1–Z2), un peu de côtes courtes, du renfo.',
  'Développement': 'Monter le volume et le D+ ; une séance de seuil ou de côtes longues par semaine, une sortie longue qui s\'allonge.',
  'Spécifique': 'Ressembler à la course : sorties longues sur terrain proche, D+ et D− du parcours, nutrition de course testée.',
  'Affûtage': 'Baisser le volume, garder un peu de rythme. Dormir, manger, vérifier le matériel.',
  'Course': 'Semaine de course : quelques footings courts, tout le reste pour le jour J.'
};
function weekDone(ws) { const we = new Date(ws); we.setDate(we.getDate() + 7); const a = S.acts.filter(x => { const d = new Date(x.start_at); return d >= ws && d < we; }); return { s: a.reduce((t, x) => t + (x.moving_s || x.elapsed_s || 0), 0), dp: a.reduce((t, x) => t + (x.elev_gain || 0), 0), lr: Math.max(0, ...a.filter(isFoot).map(x => x.moving_s || 0)) }; }
function planWeekCard(P, w, i) {
  const d = weekDone(w.ws), cur = i === 0, pct = v => Math.min(100, Math.round(v * 100));
  return '<div class="card"' + (cur ? ' style="border-color:var(--pink)"' : '') + '><div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b>' + (cur ? 'Cette semaine' : 'Sem. du ' + w.ws.getDate() + ' ' + MOIS[w.ws.getMonth()]) + '</b><span class="pill ' + (w.ph === 'Course' ? 'a' : w.ph === 'Spécifique' ? 'b' : '') + '">' + w.ph + (w.rec ? ' · récup' : '') + '</span></div>' +
    '<div class="muted" style="font-size:.82rem;margin-top:2px">' + (w.toRace ? 'J−' + dayDiff(today(), P.goal.race_date) + (cur ? '' : '') + ' · ' : '') + w.h.toLocaleString('fr-FR') + ' h · ' + fr(w.dp) + ' m D+ · sortie longue ' + w.lr.toLocaleString('fr-FR') + ' h</div>' +
    (cur ? '<div class="zrow" style="grid-template-columns:62px 1fr 74px"><span>Temps</span><div class="bar"><i style="width:' + pct(d.s / 3600 / w.h) + '%;background:var(--pink)"></i></div><span style="text-align:right">' + hm(d.s) + '</span></div><div class="zrow" style="grid-template-columns:62px 1fr 74px"><span>D+</span><div class="bar"><i style="width:' + pct(d.dp / Math.max(1, w.dp)) + '%;background:var(--violet)"></i></div><span style="text-align:right">' + fr(d.dp) + ' m</span></div><div class="zrow" style="grid-template-columns:62px 1fr 74px"><span>Longue</span><div class="bar"><i style="width:' + pct(d.lr / 3600 / w.lr) + '%;background:var(--turq)"></i></div><span style="text-align:right">' + hm(d.lr) + '</span></div><p class="note">' + PH_TXT[w.ph] + '</p>' : '') + '</div>';
}
function vPlan() {
  const P = planFor();
  if (!P) { shell('prog', '<a class="back" href="#/progres">‹ Progrès</a><div class="hd"><h1>Plan</h1></div><div class="empty"><b>Pas de course à venir</b>Ajoute ta course objectif pour générer ton plan.<div class="btns"><a class="btn" href="#/course/nouvelle">Ajouter une course</a></div></div>'); return; }
  let h = '<a class="back" href="#/progres">‹ Progrès</a><div class="hd"><h1>Plan</h1><p>Jusqu\'à <b>' + esc(P.goal.name) + '</b>, le ' + fmtD(P.goal.race_date) + ' : ' + P.weeks.length + ' semaines.</p></div>';
  h += '<div class="card"><p style="margin:0">Volume de départ <b>' + P.H0.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' h</b> par semaine (tes 4 dernières semaines), pic à <b>' + P.Hp.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' h</b> en phase spécifique. Une semaine sur quatre allégée pour récupérer.</p><label class="f" for="wh">Heures maximum par semaine <small>(selon ta vie : boulot, famille)</small></label><div class="grid2" style="grid-template-columns:1fr auto"><input class="in-f" id="wh" inputmode="decimal" value="' + (S.profile.week_hours || '') + '" placeholder="pas de limite"><button class="btn" id="whs" style="width:auto">OK</button></div><p class="note">Un repère pour s\'organiser, pas une prescription : si tu as un coach, suis son plan.</p></div>';
  h += '<h2 class="sec">Semaines</h2>' + P.weeks.map((w, i) => planWeekCard(P, w, i)).join('');
  shell('prog', h);
  $('whs').onclick = async () => { const v = +String($('wh').value).replace(',', '.') || null; if (v != null && (v < 2 || v > 40)) return toast('Entre 2 et 40 h'); try { await saveProfile({ week_hours: v }); vPlan(); } catch (e) { toast(e.message); } };
}

/* ---------- jumeau local ---------- */
async function vTwin(id) {
  const r = S.races.find(x => x.id === id); if (!r) { location.hash = '#/courses'; return; }
  let h = '<a class="back" href="#/course/' + r.id + '">‹ ' + esc(r.name) + '</a><div class="hd"><h1>Jumeau local</h1><p>Chaque montée, descente et portion roulante de la course, retrouvée dans tes propres sorties : de quoi répéter la course près de chez toi.</p></div>';
  if (!r.profile) { shell('races', h + '<div class="empty"><b>Parcours manquant</b>Ajoute le GPX de la course (Modifier) pour lancer l\'analyse.</div>'); return; }
  h += '<div class="card" id="tw"><p class="note" style="margin-top:0">Chargement de tes tracés…</p><div class="zbar" style="height:8px"><i id="twp" style="display:block;width:0;background:var(--grad);height:100%"></i></div></div>';
  shell('races', h);
  const ids = S.acts.filter(a => isFoot(a) && (a.elev_gain || 0) >= 100 && a.source !== 'manual').slice(0, 80).map(a => a.id);
  if (!ids.length) { $('tw').innerHTML = '<p class="note" style="margin-top:0">Importe des sorties avec du dénivelé (fichiers FIT ou GPX) pour trouver des portions jumelles.</p>'; return; }
  const acts = []; for (let i = 0; i < ids.length; i += 20) { const { data } = await sb.from('activities').select('id,name,start_at,track').in('id', ids.slice(i, i + 20)); (data || []).forEach(a => { if (a.track) acts.push({ id: a.id, name: a.name, date: localDay(a.start_at), track: a.track }); }); }
  if (!$('tw')) return;
  const wk = new Worker('twin-worker.js');
  wk.onmessage = e => {
    if (e.data.progress != null) { const p = $('twp'); if (p) p.style.width = Math.round(e.data.progress * 100) + '%'; return; }
    wk.terminate(); const el = $('tw'); if (!el) return;
    const secs = e.data.sections, tot = secs.reduce((s, x) => s + x.L, 0), ok = secs.filter(x => x.m && x.m.sc >= 0.75);
    const cov = ok.reduce((s, x) => s + x.L, 0) / (tot || 1), dpT = secs.reduce((s, x) => s + Math.max(0, x.up), 0), dpOk = ok.reduce((s, x) => s + Math.max(0, x.up), 0) / (dpT || 1);
    const KIND = { montee: ['Montée', 'var(--pink)', '↗'], descente: ['Descente', 'var(--turq)', '↘'], roulant: ['Roulant', 'var(--yellow)', '→'] };
    el.innerHTML = '<div class="stats"><div class="stat"><span>Parcours couvert</span><b>' + Math.round(cov * 100) + ' %</b><span>jumeau ≥ 75 %</span></div><div class="stat"><span>D+ couvert</span><b>' + Math.round(dpOk * 100) + ' %</b><span>' + fr(dpT) + ' m</span></div><div class="stat"><span>Sorties</span><b>' + e.data.nActs + '</b><span>analysées</span></div></div><p class="note">Plus tu importes de sorties variées, plus les jumeaux sont fidèles.</p>' +
      '<ul class="list" style="margin-top:12px">' + secs.map(s => { const K = KIND[s.kind], m = s.m, good = m && m.sc >= 0.75;
        return '<li>' + (m ? '<a href="#/seance/' + m.actId + '">' : '<div class="it">') + '<div style="flex:none;width:30px;text-align:center;font-size:1.2rem;color:' + K[1] + '">' + K[2] + '</div><div class="li-main"><b style="white-space:normal">' + K[0] + ' · km ' + s.k0.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' → ' + s.k1.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + '</b><small>' + (s.L / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' km · ' + (s.dz > 0 ? '+' : '') + fr(s.dz) + ' m · ' + s.gr.toLocaleString('fr-FR') + ' %' + (m ? '<br>' + (good ? '' : 'au plus proche : ') + esc(m.name || 'Sortie') + ' du ' + fmtDs(m.date) + ', km ' + m.k0.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' → ' + m.k1.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + (m.rev ? ' (dans l\'autre sens)' : '') : '') + '</small></div><div class="li-side" style="color:' + (good ? 'var(--turq)' : 'var(--muted)') + '">' + (m ? Math.round(m.sc * 100) + ' %' : '–') + '</div>' + (m ? '</a>' : '</div>') + '</li>'; }).join('') + '</ul>';
  };
  wk.onerror = () => { const el = $('tw'); if (el) el.innerHTML = '<p class="note" style="margin-top:0">Analyse impossible sur cet appareil.</p>'; };
  wk.postMessage({ profile: r.profile, acts });
}

/* ---------- progrès ---------- */
function vProg() {
  const N = 12, ws0 = weekStart(new Date()), W = [];
  for (let i = N - 1; i >= 0; i--) { const s = new Date(ws0); s.setDate(s.getDate() - 7 * i); W.push(Object.assign({ ws: s }, weekStats(i))); }
  const lab = W.map((w, i) => i % 3 === (N - 1) % 3 ? w.ws.getDate() + ' ' + MOIS[w.ws.getMonth()].replace('.', '') : '');
  let h = '<div class="hd"><h1>Progrès</h1><p>Ta forme, ton volume et tes records.</p></div>';
  if (!S.acts.length) { shell('prog', h + '<div class="empty"><b>Rien à afficher</b>Importe tes sorties pour voir ta progression.</div>'); return; }
  h += formCard(true) + '<a class="card" href="#/plan" style="display:flex;justify-content:space-between;align-items:center;text-decoration:none;color:var(--ink)"><span><b>Mon plan jusqu\'à la course A</b><br><span class="muted" style="font-size:.84rem">Phases, volume et D+ semaine par semaine</span></span><span style="color:var(--muted);font-size:1.3rem">›</span></a><h2 class="sec">Volume</h2>';
  h += '<div class="card"><div class="seg" id="pm" role="tablist"><button class="on" data-k="h" role="tab" aria-selected="true">Heures</button><button data-k="km" role="tab" aria-selected="false">Km</button><button data-k="dp" role="tab" aria-selected="false">D+</button></div><div id="pc" style="margin-top:12px"></div></div>';
  const z28 = [0, 0, 0, 0, 0]; S.acts.filter(a => Date.now() - Date.parse(a.start_at) < 28 * 864e5 && a.zone_s).forEach(a => a.zone_s.forEach((s, i) => z28[i] += s || 0));
  if (hrOK() && z28.some(Boolean)) {
    const tot = z28.reduce((a, b) => a + b, 0), easy = (z28[0] + z28[1]) / tot;
    h += '<h2 class="sec">Intensité · 28 jours</h2><div class="card">' + zoneRows(z28) + '<p class="note">' + Math.round(easy * 100) + ' % du temps en Z1–Z2. En ultra, la base se construit surtout en endurance : autour de 80 % est un repère courant.</p></div>';
  }
  const foot = S.acts.filter(isFoot), rec = (f, k) => foot.slice().sort((a, b) => (b[k] || 0) - (a[k] || 0))[0];
  const lg = rec(0, 'distance_m'), dp = rec(0, 'elev_gain'), lt = rec(0, 'moving_s');
  h += '<h2 class="sec">Records</h2><ul class="list">' + [[lg, 'Plus longue sortie', a => km1(a.distance_m) + ' km'], [dp, 'Plus gros D+', a => fr(a.elev_gain) + ' m'], [lt, 'Plus longue durée', a => hm(a.moving_s)]].filter(x => x[0]).map(([a, t, f]) => '<li><a href="#/seance/' + a.id + '"><div class="li-main"><b>' + t + '</b><small>' + esc(a.name || '') + ' · ' + fmtD(localDay(a.start_at)) + '</small></div><div class="li-side">' + f(a) + '</div></a></li>').join('') + '</ul>';
  shell('prog', h);
  const draw = k => { $('pc').innerHTML = barsSVG(W.map(w => k === 'h' ? w.s / 3600 : k === 'km' ? w.m / 1000 : w.dp), lab, { label: 'Volume par semaine' }); };
  draw('h'); $('pm').onclick = e => { const b = e.target.closest('button'); if (!b) return; $('pm').querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); draw(b.dataset.k); };
}

/* ---------- profil ---------- */
function vMe(sub) {
  const p = S.profile;
  if (sub === 'versions') {
    shell('me', '<a class="back" href="#/profil">‹ Profil</a><div class="hd"><h1>Nouveautés</h1><p>Ce qui a changé, version après version.</p></div><div class="vers">' + CHANGES.map((c, i) => '<section class="ver"><div class="vh"><span class="vn">' + c.v + '</span><div><b>' + esc(c.name) + '</b><small>' + fmtD(c.date) + (i === 0 ? ' · version installée' : '') + '</small></div></div><ul>' + c.items.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul></section>').join('') + '</div>');
    return;
  }
  const z = zones();
  let h = '<div class="hd"><h1>Profil</h1><p>' + esc(S.user.email) + '</p></div><form id="pf" class="card"><label class="f" for="nm" style="margin-top:0">Prénom</label><input class="in-f" id="nm" maxlength="60" value="' + esc(p.display_name) + '">' +
    '<label class="check"><input type="checkbox" id="hc"' + (hrOK() ? ' checked' : '') + '> <span>Enregistrer ma fréquence cardiaque (donnée de santé, visible par moi seul). Décocher efface toutes mes données cardio.</span></label>' +
    '<div class="grid2"><div><label class="f" for="hx">FC max</label><input class="in-f" id="hx" inputmode="numeric" value="' + (p.hr_max || '') + '"></div><div><label class="f" for="hr">FC repos</label><input class="in-f" id="hr" inputmode="numeric" value="' + (p.hr_rest || '') + '"></div></div>' +
    '<p class="err" id="er"></p><div class="btns"><button class="btn">Enregistrer</button></div></form>';
  if (z && hrOK()) h += '<h2 class="sec">Mes zones</h2><div class="card">' + z.map((r, i) => '<div class="zrow" style="grid-template-columns:34px 1fr auto"><span style="color:' + ZC[i] + '">' + ZN[i] + '</span><span>' + ZL[i] + '</span><span>' + (i ? r[0] : '< ' + (r[1] + 1)) + (i ? '–' + r[1] : '') + ' bpm</span></div>').join('') + '<p class="note">Calculées en % de ta FC max (72, 82, 87, 92 %). Si tu as fait un test d\'effort, dis-le-nous : la saisie de zones personnalisées arrive bientôt.</p></div>';
  h += '<h2 class="sec">Appli</h2><ul class="list"><li><a href="#/profil/versions"><div class="li-main"><b>Nouveautés</b><small>Version ' + APPV + '</small></div></a></li><li><a href="#/confidentialite"><div class="li-main"><b>Confidentialité</b><small>Ce qu\'on garde, et pourquoi</small></div></a></li><li><div class="it"><div class="li-main"><b>Strava</b><small>Bientôt : voir tes nouvelles sorties Strava ici</small></div></div></li></ul>';
  h += '<h2 class="sec">Mes données</h2><div class="btns" style="margin-top:0"><button class="btn ghost" id="ex">Exporter toutes mes données</button><button class="btn ghost" id="lo">Me déconnecter</button><button class="btn danger" id="del">Supprimer mon compte</button></div><p class="sig-foot">continuer à rêver, juste assez pour tenir debout</p>';
  shell('me', h);
  $('pf').onsubmit = async ev => {
    ev.preventDefault(); const E = t => $('er').textContent = t || ''; E('');
    const c = $('hc').checked, mx = +$('hx').value || null, rs = +$('hr').value || null;
    if (mx && (mx < 120 || mx > 230)) return E('FC max entre 120 et 230.'); if (rs && (rs < 30 || rs > 100)) return E('FC de repos entre 30 et 100.');
    if (!c && hrOK() && !confirm('Effacer ta FC de toutes tes séances ? C\'est définitif.')) return;
    try {
      await saveProfile({ display_name: $('nm').value.trim().slice(0, 60), health_consent_at: c ? (p.health_consent_at || new Date().toISOString()) : null, hr_max: c ? mx : null, hr_rest: c ? rs : null, zones: c ? zonesFrom(mx, rs) : null });
      if (!c) { const { error } = await sb.from('activities').update({ avg_hr: null, max_hr: null, zone_s: null }).eq('user_id', S.user.id); if (error) throw error; await stripTrackHr(); S.acts.forEach(a => { a.avg_hr = a.max_hr = null; a.zone_s = null; a._track = undefined; }); saveCache(); }
      toast('Profil enregistré'); vMe();
    } catch (e) { E(e.message); }
  };
  $('ex').onclick = exportData;
  $('lo').onclick = async () => { await sb.auth.signOut(); LS.del(cacheKey()); S.user = null; location.hash = '#/'; boot(); };
  $('del').onclick = () => {
    sheet('Supprimer mon compte', 'C\'est définitif', '<p>Toutes tes séances, tes courses, tes fichiers et ton profil seront effacés, et les liens équipe ne marcheront plus. Pense à exporter tes données avant.</p><label class="f" for="cf">Tape SUPPRIMER pour confirmer</label><input class="in-f" id="cf" autocomplete="off" autocapitalize="characters"><p class="err" id="ce"></p><div class="btns"><button class="btn danger" id="cgo">Supprimer définitivement</button></div>');
    $('cgo').onclick = async () => { if ($('cf').value.trim().toUpperCase() !== 'SUPPRIMER') return $('ce').textContent = 'Tape SUPPRIMER.'; const { error } = await sb.rpc('delete_my_account'); if (error) return $('ce').textContent = error.message; LS.del(cacheKey()); await sb.auth.signOut().catch(() => {}); dlg.close(); S.user = null; location.hash = '#/'; boot(); toast('Compte supprimé'); };
  };
}
async function stripTrackHr() {
  const { data } = await sb.from('activities').select('id,track').not('track', 'is', null);
  for (const a of data || []) { if (!a.track.some(p => p[4] != null)) continue; await sb.from('activities').update({ track: a.track.map(p => [p[0], p[1], p[2], p[3], null]) }).eq('id', a.id); }
}
async function exportData() {
  toast('Préparation de l\'export…');
  const [p, r, a] = await Promise.all([sb.from('profiles').select('*').eq('id', S.user.id).single(), sb.from('races').select('*'), sb.from('activities').select('*').order('start_at')]);
  const blob = new Blob([JSON.stringify({ app: 'VIC\'TORY Trail', version: APPV, exported_at: new Date().toISOString(), email: S.user.email, profile: p.data, races: r.data, activities: a.data }, null, 1)], { type: 'application/json' });
  const u = URL.createObjectURL(blob), l = document.createElement('a'); l.href = u; l.download = 'victory-trail-' + today() + '.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
}
function vPrivacy() {
  const h = '<a class="back" href="' + (S.user ? '#/profil' : '#/') + '">‹ Retour</a><div class="hd"><h1>Confidentialité</h1><p>En clair, sans jargon.</p></div><div class="prose">' +
    '<h2>Ce qu\'on enregistre</h2><p>Ton adresse e-mail (pour te connecter), ton prénom, tes courses objectifs et les séances que tu importes ou saisis : date, durée, distance, dénivelé, tracé simplifié, ressenti et notes. Ta fréquence cardiaque seulement si tu l\'acceptes : c\'est une donnée de santé.</p>' +
    '<h2>Qui peut la voir</h2><p>Toi seul. Chaque ligne de la base est liée à ton compte et protégée : un autre utilisateur ne peut pas la lire. Le lien équipe d\'une course montre seulement ton prénom, la course, son profil et les heures prévues, et tu peux le désactiver à tout moment.</p>' +
    '<h2>Où</h2><p>Chez Supabase, hébergement en Union européenne (Paris). Les fichiers de ta montre sont lus dans ton téléphone, puis gardés tels quels dans ton espace pour que tu puisses les récupérer.</p>' +
    '<h2>Ce qu\'on ne fait pas</h2><p>Pas de publicité, pas de revente, pas de pisteur. Aucune donnée n\'est partagée avec un tiers.</p>' +
    '<h2>Tes droits</h2><p>Dans Profil : exporter toutes tes données en un fichier, retirer ton accord pour la fréquence cardiaque (elle est alors effacée), supprimer ton compte et tout ce qu\'il contient.</p></div>';
  if (S.user && S.profile && S.profile.onboarded) shell('me', h); else root.innerHTML = '<main class="wrap fade" style="padding-top:24px">' + h + '</main>';
}

/* ---------- nouveautés et mises à jour ---------- */
function whatsNew() {
  const seen = LS.get('vtr-seen'); LS.set('vtr-seen', APPV);
  if (!seen || vcmp(seen, APPV) >= 0) return;
  const nw = CHANGES.filter(c => vcmp(c.v, seen) > 0).slice(0, 3);
  sheet('Nouveautés · version ' + APPV, nw[0].name, nw.map(c => '<ul class="dots">' + c.items.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>').join('') + '<div class="btns"><button class="btn grad" id="wn">C\'est parti</button></div>');
  $('wn').onclick = () => dlg.close();
}
(function () {
  let last = Date.now();
  async function chk() {
    if (document.hidden || $('upd')) return; last = Date.now();
    try { const r = await fetch('index.html?v=' + Date.now(), { cache: 'no-store' }); const m = r.ok && (await r.text()).match(/name="vt-version" content="([0-9.]+)"/);
      if (m && vcmp(m[1], APPV) > 0) { const b = document.createElement('div'); b.id = 'upd'; b.setAttribute('role', 'status'); b.innerHTML = '<span><b>Version ' + esc(m[1]) + ' disponible</b><small>Recharge pour l\'installer</small></span><button type="button">Mettre à jour</button>'; b.querySelector('button').onclick = () => location.reload(); document.body.appendChild(b); } } catch (e) {}
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - last > 5 * 60e3) chk(); });
  setInterval(chk, 30 * 60e3);
})();

/* ---------- routeur ---------- */
let liveTimer = null;
function route() {
  const h = location.hash.replace(/^#\/?/, ''), parts = h.split('/');
  clearInterval(liveTimer);
  if (parts[0] === 'equipe' && parts[1]) return vCrew(decodeURIComponent(parts[1]));
  if (parts[0] === 'confidentialite') return vPrivacy();
  if (!S.user) return vLogin();
  if (!S.profile || !S.profile.onboarded) return vOnboard(1);
  window.scrollTo(0, 0); if (dlg.open) dlg.close(); clearInterval(liveTimer);
  switch (parts[0]) {
    case 'seances': return vActs();
    case 'seance': return vAct(parts[1]);
    case 'courses': return vRaces();
    case 'course': return parts[1] === 'nouvelle' ? vRaceForm(null) : parts[2] === 'modifier' ? vRaceForm(parts[1]) : parts[2] === 'jumeau' ? vTwin(parts[1]) : vRace(parts[1]);
    case 'plan': return vPlan();
    case 'progres': return vProg();
    case 'profil': return vMe(parts[1]);
    default: return vToday();
  }
}
window.addEventListener('hashchange', route);
async function boot() {
  const h = location.hash;
  if (/^#\/(equipe|confidentialite)/.test(h)) return route();
  const { data } = await sb.auth.getSession();
  S.user = data.session ? data.session.user : null;
  if (!S.user) return vLogin();
  const cached = loadCache(); if (cached && S.profile && S.profile.onboarded) route();
  try { await loadAll(); }
  catch (e) { if (!cached) { root.innerHTML = '<div class="auth"><div class="box"><h1 style="font-size:1.8rem">Hors ligne</h1><p class="muted" style="text-align:center">Impossible de charger ton carnet. Vérifie ta connexion.</p><div class="btns"><button class="btn" id="rl">Réessayer</button></div></div></div>'; $('rl').onclick = () => location.reload(); return; } toast('Hors ligne : dernières données connues'); }
  route(); whatsNew();
}
sb.auth.onAuthStateChange((ev, session) => { if (ev === 'SIGNED_OUT') { S.user = null; } else if (session) S.user = session.user; });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
boot();
})();
