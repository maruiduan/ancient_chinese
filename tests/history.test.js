"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { reader, storage } = require("./reader-harness.cjs");
const { mergeHistory } = require("../server/src/history");

test("local reading history does not touch the network", () => {
  const shared = storage();
  const t = reader(shared);
  let syncs = 0;
  t.window.gwgzAccount = { onHistory() { syncs += 1; } };
  t.app.noteReading("ke:lesson", "课文", 1_700_000_000_000);
  t.app.noteReading("h01-01", "词话", 1_700_000_000_000);
  t.app.noteReading("z01-01", "通鉴", 1_700_000_000_000);
  assert.equal(shared.getItem("gwgz-history-v1"), null);
  assert.equal(syncs, 0);

  t.app.noteReading("tang:jingyesi", "静夜思", 1_700_000_000_000);
  t.app.markRead("tang:jingyesi", 1_700_000_000_100);
  t.app.noteReading("ci:sumu", "水调歌头", 1_700_000_000_050);
  const saved = JSON.parse(shared.getItem("gwgz-history-v1"));
  assert.deepEqual(saved.recent.map(function (item) { return item.id; }), ["ci:sumu", "tang:jingyesi"]);
  assert.equal(saved.recent[1].title, "静夜思");
  assert.equal(saved.recent[1].href, "#/tang/jingyesi");
  assert.equal(saved.read["tang:jingyesi"], 1_700_000_000_100);
  assert.equal(saved.read["ci:sumu"], undefined);
  assert.equal(syncs, 3);
  assert.equal(t.body.children.length, 0);

  const before = t.app.historyRev();
  t.app.applyHistory({
    recent: [{ id: "v01-01", title: "郑伯克段于鄢", at: 1_700_000_000_200, y: 12, href: "javascript:alert(1)" }],
    read: { "v01-01": 1_700_000_000_200, "z01-01": 1_700_000_000_200 },
  });
  assert.equal(t.app.historyRev(), before);
  assert.equal(syncs, 3);
  const snap = t.app.historySnapshot();
  assert.equal(snap.recent[0].id, "v01-01");
  assert.equal(snap.recent[0].href, "#/read/v01-01");
  assert.equal(snap.recent[0].y, 12);
  assert.equal(snap.read["v01-01"], 1_700_000_000_200);
  assert.equal(snap.read["z01-01"], undefined);
  assert.equal(snap.read["tang:jingyesi"], 1_700_000_000_100);
});

test("a full local store does not raise a notice", () => {
  const shared = storage();
  shared.setItem = function () { throw new Error("QuotaExceededError"); };
  const t = reader(shared);
  t.app.noteReading("v01-01", "郑伯克段于鄢", 1_700_000_000_000);
  assert.equal(t.app.historySnapshot().recent[0].title, "郑伯克段于鄢");
  assert.equal(t.body.children.length, 0);
});

test("client merge matches the server for the same snapshot", () => {
  const incoming = {
    recent: [
      { id: "v01-01", title: "郑伯克段于鄢", at: 80, y: 4, href: "nope" },
      { id: "ke:x", title: "课文", at: 90, y: 0 },
    ],
    read: { "tang:jingyesi": 10, "d01-01": 90 },
  };
  const saved = {
    recent: [{ id: "tang:jingyesi", title: "静夜思", at: 70, y: 2 }],
    read: { "tang:jingyesi": 40 },
  };
  const t = reader();
  assert.deepEqual(
    JSON.parse(JSON.stringify(t.app.mergeHistory(incoming, saved, 1_000_000))),
    mergeHistory(incoming, saved, 1_000_000)
  );
});

function bootAccount(options) {
  const fetches = [];
  const applied = [];
  const later = [];
  const storage = new Map(Object.entries(options.storage || {}));
  const window = {
    API_BASE: options.apiBase,
    gwgzAccountBridge: options.bridge || null,
    addEventListener() {},
  };
  const document = {
    addEventListener() {},
    querySelector() { return null; },
    getElementById() { return null; },
    createElement() { return { style: {}, appendChild() {}, addEventListener() {} }; },
  };
  const context = vm.createContext({
    window: window,
    document: document,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : ""; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); },
    },
    location: { hash: options.hash || "#/" },
    fetch(url, init) {
      fetches.push({ url: url, method: init.method, body: init.body, headers: init.headers });
      let status = options.status || 200;
      let body = options.reply || { recent: [], read: {} };
      if (typeof options.route === "function") {
        const routed = options.route(url, init);
        if (routed) {
          if (routed.status) status = routed.status;
          if (Object.prototype.hasOwnProperty.call(routed, "body")) body = routed.body;
        }
      }
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status: status,
        json() { return Promise.resolve(body); },
      });
    },
    setTimeout(fn) { later.push(fn); return later.length; },
    clearTimeout() {},
    console: { error() {}, log() {} },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/account.js"), "utf8"), context, { filename: "js/account.js" });
  return { fetches: fetches, applied: applied, later: later, window: window, storage: storage };
}

