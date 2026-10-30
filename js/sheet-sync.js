/* ============================================================
   sheet-sync.js  —  Sinkronisasi data kumulatif dari Google Sheets
   Fetch target & realisasi s/d tiap bulan (Jan-Des) per unit.
   Data diload saat halaman dibuka; grafik otomatis mengikuti sheet.
   Tidak mengubah file lain.
   ============================================================ */

const SHEET_ID = '1fuI2cYC7om9pgigi6w7THhIcvg5728ewj4gY0eFy1Yk';

/* --- Daftar tab sheet beserta GID dan nama unit --- */
const SHEET_TABS = [
  { unit: 'UP3 Pekanbaru',    gid: '1885751963' },
  { unit: 'ULP KOTIM',        gid: '333511253'  },
  { unit: 'ULP KOBAR',        gid: '1047141309' },
  { unit: 'ULP SIMPANG TIGA', gid: '877574062'  },
  { unit: 'ULP RUMBAI',       gid: '2006963693' },
  { unit: 'ULP PANAM',        gid: '770749395'  },
  { unit: 'ULP PERAWANG',     gid: '13148451'   },
  { unit: 'ULP SIAK',         gid: '111955985'  },
  { unit: 'ULP P.KERINCI',    gid: '1521216522' },
];

/* --- Mapping: id KPI dashboard ke keyword nama indikator di sheet ---
   Struktur kolom CSV sheet (0-indexed setelah parse):
     col[0]   = row label nomor
     col[1]   = NO
     col[2]   = INDIKATOR KINERJA
     col[3]   = POLARITAS
     col[4]   = SATUAN
     col[5]   = BOBOT KM
     col[6]   = BOBOT TERHITUNG
     col[7]   = TARGET 2026
     col[8]   = TARGET s.d bulan ini
     col[9]   = REALISASI s.d bulan ini
     col[10..12] = % PENCAPAIAN (3 varian)
     col[13]  = NILAI CAPPING 110%
     col[14]  = NILAI CAPPING 100%
     col[15]  = INDIKATOR (status label)
     col[16]  = (kosong)
     col[17..28]  = TARGET kumulatif Jan..Des (12 bulan)
     col[29..40]  = REALISASI kumulatif Jan..Des (12 bulan)
*/
const KPI_MAP = [
  { id: 1,  keywords: ['penjualan tenaga listrik', 'penjualan tl'] },
  { id: 2,  keywords: ['penambahan pelanggan', 'jumlah penambahan pelanggan'] },
  { id: 3,  keywords: ['penambahan daya tersambung', 'daya tersambung', 'mva'] },
  { id: 4,  keywords: ['pendapatan biaya penyambungan', 'biaya penyambungan'] },
  { id: 5,  keywords: ['susut distribusi', 'susut tanpa e-min'] },
  { id: 6,  keywords: ['saidi'] },
  { id: 7,  keywords: ['saifi'] },
  { id: 8,  keywords: ['ens'] },
  { id: 9,  keywords: ['gangguan tm', 'gangguan penyulang'] },
  { id: 10, keywords: ['kecelakaan kerja'] },
];

/* ============================================================
   Parse CSV teks menjadi array of arrays (handle quoted fields)
   ============================================================ */
