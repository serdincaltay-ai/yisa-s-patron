/**
 * YİSA-S Çoklu Ajan Orkestrasyon Tipleri
 * Gemini → Fal → V0 → Cursor → GitHub zinciri gibi
 * çoklu ajan pipeline'larını tanımlar.
 */

/** Desteklenen ajan kimlikleri */
export type AgentId =
  | "gemini"
  | "gpt"
  | "claude"
  | "together"
  | "fal"
  | "v0"
  | "cursor"
  | "github"
  | "vercel"

/** Adımın ürettiği çıktı tipi */
export type StepOutputType = "text" | "image" | "video" | "code" | "ui" | "url" | "json"

/** Zincirdeki tek bir adım */
export interface OrchestrationStep {
  /** Adımın benzersiz kimliği (zincir içinde) */
  step_id: string
  /** Hangi ajan çalıştırılacak */
  agent_id: AgentId
  /** Girdi hangi adımdan gelecek? null = kullanıcı girdisi */
  input_from: string | null
  /** Prompt şablonu — {{input}} placeholder'ı önceki adımın çıktısıyla değiştirilir */
  prompt_template: string
  /** Bu adımın ürettiği çıktı tipi */
  output_type: StepOutputType
  /** Adım açıklaması (UI'da gösterilir) */
  label: string
}

/** Orkestrasyon zinciri tanımı */
export interface OrchestrationChain {
  /** Zincir şablon kimliği */
  chain_id: string
  /** Zincir adı (Türkçe, UI'da gösterilir) */
  name: string
  /** Kısa açıklama */
  description: string
  /** Sıralı adımlar */
  steps: OrchestrationStep[]
}

/** Çalışan bir adımın durumu */
export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped"

/** Çalışan bir adımın anlık durumu */
export interface StepExecution {
  step_id: string
  agent_id: AgentId
  label: string
  status: StepStatus
  output_type: StepOutputType
  /** Adımın ürettiği çıktı (tamamlandıysa) */
  output: string | null
  /** Görsel URL (output_type image/video ise) */
  output_url: string | null
  /** Hata mesajı (başarısızsa) */
  error: string | null
  /** Başlama zamanı */
  started_at: string | null
  /** Bitiş zamanı */
  finished_at: string | null
}

/** Tüm zincirin çalışma durumu */
export type ChainStatus = "pending" | "running" | "completed" | "failed" | "cancelled"

/** Çalışan bir zincirin anlık durumu */
export interface ChainExecution {
  /** Benzersiz çalıştırma kimliği */
  execution_id: string
  /** Kullanılan zincir şablonu */
  chain_id: string
  /** Zincir adı */
  chain_name: string
  /** Kullanıcının orijinal komutu */
  user_input: string
  /** Genel durum */
  status: ChainStatus
  /** Adımların durumları */
  steps: StepExecution[]
  /** Başlama zamanı */
  started_at: string
  /** Bitiş zamanı */
  finished_at: string | null
  /** Toplam adım sayısı */
  total_steps: number
  /** Tamamlanan adım sayısı */
  completed_steps: number
}

/** Zincir çalıştırma isteği */
export interface RunChainRequest {
  /** Hangi zincir şablonu kullanılacak (chain_id) */
  chain_id: string
  /** Kullanıcı girdisi (ilk adımın prompt'unda kullanılır) */
  user_input: string
}

/** Zincir çalıştırma yanıtı */
export interface RunChainResponse {
  /** Çalıştırma kimliği (durum sorgulamak için) */
  execution_id: string
  /** Zincir adı */
  chain_name: string
  /** Toplam adım sayısı */
  total_steps: number
  /** Başlangıç durumu */
  status: ChainStatus
}