test("logged-out account code does not request reading state", () => {
  const booted = bootAccount({ apiBase: "https://api.lucca.top" });
  assert.equal(booted.fetches.length, 0);
  booted.window.gwgzAccount.onHistory();
  assert.equal(booted.fetches.length, 0);
  assert.equal(booted.later.length, 0);
  assert.equal(booted.window._hmt, undefined);
});

test("a stored token pulls state and a later change pushes the local snapshot", async () => {
  const applied = [];
  const booted = bootAccount({
    apiBase: "https://api.lucca.top",
    storage: { "gwgz-session-v1": "token-1" },
    reply: { recent: [{ id: "ci:sumu", title: "水调歌头", at: 20, y: 0 }], read: {} },
    bridge: {
      historySnapshot() {
        return { recent: [{ id: "v01-01", title: "郑伯克段于鄢", at: 30, y: 0, href: "#/read/v01-01" }], read: { "v01-01": 30 } };
      },
      historyRev() { return 1; },
      applyHistory(remote) { applied.push(remote); },
    },
  });
  await new Promise(function (resolve) { setImmediate(resolve); });
  await new Promise(function (resolve) { setImmediate(resolve); });
  assert.equal(booted.fetches.length, 2);
  assert.equal(booted.fetches[0].method, "GET");
  assert.equal(booted.fetches[0].url, "https://api.lucca.top/state");
  assert.equal(booted.fetches[0].headers.Authorization, "Bearer token-1");
  assert.equal(booted.fetches[1].method, "GET");
  assert.equal(booted.fetches[1].url, "https://api.lucca.top/me");
  assert.equal(applied.length, 1);
  assert.equal(applied[0].recent[0].id, "ci:sumu");
  assert.equal(booted.window._hmt, undefined);
  assert.equal(booted.later.length, 1);
  booted.later[0]();
  await new Promise(function (resolve) { setImmediate(resolve); });
  await new Promise(function (resolve) { setImmediate(resolve); });
  assert.equal(booted.fetches.length, 3);
  assert.equal(booted.fetches[2].method, "PUT");
  assert.equal(booted.fetches[2].url, "https://api.lucca.top/state");
  assert.equal(JSON.parse(booted.fetches[2].body).recent[0].id, "v01-01");
});

const TONGJI_USER = "0123456789abcdef0123456789abcdef";

function flushSoon() {
  return new Promise(function (resolve) { setImmediate(resolve); });
}

test("session restore publishes the /me userId and never the email", async () => {
  const booted = bootAccount({
    apiBase: "https://api.lucca.top",
    storage: { "gwgz-session-v1": "token-1" },
    route(url) {
      if (url.endsWith("/me")) return { body: { email: "a@example.com", userId: TONGJI_USER } };
      return null;
    },
  });
  assert.equal(booted.window._hmt, undefined);
  await flushSoon();
  await flushSoon();
  assert.equal(booted.storage.get("gwgz-user-v1"), TONGJI_USER);
  assert.deepEqual(JSON.parse(JSON.stringify(booted.window._hmt)), [["_setUserId", TONGJI_USER]]);
  assert.equal(JSON.stringify(booted.window._hmt).includes("a@example.com"), false);
});

test("a stored user id is sent before /me returns and is not repeated", async () => {
  const booted = bootAccount({
    apiBase: "https://api.lucca.top",
    storage: { "gwgz-session-v1": "token-1", "gwgz-user-v1": TONGJI_USER },
    route(url) {
      if (url.endsWith("/me")) return { body: { email: "a@example.com", userId: TONGJI_USER } };
      return null;
    },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(booted.window._hmt)), [["_setUserId", TONGJI_USER]]);
  await flushSoon();
  await flushSoon();
  assert.deepEqual(JSON.parse(JSON.stringify(booted.window._hmt)), [["_setUserId", TONGJI_USER]]);
});

test("email and missing user ids are not sent to Tongji", async () => {
  const emailId = bootAccount({
    apiBase: "https://api.lucca.top",
    storage: { "gwgz-session-v1": "token-1" },
    route(url) {
      if (url.endsWith("/me")) return { body: { email: "a@example.com", userId: "a@example.com" } };
      return null;
    },
  });
  await flushSoon();
  await flushSoon();
  assert.equal(emailId.window._hmt, undefined);
  assert.equal(emailId.storage.has("gwgz-user-v1"), false);

  const missing = bootAccount({
    apiBase: "https://api.lucca.top",
    storage: { "gwgz-session-v1": "token-1" },
    route(url) {
      if (url.endsWith("/me")) return { body: { email: "a@example.com" } };
      return null;
    },
  });
  await flushSoon();
  await flushSoon();
  assert.equal(missing.window._hmt, undefined);
  assert.equal(missing.storage.has("gwgz-user-v1"), false);
});

