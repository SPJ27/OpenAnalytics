/*!
 * tracker.js v5.3
 *
 * ── SETUP ───────────────────────────────────────────────────────────────────
 *
 * Plain HTML:
 *   <script src="/tracker.js" data-tracker-id="UUID" data-domain="yoursite.com"></script>
 *
 * Next.js layout.js:
 *   <Script src="/tracker.js" data-tracker-id="UUID" data-domain="yoursite.com" strategy="afterInteractive" />
 *
 * ── OPTIONAL ATTRIBUTES ─────────────────────────────────────────────────────
 *   data-api-url="https://..."      Override API endpoint (default: /api/track)
 *   data-allow-localhost="true"     Enable on localhost
 *   data-debug="true"               Log everything to console
 *
 * ── AFTER LOGIN ─────────────────────────────────────────────────────────────
 *   window.tracker.identify({ name: "Jane", email: "jane@example.com" })
 *
 * ── OPT OUT ──────────────────────────────────────────────────────────────────
 *   localStorage.setItem("tracker_ignore", "true")
 */

!function (t) {
  "use strict";

  // ── 1. Read config from script tag ────────────────────────────────────────
  if (!t) {
    console.warn("[tracker] document.currentScript is null. Tracking stopped.");
    return;
  }

  var TRACKER_ID  = t.getAttribute("data-tracker-id")     || "";
  var DOMAIN      = t.getAttribute("data-domain")          || "";
  var ALLOW_LOCAL = t.getAttribute("data-allow-localhost") === "true";
  var DEBUG       = t.getAttribute("data-debug")           === "true";
  var CUSTOM_API  = t.getAttribute("data-api-url")         || "";
  t = null;

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

  // ── 4. Enabled flag ───────────────────────────────────────────────────────
  var enabled = true;
  var disabledReason = "";

  function disable(reason) {
    enabled = false;
    disabledReason = reason;
    warn("Disabled —", reason);
  }

  // ── 5. Guards ─────────────────────────────────────────────────────────────
  function isLocalhost(h) {
    if (!h) return false;
    var host = h.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" ||
           host.slice(-6) === ".local" || host.slice(-10) === ".localhost";
  }

  if (!TRACKER_ID || !DOMAIN)                                disable("Missing data-tracker-id or data-domain.");
  if (!ALLOW_LOCAL && isLocalhost(window.location.hostname)) disable("On localhost. Add data-allow-localhost='true' to enable.");
  if (window !== window.parent)                              disable("Inside iframe.");

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

  // ── 7. Opt-out ────────────────────────────────────────────────────────────
  try {
    if (localStorage.getItem("tracker_ignore") === "true") disable("Opt-out flag in localStorage.");
  } catch (e) {}

  // ── 8. Cookies ────────────────────────────────────────────────────────────
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
      if (part.indexOf(name + "=") === 0) return part.substring(name.length + 1);
    }
    return null;
  }

  function deleteCookie(name) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  }

  // ── 9. UUID ───────────────────────────────────────────────────────────────
  function uuid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ── 10. User ID ───────────────────────────────────────────────────────────
  function getUserId() {
    var id = getCookie("_tracker_uid");
    if (!id) { id = uuid(); setCookie("_tracker_uid", id, 365); }
    return id;
  }

  // ── 11. Session ID ────────────────────────────────────────────────────────
  function getSessionId() {
    var cookieId  = getCookie("_tracker_sid");
    var storageId = null;
    try { storageId = sessionStorage.getItem("_tracker_sid"); } catch (e) {}

    if (cookieId && storageId && cookieId === storageId) {
      log("Session resumed:", cookieId);
      return cookieId;
    }

    deleteCookie("_tracker_sid");
    try { sessionStorage.removeItem("_tracker_sid"); } catch (e) {}

    var newId = uuid();
    setCookie("_tracker_sid", newId, 1 / 48);
    try { sessionStorage.setItem("_tracker_sid", newId); } catch (e) {}

    log("New session:", newId);
    return newId;
  }

  var USER_ID    = getUserId();
  var SESSION_ID = getSessionId();
  var START_TIME  = new Date().toISOString();
  var totalPinged = 0;

  // ── 12. Device / Browser / OS detection ───────────────────────────────────
  // Parsed once at startup from navigator.userAgent.
  // Sent with every ping — stored only on the first INSERT (not overwritten).
  function parseUserAgent() {
    var ua = navigator.userAgent || "";

    // ── Device type ──────────────────────────────────────────────────────────
    var device = "Desktop";
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      device = "Tablet";
    } else if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry|bb\d+|meego|palm|symbian|opera mini|iemobile|wpdesktop/i.test(ua)) {
      device = "Mobile";
    }

    // ── Browser ───────────────────────────────────────────────────────────────
    var browser = "Unknown";
    if (/edg\//i.test(ua))                          browser = "Edge";
    else if (/opr\//i.test(ua))                     browser = "Opera";
    else if (/chrome|crios/i.test(ua))              browser = "Chrome";
    else if (/firefox|fxios/i.test(ua))             browser = "Firefox";
    else if (/safari/i.test(ua))                    browser = "Safari";
    else if (/trident|msie/i.test(ua))              browser = "IE";
    else if (/samsung/i.test(ua))                   browser = "Samsung Browser";

    // ── OS ────────────────────────────────────────────────────────────────────
    var os = "Unknown";
    if (/windows nt/i.test(ua))                     os = "Windows";
    else if (/iphone os|ipad os/i.test(ua))         os = "iOS";
    else if (/mac os x|macintosh/i.test(ua))        os = "macOS";
    else if (/android/i.test(ua))                   os = "Android";
    else if (/linux/i.test(ua))                     os = "Linux";
    else if (/cros/i.test(ua))                      os = "ChromeOS";

    return { device: device, browser: browser, os: os };
  }

  var deviceInfo = parseUserAgent();
  log("Device info:", deviceInfo);

  // ── 13. Referrer ──────────────────────────────────────────────────────────
  // document.referrer is the URL the user came from.
  // We extract just the hostname (e.g. "google.com") to keep it clean.
  // Empty string means direct traffic (typed URL, bookmark, or no referrer header).
  // Only captured once at session start — SPA navigations don't change the referrer.
  function parseReferrer() {
    var ref = document.referrer;
    if (!ref) return null;
    try {
      var url = new URL(ref);
      // Ignore self-referrals (navigating within the same site)
      if (url.hostname === window.location.hostname) return null;
      return url.hostname; // e.g. "google.com", "twitter.com"
    } catch (e) {
      return null;
    }
  }

  var REFERRER = parseReferrer();
  log("Referrer:", REFERRER || "(direct)");

  // ── 14. IP Geolocation ────────────────────────────────────────────────────
  var geoData = null;

  function fetchGeo(callback) {
    var cached = getCookie("_tracker_geo");
    if (cached) {
      try {
        geoData = JSON.parse(decodeURIComponent(cached));
        log("Geo from cache:", geoData);
        callback();
        return;
      } catch (e) {}
    }

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://ipapi.co/json/", true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            geoData = {
              city:         data.city          || null,
              region:       data.region        || null,
              country:      data.country_name  || null,
              country_code: data.country_code  || null,
              latitude:     data.latitude      || null,
              longitude:    data.longitude     || null,
              timezone:     data.timezone      || null,
              ip:           data.ip            || null,
            };
            setCookie("_tracker_geo", encodeURIComponent(JSON.stringify(geoData)), 1 / 48);
            log("Geo fetched:", geoData);
          } catch (e) { warn("Geo parse error:", e); }
        } else {
          warn("Geo fetch failed — HTTP", xhr.status);
        }
        callback();
      }
    };
    xhr.send();
  }

  // ── 15. Payload builder ───────────────────────────────────────────────────
  function buildPayload(time_spent, extras) {
    var base = {
      id:           TRACKER_ID,
      domain:       DOMAIN,
      session_id:   SESSION_ID,
      user_id:      USER_ID,
      time_spent:   time_spent,
      location:     window.location.pathname,
      start_time:   START_TIME,
      // geo
      city:         geoData ? geoData.city         : null,
      region:       geoData ? geoData.region       : null,
      country:      geoData ? geoData.country      : null,
      country_code: geoData ? geoData.country_code : null,
      latitude:     geoData ? geoData.latitude     : null,
      longitude:    geoData ? geoData.longitude    : null,
      timezone:     geoData ? geoData.timezone     : null,
      ip:           geoData ? geoData.ip           : null,
      // device
      device:       deviceInfo.device,
      browser:      deviceInfo.browser,
      os:           deviceInfo.os,
      // referrer
      referrer:     REFERRER,
    };
    if (extras) {
      for (var k in extras) {
        if (Object.prototype.hasOwnProperty.call(extras, k)) base[k] = extras[k];
      }
    }
    return JSON.stringify(base);
  }

  // ── 16. XHR send ──────────────────────────────────────────────────────────
  function send(time_spent, extras) {
    if (!enabled) { log("Blocked —", disabledReason); return; }
    if (isBot())  { log("Blocked — bot."); return; }

    totalPinged += time_spent;

    var xhr = new XMLHttpRequest();
    xhr.open("POST", API_URL, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          setCookie("_tracker_sid", SESSION_ID, 1 / 48);
          try { sessionStorage.setItem("_tracker_sid", SESSION_ID); } catch (e) {}
          log("OK — time_spent:", time_spent);
        } else {
          warn("Failed — HTTP", xhr.status);
        }
      }
    };
    xhr.send(buildPayload(time_spent, extras));
  }

  // ── 17. Beacon ────────────────────────────────────────────────────────────
  function beacon(time_spent) {
    if (!enabled || time_spent <= 0) return;
    var payload = buildPayload(time_spent);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(API_URL, new Blob([payload], { type: "application/json" }));
      log("Beacon — time_spent:", time_spent);
    } else {
      send(time_spent);
    }
  }

  // ── 18. Interval ping every 30s ───────────────────────────────────────────
  setInterval(function () { send(30); }, 30000);

  // ── 19. Beacon on tab hide ────────────────────────────────────────────────
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      var total     = Math.floor((Date.now() - new Date(START_TIME).getTime()) / 1000);
      var remainder = total - totalPinged;
      beacon(remainder);
    }
  });

  // ── 20. SPA route change ──────────────────────────────────────────────────
  var lastPath     = window.location.pathname;
  var lastPingTime = 0;
  var debounce     = null;

  function onRouteChange() {
    var current = window.location.pathname;
    var now     = Date.now();
    if (current === lastPath && now - lastPingTime < 60000) return;
    lastPath     = current;
    lastPingTime = now;

    // Reset per-page time tracking
    START_TIME  = new Date().toISOString();
    totalPinged = 0;

    clearTimeout(debounce);
    debounce = setTimeout(function () {
      send(0);
      log("Route →", current);
    }, 100);
  }

  var _pushState = window.history.pushState;
  window.history.pushState = function () {
    _pushState.apply(this, arguments);
    onRouteChange();
  };
  window.addEventListener("popstate", onRouteChange);

  // ── 21. Public API ────────────────────────────────────────────────────────
  window.tracker = {
    identify: function (opts) {
      opts = opts || {};
      if (!opts.name && !opts.email) { warn("identify() needs name or email."); return; }
      send(0, { name: opts.name || null, email: opts.email || null });
      log("Identify —", opts);
    },
    sessionId: SESSION_ID,
    userId:    USER_ID,
    geo:       function () { return geoData; },
    device:    deviceInfo,
    referrer:  REFERRER,
  };

  // ── 22. Fetch geo then fire initial ping ───────────────────────────────────
  fetchGeo(function () {
    send(0);
    log("Initialised | tracker:", TRACKER_ID, "| domain:", DOMAIN);
  });

}(document.currentScript);