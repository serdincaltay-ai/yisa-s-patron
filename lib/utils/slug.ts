/**
 * YİSA-S Slug Utility
 * Firma adından slug üretme ve benzersizlik kontrolü
 */

/**
 * Türkçe karakterleri İngilizce karşılıklarına çevirir
 */
function turkishToEnglish(text: string): string {
  const turkishChars: Record<string, string> = {
    ş: "s",
    Ş: "s",
    ç: "c",
    Ç: "c",
    ğ: "g",
    Ğ: "g",
    ü: "u",
    Ü: "u",
    ö: "o",
    Ö: "o",
    ı: "i",
    İ: "i",
  }

  return text
    .split("")
    .map((char) => turkishChars[char] || char)
    .join("")
}

/**
 * Metni slug formatına çevirir
 * - Türkçe karakterleri değiştir
 * - Küçük harfe çevir
 * - Boşlukları tire ile değiştir
 * - Özel karakterleri sil (sadece [a-z0-9-] kalmalı)
 * - Ardışık tireleri tek tire yap
 * - Başta/sonda tire varsa sil
 */
export function generateSlug(text: string): string {
  if (!text) return ""

  let slug = text
    .trim()
    .toLowerCase()

  // Türkçe karakterleri değiştir
  slug = turkishToEnglish(slug)

  // Boşlukları tire ile değiştir
  slug = slug.replace(/\s+/g, "-")

  // Özel karakterleri sil (sadece [a-z0-9-] kalmalı)
  slug = slug.replace(/[^a-z0-9-]/g, "")

  // Ardışık tireleri tek tire yap
  slug = slug.replace(/-+/g, "-")

  // Başta/sonda tire varsa sil
  slug = slug.replace(/^-+|-+$/g, "")

  return slug
}

/**
 * Slug benzersizliği kontrolü
 * Eğer slug zaten varsa, sonuna -2, -3, -4 ekler
 */
export async function ensureUniqueSlug(
  baseSlug: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  const slug = baseSlug
  let counter = 2

  // İlk slug'ı kontrol et
  const exists = await checkExists(slug)
  if (!exists) {
    return slug
  }

  // Benzersiz slug bulana kadar dene
  while (true) {
    const newSlug = `${baseSlug}-${counter}`
    const newExists = await checkExists(newSlug)

    if (!newExists) {
      return newSlug
    }

    counter++

    // Güvenlik: Sonsuz döngü önleme
    if (counter > 1000) {
      throw new Error("Slug benzersizliği sağlanamadı")
    }
  }
}

/**
 * Slug validation
 * Slug sadece [a-z0-9-] karakterlerini içermeli
 */
export function isValidSlug(slug: string): boolean {
  if (!slug) return false
  const slugRegex = /^[a-z0-9-]+$/
  return slugRegex.test(slug) && slug.length >= 2 && slug.length <= 50
}
