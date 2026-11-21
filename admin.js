// Admin AturDuit — PIN lokal + ringkasan data + pengumuman.
// Catatan: ini situs statis tanpa server. PIN disimpan di localStorage perangkat
// dan hanya menghalangi akses iseng, bukan pengaman tingkat server.
(function () {
  "use strict";

  var STORE_KEY = "aturduit_v2";
  var PIN_KEY = "aturduit_admin_pin";
  var ANNOUNCE_KEY = "aturduit_announcement";
  var SESSION_KEY = "aturduit_admin_session";
  var PIN_DEFAULT = "1234";

  function $(id) { return document.getElementById(id); }
  function formatRupiah(nilai) {
    return "Rp" + Math.round(nilai).toLocaleString("id-ID", { maximumFractionDigits: 0 });
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var toastTimer = null;
  function toast(pesan) {
    var el = $("toast");
    el.textContent = pesan;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3000);
  }
  function getPin() {
    try { return localStorage.getItem(PIN_KEY) || PIN_DEFAULT; } catch (e) { return PIN_DEFAULT; }
  }
  function loadStore() {
    try {
      var data = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      return { transactions: Array.isArray(data.transactions) ? data.transactions : [], goals: Array.isArray(data.goals) ? data.goals : [] };
    } catch (e) {
      return { transactions: [], goals: [] };
    }
  }

  // ---------- Gerbang PIN ----------
  var pinBox = $("pinBox"), adminPanel = $("adminPanel");
  var pinForm = $("pinForm"), pinInput = $("pinInput"), pinError = $("pinError");

  function bukaPanel() {
    pinBox.hidden = true;
    adminPanel.hidden = false;
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (e) { /* abaikan */ }
    renderAdmin();
  }
  function sesiAktif() {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch (e) { return false; }
  }
  if (sesiAktif()) bukaPanel();

  pinForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (pinInput.value === getPin()) {
      pinError.hidden = true;
      bukaPanel();
      toast("Selamat datang, Admin.");
    } else {
      pinError.textContent = "PIN salah. Coba lagi.";
      pinError.hidden = false;
      pinInput.value = "";
      pinInput.focus();
    }
  });

  // ---------- Render panel ----------
  function renderAdmin() {
    var store = loadStore();
    var masuk = 0, keluar = 0;
    store.transactions.forEach(function (t) { if (t.jenis === "masuk") masuk += t.jumlah; else keluar += t.jumlah; });
    $("admTx").textContent = store.transactions.length;
    $("admMasuk").textContent = formatRupiah(masuk);
    $("admKeluar").textContent = formatRupiah(keluar);
    $("admGoal").textContent = store.goals.length;

    var tbody = $("admList");
    tbody.innerHTML = "";
    $("admEmpty").hidden = store.transactions.length > 0;
    store.transactions.slice(0, 10).forEach(function (t) {
      var tr = document.createElement("tr");
      var tgl = new Date(t.tanggal + "T00:00:00");
      tr.innerHTML =
        "<td>" + tgl.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) + "</td>" +
        "<td>" + escapeHtml(t.kategori) + "</td>" +
        "<td>" + escapeHtml(t.catatan || "—") + "</td>" +
        '<td class="num ' + (t.jenis === "masuk" ? "in" : "out") + '">' + (t.jenis === "masuk" ? "+" : "−") + formatRupiah(t.jumlah) + "</td>";
      tbody.appendChild(tr);
    });

    try { $("announceInput").value = localStorage.getItem(ANNOUNCE_KEY) || ""; } catch (e) { /* abaikan */ }
  }

  // ---------- Pengumuman ----------
  $("announceForm").addEventListener("submit", function (event) {
    event.preventDefault();
    try { localStorage.setItem(ANNOUNCE_KEY, $("announceInput").value.trim()); } catch (e) { /* abaikan */ }
    toast("Pengumuman disimpan. Lihat di beranda.");
  });
  $("announceHapus").addEventListener("click", function () {
    try { localStorage.removeItem(ANNOUNCE_KEY); } catch (e) { /* abaikan */ }
    $("announceInput").value = "";
    toast("Pengumuman dihapus.");
  });

  // ---------- Ubah PIN ----------
  $("pinChangeForm").addEventListener("submit", function (event) {
    event.preventDefault();
    var baru = $("pinBaru").value.trim();
    var ulang = $("pinBaruUlang").value.trim();
    var err = $("pinChangeError");
    if (!/^\d{4,8}$/.test(baru)) {
      err.textContent = "PIN harus 4–8 digit angka.";
      err.hidden = false;
      return;
    }
    if (baru !== ulang) {
      err.textContent = "PIN baru dan ulangannya tidak sama.";
      err.hidden = false;
      return;
    }
    try { localStorage.setItem(PIN_KEY, baru); } catch (e) { /* abaikan */ }
    err.hidden = true;
    $("pinBaru").value = ""; $("pinBaruUlang").value = "";
    toast("PIN berhasil diubah.");
  });

  // ---------- Data ----------
  $("btnBackup").addEventListener("click", function () {
    var store = loadStore();
    var blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aturduit-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Cadangan diunduh.");
  });
  $("btnReset").addEventListener("click", function () {
    if (!confirm("Hapus SEMUA data AturDuit di perangkat ini (transaksi + tujuan)? Tindakan ini tidak bisa dibatalkan.")) return;
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* abaikan */ }
    renderAdmin();
    toast("Semua data dihapus.");
  });
  $("btnKeluar").addEventListener("click", function () {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* abaikan */ }
    adminPanel.hidden = true;
    pinBox.hidden = false;
    pinInput.value = "";
    pinInput.focus();
  });
})();
