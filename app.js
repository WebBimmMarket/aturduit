js
// Menu mobile: buka/tutup navigasi + beri tahu pembaca layar
const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");


function syncMenuBtn() {
  const terbuka = nav.classList.contains("open");
  menuBtn.setAttribute("aria-expanded", String(terbuka));
  menuBtn.setAttribute("aria-label", terbuka ? "Tutup menu" : "Buka menu");
}


syncMenuBtn();


menuBtn.addEventListener("click", () => {
  nav.classList.toggle("open");
  syncMenuBtn();
});


// Tutup menu setelah salah satu tautan diklik
nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    syncMenuBtn();
  });
});


// Kalkulator anggaran: sisa = pemasukan - pengeluaran
const calcForm = document.getElementById("calcForm");
const pemasukanInput = document.getElementById("pemasukan");
const pengeluaranInput = document.getElementById("pengeluaran");
const hasilEl = document.getElementById("hasil");


function formatRupiah(nilai) {
  return "Rp" + Math.round(nilai).toLocaleString("id-ID", { maximumFractionDigits: 0 });
}


calcForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const pemasukan = Number(pemasukanInput.value) || 0;
  const pengeluaran = Number(pengeluaranInput.value) || 0;
  if (pemasukan < 0 || pengeluaran < 0) {
    hasilEl.textContent = "Nilai tidak boleh negatif. Periksa lagi angkanya ⚠️";
    return;
  }
  const sisa = Math.max(0, pemasukan) - Math.max(0, pengeluaran);
  if (sisa >= 0) {
    hasilEl.textContent = "Sisa uangmu: " + formatRupiah(sisa) + " / bulan 🎉";
  } else {
    hasilEl.textContent = "Defisit " + formatRupiah(Math.abs(sisa)) + " / bulan — kurangi pengeluaranmu ⚠️";
  }
});