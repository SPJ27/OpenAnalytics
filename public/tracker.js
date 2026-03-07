/*!
 * tracker.js v3.0
 *
 * ── SETUP ───────────────────────────────────────────────────────────────────
 *
 * Plain HTML — paste before </body>:
 *   <script src="/tracker.js" data-tracker-id="UUID" data-domain="yoursite.com"></script>
 *
 * Next.js layout.js:
 *   import Script from "next/script"
 *   <Script src="/tracker.js" data-tracker-id="UUID" data-domain="yoursite.com" strategy="afterInteractive" />
 *
 * ── OPTIONAL ATTRIBUTES ─────────────────────────────────────────────────────
 *   data-api-url="https://..."      Override API endpoint (default: /api/track)
 *   data-allow-localhost="true"     Enable on localhost
 *   data-debug="true"               Log everything to console
 *
 * ── IDENTIFY (call after login) ─────────────────────────────────────────────
 *   window.tracker.identify({ name: "Jane", email: "jane@example.com" })
 *
 * ── OPT OUT ─────────────────────────────────────────────────────────────────
 *   localStorage.setItem("tracker_ignore", "true")
 */

// ============================================================================
// currentScript MUST be captured here — at the very top, before the IIFE.
// The browser nullifies it once the script finishes parsing.
// Passing it as an argument is the only reliable pattern.
// ============================================================================
!function (t) {
  "use strict";

  // ── 1. Read all config from script tag immediately ─────────────────────────
  if (!t) {
    console.warn("[tracker] document.currentScript is null. Tracking stopped.");
    return;
  }

  var TRACKER_ID  = t.getAttribute("data-tracker-id")         || "";
  var DOMAIN      = t.getAttribute("data-domain")              || "";
  var ALLOW_LOCAL = t.getAttribute("data-allow-localhost")     === "true";
  var DEBUG       = t.getAttribute("data-debug")               === "true";
  var CUSTOM_API  = t.getAttribute("data-api-url")             || "";

  t = null; // drop DOM reference — never touch it again

  // ── 2. Logging ────────────────────────────────────────────────────────────
  function log()  { if (DEBUG) console.log.apply(console,  ["[tracker]"].concat([].slice.call(arguments))); }
  function warn() { if (DEBUG) console.warn.apply(console, ["[tracker]"].concat([].slice.call(arguments))); }

  // ── 3. Resolve API URL ────────────────────────────────────────────────────
  var API_URL;
  if (CUSTOM_API) {
    try       { API_URL = new URL(CUSTOM_API).href; }
    catch (e) { API_URL = new URL(CUSTOM_API, window.location.origin).href; }
  } else {
    API_URL = new URL("/api/track", window.location.origin).href;
  }

  // ── 4. Enabled flag — one boolean controls everything ─────────────────────
  var enabled = true;
  var disabledReason = "";

  function disable(reason) {
    enabled = false;
    disabledReason = reason;
    warn("Tracking disabled —", reason);
  }

  // ── 5. Localhost check ────────────────────────────────────────────────────
  function isLocalhost(h) {
    if (!h) return false;
    var host = h.toLowerCase();
    return host === "localhost" ||
           host === "127.0.0.1" ||
           host === "::1"       ||
           host.slice(-6)  === ".local" ||
           host.slice(-10) === ".localhost";
  }

  if (!TRACKER_ID || !DOMAIN)                                  disable("Missing data-tracker-id or data-domain.");
  if (!ALLOW_LOCAL && isLocalhost(window.location.hostname))   disable("Running on localhost. Add data-allow-localhost='true' to enable.");
  if (window !== window.parent)                                 disable("Running inside an iframe.");

  // ── 6. Bot detection ──────────────────────────────────────────────────────
  function isBot() {
    try {
      if (window.navigator.webdriver || window.callPhantom || window._phantom || window.__nightmare) return true;
      if (!window.navigator || !window.location || !window.document) return true;
      var ua = (window.navigator.userAgent || "").toLowerCase();
      if (!ua || ua.length < 5 || ua === "undefined") return true;
      var botUA = ["headlesschrome","phantomjs","selenium","webdriver","puppeteer",
                   "playwright","python","curl","wget","java/","go-http","node.js","axios","postman"];
      for (var i = 0; i < botUA.length; i++) {
        if (ua.indexOf(botUA[i]) !== -1) return true;
      }
      var botProps = ["__webdriver_evaluate","__selenium_evaluate","__webdriver_script_function",
                      "__webdriver_unwrapped","__fxdriver_evaluate","__driver_evaluate",
                      "_Selenium_IDE_Recorder","_selenium","calledSelenium","$cdc_asdjflasutopfhvcZLmcfl_"];
      for (var j = 0; j < botProps.length; j++) {
        if (typeof window[botProps[j]] !== "undefined") return true;
      }
      var docEl = document.documentElement;
      if (docEl && (docEl.getAttribute("webdriver") || docEl.getAttribute("selenium") || docEl.getAttribute("driver"))) return true;
    } catch (e) { return false; }
    return false;
  }

  if (isBot()) disable("Bot detected.");

  // ── 7. Cookie helpers ─────────────────────────────────────────────────────
  function setCookie(name, value, days) {
    var expires = "";
    if (days) {
      var d = new Date();
      d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + d.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
  }

  function getCookie(name) {
    var parts = document.cookie.split(";");
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      while (part.charAt(0) === " ") part = part.substring(1);
      if (part.indexOf(name + "=") === 0) {
        return part.substring(name.length + 1);
      }
    }
    return null;
  }

  // ── 8. UUID ───────────────────────────────────────────────────────────────
  function uuid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ── 9. IDs via cookies ────────────────────────────────────────────────────
  // user_id    → 365 day cookie  (persists across sessions like a returning visitor)
  // session_id → 30 min cookie   (refreshed on every ping, expires when idle)
  function getUserId() {
    var id = getCookie("_tracker_uid");
    if (!id) { id = uuid(); setCookie("_tracker_uid", id, 365); }
    return id;
  }

  function getSessionId() {
    var id = getCookie("_tracker_sid");
    if (!id) { id = uuid(); setCookie("_tracker_sid", id, 1 / 48); }
    return id;
  }

  var USER_ID    = getUserId();
  var SESSION_ID = getSessionId();
  var START_TIME = new Date().toISOString();
  var totalPinged = 0;

  log("user_id:", USER_ID);
  log("session_id:", SESSION_ID);

  // ── 10. Opt-out check ─────────────────────────────────────────────────────
  try {
    if (localStorage.getItem("tracker_ignore") === "true") disable("Opt-out flag set in localStorage.");
  } catch (e) { /* private mode — continue */ }

  // ── 11. Payload builder ───────────────────────────────────────────────────
  function buildPayload(time_spent, extras) {
    var base = {
      id:         TRACKER_ID,
      domain:     DOMAIN,
      session_id: SESSION_ID,
      user_id:    USER_ID,
      time_spent: time_spent,
      location:   window.location.pathname,
      start_time: START_TIME,
    };
    if (extras) {
      for (var k in extras) {
        if (Object.prototype.hasOwnProperty.call(extras, k)) base[k] = extras[k];
      }
    }
    return JSON.stringify(base);
  }

  // ── 12. XHR send ─────────────────────────────────────────────────────────
  // Uses XHR not fetch — more reliable across loading strategies and browsers
  function send(time_spent, extras) {
    if (!enabled) { log("Send blocked —", disabledReason); return; }
    if (isBot())  { log("Send blocked — bot detected."); return; }

    totalPinged += time_spent;

    var xhr = new XMLHttpRequest();
    xhr.open("POST", API_URL, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          // Refresh session cookie expiry on every successful ping
          // This means the 30min session only expires after 30min of INACTIVITY
          setCookie("_tracker_sid", SESSION_ID, 1 / 48);
          log("OK — time_spent:", time_spent);
        } else {
          warn("HTTP error:", xhr.status);
        }
      }
    };
    xhr.send(buildPayload(time_spent, extras));
  }

  // ── 13. Beacon (used on tab close — browser won't cancel it) ──────────────
  function beacon(time_spent) {
    if (!enabled) return;
    if (time_spent <= 0) return;
    var payload = buildPayload(time_spent);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(API_URL, new Blob([payload], { type: "application/json" }));
      log("Beacon fired — time_spent:", time_spent);
    } else {
      send(time_spent); // fallback for browsers without sendBeacon
    }
  }

  // ── 14. Interval ping every 30s ───────────────────────────────────────────
  setInterval(function () { send(30); }, 30000);

  // ── 15. Visibility change — beacon only the uncounted remainder ───────────
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      var totalSecs = Math.floor((Date.now() - new Date(START_TIME).getTime()) / 1000);
      var remainder = totalSecs - totalPinged;
      beacon(remainder);
    }
  });

  // ── 16. SPA route change detection ───────────────────────────────────────
  // Throttle — same URL within 60s won't fire twice (mirrors reference approach)
  var lastPath      = window.location.pathname;
  var lastPingTime  = 0;
  var debounceTimer = null;

  function onRouteChange() {
    var current = window.location.pathname;
    var now     = Date.now();
    if (current === lastPath && now - lastPingTime < 60000) return;
    lastPath     = current;
    lastPingTime = now;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      send(0);
      log("Route →", current);
    }, 100); // 100ms debounce prevents double-fires from frameworks
  }

  var _pushState = window.history.pushState;
  window.history.pushState = function () {
    _pushState.apply(this, arguments);
    onRouteChange();
  };
  window.addEventListener("popstate", onRouteChange);

  // ── 17. Public API ────────────────────────────────────────────────────────
  window.tracker = {
    /**
     * Attach name/email to the current user. Call after login.
     * window.tracker.identify({ name: "Jane", email: "jane@example.com" })
     */
    identify: function (opts) {
      opts = opts || {};
      if (!opts.name && !opts.email) {
        warn("identify() needs at least a name or email.");
        return;
      }
      send(0, { name: opts.name || null, email: opts.email || null });
      log("Identify —", opts);
    },
    sessionId: SESSION_ID,
    userId:    USER_ID,
  };

  // ── 18. Initial ping ──────────────────────────────────────────────────────
  send(0);
  log("Initialised | tracker:", TRACKER_ID, "| domain:", DOMAIN);

}(document.currentScript); // currentScript passed in before IIFE executes