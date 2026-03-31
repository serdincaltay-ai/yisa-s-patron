"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import {
  Code2,
  ImageIcon,
  Video,
  FileText,
  Layout,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

// ==================== TYPES ====================

export interface CelfOutputData {
  type: "code" | "image" | "video" | "text" | "design"
  content: string
  language?: string
  images?: string[]
  videoUrl?: string
  iframeUrl?: string
  metadata?: Record<string, unknown>
}

interface CelfOutputPreviewProps {
  output: Record<string, unknown> | null
  outputType: string | null
}

// ==================== HELPERS ====================

function parseOutputData(
  output: Record<string, unknown> | null,
  outputType: string | null
): CelfOutputData {
  if (!output) {
    return { type: "text", content: "Henuz cikti yok." }
  }

  const rawType = (outputType ?? (output.type as string) ?? "text").toLowerCase()

  // Code output
  if (rawType === "code" || rawType === "sql" || rawType === "api") {
    const code =
      (output.code as string) ??
      (output.sql as string) ??
      (output.artifact as string) ??
      (output.result as string) ??
      (typeof output.plan === "string" ? output.plan : null) ??
      JSON.stringify(output, null, 2)
    const language =
      (output.language as string) ??
      (rawType === "sql" ? "sql" : "typescript")
    return { type: "code", content: code, language }
  }

  // Image output
  if (rawType === "image" || rawType === "design_image" || rawType === "gorsel") {
    const images: string[] = []
    if (output.url) images.push(output.url as string)
    if (output.image_url) images.push(output.image_url as string)
    if (Array.isArray(output.images)) {
      images.push(
        ...(output.images as string[]).filter((u) => typeof u === "string")
      )
    }
    if (Array.isArray(output.urls)) {
      images.push(
        ...(output.urls as string[]).filter((u) => typeof u === "string")
      )
    }
    return {
      type: "image",
      content: (output.description as string) ?? "",
      images: images.length > 0 ? images : undefined,
    }
  }

  // Video output
  if (rawType === "video" || rawType === "animation") {
    const videoUrl =
      (output.video_url as string) ??
      (output.url as string) ??
      (output.result as string) ??
      ""
    return {
      type: "video",
      content: (output.description as string) ?? "",
      videoUrl,
    }
  }

  // Design / iframe output
  if (rawType === "design" || rawType === "ui" || rawType === "v0") {
    const iframeUrl = (output.iframe_url as string) ?? (output.url as string) ?? ""
    const code = (output.code as string) ?? (output.html as string) ?? ""
    return {
      type: "design",
      content: code,
      iframeUrl,
    }
  }

  // Default: text / markdown
  const textContent =
    (output.plan as string) ??
    (output.note as string) ??
    (output.text as string) ??
    (output.result as string) ??
    (output.summary as string) ??
    (output.response as string) ??
    (typeof output === "object" ? JSON.stringify(output, null, 2) : String(output))

  return { type: "text", content: textContent }
}

const OUTPUT_TYPE_ICONS: Record<CelfOutputData["type"], typeof Code2> = {
  code: Code2,
  image: ImageIcon,
  video: Video,
  text: FileText,
  design: Layout,
}

const OUTPUT_TYPE_LABELS: Record<CelfOutputData["type"], string> = {
  code: "Kod",
  image: "Gorsel",
  video: "Video",
  text: "Metin",
  design: "Tasarim",
}

// ==================== CODE PREVIEW ====================

