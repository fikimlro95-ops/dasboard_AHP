/**
 * AHP Engine - Analytic Hierarchy Process Mathematical Core
 * Berdasarkan Studi Kasus Pemilihan Mobil (AHP_Studi_Kasus_Mobil (1).xlsx)
 */

const SAATY_RI = {
  1: 0.00,
  2: 0.00,
  3: 0.58,
  4: 0.90,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49
};

const SAATY_SCALE_DESCRIPTIONS = {
  1: "Sama penting (Equal importance)",
  2: "Mendekati sedikit lebih penting (Between equal and moderate)",
  3: "Sedikit lebih penting (Moderate importance)",
  4: "Mendekati lebih penting (Between moderate and strong)",
  5: "Jelas lebih penting (Strong importance)",
  6: "Mendekati sangat penting (Between strong and very strong)",
  7: "Sangat penting (Very strong importance)",
  8: "Mendekati mutlak lebih penting (Between very strong and extreme)",
  9: "Mutlak lebih penting (Extreme importance)"
};

// Data Asli Sesuai Excel AHP_Studi_Kasus_Mobil (1).xlsx
const DEFAULT_AHP_DATA = {
  criteria: [
    { id: "S", name: "Style", code: "S", desc: "Desain, estetika, dan tampilan eksterior & interior" },
    { id: "K", name: "Keandalan", code: "K", desc: "Daya tahan mesin, performa, ketangguhan & keamanan" },
    { id: "B", name: "Konsumsi BBM", code: "B", desc: "Efisiensi pemakaian bahan bakar minyak per km" }
  ],
  alternatives: [
    { id: "avanza", name: "Avanza", brand: "Toyota Avanza", image: "avanza", tag: "MPV Terlaris" },
    { id: "xenia", name: "Xenia", brand: "Daihatsu Xenia", image: "xenia", tag: "MPV Ekonomis" },
    { id: "ertiga", name: "Ertiga", brand: "Suzuki Ertiga", image: "ertiga", tag: "MPV Nyaman" },
    { id: "grand_livina", name: "Grand Livina", brand: "Nissan Grand Livina", image: "livina", tag: "MPV Sedan-like" }
  ],
  // Matriks Kriteria (3x3): S, K, B
  criteriaMatrix: [
    [1, 1/2, 3],
    [2, 1, 4],
    [1/3, 1/4, 1]
  ],
  // Matriks Alternatif thd Style (4x4): Avanza, Xenia, Ertiga, Grand Livina
  // Catatan Excel: Ertiga:Xenia = 4 (agar CR <= 0.1)
  styleMatrix: [
    [1, 2, 1/3, 1/4],
    [1/2, 1, 1/4, 1/5],
    [3, 4, 1, 2],
    [4, 5, 1/2, 1]
  ],
  // Alternatif thd Keandalan (4x4)
  keandalanMatrix: [
    [1, 2, 1/4, 1/3],
    [1/2, 1, 1/5, 1/4],
    [4, 5, 1, 3],
    [3, 4, 1/3, 1]
  ],
  // Alternatif thd Konsumsi BBM (4x4)
  bbmMatrix: [
    [1, 2, 1/2, 4],
    [1/2, 1, 2/3, 3],
    [2, 1.5, 1, 4],
    [1/4, 1/3, 1/4, 1]
  ]
};

class AHPEngine {
  constructor() {
    this.resetToDefault();
  }

  resetToDefault() {
    this.criteria = JSON.parse(JSON.stringify(DEFAULT_AHP_DATA.criteria));
    this.alternatives = JSON.parse(JSON.stringify(DEFAULT_AHP_DATA.alternatives));
    this.criteriaMatrix = JSON.parse(JSON.stringify(DEFAULT_AHP_DATA.criteriaMatrix));
    this.styleMatrix = JSON.parse(JSON.stringify(DEFAULT_AHP_DATA.styleMatrix));
    this.keandalanMatrix = JSON.parse(JSON.stringify(DEFAULT_AHP_DATA.keandalanMatrix));
    this.bbmMatrix = JSON.parse(JSON.stringify(DEFAULT_AHP_DATA.bbmMatrix));
    this.useAdjustedStyle = true; // true = 4, false = 2 (soal asli)
  }

