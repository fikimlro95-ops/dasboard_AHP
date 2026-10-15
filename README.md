# AHP DecisionHub — Sistem Pendukung Keputusan Pemilihan Mobil (Metode AHP)

Dashboard interaktif Sistem Pendukung Keputusan (SPK) Pemilihan Mobil Keluarga berbasis metode **Analytic Hierarchy Process (AHP)**, disesuaikan secara presisi dengan data dan formula matematis lembar kerja Excel `AHP_Mobil` pada `AHP_Studi_Kasus_Mobil (1).xlsx`.

Desain antarmuka mengadopsi estetika **AI Finance Dashboard (Smarter Money Management)** dengan tema Dark Obsidian, Glassmorphism, Palet Neon Cyan & Indigo, serta navigasi sidebar vertikal yang responsif.

🌐 **Demo Live:** [https://fikimlro95-ops.github.io/dasboard_AHP/](https://fikimlro95-ops.github.io/dasboard_AHP/)

---

## 🚀 Fitur Utama

- **Ringkasan & Peringkat Mobil**:
  - Rekomendasi pemenang (#1 Suzuki Ertiga: 48.14%) dengan margin +20.61% di atas runner-up (#2 Nissan Grand Livina: 27.53%).
  - Kartu profil untuk ke-4 alternatif mobil (Avanza, Xenia, Ertiga, Grand Livina) dilengkapi indikator skor kriteria.
  - Visualisasi interaktif Chart.js: Bar Chart Ranking, Radar Chart Multikriteria, Donut Chart Bobot Kriteria, dan Stacked Contribution Chart.
- **AI Decision Copilot ("Smarter Decision Management")**:
  - Ringkasan naratif cerdas secara real-time yang membedah faktor kemenangan dan stabilitas keputusan.
  - Aksi cepat (*quick action chips*) untuk perbandingan 2 mobil teratas dan pengujian sensitivitas.
- **Struktur Hirarki Keputusan**:
  - Visualisasi 3 tingkat (Goal, Kriteria, Alternatif) beserta diagram acuan dari Excel.
- **Matriks Perbandingan Berpasangan & Normalisasi Interaktif**:
  - Perhitungan otomatis Total Kolom, Normalisasi Matriks, Bobot Prioritas (Vektor Eigen), dan Eigen Value ($\lambda_{\max}$).
  - Toggle cepat perbandingan data Excel konsisten ($CR \le 0.10$).
- **Uji Konsistensi Saaty (Bagian 6 Excel)**:
  - Validasi Indeks Konsistensi ($CI$) dan Rasio Konsistensi ($CR = CI / RI$) terhadap tabel Random Index Saaty ($RI = 0.58$ untuk $n=3$, $RI = 0.90$ untuk $n=4$).
- **Simulasi Sensitivitas (What-If Analysis)**:
  - Slider dinamis untuk menguji perubahan prioritas preferensi pembeli terhadap peringkat mobil.
- **Navbar Swipeable & Search Bar**:
  - Header dengan filter pencarian instan (`Ctrl + K`) dan kemampuan swipe/scroll horizontal di layar desktop maupun mobile.

---

## 🛠️ Teknologi

- **HTML5** & **Vanilla CSS** (Custom Design Tokens, Glassmorphism, Micro-animations)
- **JavaScript (ES6+)** (AHP Engine terverifikasi 100% identik dengan formula Excel)
- **Chart.js v4.4** (Data visualisasi responsif dengan palet AI Finance)