function CodePreview({ data }: { data: CelfOutputData }) {
  const [showPreview, setShowPreview] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(data.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isHtml =
    data.language === "html" ||
    data.content.trim().startsWith("<") ||
    data.content.includes("<!DOCTYPE")

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a3650] bg-[#0a0e17]/60">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-[#8892a8] uppercase tracking-wider">
            {data.language ?? "code"}
          </span>
          {isHtml && (
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#2a3650] text-[#8b5cf6] hover:bg-[#8b5cf6]/10 transition-colors"
            >
              {showPreview ? "Kod" : "Onizleme"}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded border border-[#2a3650] text-[#8892a8] hover:text-[#e2e8f0] hover:bg-[#2a3650]/50 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
          {copied ? "Kopyalandi" : "Kopyala"}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {showPreview && isHtml ? (
          <iframe
            srcDoc={data.content}
            title="Code Preview"
            className="w-full h-full min-h-[300px] bg-white"
            sandbox="allow-scripts"
          />
        ) : (
          <SyntaxHighlighter
            language={data.language ?? "typescript"}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: "16px",
              background: "#060a13",
              fontSize: "11px",
              lineHeight: "1.6",
              minHeight: "200px",
            }}
            wrapLongLines
          >
            {data.content}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  )
}

// ==================== IMAGE GALLERY ====================

function ImageGallery({ data }: { data: CelfOutputData }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const images = data.images ?? []

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <ImageIcon className="w-12 h-12 text-[#8892a8]/30 mx-auto mb-2" />
          <p className="text-xs font-mono text-[#8892a8]">Gorsel bulunamadi</p>
          {data.content && (
            <p className="text-[10px] font-mono text-[#8892a8]/60 mt-1 max-w-md">
              {data.content}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Main image */}
      <div className="flex-1 relative flex items-center justify-center bg-[#060a13] overflow-hidden">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="relative group cursor-zoom-in"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[activeIndex]}
            alt={data.content || `Gorsel ${activeIndex + 1}`}
            className="max-h-[400px] max-w-full object-contain"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <Maximize2 className="w-6 h-6 text-white" />
          </div>
        </button>

        {/* Nav arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActiveIndex((i) => (i - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((i) => (i + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto border-t border-[#2a3650]">
          {images.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                idx === activeIndex
                  ? "border-[#8b5cf6]"
                  : "border-[#2a3650] opacity-60 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center cursor-zoom-out"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[activeIndex]}
            alt={data.content || "Lightbox"}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

// ==================== VIDEO PLAYER ====================

function VideoPlayer({ data }: { data: CelfOutputData }) {
  if (!data.videoUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Video className="w-12 h-12 text-[#8892a8]/30 mx-auto mb-2" />
          <p className="text-xs font-mono text-[#8892a8]">Video URL bulunamadi</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-full bg-[#060a13] p-4">
      <video
        src={data.videoUrl}
        controls
        className="max-h-[400px] max-w-full rounded-lg"
        preload="metadata"
      >
        Tarayiciniz video etiketini desteklemiyor.
      </video>
    </div>
  )
}

// ==================== MARKDOWN RENDER ====================

function MarkdownRender({ data }: { data: CelfOutputData }) {
  return (
    <div className="p-4 overflow-auto h-full">
      <div className="prose prose-invert prose-sm max-w-none font-mono text-[12px] leading-relaxed [&_h1]:text-[#e2e8f0] [&_h2]:text-[#e2e8f0] [&_h3]:text-[#e2e8f0] [&_p]:text-[#cbd5e1] [&_li]:text-[#cbd5e1] [&_strong]:text-[#e2e8f0] [&_a]:text-[#8b5cf6] [&_code]:text-[#f59e0b] [&_code]:bg-[#1a1a2e] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-[#060a13] [&_pre]:border [&_pre]:border-[#2a3650] [&_blockquote]:border-[#8b5cf6]/30 [&_table]:border-[#2a3650] [&_th]:border-[#2a3650] [&_td]:border-[#2a3650] [&_hr]:border-[#2a3650]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
      </div>
    </div>
  )
}

// ==================== DESIGN/IFRAME PREVIEW ====================

function DesignPreview({ data }: { data: CelfOutputData }) {
  const [fullscreen, setFullscreen] = useState(false)

  // If we have an iframe URL, use it directly
  if (data.iframeUrl) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a3650] bg-[#0a0e17]/60">
          <span className="text-[9px] font-mono text-[#8892a8] uppercase tracking-wider">
            V0 / Tasarim Onizleme
          </span>
          <button
            type="button"
            onClick={() => setFullscreen(!fullscreen)}
            className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#2a3650] text-[#8892a8] hover:text-[#e2e8f0] hover:bg-[#2a3650]/50 transition-colors"
          >
            {fullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>
        <div className={`flex-1 ${fullscreen ? "fixed inset-0 z-[100] bg-white" : ""}`}>
          {fullscreen && (
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
          <iframe
            src={data.iframeUrl}
            title="Design Preview"
            className="w-full h-full min-h-[300px]"
            sandbox="allow-scripts"
          />
        </div>
      </div>
    )
  }

  // Fallback: render HTML content in sandboxed iframe
  if (data.content) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a3650] bg-[#0a0e17]/60">
          <span className="text-[9px] font-mono text-[#8892a8] uppercase tracking-wider">
            Tasarim Onizleme
          </span>
        </div>
        <div className="flex-1">
          <iframe
            srcDoc={data.content}
            title="Design Preview"
            className="w-full h-full min-h-[300px] bg-white"
            sandbox="allow-scripts"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Layout className="w-12 h-12 text-[#8892a8]/30 mx-auto mb-2" />
        <p className="text-xs font-mono text-[#8892a8]">Tasarim icerigi bulunamadi</p>
      </div>
    </div>
  )
}

// ==================== MAIN EXPORT ====================

export default function CelfOutputPreview({ output, outputType }: CelfOutputPreviewProps) {
  const data = parseOutputData(output, outputType)
  const TypeIcon = OUTPUT_TYPE_ICONS[data.type]
  const typeLabel = OUTPUT_TYPE_LABELS[data.type]

  return (
    <div className="flex flex-col h-full rounded-lg border border-[#2a3650] bg-[#0a0e17]/80 overflow-hidden">
      {/* Type indicator header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a3650]/60 bg-[#0f1420]/80">
        <TypeIcon className="w-3.5 h-3.5 text-[#8b5cf6]" />
        <span className="text-[9px] font-mono font-bold text-[#8b5cf6] uppercase tracking-wider">
          {typeLabel} Ciktisi
        </span>
      </div>

      {/* Render based on type */}
      <div className="flex-1 min-h-0">
        {data.type === "code" && <CodePreview data={data} />}
        {data.type === "image" && <ImageGallery data={data} />}
        {data.type === "video" && <VideoPlayer data={data} />}
        {data.type === "text" && <MarkdownRender data={data} />}
        {data.type === "design" && <DesignPreview data={data} />}
      </div>
    </div>
  )
}

export { parseOutputData, OUTPUT_TYPE_ICONS, OUTPUT_TYPE_LABELS }
export type { CelfOutputData as CelfOutputDataType }