  /**
   * Set comparison value in pairwise matrix. Automatically sets reciprocal.
   */
  setPairwise(matrix, rowIdx, colIdx, val) {
    if (rowIdx === colIdx) {
      matrix[rowIdx][colIdx] = 1;
      return;
    }
    const numVal = parseFloat(val);
    if (isNaN(numVal) || numVal <= 0) return;
    matrix[rowIdx][colIdx] = numVal;
    matrix[colIdx][rowIdx] = 1 / numVal;
  }

  /**
   * Toggle between Excel tuned Ertiga:Xenia = 4 and Soal Asli = 2
   */
  toggleStyleCase(useAdjusted) {
    this.useAdjustedStyle = useAdjusted;
    // Ertiga is index 2, Xenia is index 1
    const ertigaVsXenia = useAdjusted ? 4 : 2;
    this.setPairwise(this.styleMatrix, 2, 1, ertigaVsXenia);
  }

  /**
   * Calculate AHP parameters for an n x n pairwise matrix
   * Returns:
   * - matrix (copy)
   * - colSums (sum of each column)
   * - normalized (matrix / colSums)
   * - rowSums (sum of normalized row)
   * - weights (rowSums / n)
   * - eigenValues (colSums[i] * weights[i])
   * - lambdaMax (sum of eigenValues)
   * - ci ((lambdaMax - n) / (n - 1))
   * - ri (Saaty random index for n)
   * - cr (ci / ri)
   * - isConsistent (cr <= 0.10)
   */
  solveMatrix(mat) {
    const n = mat.length;
    const colSums = new Array(n).fill(0);

    for (let c = 0; c < n; c++) {
      for (let r = 0; r < n; r++) {
        colSums[c] += mat[r][c];
      }
    }

    const normalized = [];
    const rowSums = new Array(n).fill(0);
    const weights = new Array(n).fill(0);

    for (let r = 0; r < n; r++) {
      normalized[r] = [];
      let rSum = 0;
      for (let c = 0; c < n; c++) {
        const normVal = colSums[c] > 0 ? mat[r][c] / colSums[c] : 0;
        normalized[r][c] = normVal;
        rSum += normVal;
      }
      rowSums[r] = rSum;
      weights[r] = rSum / n;
    }

    // Exact Excel formula: Eigen Value = col_sum * weight
    const eigenValues = new Array(n).fill(0);
    let lambdaMax = 0;
    for (let i = 0; i < n; i++) {
      eigenValues[i] = colSums[i] * weights[i];
      lambdaMax += eigenValues[i];
    }

    const ci = n > 1 ? (lambdaMax - n) / (n - 1) : 0;
    const ri = SAATY_RI[n] || 0.90;
    const cr = ri > 0 ? ci / ri : 0;
    const isConsistent = cr <= 0.100001; // tolerance for rounding

    return {
      n,
      matrix: mat,
      colSums,
      normalized,
      rowSums,
      weights,
      eigenValues,
      lambdaMax,
      ci,
      ri,
      cr,
      isConsistent
    };
  }