test("a rejected session clears the Tongji user id", async () => {
  const booted = bootAccount({
    apiBase: "https://api.lucca.top",
    storage: { "gwgz-session-v1": "token-1", "gwgz-user-v1": TONGJI_USER },
    route(url) {
      if (url.endsWith("/me")) return { status: 401, body: { error: "请先登录" } };
      return null;
    },
  });
  await flushSoon();
  await flushSoon();
  assert.equal(booted.storage.has("gwgz-session-v1"), false);
  assert.equal(booted.storage.has("gwgz-user-v1"), false);
  assert.deepEqual(JSON.parse(JSON.stringify(booted.window._hmt)), [
    ["_setUserId", TONGJI_USER],
    ["_setUserId", ""],
  ]);
});

function walkClicks(node, out) {
  if (!node || typeof node !== "object") return;
  if (node.listeners && node.listeners.click) out.push(node);
  const children = node.children || [];
  for (let i = 0; i < children.length; i += 1) walkClicks(children[i], out);
}

function pageAccount(options) {
  const fetches = [];
  const storage = new Map(Object.entries(options.storage || {}));
  const location = { hash: options.hash || "#/" };
  const main = { children: [], replaceChildren(node) { this.children = [node]; } };
  function make() {
    return {
      children: [],
      style: {},
      hidden: false,
      listeners: {},
      appendChild(child) { this.children.push(child); return child; },
      addEventListener(type, fn) {
        this.listeners[type] = this.listeners[type] || [];
        this.listeners[type].push(fn);
      },
      setAttribute() {},
      focus() {},
    };
  }
  const window = {
    API_BASE: "https://api.lucca.top",
    _hmt: [],
    addEventListener() {},
    confirm() { return false; },
  };
  const document = {
    title: "",
    addEventListener() {},
    querySelector() { return null; },
    getElementById(id) { return id === "main" ? main : null; },
    createElement: make,
    createTextNode() { return { textContent: "" }; },
  };
  const context = vm.createContext({
    window: window,
    document: document,
    location: location,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : ""; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); },
    },
    fetch(url) {
      fetches.push(url);
      const found = options.onFetch(url) || {};
      const status = found.status || 200;
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status: status,
        json() { return Promise.resolve(found.body || {}); },
      });
    },
    setTimeout() { return 0; },
    clearTimeout() {},
    console: { error() {}, log() {} },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/account.js"), "utf8"), context, { filename: "js/account.js" });
  return { fetches: fetches, storage: storage, window: window, main: main, location: location };
}

function clickNamed(root, text) {
  const found = [];
  walkClicks(root, found);
  const node = found.find(function (item) { return item.textContent === text; });
  assert.ok(node, text);
  node.listeners.click[0]();
}

test("login sets the Tongji user id and logout clears it", async () => {
  const booted = pageAccount({
    hash: "#/login",
    onFetch(url) {
      if (url.endsWith("/auth/verify")) return { body: { token: "tok-1", email: "a@example.com", userId: TONGJI_USER } };
      if (url.endsWith("/auth/logout")) return { body: { ok: true } };
      if (url.endsWith("/me")) return { body: { email: "a@example.com", userId: TONGJI_USER } };
      return { body: { recent: [], read: {} } };
    },
  });
  assert.deepEqual(booted.window._hmt, []);
  clickNamed(booted.main, "登录");
  await flushSoon();
  await flushSoon();
  assert.equal(booted.storage.get("gwgz-session-v1"), "tok-1");
  assert.equal(booted.storage.get("gwgz-user-v1"), TONGJI_USER);
  assert.deepEqual(JSON.parse(JSON.stringify(booted.window._hmt)), [["_setUserId", TONGJI_USER]]);
  assert.equal(JSON.stringify(booted.window._hmt).includes("@"), false);

  booted.window.gwgzAccount.route("#/me");
  await flushSoon();
  clickNamed(booted.main, "退出登录");
  await flushSoon();
  await flushSoon();
  assert.equal(booted.storage.has("gwgz-session-v1"), false);
  assert.equal(booted.storage.has("gwgz-user-v1"), false);
  assert.equal(booted.location.hash, "#/login");
  assert.deepEqual(JSON.parse(JSON.stringify(booted.window._hmt)), [
    ["_setUserId", TONGJI_USER],
    ["_setUserId", ""],
  ]);
});

test("login without a userId does not invent one", async () => {
  const booted = pageAccount({
    hash: "#/login",
    onFetch(url) {
      if (url.endsWith("/auth/verify")) return { body: { token: "tok-1", email: "a@example.com" } };
      return { body: {} };
    },
  });
  clickNamed(booted.main, "登录");
  await flushSoon();
  await flushSoon();
  assert.equal(booted.storage.get("gwgz-session-v1"), "tok-1");
  assert.equal(booted.storage.has("gwgz-user-v1"), false);
  assert.deepEqual(booted.window._hmt, []);
});
