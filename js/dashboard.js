/**
 * AHP Dashboard Controller & UI Logic
 * Interactivity, Chart.js Visualizations, Dynamic Recalculation & Simulation
 */

document.addEventListener("DOMContentLoaded", () => {
  // Initialize AHP Engine
  const engine = new AHPEngine();
  let currentMatrixTab = "criteria";
  let rankingChart = null;
  let radarChart = null;
  let criteriaChart = null;
  let stackedChart = null;
  let simChart = null;

  // Format Helpers
  const fmt = (num, decimals = 4) => {
    if (num === null || num === undefined || isNaN(num)) return "-";
    return Number(num).toFixed(decimals);
  };

  const fmtPercent = (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return "-";
    return (Number(num) * 100).toFixed(decimals) + "%";
  };

  const fmtFracOrDec = (num) => {
    if (Math.abs(num - 1/2) < 0.001) return "1/2";
    if (Math.abs(num - 1/3) < 0.001) return "1/3";
    if (Math.abs(num - 1/4) < 0.001) return "1/4";
    if (Math.abs(num - 1/5) < 0.001) return "1/5";
    if (Math.abs(num - 2/3) < 0.001) return "2/3";
    if (Math.abs(num - 3/4) < 0.001) return "3/4";
    if (Number.isInteger(num)) return num.toString();
    return num.toFixed(3);
  };

  // Color Tokens for Charts
  const getThemeColors = () => {
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    return {
      textColor: isDark ? "#f8fafc" : "#0f172a",
      gridColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
      primary: "#6366f1",
      success: "#10b981",
      warning: "#f59e0b",
      info: "#0ea5e9",
      purple: "#8b5cf6"
    };
  };

  // Main Render Function
  function renderDashboard() {
    const results = engine.computeAll();

    renderKPICards(results);
    renderAICopilotCard(results);
    renderWinnerCard(results);
    renderAlternativeCards(results);
    renderSynthesisTable(results);
    renderConsistencySummary(results);
    renderActiveMatrixTab(results);
    updateCharts(results);
    updateHierarchyTree(results);
    syncSensitivitySliders(results.criteriaSolved.weights);
    updateStyleToggleButtons(results.useAdjustedStyle);
  }

  // 1. KPI Cards
  function renderKPICards(res) {
    const winnerEl = document.getElementById("kpi-winner-name");
    const winnerScoreEl = document.getElementById("kpi-winner-score");
    const dominantCritEl = document.getElementById("kpi-dominant-crit");
    const dominantCritValEl = document.getElementById("kpi-dominant-val");
    const globalCrEl = document.getElementById("kpi-global-cr");
    const diffEl = document.getElementById("kpi-diff-val");
    const winnerBar = document.getElementById("kpi-winner-bar");
    const dominantBar = document.getElementById("kpi-dominant-bar");

    if (winnerEl) winnerEl.textContent = res.winner.name;
    if (winnerScoreEl) winnerScoreEl.textContent = fmtPercent(res.winner.totalScore);
    if (winnerBar) winnerBar.style.width = (res.winner.totalScore * 100) + "%";

    // Dominant Criteria
    let maxCritIdx = 0;
    res.criteriaSolved.weights.forEach((w, idx) => {
      if (w > res.criteriaSolved.weights[maxCritIdx]) maxCritIdx = idx;
    });
    const maxCrit = res.criteria[maxCritIdx];
    const maxCritWeight = res.criteriaSolved.weights[maxCritIdx];
    if (dominantCritEl) dominantCritEl.textContent = maxCrit.name;
    if (dominantCritValEl) dominantCritValEl.textContent = fmtPercent(maxCritWeight);
    if (dominantBar) dominantBar.style.width = (maxCritWeight * 100) + "%";

    if (globalCrEl) {
      globalCrEl.textContent = res.allConsistent ? "Konsisten" : "Perlu Koreksi";
      globalCrEl.className = res.allConsistent ? "kpi-value text-success" : "kpi-value text-danger";
    }

    // Difference between rank 1 and rank 2
    const sorted = [...res.altResults].sort((a, b) => b.totalScore - a.totalScore);
    const diff = sorted[0].totalScore - sorted[1].totalScore;
    if (diffEl) diffEl.textContent = "+" + fmtPercent(diff);
  }

  // 1b. AI Copilot Smart Advisor Card
  function renderAICopilotCard(res) {
    const textEl = document.getElementById("ai-copilot-text");
    if (!textEl) return;

    const sorted = [...res.altResults].sort((a, b) => b.totalScore - a.totalScore);
    const winner = sorted[0];
    const runnerUp = sorted[1];
    const diff = winner.totalScore - runnerUp.totalScore;

    let maxCritIdx = 0;
    res.criteriaSolved.weights.forEach((w, idx) => {
      if (w > res.criteriaSolved.weights[maxCritIdx]) maxCritIdx = idx;
    });
    const maxCrit = res.criteria[maxCritIdx];
    const maxCritWeight = res.criteriaSolved.weights[maxCritIdx];

    const consistencyText = res.allConsistent
      ? `Seluruh matriks perbandingan berpasangan memenuhi batas toleransi Saaty dengan <strong>CR ≤ 0.10</strong> (Konsisten).`
      : `Perhatian: Terdapat matriks yang melebihi batas <strong>CR > 0.10</strong> dan disarankan untuk ditinjau ulang.`;

    textEl.innerHTML = `Berdasarkan evaluasi AHP terhadap 4 alternatif mobil dan 3 kriteria keputusan, <strong>${winner.brand} ${winner.name}</strong> terpilih sebagai rekomendasi pembelian paling optimal dengan skor akhir <strong>${fmtPercent(winner.totalScore)}</strong>, melampaui peringkat #2 ${runnerUp.brand} ${runnerUp.name} (${fmtPercent(runnerUp.totalScore)}) dengan margin keunggulan <strong>+${fmtPercent(diff)}</strong>. Faktor penentu terbesar adalah dominasi pada kriteria berbobot tertinggi yaitu <strong>${maxCrit.name} (${fmtPercent(maxCritWeight)})</strong> di mana ${winner.name} memperoleh bobot lokal ${fmtPercent(winner.rawScores[maxCritIdx])}. ${consistencyText}`;
  }

  // 2. Winner Spotlight Card
  function renderWinnerCard(res) {
    const w = res.winner;
    const nameEl = document.getElementById("spotlight-car-name");
    const scoreEl = document.getElementById("spotlight-score");
    const whyEl = document.getElementById("spotlight-reasons");

    if (nameEl) nameEl.textContent = w.brand + " (" + w.name + ")";
    if (scoreEl) scoreEl.textContent = `Skor Akhir: ${fmt(w.totalScore, 4)} (${fmtPercent(w.totalScore)})`;

    // Winner Breakdown Meters
    const meterK = document.getElementById("winner-meter-k");
    const barK = document.getElementById("winner-bar-k");
    const meterB = document.getElementById("winner-meter-b");
    const barB = document.getElementById("winner-bar-b");
    const meterS = document.getElementById("winner-meter-s");
    const barS = document.getElementById("winner-bar-s");

    if (meterK) meterK.textContent = fmtPercent(w.rawScores[1]);
    if (barK) barK.style.width = (w.rawScores[1] * 100) + "%";

    if (meterB) meterB.textContent = fmtPercent(w.rawScores[2]);
    if (barB) barB.style.width = (w.rawScores[2] * 100) + "%";

    if (meterS) meterS.textContent = fmtPercent(w.rawScores[0]);
    if (barS) barS.style.width = (w.rawScores[0] * 100) + "%";

    if (whyEl) {
      whyEl.innerHTML = `
        <li>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          <strong>Keandalan Tertinggi (${fmtPercent(w.rawScores[1])}):</strong> Unggul mutlak pada kriteria dengan bobot terbesar (${fmtPercent(res.criteriaSolved.weights[1])}).
        </li>
        <li>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          <strong>Style / Tampilan (${fmtPercent(w.rawScores[0])}):</strong> Menempati posisi bersaing pada kriteria estetika keluarga.
        </li>
        <li>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          <strong>Konsumsi BBM Sangat Kompetitif (${fmtPercent(w.rawScores[2])}):</strong> Memperkuat efisiensi biaya operasional jangka panjang.
        </li>
      `;
    }
  }

  // 3. Alternative Cards Grid
  function renderAlternativeCards(res) {
    const container = document.getElementById("alt-cards-container");
    if (!container) return;

    const sorted = [...res.altResults].sort((a, b) => a.rank - b.rank);

    container.innerHTML = sorted.map(alt => {
      const rankClass = `rank-${alt.rank}`;
      const medal = alt.rank === 1 ? "🥇" : alt.rank === 2 ? "🥈" : alt.rank === 3 ? "🥉" : "4️⃣";

      return `
        <div class="alt-card ${rankClass}">
          <div>
            <div class="alt-card-header">
              <div>
                <span class="alt-brand">${alt.brand}</span>
                <div class="alt-name">${alt.name}</div>
              </div>
              <div class="alt-rank-tag rank-tag-${alt.rank}">
                ${medal}
              </div>
            </div>

            <div class="alt-final-score">
              ${fmt(alt.totalScore, 4)}
              <span>(${fmtPercent(alt.totalScore)})</span>
            </div>
            <div class="kpi-subtext">Peringkat #${alt.rank} dari 4 Mobil</div>
          </div>

          <div class="alt-bars">
            <div class="bar-row">
              <div class="bar-label-row">
                <span>Style (${fmtPercent(res.criteriaSolved.weights[0], 1)})</span>
                <strong>${fmtPercent(alt.rawScores[0])}</strong>
              </div>
              <div class="progress-track">
                <div class="progress-fill fill-style" style="width: ${alt.rawScores[0] * 100}%"></div>
              </div>
            </div>

            <div class="bar-row">
              <div class="bar-label-row">
                <span>Keandalan (${fmtPercent(res.criteriaSolved.weights[1], 1)})</span>
                <strong>${fmtPercent(alt.rawScores[1])}</strong>
              </div>
              <div class="progress-track">
                <div class="progress-fill fill-keandalan" style="width: ${alt.rawScores[1] * 100}%"></div>
              </div>
            </div>

            <div class="bar-row">
              <div class="bar-label-row">
                <span>Konsumsi BBM (${fmtPercent(res.criteriaSolved.weights[2], 1)})</span>
                <strong>${fmtPercent(alt.rawScores[2])}</strong>
              </div>
              <div class="progress-track">
                <div class="progress-fill fill-bbm" style="width: ${alt.rawScores[2] * 100}%"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // 4. Synthesis Table (Section 5 Excel)
  function renderSynthesisTable(res) {
    const tableBody = document.getElementById("synthesis-table-body");
    const weightHeaders = document.getElementById("synthesis-weight-headers");
    if (!tableBody) return;

    const w = res.criteriaSolved.weights;
    if (weightHeaders) {
      weightHeaders.innerHTML = `
        <th>Mobil / Alternatif</th>
        <th>Style (${fmt(w[0], 4)})</th>
        <th>Keandalan (${fmt(w[1], 4)})</th>
        <th>BBM (${fmt(w[2], 4)})</th>
        <th>Weighted Style</th>
        <th>Weighted Keandalan</th>
        <th>Weighted BBM</th>
        <th>NILAI SKOR</th>
        <th>RANGKING</th>
      `;
    }

    const sortedByOriginal = [...res.altResults]; // original order: Avanza, Xenia, Ertiga, Grand Livina
    tableBody.innerHTML = sortedByOriginal.map(alt => {
      const isWinner = alt.rank === 1;
      return `
        <tr class="${isWinner ? 'cell-input' : ''}">
          <td style="font-weight:700; text-align:left;">
            ${isWinner ? '🏆 ' : ''}${alt.name}
          </td>
          <td>${fmt(alt.rawScores[0], 4)}</td>
          <td>${fmt(alt.rawScores[1], 4)}</td>
          <td>${fmt(alt.rawScores[2], 4)}</td>
          <td class="cell-reciprocal">${fmt(alt.weightedScores[0], 4)}</td>
          <td class="cell-reciprocal">${fmt(alt.weightedScores[1], 4)}</td>
          <td class="cell-reciprocal">${fmt(alt.weightedScores[2], 4)}</td>
          <td class="cell-weight" style="font-size:1rem;">${fmt(alt.totalScore, 6)}</td>
          <td>
            <span class="alt-rank-tag rank-tag-${alt.rank}" style="display:inline-flex; width:26px; height:26px; font-size:0.75rem;">
              ${alt.rank}
            </span>
          </td>
        </tr>
      `;
    }).join("");
  }

  // 5. Consistency Summary Table (Section 6 Excel)
  function renderConsistencySummary(res) {
    const summaryBody = document.getElementById("consistency-summary-body");
    if (!summaryBody) return;

    summaryBody.innerHTML = res.consistencySummary.map(item => {
      const statusBadge = item.isConsistent
        ? `<span class="consistency-status-badge status-consistent">✓ Konsisten (CR ≤ 0.10)</span>`
        : `<span class="consistency-status-badge status-inconsistent">✗ Tidak Konsisten (CR > 0.10)</span>`;

      return `
        <tr>
          <td style="font-weight:700; text-align:left;">${item.name} (${item.size})</td>
          <td class="cell-eigen">${fmt(item.lambdaMax, 4)}</td>
          <td>${fmt(item.ci, 4)}</td>
          <td>${fmt(item.ri, 2)}</td>
          <td class="cell-weight">${fmt(item.cr, 4)} (${fmtPercent(item.cr, 2)})</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join("");
  }

  // 6. Interactive Pairwise Matrix Tab
  function renderActiveMatrixTab(res) {
    const container = document.getElementById("matrix-interactive-container");
    if (!container) return;

    let solvedObj, labels, title, isCriteria = false, noteHtml = "";

    if (currentMatrixTab === "criteria") {
      solvedObj = res.criteriaSolved;
      labels = res.criteria.map(c => c.name);
      title = "1. Perbandingan Kriteria dengan Kriteria (3x3)";
      isCriteria = true;
    } else if (currentMatrixTab === "style") {
      solvedObj = res.styleSolved;
      labels = res.alternatives.map(a => a.name);
      title = "2. Perbandingan Kriteria Style dengan Alternatif (4x4)";
      noteHtml = `
        <div class="alert-box">
          <div class="alert-content">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>
            <div>
              <strong>Catatan Excel Khusus Matriks Style:</strong>
              <div>Perbandingan <em>Ertiga : Xenia</em> diubah dari <strong>2 (data soal asli)</strong> menjadi <strong>4</strong> agar matriks Style konsisten (CR ≤ 0.1). Saat bernilai 2, CR adalah 0.1455 (Tidak Konsisten). Saat bernilai 4, CR turun menjadi 0.0704 (Konsisten).</div>
            </div>
          </div>
          <div class="alert-actions">
            <button class="btn btn-primary" id="btn-toggle-style-case">
              ${res.useAdjustedStyle ? "Coba Nilai Soal Asli (2)" : "Kembalikan ke Excel (4)"}
            </button>
          </div>
        </div>
      `;
    } else if (currentMatrixTab === "keandalan") {
      solvedObj = res.keandalanSolved;
      labels = res.alternatives.map(a => a.name);
      title = "3. Perbandingan Kriteria Keandalan dengan Alternatif (4x4)";
    } else if (currentMatrixTab === "bbm") {
      solvedObj = res.bbmSolved;
      labels = res.alternatives.map(a => a.name);
      title = "4. Perbandingan Kriteria Konsumsi BBM dengan Alternatif (4x4)";
    }

    const n = labels.length;

    // Build Step 1: Raw Matrix Table
    let rawTableHtml = `
      <div class="table-responsive" style="margin-bottom: 1.5rem;">
        <table class="ahp-table">
          <thead>
            <tr>
              <th class="header-kriteria">Kriteria / Elemen</th>
              ${labels.map(l => `<th>${l}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
    `;

    for (let r = 0; r < n; r++) {
      rawTableHtml += `<tr><td style="font-weight:700; text-align:left;">${labels[r]}</td>`;
      for (let c = 0; c < n; c++) {
        const val = solvedObj.matrix[r][c];
        if (r === c) {
          rawTableHtml += `<td class="cell-diagonal">1</td>`;
        } else if (r > c) {
          // Lower triangle: input (green in Excel)
          rawTableHtml += `
            <td class="cell-input">
              <input type="number" step="any" min="0.05" max="9"
                class="matrix-input input-lower"
                data-tab="${currentMatrixTab}"
                data-row="${r}"
                data-col="${c}"
                value="${Math.round(val * 1000) / 1000}" />
            </td>
          `;
        } else {
          // Upper triangle: reciprocal (blue in Excel)
          rawTableHtml += `
            <td class="cell-reciprocal" title="Kebalikan: 1 / [${labels[c]}, ${labels[r]}]">
              ${fmtFracOrDec(val)}
            </td>
          `;
        }
      }
      rawTableHtml += `</tr>`;
    }

    // Column Sums Row
    rawTableHtml += `
          <tr class="cell-total-row">
            <td style="text-align:left;">TOTAL (∑)</td>
            ${solvedObj.colSums.map(s => `<td>${fmt(s, 4)}</td>`).join("")}
          </tr>
        </tbody>
      </table>
    </div>
    `;

    // Build Step 2: Normalized Matrix & Weights & Eigen Values
    let normTableHtml = `
      <div class="table-responsive">
        <table class="ahp-table">
          <thead>
            <tr>
              <th class="header-kriteria">Elemen Normalisasi</th>
              ${labels.map(l => `<th>${l}</th>`).join("")}
              <th>Jumlah Vektor</th>
              <th class="cell-weight">Bobot Prioritas</th>
              <th class="cell-eigen">Eigen Value</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (let r = 0; r < n; r++) {
      normTableHtml += `<tr><td style="font-weight:700; text-align:left;">${labels[r]}</td>`;
      for (let c = 0; c < n; c++) {
        normTableHtml += `<td>${fmt(solvedObj.normalized[r][c], 4)}</td>`;
      }
      normTableHtml += `
        <td>${fmt(solvedObj.rowSums[r], 4)}</td>
        <td class="cell-weight">${fmt(solvedObj.weights[r], 6)}</td>
        <td class="cell-eigen">${fmt(solvedObj.eigenValues[r], 4)}</td>
      </tr>`;
    }

    // Column Total for Normalized
    const normColSums = new Array(n).fill(0);
    for (let c = 0; c < n; c++) {
      for (let r = 0; r < n; r++) {
        normColSums[c] += solvedObj.normalized[r][c];
      }
    }

    normTableHtml += `
          <tr class="cell-total-row">
            <td style="text-align:left;">TOTAL</td>
            ${normColSums.map(s => `<td>${fmt(s, 2)}</td>`).join("")}
            <td>-</td>
            <td class="cell-weight">1.0000</td>
            <td class="cell-eigen">${fmt(solvedObj.lambdaMax, 4)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    `;

    // Consistency Stat Box
    const consistencyBadge = solvedObj.isConsistent
      ? `<div class="consistency-status-badge status-consistent">✓ KONSISTEN (CR ≤ 0.10)</div>`
      : `<div class="consistency-status-badge status-inconsistent">⚠️ TIDAK KONSISTEN (CR > 0.10)</div>`;

    const consistencyBoxHtml = `
      <div class="consistency-box">
        <div class="consistency-stat">
          <span class="label">Eigen Value Maks (λ max)</span>
          <span class="val cell-eigen">${fmt(solvedObj.lambdaMax, 6)}</span>
        </div>
        <div class="consistency-stat">
          <span class="label">Index Konsistensi (CI)</span>
          <span class="val">${fmt(solvedObj.ci, 6)}</span>
        </div>
        <div class="consistency-stat">
          <span class="label">Random Index (RI n=${n})</span>
          <span class="val">${fmt(solvedObj.ri, 2)}</span>
        </div>
        <div class="consistency-stat">
          <span class="label">Rasio Konsistensi (CR = CI / RI)</span>
          <span class="val cell-weight">${fmt(solvedObj.cr, 6)} (${fmtPercent(solvedObj.cr, 2)})</span>
        </div>
        <div>
          ${consistencyBadge}
        </div>
      </div>
    `;

    container.innerHTML = `
      <h3 style="margin-bottom: 0.5rem;">${title}</h3>
      <p style="margin-bottom: 1.25rem;">Gunakan tabel berikut untuk melihat dan mengubah perbandingan berpasangan. Rumus dan perhitungan otomatis menyesuaikan logika Excel.</p>
      ${noteHtml}
      
      <div class="excel-legend-bar">
        <div class="legend-item">
          <span class="legend-chip green"></span>
          <span><strong>Hijau:</strong> Nilai input perbandingan (segitiga bawah)</span>
        </div>
        <div class="legend-item">
          <span class="legend-chip blue"></span>
          <span><strong>Biru:</strong> Nilai kebalikan otomatis (1/nilai hijau)</span>
        </div>
        <div class="legend-item">
          <span class="legend-chip gray"></span>
          <span><strong>Abu-abu:</strong> Nilai diagonal perbandingan identik (= 1)</span>
        </div>
      </div>

      <h4 style="margin-bottom: 0.75rem;">Langkah 1: Matriks Perbandingan Berpasangan & Total Kolom</h4>
      ${rawTableHtml}

      <h4 style="margin-top: 1.5rem; margin-bottom: 0.75rem;">Langkah 2: Matriks Normalisasi, Bobot Prioritas & Uji Eigen</h4>
      ${normTableHtml}

      ${consistencyBoxHtml}
    `;

    // Attach Event Listeners to Inputs
    const inputs = container.querySelectorAll(".input-lower");
    inputs.forEach(input => {
      input.addEventListener("change", (e) => {
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        const tab = e.target.dataset.tab;
        const val = parseFloat(e.target.value);

        if (isNaN(val) || val <= 0) return;

        let targetMatrix;
        if (tab === "criteria") targetMatrix = engine.criteriaMatrix;
        else if (tab === "style") targetMatrix = engine.styleMatrix;
        else if (tab === "keandalan") targetMatrix = engine.keandalanMatrix;
        else if (tab === "bbm") targetMatrix = engine.bbmMatrix;

        if (targetMatrix) {
          engine.setPairwise(targetMatrix, row, col, val);
          renderDashboard();
        }
      });
    });

    // Style toggle button listener
    const toggleBtn = document.getElementById("btn-toggle-style-case");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        engine.toggleStyleCase(!engine.useAdjustedStyle);
        renderDashboard();
      });
    }
  }

  // 7. Charts Initialization & Updates
  function updateCharts(res) {
    if (typeof Chart === "undefined") {
      console.warn("Chart.js is not loaded yet.");
      return;
    }

    const theme = getThemeColors();
    const sortedAlts = [...res.altResults].sort((a, b) => b.totalScore - a.totalScore);

    // Chart 1: Final Ranking Bar Chart
    const ctxBar = document.getElementById("rankingBarChart");
    if (ctxBar) {
      const labels = sortedAlts.map(a => a.name);
      const data = sortedAlts.map(a => a.totalScore * 100);
      const bgColors = sortedAlts.map(a => {
        if (a.rank === 1) return "#fbbf24";
        if (a.rank === 2) return "#00f2fe";
        if (a.rank === 3) return "#818cf8";
        return "#64748b";
      });

      if (rankingChart) {
        rankingChart.data.labels = labels;
        rankingChart.data.datasets[0].data = data;
        rankingChart.data.datasets[0].backgroundColor = bgColors;
        rankingChart.update();
      } else {
        rankingChart = new Chart(ctxBar, {
          type: "bar",
          data: {
            labels,
            datasets: [{
              label: "Skor Akhir (%)",
              data,
              backgroundColor: bgColors,
              borderRadius: 10,
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` Skor Akhir: ${ctx.parsed.y.toFixed(2)}%`
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 60,
                ticks: { color: theme.textColor, callback: v => v + "%" },
                grid: { color: theme.gridColor }
              },
              x: {
                ticks: { color: theme.textColor, font: { weight: "600" } },
                grid: { display: false }
              }
            }
          }
        });
      }
    }

    // Chart 2: Radar Comparison Chart
    const ctxRadar = document.getElementById("radarComparisonChart");
    if (ctxRadar) {
      const radarDatasets = res.altResults.map((alt, idx) => {
        const colors = [
          { stroke: "#818cf8", bg: "rgba(129, 140, 248, 0.2)" }, // Avanza
          { stroke: "#64748b", bg: "rgba(100, 116, 139, 0.2)" }, // Xenia
          { stroke: "#fbbf24", bg: "rgba(251, 191, 36, 0.35)" }, // Ertiga (Winner)
          { stroke: "#00f2fe", bg: "rgba(0, 242, 254, 0.25)" }  // Livina (Runner-up)
        ];
        return {
          label: alt.name,
          data: alt.rawScores.map(s => s * 100),
          borderColor: colors[idx].stroke,
          backgroundColor: colors[idx].bg,
          borderWidth: alt.rank === 1 ? 3 : 1.5,
          pointRadius: 4,
          fill: true
        };
      });

      if (radarChart) {
        radarChart.data.datasets = radarDatasets;
        radarChart.update();
      } else {
        radarChart = new Chart(ctxRadar, {
          type: "radar",
          data: {
            labels: ["Style (32.0%)", "Keandalan (55.7%)", "Konsumsi BBM (12.3%)"],
            datasets: radarDatasets
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: { color: theme.textColor, boxWidth: 12 }
              }
            },
            scales: {
              r: {
                beginAtZero: true,
                max: 60,
                ticks: { display: false },
                grid: { color: theme.gridColor },
                angleLines: { color: theme.gridColor },
                pointLabels: { color: theme.textColor, font: { weight: "bold", size: 11 } }
              }
            }
          }
        });
      }
    }

    // Chart 3: Criteria Weights Donut Chart
    const ctxCrit = document.getElementById("criteriaDonutChart");
    if (ctxCrit) {
      const critLabels = res.criteria.map(c => c.name);
      const critData = res.criteriaSolved.weights.map(w => (w * 100).toFixed(2));
      const critColors = ["#818cf8", "#10b981", "#fbbf24"];

      if (criteriaChart) {
        criteriaChart.data.datasets[0].data = critData;
        criteriaChart.update();
      } else {
        criteriaChart = new Chart(ctxCrit, {
          type: "doughnut",
          data: {
            labels: critLabels,
            datasets: [{
              data: critData,
              backgroundColor: critColors,
              borderWidth: 0,
              hoverOffset: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: { color: theme.textColor, boxWidth: 14 }
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` Bobot: ${ctx.parsed}%`
                }
              }
            },
            cutout: "70%"
          }
        });
      }
    }

    // Chart 4: Stacked Bar Chart for Score Contribution
    const ctxStacked = document.getElementById("stackedContributionChart");
    if (ctxStacked) {
      const labels = res.altResults.map(a => a.name);
      const datasets = [
        {
          label: "Style Kontribusi",
          data: res.altResults.map(a => a.weightedScores[0] * 100),
          backgroundColor: "#818cf8"
        },
        {
          label: "Keandalan Kontribusi",
          data: res.altResults.map(a => a.weightedScores[1] * 100),
          backgroundColor: "#10b981"
        },
        {
          label: "BBM Kontribusi",
          data: res.altResults.map(a => a.weightedScores[2] * 100),
          backgroundColor: "#fbbf24"
        }
      ];

      if (stackedChart) {
        stackedChart.data.labels = labels;
        stackedChart.data.datasets = datasets;
        stackedChart.update();
      } else {
        stackedChart = new Chart(ctxStacked, {
          type: "bar",
          data: { labels, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: { color: theme.textColor, boxWidth: 12 }
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`
                }
              }
            },
            scales: {
              x: {
                stacked: true,
                ticks: { color: theme.textColor, font: { weight: "600" } },
                grid: { display: false }
              },
              y: {
                stacked: true,
                ticks: { color: theme.textColor, callback: v => v + "%" },
                grid: { color: theme.gridColor }
              }
            }
          }
        });
      }
    }

    // Update sensitivity simulation
    runSensitivitySimulation();
  }

  // 8. Dynamic Hierarchy Tree Nodes
  function updateHierarchyTree(res) {
    const sNode = document.getElementById("tree-crit-s");
    const kNode = document.getElementById("tree-crit-k");
    const bNode = document.getElementById("tree-crit-b");

    if (sNode) sNode.textContent = `Bobot: ${fmtPercent(res.criteriaSolved.weights[0])}`;
    if (kNode) kNode.textContent = `Bobot: ${fmtPercent(res.criteriaSolved.weights[1])}`;
    if (bNode) bNode.textContent = `Bobot: ${fmtPercent(res.criteriaSolved.weights[2])}`;

    res.altResults.forEach(alt => {
      const altNode = document.getElementById(`tree-alt-${alt.id}`);
      if (altNode) {
        altNode.textContent = `Skor: ${fmtPercent(alt.totalScore)} (Rank #${alt.rank})`;
      }
    });
  }

  // 9. Sensitivity Sliders & What-If Simulation
  function syncSensitivitySliders(weights) {
    const slStyle = document.getElementById("slider-style");
    const slKeandalan = document.getElementById("slider-keandalan");
    const slBBM = document.getElementById("slider-bbm");

    if (slStyle) slStyle.value = Math.round(weights[0] * 100);
    if (slKeandalan) slKeandalan.value = Math.round(weights[1] * 100);
    if (slBBM) slBBM.value = Math.round(weights[2] * 100);

    updateSliderBadges();
  }

  function updateSliderBadges() {
    const slStyle = document.getElementById("slider-style");
    const slKeandalan = document.getElementById("slider-keandalan");
    const slBBM = document.getElementById("slider-bbm");

    const badgeStyle = document.getElementById("badge-val-style");
    const badgeKeandalan = document.getElementById("badge-val-keandalan");
    const badgeBBM = document.getElementById("badge-val-bbm");

    if (badgeStyle && slStyle) badgeStyle.textContent = slStyle.value + "%";
    if (badgeKeandalan && slKeandalan) badgeKeandalan.textContent = slKeandalan.value + "%";
    if (badgeBBM && slBBM) badgeBBM.textContent = slBBM.value + "%";
  }

  function runSensitivitySimulation() {
    const slStyle = document.getElementById("slider-style");
    const slKeandalan = document.getElementById("slider-keandalan");
    const slBBM = document.getElementById("slider-bbm");
    if (!slStyle || !slKeandalan || !slBBM) return;

    const wS = parseFloat(slStyle.value) || 0;
    const wK = parseFloat(slKeandalan.value) || 0;
    const wB = parseFloat(slBBM.value) || 0;

    const sim = engine.simulateSensitivity(wS, wK, wB);

    const simWinnerEl = document.getElementById("sim-winner-name");
    const simWinnerScoreEl = document.getElementById("sim-winner-score");
    if (simWinnerEl) simWinnerEl.textContent = sim.winner.name;
    if (simWinnerScoreEl) simWinnerScoreEl.textContent = fmtPercent(sim.winner.totalScore);

    // Update Simulation Table / List
    const simList = document.getElementById("sim-results-list");
    if (simList) {
      const sorted = [...sim.simResults].sort((a, b) => a.rank - b.rank);
      simList.innerHTML = sorted.map(a => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.8rem; background:var(--bg-secondary); border-radius:var(--radius-sm); border:1px solid var(--border-color); margin-bottom:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span class="alt-rank-tag rank-tag-${a.rank}" style="width:26px; height:26px; font-size:0.75rem;">${a.rank}</span>
            <strong>${a.name}</strong>
          </div>
          <div style="font-weight:700; color:var(--accent-primary);">
            ${fmtPercent(a.totalScore)}
          </div>
        </div>
      `).join("");
    }

    // Update Simulation Chart
    const ctxSim = document.getElementById("simComparisonChart");
    if (ctxSim && typeof Chart !== "undefined") {
      const theme = getThemeColors();
      const sorted = [...sim.simResults].sort((a, b) => b.totalScore - a.totalScore);
      const labels = sorted.map(a => a.name);
      const data = sorted.map(a => a.percentScore);
      const colors = sorted.map(a => a.rank === 1 ? "rgba(245, 158, 11, 0.85)" : "rgba(14, 165, 233, 0.75)");

      if (simChart) {
        simChart.data.labels = labels;
        simChart.data.datasets[0].data = data;
        simChart.data.datasets[0].backgroundColor = colors;
        simChart.update();
      } else {
        simChart = new Chart(ctxSim, {
          type: "bar",
          data: {
            labels,
            datasets: [{
              label: "Skor Simulasi (%)",
              data,
              backgroundColor: colors,
              borderRadius: 6
            }]
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: {
                beginAtZero: true,
                max: 60,
                ticks: { color: theme.textColor, callback: v => v + "%" },
                grid: { color: theme.gridColor }
              },
              y: {
                ticks: { color: theme.textColor, font: { weight: "600" } },
                grid: { display: false }
              }
            }
          }
        });
      }
    }
  }

  // 10. Update Style Case Toggle Buttons
  function updateStyleToggleButtons(useAdjusted) {
    const btn = document.getElementById("btn-quick-toggle-style");
    if (!btn) return;
    if (useAdjusted) {
      btn.innerHTML = `
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span>Data Excel Konsisten</span>
      `;
      btn.title = "Data Konsisten: Ertiga:Xenia = 4 (CR = 0.0704 ≤ 0.10). Klik untuk beralih.";
      btn.className = "btn btn-success";
    } else {
      btn.innerHTML = `
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <span>Data Soal Asli</span>
      `;
      btn.title = "Data Soal Asli: Ertiga:Xenia = 2 (CR = 0.1455 > 0.10). Klik untuk kembalikan.";
      btn.className = "btn btn-primary";
    }
  }

  // Attach Navigation Tab Listeners
  const mainTabButtons = document.querySelectorAll(".tab-btn");
  mainTabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      mainTabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const targetPaneId = btn.dataset.tab;
      document.querySelectorAll(".tab-pane").forEach(pane => {
        pane.classList.remove("active");
      });
      const activePane = document.getElementById(targetPaneId);
      if (activePane) activePane.classList.add("active");

      // Update active tab title in header breadcrumb
      const titleSpan = document.getElementById("active-tab-title");
      if (titleSpan) {
        const textSpan = btn.querySelector("span");
        if (textSpan) titleSpan.textContent = textSpan.textContent;
      }

      // Close mobile sidebar if open
      const sidebar = document.getElementById("app-sidebar");
      const backdrop = document.getElementById("sidebar-backdrop");
      if (sidebar && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
        if (backdrop) backdrop.classList.remove("active");
      }

      // Resize charts upon tab switch
      setTimeout(() => {
        if (rankingChart) rankingChart.resize();
        if (radarChart) radarChart.resize();
        if (criteriaChart) criteriaChart.resize();
        if (stackedChart) stackedChart.resize();
        if (simChart) simChart.resize();
      }, 50);
    });
  });

  // Sidebar Toggle & Collapse Controller (Desktop & Mobile)
  const appLayout = document.querySelector(".app-layout");
  const sidebar = document.getElementById("app-sidebar");
  const menuBtn = document.getElementById("menu-toggle-btn");
  const closeBtn = document.getElementById("sidebar-close-btn");
  const backdrop = document.getElementById("sidebar-backdrop");

  const isMobileView = () => window.innerWidth <= 860;

  function toggleSidebar() {
    if (isMobileView()) {
      if (sidebar && sidebar.classList.contains("open")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    } else {
      if (appLayout && appLayout.classList.contains("sidebar-collapsed")) {
        expandSidebar();
      } else {
        collapseSidebar();
      }
    }
  }

  function openSidebar() {
    if (sidebar) sidebar.classList.add("open");
    if (backdrop) backdrop.classList.add("active");
  }

  function closeSidebar() {
    if (isMobileView()) {
      if (sidebar) sidebar.classList.remove("open");
      if (backdrop) backdrop.classList.remove("active");
    } else {
      collapseSidebar();
    }
  }

  function collapseSidebar() {
    if (appLayout) appLayout.classList.add("sidebar-collapsed");
    localStorage.setItem("ahp-sidebar-collapsed", "true");
    if (menuBtn) menuBtn.setAttribute("title", "Tampilkan Sidebar (Klik untuk membuka)");
    triggerChartsResize();
  }

  function expandSidebar() {
    if (appLayout) appLayout.classList.remove("sidebar-collapsed");
    localStorage.setItem("ahp-sidebar-collapsed", "false");
    if (menuBtn) menuBtn.setAttribute("title", "Sembunyikan Sidebar");
    triggerChartsResize();
  }

  function triggerChartsResize() {
    setTimeout(() => {
      if (rankingChart) rankingChart.resize();
      if (radarChart) radarChart.resize();
      if (criteriaChart) criteriaChart.resize();
      if (stackedChart) stackedChart.resize();
      if (simChart) simChart.resize();
    }, 280);
  }

  if (menuBtn) {
    menuBtn.addEventListener("click", toggleSidebar);
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeSidebar);
  }

  if (backdrop) {
    backdrop.addEventListener("click", closeSidebar);
  }

  // Restore desktop sidebar collapsed state if previously saved
  if (appLayout && !isMobileView() && localStorage.getItem("ahp-sidebar-collapsed") === "true") {
    appLayout.classList.add("sidebar-collapsed");
  }


  // Attach Sub-tab Matrix Listeners
  const subTabButtons = document.querySelectorAll(".subtab-btn");
  subTabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      subTabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentMatrixTab = btn.dataset.matrix;
      renderActiveMatrixTab(engine.computeAll());
    });
  });

  // Theme Switcher
  const themeToggleBtn = document.getElementById("btn-theme-toggle");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("ahp-theme", next);

      // Re-render charts with updated theme palette
      if (rankingChart) { rankingChart.destroy(); rankingChart = null; }
      if (radarChart) { radarChart.destroy(); radarChart = null; }
      if (criteriaChart) { criteriaChart.destroy(); criteriaChart = null; }
      if (stackedChart) { stackedChart.destroy(); stackedChart = null; }
      if (simChart) { simChart.destroy(); simChart = null; }
      updateCharts(engine.computeAll());
    });
  }

  // Saved Theme Restore
  const savedTheme = localStorage.getItem("ahp-theme");
  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
  }

  // Reset to Default Excel Button
  const resetBtn = document.getElementById("btn-reset-excel");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      engine.resetToDefault();
      renderDashboard();
      alert("Data berhasil dikembalikan ke nilai default file Excel AHP_Studi_Kasus_Mobil.");
    });
  }

  // Quick Toggle Style Case Button in Header
  const quickToggleBtn = document.getElementById("btn-quick-toggle-style");
  if (quickToggleBtn) {
    quickToggleBtn.addEventListener("click", () => {
      engine.toggleStyleCase(!engine.useAdjustedStyle);
      renderDashboard();
    });
  }

  // Print / PDF Button
  const printBtn = document.getElementById("btn-print");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }

  // Export CSV Button
  const exportCsvBtn = document.getElementById("btn-export-csv");
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", () => {
      const res = engine.computeAll();
      let csv = "Peringkat,Mobil,Style,Keandalan,Konsumsi BBM,Weighted Style,Weighted Keandalan,Weighted BBM,Skor Akhir,Persentase\n";
      res.altResults.sort((a,b)=>a.rank-b.rank).forEach(a => {
        csv += `${a.rank},"${a.name}",${a.rawScores[0]},${a.rawScores[1]},${a.rawScores[2]},${a.weightedScores[0]},${a.weightedScores[1]},${a.weightedScores[2]},${a.totalScore},"${(a.totalScore*100).toFixed(2)}%"\n`;
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "AHP_Studi_Kasus_Mobil_Hasil.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Sensitivity Sliders Listeners
  ["slider-style", "slider-keandalan", "slider-bbm"].forEach(id => {
    const slider = document.getElementById(id);
    if (slider) {
      slider.addEventListener("input", () => {
        updateSliderBadges();
        runSensitivitySimulation();
      });
    }
  });

  // Preset Simulation Scenarios
  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const preset = btn.dataset.preset;
      const slS = document.getElementById("slider-style");
      const slK = document.getElementById("slider-keandalan");
      const slB = document.getElementById("slider-bbm");
      if (!slS || !slK || !slB) return;

      if (preset === "excel") {
        slS.value = 32;
        slK.value = 56;
        slB.value = 12;
      } else if (preset === "fuel") {
        slS.value = 15;
        slK.value = 15;
        slB.value = 70;
      } else if (preset === "style") {
        slS.value = 70;
        slK.value = 20;
        slB.value = 10;
      } else if (preset === "equal") {
        slS.value = 33;
        slK.value = 33;
        slB.value = 33;
      }
      updateSliderBadges();
      runSensitivitySimulation();
    });
  });

  // AI Copilot Quick Action Chips
  const chipCompare = document.getElementById("chip-compare-top2");
  if (chipCompare) {
    chipCompare.addEventListener("click", () => {
      // Switch to summary tab
      const summaryBtn = document.querySelector('.tab-btn[data-tab="tab-summary"]');
      if (summaryBtn) summaryBtn.click();
      
      // Highlight top 2 car cards
      const cards = document.querySelectorAll(".alt-card");
      cards.forEach(c => {
        if (c.classList.contains("rank-1") || c.classList.contains("rank-2")) {
          c.classList.add("card-search-highlight");
          setTimeout(() => c.classList.remove("card-search-highlight"), 3000);
        }
      });
      const container = document.getElementById("alt-cards-container");
      if (container) container.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  const chipKeandalan = document.getElementById("chip-view-keandalan");
  if (chipKeandalan) {
    chipKeandalan.addEventListener("click", () => {
      // Switch to matrices tab
      const matricesBtn = document.querySelector('.tab-btn[data-tab="tab-matrices"]');
      if (matricesBtn) matricesBtn.click();

      // Switch to keandalan subtab
      const keandalanBtn = document.querySelector('.subtab-btn[data-matrix="keandalan"]');
      if (keandalanBtn) keandalanBtn.click();
    });
  }

  const chipSensitivity = document.getElementById("chip-sim-sensitivity");
  if (chipSensitivity) {
    chipSensitivity.addEventListener("click", () => {
      const simBtn = document.querySelector('.tab-btn[data-tab="tab-sensitivity"]');
      if (simBtn) simBtn.click();
    });
  }

  // Global Header Search & Filter (AI Finance Feature)
  const searchInput = document.getElementById("global-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      const cards = document.querySelectorAll(".alt-card");

      if (!query) {
        cards.forEach(c => {
          c.classList.remove("card-search-dimmed");
          c.classList.remove("card-search-highlight");
        });
        return;
      }

      cards.forEach(c => {
        const text = c.textContent.toLowerCase();
        if (text.includes(query)) {
          c.classList.remove("card-search-dimmed");
          c.classList.add("card-search-highlight");
        } else {
          c.classList.add("card-search-dimmed");
          c.classList.remove("card-search-highlight");
        }
      });
    });

    // Keyboard Shortcut Ctrl+K / Cmd+K to focus search
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });
  }

  // =========================================================================
  // Horizontal Swipe & Drag-to-Scroll for App Header Navbar
  // =========================================================================
  const appHeader = document.querySelector(".app-header");
  if (appHeader) {
    let isMouseDown = false;
    let startX = 0;
    let scrollLeft = 0;

    // Desktop Mouse Drag to Swipe
    appHeader.addEventListener("mousedown", (e) => {
      // Don't drag if clicking directly inside an interactive input, button, or link
      if (e.target.closest("button, input, select, a, kbd")) return;
      isMouseDown = true;
      appHeader.classList.add("header-swiping");
      startX = e.pageX - appHeader.offsetLeft;
      scrollLeft = appHeader.scrollLeft;
    });

    window.addEventListener("mouseup", () => {
      if (isMouseDown) {
        isMouseDown = false;
        appHeader.classList.remove("header-swiping");
      }
    });

    appHeader.addEventListener("mousemove", (e) => {
      if (!isMouseDown) return;
      e.preventDefault();
      const x = e.pageX - appHeader.offsetLeft;
      const walk = (x - startX) * 1.5;
      appHeader.scrollLeft = scrollLeft - walk;
    });

    // Horizontal Scroll with Mouse Wheel when hovering over header
    appHeader.addEventListener("wheel", (e) => {
      if (appHeader.scrollWidth > appHeader.clientWidth) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          appHeader.scrollLeft += e.deltaY * 0.9;
        }
      }
    }, { passive: false });
  }

  // Initial Render
  renderDashboard();
});