  /**
   * Compute full AHP model and synthesis
   */
  computeAll() {
    const resCriteria = this.solveMatrix(this.criteriaMatrix);
    const resStyle = this.solveMatrix(this.styleMatrix);
    const resKeandalan = this.solveMatrix(this.keandalanMatrix);
    const resBBM = this.solveMatrix(this.bbmMatrix);

    const critWeights = resCriteria.weights; // [wS, wK, wB]
    const numAlts = this.alternatives.length;

    // Synthesis:
    // Raw scores: [ [S_i, K_i, B_i], ... ]
    // Weighted scores: [ [S_i*wS, K_i*wK, B_i*wB], ... ]
    // Total score = sum of weighted scores
    const altResults = [];
    for (let i = 0; i < numAlts; i++) {
      const alt = this.alternatives[i];
      const sScore = resStyle.weights[i];
      const kScore = resKeandalan.weights[i];
      const bScore = resBBM.weights[i];

      const wStyle = sScore * critWeights[0];
      const wKeandalan = kScore * critWeights[1];
      const wBBM = bScore * critWeights[2];
      const totalScore = wStyle + wKeandalan + wBBM;

      altResults.push({
        id: alt.id,
        name: alt.name,
        brand: alt.brand,
        tag: alt.tag,
        rawScores: [sScore, kScore, bScore],
        weightedScores: [wStyle, wKeandalan, wBBM],
        totalScore,
        percentScore: totalScore * 100,
        rank: 1 // calculated next
      });
    }

    // Rank sorting (highest score = rank 1)
    const sorted = [...altResults].sort((a, b) => b.totalScore - a.totalScore);
    sorted.forEach((item, idx) => {
      const found = altResults.find(a => a.id === item.id);
      if (found) found.rank = idx + 1;
    });

    // Summary of Consistency (Section 6 Excel)
    const consistencySummary = [
      {
        name: "Kriteria (S, K, B)",
        code: "Kriteria",
        size: "3x3",
        lambdaMax: resCriteria.lambdaMax,
        ci: resCriteria.ci,
        ri: resCriteria.ri,
        cr: resCriteria.cr,
        isConsistent: resCriteria.isConsistent
      },
      {
        name: "Alternatif thd Style",
        code: "Style",
        size: "4x4",
        lambdaMax: resStyle.lambdaMax,
        ci: resStyle.ci,
        ri: resStyle.ri,
        cr: resStyle.cr,
        isConsistent: resStyle.isConsistent
      },
      {
        name: "Alternatif thd Keandalan",
        code: "Keandalan",
        size: "4x4",
        lambdaMax: resKeandalan.lambdaMax,
        ci: resKeandalan.ci,
        ri: resKeandalan.ri,
        cr: resKeandalan.cr,
        isConsistent: resKeandalan.isConsistent
      },
      {
        name: "Alternatif thd Konsumsi BBM",
        code: "Konsumsi BBM",
        size: "4x4",
        lambdaMax: resBBM.lambdaMax,
        ci: resBBM.ci,
        ri: resBBM.ri,
        cr: resBBM.cr,
        isConsistent: resBBM.isConsistent
      }
    ];

    const allConsistent = consistencySummary.every(c => c.isConsistent);
    const winner = [...altResults].sort((a, b) => a.rank - b.rank)[0];

    return {
      criteria: this.criteria,
      alternatives: this.alternatives,
      criteriaSolved: resCriteria,
      styleSolved: resStyle,
      keandalanSolved: resKeandalan,
      bbmSolved: resBBM,
      altResults,
      consistencySummary,
      allConsistent,
      winner,
      useAdjustedStyle: this.useAdjustedStyle
    };
  }

  /**
   * Run sensitivity simulation by overriding criteria weights
   */
  simulateSensitivity(wStyle, wKeandalan, wBBM) {
    const sum = wStyle + wKeandalan + wBBM;
    const normStyle = sum > 0 ? wStyle / sum : 1/3;
    const normKeandalan = sum > 0 ? wKeandalan / sum : 1/3;
    const normBBM = sum > 0 ? wBBM / sum : 1/3;

    const resStyle = this.solveMatrix(this.styleMatrix);
    const resKeandalan = this.solveMatrix(this.keandalanMatrix);
    const resBBM = this.solveMatrix(this.bbmMatrix);

    const simResults = this.alternatives.map((alt, i) => {
      const sScore = resStyle.weights[i];
      const kScore = resKeandalan.weights[i];
      const bScore = resBBM.weights[i];

      const wS = sScore * normStyle;
      const wK = kScore * normKeandalan;
      const wB = bScore * normBBM;
      const total = wS + wK + wB;

      return {
        id: alt.id,
        name: alt.name,
        brand: alt.brand,
        totalScore: total,
        percentScore: total * 100,
        weighted: [wS, wK, wB]
      };
    });

    const sorted = [...simResults].sort((a, b) => b.totalScore - a.totalScore);
    sorted.forEach((item, idx) => {
      const found = simResults.find(a => a.id === item.id);
      if (found) found.rank = idx + 1;
    });

    return {
      weights: [normStyle, normKeandalan, normBBM],
      simResults,
      winner: sorted[0]
    };
  }
}

// Export for global browser use
window.AHPEngine = AHPEngine;
window.SAATY_SCALE_DESCRIPTIONS = SAATY_SCALE_DESCRIPTIONS;
window.SAATY_RI = SAATY_RI;
window.DEFAULT_AHP_DATA = DEFAULT_AHP_DATA;
