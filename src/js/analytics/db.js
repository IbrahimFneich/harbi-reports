/* === src/js/analytics/db.js — sql.js loader and query helpers === */

var _db = null;
var _dbReady = null;

function waitForSqlJs() {
  return new Promise(function(resolve, reject) {
    if (typeof initSqlJs !== 'undefined') { resolve(); return; }
    var attempts = 0;
    var check = setInterval(function() {
      attempts++;
      if (typeof initSqlJs !== 'undefined') {
        clearInterval(check);
        resolve();
      } else if (attempts > 100) {
        clearInterval(check);
        reject(new Error('sql.js failed to load from CDN'));
      }
    }, 100);
  });
}

export function initDB() {
  if (_dbReady) { console.log('[db] initDB: returning cached promise'); return _dbReady; }

  console.log('[db] initDB: starting...');
  _dbReady = waitForSqlJs().then(function() {
    console.log('[db] sql.js global found, initializing WASM...');
    return initSqlJs({
      locateFile: function(file) {
        return 'https://sql.js.org/dist/' + file;
      }
    });
  }).then(function(SQL) {
    console.log('[db] WASM loaded, fetching harbi.db...');
    return fetch('data/harbi.db').then(function(r) {
      if (!r.ok) throw new Error('Failed to fetch harbi.db: ' + r.status);
      console.log('[db] harbi.db fetched, size:', r.headers.get('content-length'));
      return r.arrayBuffer();
    }).then(function(buf) {
      console.log('[db] Creating SQL.Database from', buf.byteLength, 'bytes');
      _db = new SQL.Database(new Uint8Array(buf));
      console.log('[db] DB ready!');
      return _db;
    });
  }).catch(function(err) {
    console.error('[db] initDB FAILED:', err);
    throw err;
  });

  return _dbReady;
}

/**
 * Run a SQL query and return {columns: string[], values: any[][]}.
 */
export function query(sql, params) {
  if (!_db) throw new Error('DB not initialized');
  var results = _db.exec(sql, params);
  if (results.length === 0) return { columns: [], values: [] };
  return results[0];
}

/**
 * Run a query and return the first value of the first row, or null.
 */
export function queryOne(sql, params) {
  var r = query(sql, params);
  if (r.values.length === 0) return null;
  return r.values[0][0];
}

/**
 * Run a query and return an array of objects [{col: val, ...}, ...].
 */
export function queryRows(sql, params) {
  var r = query(sql, params);
  if (r.values.length === 0) return [];
  return r.values.map(function(row) {
    var obj = {};
    for (var i = 0; i < r.columns.length; i++) {
      obj[r.columns[i]] = row[i];
    }
    return obj;
  });
}
