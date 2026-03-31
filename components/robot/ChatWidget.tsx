"use client"

import { useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  ClipboardList,
  RotateCcw,
} from "lucide-react"

/* ================================================================
   YiSA-S Patron Chat Widget — Floating sag-alt kose
   CELF gorev olusturma + robot-chat API entegrasyonu
   ================================================================ */

interface ChatMessage {
  id: string
  role: "user" | "bot"
  text: string
  ts: number
}

const WELCOME_MSG: ChatMessage = {
  id: "welcome",
  role: "bot",
  text: "Merhaba! Ben YiSA-S Robot Asistanınız. Yoklama, aidat, rapor, görev yönetimi ve daha fazlası hakkında sorularınızı yanıtlayabilirim.",
  ts: Date.now(),
}

export default function RobotChatWidget() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auth sayfalarinda widget gosterme
  if (pathname?.startsWith("/auth")) {
    return null
  }

  async function handleSend() {
    if (!input.trim() || sending) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: input.trim(),
      ts: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setSending(true)

    // CELF gorev olusturma kisa yolu
    const lowerText = input.trim().toLowerCase()
    const isTaskRequest =
      lowerText.startsWith("gorev:") ||
      lowerText.startsWith("görev:") ||
      lowerText.startsWith("task:")

    if (isTaskRequest) {
      const taskTitle = input
        .trim()
        .replace(/^(gorev:|görev:|task:)\s*/i, "")
        .trim()
      if (taskTitle) {
        await createCelfTask(taskTitle)
        setSending(false)
        return
      }
    }

    // Normal robot-chat API
    try {
      const res = await fetch("/api/robot-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text }),
      })
      const data = await res.json()
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "bot",
        text:
          data?.reply ||
          "Anlıyorum, bu konuda yardımcı olabilirim. Detaylı bilgi için ilgili sayfayı kontrol edin.",
        ts: Date.now(),
      }
      setMessages((prev) => [...prev, botMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: "bot",
          text: "Bağlantı hatası. Lütfen tekrar deneyin.",
          ts: Date.now(),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  async function createCelfTask(title: string) {
    const pendingMsg: ChatMessage = {
      id: `bot-pending-${Date.now()}`,
      role: "bot",
      text: `CELF görev oluşturuluyor: "${title}"...`,
      ts: Date.now(),
    }
    setMessages((prev) => [...prev, pendingMsg])

    try {
      const res = await fetch("/api/celf/tasks/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: title,
          confirmed: true,
        }),
      })
      const data = await res.json()
      const resultMsg: ChatMessage = {
        id: `bot-result-${Date.now()}`,
        role: "bot",
        text: data?.epicId
          ? `CELF görevi oluşturuldu! Başlık: "${title}". Görev kuyruğuna eklendi.`
          : `Görev oluşturulamadı: ${typeof data?.error === "string" ? data.error : data?.error?.message ?? "Bilinmeyen hata"}`,
        ts: Date.now(),
      }
      setMessages((prev) => [...prev, resultMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: "bot",
          text: "Bağlantı hatası. Görev oluşturulamadı.",
          ts: Date.now(),
        },
      ])
    }
  }

  function handleReset() {
    setMessages([WELCOME_MSG])
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 flex items-center justify-center transition-all hover:scale-110"
          aria-label="Chat aç"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-32px)] h-[520px] max-h-[calc(100vh-96px)] md:max-h-[calc(100vh-48px)] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="text-sm font-semibold text-white">
                  YiSA-S Robot
                </span>
                <span className="text-xs text-zinc-500 ml-2">
                  Patron Asistan
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
                title="Sohbeti sıfırla"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-zinc-500 hover:text-white rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "bot" && (
                  <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-cyan-400" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-cyan-600 text-white rounded-br-md"
                      : "bg-zinc-800 text-zinc-200 rounded-bl-md"
                  }`}
                >
                  {msg.text}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-zinc-300" />
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="bg-zinc-800 text-zinc-400 rounded-xl rounded-bl-md px-3 py-2 text-sm">
                  Yazılıyor...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* CELF Task Shortcut */}
          <div className="px-4 py-1.5 bg-zinc-900/50 border-t border-zinc-800/50">
            <p className="text-[10px] text-zinc-600 flex items-center gap-1">
              <ClipboardList className="w-3 h-3" />
              <span>
                CELF görev oluşturmak için:{" "}
                <code className="text-cyan-500">görev: başlık</code>
              </span>
            </p>
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border-t border-zinc-800">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Mesajınızı yazın..."
              className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="p-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
