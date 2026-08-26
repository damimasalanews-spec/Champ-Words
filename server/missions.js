/**
 * Champ Words — Daily Missions
 * Per-player daily progress (solved words, rounds played, duels won, score),
 * reset at midnight. Points are awarded on claim.
 *
 * Keyed by player name (lowercased) so guests keep progress across sessions.
 */
const daily = new Map(); // key -> { date, name, solved, rounds, duels, score, claimed: Set }

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function entry(key, name) {
  const t = todayKey();
  let e = daily.get(key);
  if (!e || e.date !== t) {
    e = { date: t, name: name || '', solved: 0, rounds: 0, duels: 0, score: 0, claimed: new Set() };
    daily.set(key, e);
  }
  if (name && !e.name) e.name = name;
  return e;
}

function norm(key) {
  return String(key || 'guest').trim().toLowerCase().slice(0, 40) || 'guest';
}

const MISSIONS = [
  { id: 'solve_3', icon: '🎯', title: 'Solve 3 words', target: 3, reward: 150 },
  { id: 'rounds_5', icon: '🔁', title: 'Play 5 rounds', target: 5, reward: 100 },
  { id: 'duel_1', icon: '⚔️', title: 'Win a duel', target: 1, reward: 200 },
  { id: 'score_500', icon: '💎', title: 'Earn 500 points', target: 500, reward: 250 },
];

function trackSolved(key, name) {
  entry(norm(key), name).solved += 1;
}
function trackRounds(key, name) {
  entry(norm(key), name).rounds += 1;
}
function trackDuelWin(key, name) {
  entry(norm(key), name).duels += 1;
}
function trackScore(key, name, pts) {
  entry(norm(key), name).score += Number(pts) || 0;
}

function getMissions(key) {
  const k = norm(key);
  const e = entry(k);
  return MISSIONS.map(m => {
    let progress = 0;
    if (m.id === 'solve_3') progress = e.solved;
    else if (m.id === 'rounds_5') progress = e.rounds;
    else if (m.id === 'duel_1') progress = e.duels;
    else if (m.id === 'score_500') progress = e.score;
    return {
      id: m.id,
      icon: m.icon,
      title: m.title,
      target: m.target,
      reward: m.reward,
      progress: Math.min(progress, m.target),
      claimed: e.claimed.has(m.id),
    };
  });
}

/**
 * Claim a mission reward. addAllTime is injected to award points.
 * Returns { ok, awarded, missions } or { ok:false, error }.
 */
function claimMission(key, id, addAllTime) {
  const k = norm(key);
  const e = entry(k);
  const m = MISSIONS.find(x => x.id === id);
  if (!m) return { ok: false, error: 'unknown mission' };
  if (e.claimed.has(m.id)) return { ok: false, error: 'already claimed' };
  let progress = 0;
  if (m.id === 'solve_3') progress = e.solved;
  else if (m.id === 'rounds_5') progress = e.rounds;
  else if (m.id === 'duel_1') progress = e.duels;
  else if (m.id === 'score_500') progress = e.score;
  if (progress < m.target) return { ok: false, error: 'not completed' };
  e.claimed.add(m.id);
  if (typeof addAllTime === 'function') {
    addAllTime(k, e.name || 'Player', '', m.reward);
  }
  return { ok: true, awarded: m.reward, missions: getMissions(k) };
}

module.exports = {
  trackSolved,
  trackRounds,
  trackDuelWin,
  trackScore,
  getMissions,
  claimMission,
};
