<?php
/**
 * Champ Words — static site API bridge.
 *
 * Same-origin proxy to the Champ Words game server (localhost:3000).
 * Replaces the old WordPress champ-helpers.php: the browser calls this
 * script (same origin, no CORS issues) and it forwards to the game
 * server's REST API. Falls back gracefully when the server is offline.
 *
 * Usage:  api-proxy.php?endpoint=stats
 *         api-proxy.php?endpoint=alltime
 *         api-proxy.php?endpoint=today
 *         api-proxy.php?endpoint=wotd
 *         api-proxy.php?endpoint=categories
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');

$base = 'http://localhost:3000';

$allowed = array(
    'stats', 'alltime', 'today', 'wotd', 'categories',
    'active-room', 'topgifters', 'achievements',
);

$endpoint = isset($_GET['endpoint']) ? preg_replace('/[^a-z0-9\-_]/i', '', $_GET['endpoint']) : '';

if ($endpoint === '' || !in_array($endpoint, $allowed, true)) {
    http_response_code(400);
    exit('{"error":"bad endpoint"}');
}

$url = $base . '/api/' . $endpoint;

$body = false;
if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 4,
        CURLOPT_CONNECTTIMEOUT => 2,
        CURLOPT_FOLLOWLOCATION => false,
    ));
    $body = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
}

if ($body === false && ini_get('allow_url_fopen')) {
    $ctx = stream_context_create(array('http' => array('timeout' => 4)));
    $body = @file_get_contents($url, false, $ctx);
    $code = 200;
}

if ($body === false) {
    http_response_code(502);
    exit('{"error":"game server offline"}');
}

if (isset($code) && $code >= 400) {
    http_response_code($code);
}
echo $body;