function parseCsv(text) {
  var rows = [], row = [], field = '', inQ = false;
  for (var i = 0; i < text.length; i++) {
    var c = text[i], nx = text[i + 1];
    if (inQ) {
      if (c === '"' && nx === '"') { field += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQ = true; }
      else if (c === ',') { row.push(field.trim()); field = ''; }
      else if (c === '\n') { row.push(field.trim()); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') { field += c; }
    }
  }
  if (row.length || field) { row.push(field.trim()); rows.push(row); }
  return rows;
}

/* ============================================================
   Bersihkan angka format Indonesia: titik=ribuan, koma=desimal
   Kurung = negatif: (1.234,56) menjadi -1234.56
   ============================================================ */
function parseNum(s) {
  if (!s) return null;
  s = s.trim();
  if (s === '-' || s === '' || s === '\u2014') return null;
  var neg = s.charAt(0) === '(' && s.charAt(s.length - 1) === ')';
  s = s.replace(/[()]/g, '').replace(/\./g, '').replace(',', '.');
  var n = parseFloat(s);
  if (!isFinite(n)) return null;
  return neg ? -n : n;
}

/* ============================================================
   Cari baris yang cocok keyword KPI, ambil 12 target & 12 realisasi
   ============================================================ */
function extractKpiData(rows, kpiEntry) {
  var kws = kpiEntry.keywords;
  for (var ri = 0; ri < rows.length; ri++) {
    var row = rows[ri];
    var nama = (row[2] || '').toLowerCase().trim();
    var satuan = (row[4] || '').toLowerCase().trim();
    if (!nama) continue;
    var match = false;
    for (var ki = 0; ki < kws.length; ki++) {
      if (nama.indexOf(kws[ki]) !== -1) { match = true; break; }
    }
    if (!match) continue;
    /* id=2 Pelanggan: skip baris satuan MVA */
    if (kpiEntry.id === 2 && satuan.indexOf('mva') !== -1) continue;
    /* id=3 MVA: hanya ambil baris satuan MVA */
    if (kpiEntry.id === 3 && satuan.indexOf('mva') === -1) continue;
    var target = [], realisasi = [];
    for (var c = 17; c <= 28; c++) target.push(parseNum(row[c]));
    for (var c = 29; c <= 40; c++) realisasi.push(parseNum(row[c]));
    if (!target.some(function(v){ return v !== null; }) &&
        !realisasi.some(function(v){ return v !== null; })) continue;
    return { target: target, realisasi: realisasi };
  }
  return null;
}

/* ============================================================
   Fetch satu tab CSV dari Google Sheets
   ============================================================ */
function fetchSheet(gid) {
  var url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID +
            '/export?format=csv&gid=' + gid;
  return fetch(url).then(function(resp) {
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return resp.text();
  }).then(function(text) {
    return parseCsv(text);
  });
}

/* ============================================================
   Simpan semua data sheet; diakses modul lain lewat window.sheetData
   Format: { 'UP3 Pekanbaru': { 1:{target:[],realisasi:[]}, ... }, ... }
   ============================================================ */
window.sheetData = {};

/* ============================================================
   Apply data unit UP3 ke metrics[] global & hitung ulang pencapaian
   ============================================================ */
function applyToMetrics(unitData) {
  if (!window.metrics || !Array.isArray(window.metrics)) return;
  window.metrics.forEach(function(m) {
    var d = unitData[m.id];
    if (!d) return;
    d.target.forEach(function(v, i) { if (v !== null) m.target[i] = v; });
    d.realisasi.forEach(function(v, i) { m.realisasi[i] = v; });
    m.pencapaian = m.target.map(function(t, i) {
      var r = m.realisasi[i];
      if (!isFinite(t) || !isFinite(r)) return null;
      if (m.id === 10) return r === 0 ? 100 : null;
      if (t === 0) return null;
      return m.id <= 4 ? (r / t * 100) : ((2 - r / t) * 100);
    });
  });
}

/* ============================================================
   Banner status kecil di pojok kanan bawah
   ============================================================ */
function showBanner(msg, isErr) {
  var el = document.getElementById('sheetSyncBanner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sheetSyncBanner';
    el.style.cssText = 'position:fixed;bottom:14px;right:18px;z-index:9999;' +
      'padding:9px 16px;border-radius:8px;font-size:12px;font-weight:600;' +
      'box-shadow:0 2px 12px rgba(0,0,0,.18);transition:opacity .6s;max-width:320px;';
    document.body.appendChild(el);
  }
  el.style.background = isErr ? '#fde8e8' : '#e6f6ee';
  el.style.color      = isErr ? '#9b2323' : '#0a5e3a';
  el.style.border     = isErr ? '1px solid #f5b8b8' : '1px solid #9edfc0';
  el.textContent = msg;
  el.style.opacity = '1';
  if (!isErr) setTimeout(function() { el.style.opacity = '0'; }, 5000);
}

/* ============================================================
   Proses satu tab: fetch, parse, simpan ke sheetData
   Return Promise yang resolve ke true/false
   ============================================================ */
function processTab(tab) {
  return fetchSheet(tab.gid).then(function(rows) {
    var unitData = {};
    KPI_MAP.forEach(function(entry) {
      var result = extractKpiData(rows, entry);
      if (result) unitData[entry.id] = result;
    });
    window.sheetData[tab.unit] = unitData;
    return true;
  }).catch(function(err) {
    console.warn('[sheet-sync] Gagal load ' + tab.unit + ':', err.message);
    return false;
  });
}

/* ============================================================
   Ambil semua tab secara paralel, apply UP3, lalu re-render
   ============================================================ */
function syncAllSheets() {
  showBanner('\u23f3 Mengambil data dari Google Sheets...', false);
  var promises = SHEET_TABS.map(function(tab) { return processTab(tab); });
  Promise.all(promises).then(function(results) {
    var ok = results.filter(Boolean).length;
    /* Apply data UP3 ke metrics[] supaya grafik UP3 terupdate */
    var up3Data = window.sheetData['UP3 Pekanbaru'];
    if (up3Data) applyToMetrics(up3Data);
    /* Re-render dashboard UP3 */
    if (typeof window.render === 'function') window.render();
    /* Dispatch event agar modul ULP & Tren bisa ikut refresh */
    window.dispatchEvent(new CustomEvent('sheet-synced', { detail: window.sheetData }));
    if (ok > 0) {
      showBanner('\u2705 Data diperbarui dari Google Sheets (' + ok + '/' + SHEET_TABS.length + ' unit)', false);
    } else {
      showBanner('\u26a0\ufe0f Gagal mengambil data dari sheet. Data lokal digunakan.', true);
    }
  });
}

/* Akses data sheet untuk ULP dari modul lain */
window.getSheetDataForUnit = function(unitName) {
  return window.sheetData[unitName] || null;
};

/* Jalankan setelah DOM siap */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncAllSheets);
} else {
  syncAllSheets();
}
