/* ============================================================
   CHAMP WORDS — static Bootstrap site (no WordPress)
   Live data: direct same-origin fetch to the game server API
   (Render deployment — the site is served at the root by Express).
   Graceful fallbacks when the game server is offline.
   ============================================================ */
(function () {
  'use strict';

  var API_BASE = '/api/';                      // same-origin game API
  var GAME_URL = '/';                          // game client at the root (same origin)
  var FALLBACK_WORDS = '7,296';                // original hardcoded fallback
  var FALLBACK_CATS = '13+';                   // original hardcoded fallback
  var FALLBACK_CAT_COUNT = 13;

  /* ---------- small utils ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function fmt(n) {
    var v = parseInt(n, 10);
    return isNaN(v) ? '0' : v.toLocaleString('en-US');
  }
  function medal(i) {
    if (i === 1) return '&#129351;'; // 🥇
    if (i === 2) return '&#129352;'; // 🥈
    if (i === 3) return '&#129353;'; // 🥉
    return '';
  }
  function hhmm() {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  /* ---------- fetch with timeout ---------- */
  function fetchJSON(endpoint, ms) {
    ms = ms || 15000;
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms);
    return fetch(API_BASE + encodeURIComponent(endpoint), {
      signal: ctrl.signal,
      cache: 'no-store'
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (data) {
      clearTimeout(timer);
      return data;
    }).catch(function (e) {
      clearTimeout(timer);
      return null;
    });
  }

  /* ---------- server status dots ---------- */
  function setServerState(ok, label) {
    var dots = document.querySelectorAll('[data-srv-dot]');
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('srv-off', !ok);
    }
    var labels = document.querySelectorAll('[data-srv-label]');
    for (var j = 0; j < labels.length; j++) {
      labels[j].textContent = label || (ok ? 'Arena online — jump in now' : 'Arena offline');
    }
    var warns = document.querySelectorAll('[data-srv-warn]');
    for (var k = 0; k < warns.length; k++) {
      warns[k].textContent = ok ? '' : '(server offline — refresh in a moment)';
    }
  }

  /* ---------- homepage hero stats ---------- */
  function renderStats(stats, wotd, cats) {
    var wordsEl = document.querySelector('[data-stat="words"]');
    if (wordsEl) {
      var n = stats && stats.words ? fmt(stats.words) : FALLBACK_WORDS;
      wordsEl.textContent = n + '+';
    }
    var wotdEl = document.querySelector('[data-stat="wotd"]');
    if (wotdEl) {
      wotdEl.textContent = (wotd && wotd.word) ? (wotd.art ? wotd.art + ' ' + wotd.word : wotd.word) : '\u2014';
    }
    var catsEl = document.querySelector('[data-stat="cats"]');
    if (catsEl) {
      var c = cats && cats.length ? cats.length : FALLBACK_CAT_COUNT;
      catsEl.textContent = c + '+';
    }
  }

  /* ---------- leaderboards ---------- */
  function renderAlltime(rows, limit) {
    var wrap = document.querySelector('[data-board="alltime"]');
    if (!wrap) return;
    if (!rows || !rows.length) {
      wrap.innerHTML = '<div class="cw-empty">No scores yet — be the first on the board!</div>';
      return;
    }
    var list = rows.slice(0, limit || 20);
    var html = '<div class="cw-tbl-wrap"><table class="cw-tbl"><thead><tr>' +
      '<th></th><th>Player</th><th>Found</th><th>Streak</th><th>Score</th>' +
      '</tr></thead><tbody>';
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var name = esc(p.name || p.key || 'Player');
      var score = fmt(p.score);
      var found = p.found != null ? parseInt(p.found, 10) : '\u2014';
      var streak = p.bestStreak != null ? parseInt(p.bestStreak, 10) : '\u2014';
      var m = medal(i + 1);
      html += '<tr>' +
        '<td class="rank">' + (m ? '<span class="medal">' + m + '</span>' : (i + 1)) + '</td>' +
        '<td>' + name + '</td>' +
        '<td class="stat">' + found + '</td>' +
        '<td class="stat">' + streak + '</td>' +
        '<td class="score">' + score + '</td>' +
        '</tr>';
    }
    html += '</tbody></table></div>';
    wrap.innerHTML = html;
  }

  function renderToday(rows, limit) {
    var wrap = document.querySelector('[data-board="today"]');
    if (!wrap) return;
    if (!rows || !rows.length) {
      wrap.innerHTML = '<div class="cw-empty">No scores today yet — jump in and grab the crown!</div>';
      return;
    }
    var list = rows.slice(0, limit || 10);
    var html = '<div class="cw-tbl-wrap"><table class="cw-tbl"><thead><tr>' +
      '<th></th><th>Player</th><th>Today</th>' +
      '</tr></thead><tbody>';
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var name = esc(p.name || p.key || 'Player');
      var score = fmt(p.score);
      var m = medal(i + 1);
      html += '<tr>' +
        '<td class="rank">' + (m ? '<span class="medal">' + m + '</span>' : (i + 1)) + '</td>' +
        '<td>' + name + '</td>' +
        '<td class="score">' + score + '</td>' +
        '</tr>';
    }
    html += '</tbody></table></div>';
    wrap.innerHTML = html;
  }

  /* ---------- leaderboard page: updated time ---------- */
  function setUpdated(ok) {
    var el = document.querySelector('[data-updated]');
    if (el && ok) el.textContent = 'Live \u00b7 updated ' + hhmm();
  }

  /* ---------- play page ---------- */
  // Cold-start friendly: probe the API with retries (Render free tier sleeps
  // when idle and can take ~30-60s to wake) before showing the offline state.
  function probeServer(attempt) {
    attempt = attempt || 0;
    return fetchJSON('stats', 15000).then(function (stats) {
      var ok = stats !== null;
      if (!ok && attempt < 4) {
        return new Promise(function (resolve) {
          setTimeout(function () { resolve(probeServer(attempt + 1)); }, 5000);
        });
      }
      return ok;
    });
  }

  function setupPlayPage() {
    var frame = document.querySelector('[data-game-frame]');
    var offline = document.querySelector('[data-game-offline]');
    if (!frame) return;
    var host = /[?&]host=1/.test(window.location.search) ? '?host=1' : '';
    var full = document.querySelector('[data-game-full]');
    if (full) full.href = GAME_URL + host;
    probeServer().then(function (ok) {
      setServerState(ok, ok ? 'Game server online' : 'Game server offline');
      if (ok) {
        frame.src = GAME_URL + host;
        frame.style.display = 'block';
        if (offline) offline.style.display = 'none';
      } else {
        frame.style.display = 'none';
        if (offline) offline.style.display = 'flex';
      }
    });
  }

  /* ---------- main ---------- */
  function init() {
    // Footer year
    var yEl = document.querySelector('[data-year]');
    if (yEl) yEl.textContent = new Date().getFullYear();

    // Back-to-top button
    var topBtn = document.querySelector('[data-top]');
    if (topBtn) {
      var onScroll = function () {
        topBtn.classList.toggle('show', (window.scrollY || document.documentElement.scrollTop) > 480);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      topBtn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Probe server once
    var p = fetchJSON('stats');

    if (document.querySelector('[data-game-frame]')) {
      setupPlayPage();
      return;
    }

    p.then(function (stats) {
      var ok = stats !== null;
      setServerState(ok);
      setUpdated(ok);

      var jobs = [];
      if (document.querySelector('[data-stat]')) {
        jobs.push(fetchJSON('wotd'));
        jobs.push(fetchJSON('categories'));
      }
      if (document.querySelector('[data-board="alltime"]')) {
        jobs.push(fetchJSON('alltime'));
      }
      if (document.querySelector('[data-board="today"]')) {
        jobs.push(fetchJSON('today'));
      }
      return Promise.all(jobs).then(function (res) {
        renderStats(stats, res[0], res[1]);
        var idx = 0;
        if (document.querySelector('[data-stat]')) idx = 2;
        if (document.querySelector('[data-board="alltime"]')) {
          var a = res[idx++];
          var lim = parseInt(document.querySelector('[data-board="alltime"]').getAttribute('data-limit') || '20', 10);
          renderAlltime(a && a.top, lim);
        }
        if (document.querySelector('[data-board="today"]')) {
          var t = res[idx++];
          var limT = parseInt(document.querySelector('[data-board="today"]').getAttribute('data-limit') || '10', 10);
          renderToday(t && t.top, limT);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
