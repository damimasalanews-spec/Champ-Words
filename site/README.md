# Champ Words — Static Bootstrap Website

A fresh, WordPress-free rebuild of the Champ Words game website. Same pages, same
dark arcade design, same live leaderboards — built with **Bootstrap 5** + plain
HTML/CSS/JS. No WordPress, no database.

## Pages

| File | What it is |
|------|------------|
| `index.html` | Home — hero, arena banner, features, daily missions, how-to, top players |
| `play.html` | Full-screen game page (embeds the arena). `play.html?host=1` opens host mode |
| `leaderboard.html` | All-Time Legends (Top 20) + Today's Race (Top 10) |
| `how-to-play.html` | Rules, scoring, power-ups & commands, pro tips |
| `about.html` | About the game |

## How to run

1. Copy this `champwords-site` folder into XAMPP's web root, e.g. `C:\xampp\htdocs\champwords` (or just run the folder anywhere PHP is available — Apache + PHP from XAMPP is all you need).
2. Start the Champ Words game server: run `start-champ.bat` from `C:\xampp\htdocs\wordpress\game` (it serves on `http://localhost:3000`).
3. Open **http://localhost/champwords/** in your browser.

## How the live data works

- `js/main.js` requests data through `api-proxy.php?endpoint=...` — a tiny
  same-origin PHP bridge that forwards to the game server's REST API
  (`/api/stats`, `/api/alltime`, `/api/today`, `/api/wotd`, `/api/categories`),
  exactly like the old WordPress `champ-helpers.php` did.
- Game server **online** → hero stats, word of the day and both leaderboards
  show live data; status dots glow green.
- Game server **offline** → the site still works: stats fall back to the
  defaults (7,296+ words, 13+ categories), boards show a friendly empty state,
  and the status dots turn red.

## Customization

- Colors / fonts / layout: edit `css/game-site.css` (design tokens live in the
  `:root` block at the top).
- Game server address: change `GAME_URL` in `js/main.js` and `$base` in
  `api-proxy.php` (e.g. when deploying to a remote server).

## Original vs this build

The original site lived inside a WordPress install (`wordpress/wp-content/themes/gem_tf`).
This build keeps 100% of the look and content but removes every WordPress
dependency: the templates are plain HTML, the theme hooks are gone, and the
game itself still runs from its own Node.js server and is embedded on
`play.html`.
