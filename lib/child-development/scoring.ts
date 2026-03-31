/**
 * YİSA-S Çocuk Gelişim Modülü — skor fonksiyonları
 * CSPO: depth skoru, yaş faktörü, risk faktörü, büyüme potansiyeli
 */

/**
 * Derinlik (depth) skoru hesaplar — branş/performans derinliği
 */
export function calculateDepthScore(params: {
  baselineScores: number[]
  assessments: number[]
  weightBaseline?: number
  weightAssessment?: number
}): number {
  const { baselineScores, assessments, weightBaseline = 0.5, weightAssessment = 0.5 } = params
  const avgBaseline =
    baselineScores.length > 0
      ? baselineScores.reduce((a, b) => a + b, 0) / baselineScores.length
      : 0
  const avgAssessment =
    assessments.length > 0 ? assessments.reduce((a, b) => a + b, 0) / assessments.length : 0
  return Math.round((avgBaseline * weightBaseline + avgAssessment * weightAssessment) * 100) / 100
}

/**
 * Yaş faktörü — referans değerlere göre yaş bandı katsayısı
 */
export function calculateAgeFactor(ageYears: number, referenceMin?: number, referenceMax?: number): number {
  if (referenceMin != null && referenceMax != null) {
    if (ageYears < referenceMin) return 0.8
    if (ageYears > referenceMax) return 0.9
    return 1.0
  }
  if (ageYears >= 6 && ageYears <= 12) return 1.0
  if (ageYears < 6 || ageYears > 14) return 0.85
  return 1.0
}

/**
 * Risk faktörü — risk flag sayısına göre düşürme
 */
export function calculateRiskFactor(riskCount: number, severityWeight?: number): number {
  const w = severityWeight ?? 1
  if (riskCount === 0) return 1.0
  const reduction = Math.min(0.5, riskCount * 0.1 * w)
  return Math.max(0.5, 1.0 - reduction)
}

/**
 * Büyüme potansiyeli — depth + yaş + risk birleşik
 */
export function calculateGrowthPotential(params: {
  depthScore: number
  ageFactor: number
  riskFactor: number
  maxDepth?: number
}): number {
  const { depthScore, ageFactor, riskFactor, maxDepth = 100 } = params
  const normalized = (depthScore / maxDepth) * ageFactor * riskFactor
  return Math.round(Math.min(1, Math.max(0, normalized)) * 100) / 100
}
