// AturDuit v2 — pencatatan transaksi, anggaran 50/30/20, tujuan tabungan.
// Data tersimpan lokal di browser (localStorage). Tidak ada data yang dikirim ke server.
(function () {
  "use strict";

  var STORE_KEY = "aturduit_v2";
  var ANNOUNCE_KEY = "aturduit_announcement";

  var KATEGORI = {
    masuk: ["Gaji", "Usaha", "Investasi", "Hadiah", "Lainnya"],
    keluar: [
      { nama: "Makan & Minum", grup: "kebutuhan" },
      { nama: "Transportasi", grup: "kebutuhan" },
      { nama: "Tagihan & Rumah", grup: "kebutuhan" },
      { nama: "Kesehatan", grup: "kebutuhan" },
      { nama: "Pendidikan", grup: "kebutuhan" },
      { nama: "Hiburan", grup: "keinginan" },
      { nama: "Belanja", grup: "keinginan" },
      { nama: "Makan di Luar", grup: "keinginan" },
      { nama: "Lainnya", grup: "keinginan" }
    ]
  };
  var WARNA_KATEGORI = ["#059669", "#f59e0b", "#0ea5e9", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#64748b", "#a855f7"];

  var BUDGET = [
    { kunci: "kebutuhan", label: "Kebutuhan", persen: 50, warna: "#059669" },
    { kunci: "keinginan", label: "Keinginan", persen: 30, warna: "#f59e0b" },
    { kunci: "tabungan", label: "Tabungan", persen: 20, warna: "#0ea5e9" }
  ];

  // ---------- Util ----------
  function $(id) { return document.getElementById(id); }
  function formatRupiah(nilai) {
    return "Rp" + Math.round(nilai).toLocaleString("id-ID", { maximumFractionDigits: 0 });
  }
  function bulanIni() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }
  function namaBulan(ym) {
    var parts = ym.split("-");
    var nama = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return nama[Number(parts[1]) - 1] + " " + parts[0];
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  var toastTimer = null;
  function toast(pesan) {
    var el = $("toast");
    el.textContent = pesan;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3000);
  }

  // ---------- Penyimpanan ----------
  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return { transactions: [], goals: [] };
      var data = JSON.parse(raw);
      if (!Array.isArray(data.transactions)) data.transactions = [];
      if (!Array.isArray(data.goals)) data.goals = [];
      return data;
    } catch (e) {
      return { transactions: [], goals: [] };
    }
  }
  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* penyimpanan penuh / diblokir */ }
  }
  var store = loadStore();

  // ---------- Menu mobile ----------
  var menuBtn = $("menuBtn"), nav = $("nav");
  function syncMenuBtn() {
    var terbuka = nav.classList.contains("open");
    menuBtn.setAttribute("aria-expanded", String(terbuka));
    menuBtn.setAttribute("aria-label", terbuka ? "Tutup menu" : "Buka menu");
  }
  menuBtn.addEventListener("click", function () { nav.classList.toggle("open"); syncMenuBtn(); });
  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () { nav.classList.remove("open"); syncMenuBtn(); });
  });
  syncMenuBtn();

  // ---------- Pengumuman dari admin ----------
  (function () {
    var teks = "";
    try { teks = localStorage.getItem(ANNOUNCE_KEY) || ""; } catch (e) { /* abaikan */ }
    if (teks.trim()) {
      var el = $("announce");
      el.textContent = teks.trim();
      el.hidden = false;
    }
  })();

  // ---------- Form transaksi ----------
  var txForm = $("txForm"), txJenis = $("txJenis"), txKategori = $("txKategori"),
      txTanggal = $("txTanggal"), txJumlah = $("txJumlah"), txCatatan = $("txCatatan"),
      txError = $("txError");

  function isiKategori() {
    var jenis = txJenis.value;
    txKategori.innerHTML = "";
    KATEGORI[jenis].forEach(function (k) {
      var nama = typeof k === "string" ? k : k.nama;
      var opt = document.createElement("option");
      opt.value = nama; opt.textContent = nama;
      txKategori.appendChild(opt);
    });
  }
  txJenis.addEventListener("change", isiKategori);
  isiKategori();
  txTanggal.value = new Date().toISOString().slice(0, 10);

  txForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var jumlah = Math.floor(Number(txJumlah.value));
    var tanggal = txTanggal.value;
    if (!tanggal || !jumlah || jumlah <= 0) {
      txError.textContent = "Periksa lagi: tanggal harus diisi dan jumlah harus lebih dari Rp0.";
      txError.hidden = false;
      return;
    }
    txError.hidden = true;
    store.transactions.push({
      id: uid(), tanggal: tanggal, jenis: txJenis.value,
      kategori: txKategori.value, jumlah: jumlah,
      catatan: txCatatan.value.trim()
    });
    store.transactions.sort(function (a, b) { return b.tanggal.localeCompare(a.tanggal); });
    saveStore();
    txJumlah.value = ""; txCatatan.value = "";
    renderSemua();
    toast("Transaksi tersimpan.");
  });

  // ---------- Render: ringkasan + diagram + anggaran + riwayat ----------
  function transaksiBulanIni() {
    var ym = bulanIni();
    return store.transactions.filter(function (t) { return t.tanggal.slice(0, 7) === ym; });
  }
  function grupKategori(nama) {
    var found = KATEGORI.keluar.find(function (k) { return k.nama === nama; });
    return found ? found.grup : "keinginan";
  }

  function renderRingkasan(list) {
    var masuk = 0, keluar = 0;
    list.forEach(function (t) { if (t.jenis === "masuk") masuk += t.jumlah; else keluar += t.jumlah; });
    $("statSaldo").textContent = formatRupiah(masuk - keluar);
    $("statMasuk").textContent = formatRupiah(masuk);
    $("statKeluar").textContent = formatRupiah(keluar);
    $("bulanLabel").textContent = namaBulan(bulanIni());
    return { masuk: masuk, keluar: keluar };
  }

  function renderDonut(list) {
    var perKategori = {};
    var total = 0;
    list.forEach(function (t) {
      if (t.jenis !== "keluar") return;
      perKategori[t.kategori] = (perKategori[t.kategori] || 0) + t.jumlah;
      total += t.jumlah;
    });
    var canvas = $("donut"), ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    $("donutCenter").querySelector("strong").textContent = formatRupiah(total);
    $("donutEmpty").hidden = total > 0;
    var legend = $("legend");
    legend.innerHTML = "";
    var keys = Object.keys(perKategori).sort(function (a, b) { return perKategori[b] - perKategori[a]; });
    if (!keys.length) return;
    var cx = 110, cy = 110, r = 95, rIn = 62, start = -Math.PI / 2;
    keys.forEach(function (nama, i) {
      var warna = WARNA_KATEGORI[i % WARNA_KATEGORI.length];
      var porsi = perKategori[nama] / total;
      var end = start + porsi * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, end);
      ctx.arc(cx, cy, rIn, end, start, true);
      ctx.closePath();
      ctx.fillStyle = warna;
      ctx.fill();
      start = end;
      var li = document.createElement("li");
      li.innerHTML = '<span class="dot" style="background:' + warna + '"></span>' +
        escapeHtml(nama) + " · " + Math.round(porsi * 100) + "%" +
        '<span class="amt">' + formatRupiah(perKategori[nama]) + "</span>";
      legend.appendChild(li);
    });
  }

  function renderAnggaran(list) {
    var masuk = 0, perGrup = { kebutuhan: 0, keinginan: 0 };
    list.forEach(function (t) {
      if (t.jenis === "masuk") masuk += t.jumlah;
      else perGrup[grupKategori(t.kategori)] += t.jumlah;
    });
    var wrap = $("budgetBars");
    wrap.innerHTML = "";
    BUDGET.forEach(function (b) {
      var batas = Math.round(masuk * b.persen / 100);
      var terpakai = b.kunci === "tabungan" ? Math.max(0, masuk - perGrup.kebutuhan - perGrup.keinginan) : perGrup[b.kunci];
      var persenPakai = batas > 0 ? Math.min(100, Math.round(terpakai / batas * 100)) : 0;
      var over = batas > 0 && terpakai > batas;
      var row = document.createElement("div");
      row.className = "budget-row";
      row.innerHTML =
        '<div class="budget-top"><span><strong>' + b.label + "</strong> · " + b.persen + '% dari pemasukan</span>' +
        '<span class="' + (over ? "over" : "") + '">' + formatRupiah(terpakai) + " / " + formatRupiah(batas) + "</span></div>" +
        '<div class="bar"><span class="' + (over ? "over" : "") + '" style="width:' + persenPakai + "%;background:" + b.warna + '"></span></div>' +
        '<p class="budget-note">' + (masuk <= 0 ? "Masukkan pemasukan bulan ini untuk melihat batas anggarannya."
          : over ? "Melewati batas " + formatRupiah(terpakai - batas) + " — pertimbangkan mengurangi pengeluaran " + b.label.toLowerCase() + "."
          : "Sisa anggaran " + formatRupiah(batas - terpakai) + ".") + "</p>";
      wrap.appendChild(row);
    });
  }

  function renderRiwayat() {
    var cari = ($("txCari").value || "").toLowerCase();
    var filter = $("txFilter").value;
    var list = store.transactions.filter(function (t) {
      if (filter !== "semua" && t.jenis !== filter) return false;
      if (cari && (t.catatan + " " + t.kategori).toLowerCase().indexOf(cari) === -1) return false;
      return true;
    });
    var tbody = $("txList");
    tbody.innerHTML = "";
    $("txEmpty").hidden = list.length > 0;
    list.slice(0, 100).forEach(function (t) {
      var tr = document.createElement("tr");
      var tgl = new Date(t.tanggal + "T00:00:00");
      var tglText = tgl.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
      tr.innerHTML =
        "<td>" + tglText + "</td><td>" + escapeHtml(t.kategori) + "</td><td>" + escapeHtml(t.catatan || "—") + "</td>" +
        '<td class="num ' + (t.jenis === "masuk" ? "in" : "out") + '">' + (t.jenis === "masuk" ? "+" : "−") + formatRupiah(t.jumlah) + "</td>" +
        '<td><button class="tx-del" type="button" data-id="' + t.id + '" aria-label="Hapus transaksi">×</button></td>';
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll(".tx-del").forEach(function (btn) {
      btn.addEventListener("click", function () {
        store.transactions = store.transactions.filter(function (t) { return t.id !== btn.getAttribute("data-id"); });
        saveStore();
        renderSemua();
        toast("Transaksi dihapus.");
      });
    });
  }

  $("txCari").addEventListener("input", renderRiwayat);
  $("txFilter").addEventListener("change", renderRiwayat);

  $("btnCsv").addEventListener("click", function () {
    if (!store.transactions.length) { toast("Belum ada transaksi untuk diekspor."); return; }
    var baris = ["Tanggal,Jenis,Kategori,Jumlah (Rp),Catatan"];
    store.transactions.forEach(function (t) {
      baris.push([t.tanggal, t.jenis, '"' + t.kategori.replace(/"/g, '""') + '"', t.jumlah, '"' + (t.catatan || "").replace(/"/g, '""') + '"'].join(","));
    });
    var blob = new Blob(["\uFEFF" + baris.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aturduit-transaksi.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("File CSV diunduh.");
  });

  $("btnHapusSemua").addEventListener("click", function () {
    if (!store.transactions.length) { toast("Belum ada transaksi."); return; }
    if (!confirm("Hapus SEMUA transaksi? Tindakan ini tidak bisa dibatalkan. Ekspor CSV dulu bila perlu.")) return;
    store.transactions = [];
    saveStore();
    renderSemua();
    toast("Semua transaksi dihapus.");
  });

  // ---------- Kalkulator 50/30/20 (langsung saat mengetik) ----------
  var pemasukanInput = $("pemasukan"), pengeluaranInput = $("pengeluaran"), calcResult = $("calcResult");
  function renderKalkulator() {
    var pemasukan = Math.max(0, Number(pemasukanInput.value) || 0);
    var pengeluaran = Math.max(0, Number(pengeluaranInput.value) || 0);
    if (pemasukan <= 0) {
      calcResult.innerHTML = '<p class="calc-hint">Isi pemasukanmu untuk melihat pembagian anggaran.</p>';
      return;
    }
    var kebutuhan = Math.round(pemasukan * 0.5);
    var keinginan = Math.round(pemasukan * 0.3);
    var tabungan = pemasukan - kebutuhan - keinginan;
    var sisa = pemasukan - pengeluaran;
    calcResult.innerHTML =
      '<div class="calc-rows">' +
      '<div class="calc-row"><span>Kebutuhan (50%)</span><strong>' + formatRupiah(kebutuhan) + "</strong></div>" +
      '<div class="calc-row"><span>Keinginan (30%)</span><strong>' + formatRupiah(keinginan) + "</strong></div>" +
      '<div class="calc-row"><span>Tabungan (20%)</span><strong>' + formatRupiah(tabungan) + "</strong></div>" +
      '<div class="calc-row total"><span>Sisa setelah pengeluaranmu</span><strong class="' + (sisa >= 0 ? "pos" : "neg") + '">' + formatRupiah(sisa) + "</strong></div>" +
      "</div>" +
      '<p class="calc-note">' + (pengeluaran > 0
        ? (sisa >= 0 ? "Pengeluaranmu masih dalam pemasukan. Sisanya bisa dialihkan ke tabungan."
          : "Pengeluaran melebihi pemasukan sebesar " + formatRupiah(-sisa) + " — cek lagi pos keinginanmu.")
        : "Masukkan pengeluaranmu di atas untuk melihat sisa uangmu.") + "</p>";
  }
  pemasukanInput.addEventListener("input", renderKalkulator);
  pengeluaranInput.addEventListener("input", renderKalkulator);
  $("calcForm").addEventListener("submit", function (e) { e.preventDefault(); renderKalkulator(); });

  // ---------- Tujuan tabungan ----------
  var goalForm = $("goalForm"), goalNama = $("goalNama"), goalTarget = $("goalTarget"), goalError = $("goalError");

  goalForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var target = Math.floor(Number(goalTarget.value));
    if (!goalNama.value.trim() || !target || target <= 0) {
      goalError.textContent = "Isi nama tujuan dan target lebih dari Rp0.";
      goalError.hidden = false;
      return;
    }
    goalError.hidden = true;
    store.goals.push({ id: uid(), nama: goalNama.value.trim(), target: target, terkumpul: 0 });
    saveStore();
    goalNama.value = ""; goalTarget.value = "";
    renderTujuan();
    toast("Tujuan dibuat.");
  });

  function renderTujuan() {
    var wrap = $("goalList");
    wrap.innerHTML = "";
    $("goalEmpty").hidden = store.goals.length > 0;
    store.goals.forEach(function (g) {
      var persen = Math.min(100, Math.round(g.terkumpul / g.target * 100));
      var tercapai = g.terkumpul >= g.target;
      var card = document.createElement("article");
      card.className = "goal-card" + (tercapai ? " done" : "");
      card.innerHTML =
        '<div class="goal-top"><h3>' + escapeHtml(g.nama) + "</h3>" +
        '<span class="pct">' + persen + "%" + (tercapai ? ' <span class="goal-done-badge">Tercapai</span>' : "") + "</span></div>" +
        '<p class="goal-amounts">' + formatRupiah(g.terkumpul) + " dari " + formatRupiah(g.target) + "</p>" +
        '<div class="bar"><span style="width:' + persen + '%"></span></div>' +
        '<div class="goal-actions">' +
        '<input type="number" min="1" inputmode="numeric" placeholder="Tambah dana (Rp)" aria-label="Tambah dana untuk ' + escapeHtml(g.nama) + '">' +
        '<button class="btn btn-small btn-primary" type="button" data-aksi="tambah">+ Dana</button>' +
        '<button class="btn btn-small btn-danger-outline" type="button" data-aksi="hapus">Hapus</button>' +
        "</div>";
      var input = card.querySelector("input");
      card.querySelector('[data-aksi="tambah"]').addEventListener("click", function () {
        var nominal = Math.floor(Number(input.value));
        if (!nominal || nominal <= 0) { toast("Masukkan nominal dana yang valid."); return; }
        g.terkumpul += nominal;
        saveStore();
        renderTujuan();
        toast("Dana ditambahkan ke " + g.nama + ".");
      });
      card.querySelector('[data-aksi="hapus"]').addEventListener("click", function () {
        if (!confirm('Hapus tujuan "' + g.nama + '"?')) return;
        store.goals = store.goals.filter(function (x) { return x.id !== g.id; });
        saveStore();
        renderTujuan();
        toast("Tujuan dihapus.");
      });
      wrap.appendChild(card);
    });
  }

  // ---------- Render awal ----------
  function renderSemua() {
    var list = transaksiBulanIni();
    renderRingkasan(list);
    renderDonut(list);
    renderAnggaran(list);
    renderRiwayat();
  }
  renderSemua();
  renderTujuan();
})();
