"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronUp, BookOpen, Download, Loader2, Play, Check } from "lucide-react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import { motion, AnimatePresence } from "framer-motion"
import { calculateDiet, type UserData, type DietPlan } from "@/lib/diet-utils"
import { OnboardingForm } from "./onboarding-form"
import { Button } from "./ui/button"

const sections = [
  { id: "intro", title: "📖 Introdução", icon: "📖" },
  { id: "diagnostico", title: "🩺 Diagnóstico Corporal", icon: "🩺", category: "fundamentos" },
  { id: "compras", title: "🛒 Lista de Compras Ancestral", icon: "🛒", category: "fundamentos" },
  { id: "principios", title: "💪 Princípios Fundamentais", icon: "💪" },
  { id: "macros", title: "📊 Distribuição de Macronutrientes", icon: "📊" },
  { id: "guia-montagem", title: "🍽️ Guia de Montagem", icon: "🍽️" },
  { id: "cardapio", title: "📅 Cardápio Mensal", icon: "📅" },
  { id: "smoothies", title: "🥤 Smoothies de Alta Caloria", icon: "🥤" },
  { id: "suplementacao", title: "💊 Suplementação", icon: "💊" },
  { id: "treino", title: "🏋️ Treino Complementar", icon: "🏋️" },
  { id: "acompanhamento", title: "📈 Acompanhamento de Progresso", icon: "📈", category: "progresso" },
]

const tabCategories = [
  { id: "fundamentos", title: "🦁 Fundamentos", icon: "🦁", label: "Fundamentos" },
  { id: "protocolo", title: "🥩 O Protocolo", icon: "🥩", label: "O Protocolo" },
  { id: "progresso", title: "📈 Progresso", icon: "📈", label: "Progresso" },
]



function prepareElementForPdf(element: HTMLElement) {
  const allElements = element.querySelectorAll("*")
  const elementsToProcess = [element, ...Array.from(allElements)] as HTMLElement[]

  // Helper to convert any color string to RGB
  // Browsers might return lab() or oklch() in getComputedStyle if they support it
  const toRgb = (colorStr: string): string => {
    if (!colorStr || colorStr === "transparent" || colorStr === "rgba(0, 0, 0, 0)") return colorStr

    // If it's already RGB/RGBA, return it
    if (colorStr.startsWith("rgb")) return colorStr

    // Fallback for known problematic strings
    if (colorStr.includes("lab(") || colorStr.includes("oklch(") || colorStr.includes("oklab(") || colorStr.includes("lch(")) {
      // Create a temporary canvas to get the RGB value
      // This is the most reliable way to let the browser do the conversion
      try {
        const canvas = document.createElement("canvas")
        canvas.width = 1
        canvas.height = 1
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.fillStyle = colorStr
          ctx.fillRect(0, 0, 1, 1)
          const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
          return `rgba(${r}, ${g}, ${b}, ${a / 255})`
        }
      } catch (e) {
        console.warn("Color conversion failed for:", colorStr)
      }
    }
    return colorStr
  }

  elementsToProcess.forEach((el) => {
    const computedStyle = window.getComputedStyle(el)

    // Critical properties for html2canvas
    const color = computedStyle.color
    const bgColor = computedStyle.backgroundColor
    const borderColor = computedStyle.borderColor
    const shadow = computedStyle.boxShadow
    const fill = computedStyle.fill
    const stroke = computedStyle.stroke

    // Apply converted RGB values directly as inline styles
    if (color) el.style.color = toRgb(color)
    if (bgColor && bgColor !== "rgba(0, 0, 0, 0)") el.style.backgroundColor = toRgb(bgColor)
    if (borderColor && borderColor !== "rgba(0, 0, 0, 0)") el.style.borderColor = toRgb(borderColor)

    // box-shadow often contains oklch/lab colors in Tailwind v4
    // We try to clean it up by replacing problematic parts or just hiding it if it's too complex
    if (shadow && (shadow.includes("lab(") || shadow.includes("oklch("))) {
      el.style.boxShadow = "none"
    }

    // Critical properties for text stabilization in html2canvas
    el.style.lineHeight = "1.5"
    el.style.letterSpacing = "0px"
    el.style.wordSpacing = "0px"
    el.style.textRendering = "optimizeLegibility"
    el.style.fontSmooth = "always"

    // Clear any transitions or transformations that break capture
    el.style.transition = "none !important"
    el.style.transform = "none !important"
    el.style.animation = "none !important"

    // Fix for color conversions
    if (stroke && stroke.startsWith("oklch")) el.style.stroke = toRgb(stroke)

    // Handle gradient backgrounds by replacing with solid colors
    const bgImage = computedStyle.backgroundImage
    if (bgImage && bgImage.includes("gradient")) {
      // PDF-Clean: Solid light backgrounds for sections
      if (bgImage.includes("emerald") || bgImage.includes("green") || bgImage.includes("teal")) {
        el.style.background = "#f0fdf4" // green-50
      } else if (bgImage.includes("red")) {
        el.style.background = "#fef2f2" // red-50
      } else if (bgImage.includes("blue") || bgImage.includes("indigo")) {
        el.style.background = "#eff6ff" // blue-50
      } else if (bgImage.includes("purple") || bgImage.includes("pink")) {
        el.style.background = "#faf5ff" // purple-50
      } else {
        el.style.background = "#ffffff"
      }
      el.style.backgroundImage = "none"
      el.style.border = "1px solid #e5e7eb"
    }

    // NEW: Handle "Enxuto" (Lean) Mode - Hide non-essential elements
    if (el.getAttribute("data-pdf-essential") === "false") {
      el.style.display = "none"
    }

    // NEW: Text visibility fixes for PDF (force dark colors on neutralized backgrounds)
    if (el.classList.contains("text-white") || el.tagName.match(/^H[1-6]$/)) {
      el.style.color = "#1a1a1a"
    }

    // NEW: Layout linearization (force grids into single column to prevent clipping)
    if (computedStyle.display === "grid" || el.classList.contains("grid")) {
      el.style.display = "block"
      el.style.width = "100%"
    }

    // Simplify footer for PDF
    if (el.classList.contains("pdf-footer")) {
      el.style.background = "#ffffff"
      el.style.color = "#4b5563"
      el.style.border = "1px solid #e5e7eb"
      el.style.padding = "20px"
    }

    // Simplify section headers for PDF
    if (el.tagName === "BUTTON" && el.classList.contains("pdf-header")) {
      el.style.background = "#f3f4f6"
      el.style.color = "#1f2937"
      el.style.borderBottom = "2px solid #e5e7eb"
    }
  })
}

export function Ebook() {
  const [appState, setAppState] = useState<"welcome" | "onboarding" | "loading" | "success" | "ebook">("welcome")
  const [userData, setUserData] = useState<UserData | null>(null)
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null)
  const [activeTab, setActiveTab] = useState("fundamentos")
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleOnboardingComplete = (data: UserData) => {
    setUserData(data)
    setAppState("loading")

    setTimeout(() => {
      const plan = calculateDiet(data)
      setDietPlan(plan)
      setAppState("success")
    }, 2000)
  }

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id)
  }

  const handleDownload = () => {
    window.print()
  }

  if (appState === "welcome") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full bg-white rounded-xl shadow-none overflow-hidden"
        >
          <div className="bg-emerald-700 p-12 text-center text-white">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="mb-6 flex justify-center"
            >
              <img
                src="/592accf5-9d8e-4ea0-bfbd-7ad00ed283b8.png"
                alt="Dieta da Selva Logo"
                className="w-48 h-auto"
              />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">DIETA DA SELVA</h1>
            <p className="text-xl opacity-90">O Protocolo de Nutrição Ancestral Personalizado</p>
          </div>
          <div className="p-8 md:p-12 space-y-8 text-center">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Pronto para sua transformação?</h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                Esqueça dietas genéricas. Em menos de 2 minutos, vamos calcular suas necessidades exatas baseadas no seu corpo e rotina.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl mb-1">📊</div>
                <div className="font-bold text-emerald-800 text-sm">Cálculo Preciso</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl mb-1">🥩</div>
                <div className="font-bold text-emerald-800 text-sm">Plano de Atalaia</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl mb-1">📄</div>
                <div className="font-bold text-emerald-800 text-sm">PDF Completo</div>
              </div>
            </div>

            <Button
              size="lg"
              onClick={() => setAppState("onboarding")}
              className="w-full h-16 text-xl bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-none transition-all hover:scale-[1.02]"
            >
              Começar Agora <Play className="ml-2 fill-current" size={20} />
            </Button>
            <p className="text-xs text-gray-400">Desenvolvido por Julimar Meneses - Nutricionista | @dr.julimar.meneses</p>
          </div>
        </motion.div>
      </div>
    )
  }

  if (appState === "onboarding") {
    return (
      <div className="min-h-screen bg-white">
        <OnboardingForm onComplete={handleOnboardingComplete} />
      </div>
    )
  }

  if (appState === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative w-24 h-24 mb-8">
          <motion.div
            className="absolute inset-0 border-4 border-emerald-200 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 border-t-4 border-emerald-600 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/592accf5-9d8e-4ea0-bfbd-7ad00ed283b8.png"
              alt="Logo"
              className="w-16 h-auto"
            />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Processando seus dados...</h2>
        <p className="text-gray-600 text-lg">Estamos preparando seu protocolo ancestral personalizado.</p>

        <div className="mt-12 max-w-xs w-full space-y-3">
          {[
            "Calculando Metas...",
            "Ajustando Macronutrientes...",
            "Customizando Cardápio...",
            "Finalizando Manual..."
          ].map((text, i) => (
            <motion.div
              key={i}
              className="flex items-center space-x-3 text-left"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.4 }}
            >
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                <Loader2 className="w-3 h-3 text-green-600 animate-spin" />
              </div>
              <span className="text-sm font-medium text-gray-500">{text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 overflow-x-hidden font-sans">
      {/* SUCCESS RESUMO VIEW */}
      {appState === "success" && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-10 relative overflow-hidden print:hidden">

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden relative z-20 border border-emerald-100"
          >
            <div className="p-8 md:p-12 text-center">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center mb-6"
              >
                <div className="bg-emerald-100 p-4 rounded-full">
                  <Check className="w-10 h-10 text-emerald-600" />
                </div>
              </motion.div>

              <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight uppercase">
                Protocolo Pronto!
              </h2>
              <p className="text-gray-500 text-lg md:text-xl max-w-xl mx-auto mb-10">
                Analisamos seus dados e geramos suas diretrizes ancestrais personalizadas.
              </p>

              {/* Quick Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                 <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-widest mb-2">Energia Diária</p>
                    <p className="text-3xl font-black text-emerald-950">{dietPlan?.calories} <span className="text-xs font-normal">kcal</span></p>
                    <p className="text-[10px] text-emerald-600/60 mt-2 italic">Meta recomendada</p>
                 </div>
                 <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-widest mb-2">Proteína</p>
                    <p className="text-3xl font-black text-emerald-950">{dietPlan?.macros.protein}g</p>
                    <p className="text-[10px] text-emerald-600/60 mt-2 italic">Aporte essencial</p>
                 </div>
                 <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-widest mb-2">Metabolismo</p>
                    <p className="text-3xl font-black text-emerald-950">{dietPlan?.bmr} <span className="text-xs font-normal">kcal</span></p>
                    <p className="text-[10px] text-emerald-600/60 mt-2 italic">Taxa Basal (TMB)</p>
                 </div>
              </div>

              <div className="flex justify-center">
                 <Button
                    size="lg"
                    onClick={handleDownload}
                    className="h-16 px-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-lg font-black uppercase tracking-wider flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-lg"
                 >
                    <Download className="w-5 h-5 transition-transform group-hover:animate-bounce" />
                    Baixar Protocolo PDF
                 </Button>
              </div>

              <p className="mt-10 text-xs text-gray-400 font-medium">
                * O manual completo contém cardápio mensal, lista de compras e orientações de treino.
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* FULL EBOOK CONTENT (MANUAL) */}
      <div className={`${appState === "success" ? "hidden print:block" : (appState === "ebook" ? "block" : "hidden")}`}>
      {/* Header */}
      <header className="relative overflow-hidden print:h-[297mm] print:w-[210mm] print:m-0 print:rounded-none bg-emerald-950 min-h-[500px] flex flex-col justify-center">
        {/* Background Image for Web and Print */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/jungle-bg.png" 
            alt="Background" 
            className="w-full h-full object-cover opacity-60 print:opacity-100"
          />
          <div className="absolute inset-0 bg-emerald-950/90" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-20 w-full py-16 px-6">
          <div className="mb-10">
            <img
              src="/592accf5-9d8e-4ea0-bfbd-7ad00ed283b8.png"
              alt="Logo"
              className="w-48 h-auto mx-auto drop-shadow-2xl relative z-30"
            />
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-white uppercase drop-shadow-lg !leading-none">
            DIETA DA SELVA
          </h1>

          <div className="inline-block px-8 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-12 uppercase tracking-[0.3em] font-black text-xs text-white">
            Protocolo de Nutrição Ancestral
          </div>

          <div className="space-y-6 mb-16">
            <div className="h-1.5 w-24 bg-emerald-400 mx-auto rounded-full" />
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-light tracking-[0.2em] text-emerald-200 uppercase">
                Personalizado para:
              </h2>
              <div className="text-5xl md:text-7xl font-black uppercase tracking-tight text-white">
                {userData?.name}
              </div>
              <div className="text-xl md:text-3xl font-bold text-emerald-300 italic mt-6">
                {userData?.goal === "muscle-gain" ? "Ganho de Massa Muscular" : (userData?.goal === "lose-weight" ? "Emagrecimento Saudável" : "Performance & Bem-Estar")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto bg-black/40 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 text-white">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest opacity-60">Energia</p>
              <p className="text-4xl font-black">{dietPlan?.calories}</p>
              <p className="text-xs opacity-40 font-bold uppercase tracking-tighter">Kcal/Dia</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest opacity-60">Proteína</p>
              <p className="text-4xl font-black">{dietPlan?.macros.protein}g</p>
              <p className="text-xs opacity-40 font-bold uppercase tracking-tighter">Essencial</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest opacity-60">Gorduras</p>
              <p className="text-4xl font-black">{dietPlan?.macros.fats}g</p>
              <p className="text-xs opacity-40 font-bold uppercase tracking-tighter">Hormonal</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest opacity-60">Carbo</p>
              <p className="text-4xl font-black">{dietPlan?.macros.carbs}g</p>
              <p className="text-xs opacity-40 font-bold uppercase tracking-tighter">Energia</p>
            </div>
          </div>

          <div className="mt-20 text-[10px] opacity-30 font-normal tracking-[0.4em] uppercase hidden print:block border-t border-white/10 pt-10 text-white">
            Nutricionista Julimar Meneses • @dr.julimar.meneses • Dieta da Selva
          </div>
        </div>

        {/* Page break after cover in print */}
        <div className="print:break-after-page" />
      </header>

      {/* PDF Download Button - Fixed */}
      <button
        onClick={handleDownload}
        className="fixed bottom-6 right-6 z-50 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 h-16 shadow-none flex items-center gap-3 transition-all hover:scale-105 active:scale-95 group print:hidden"
      >
        <Download className="w-6 h-6 group-hover:animate-bounce" />
        <span className="font-bold text-lg uppercase tracking-wider">Baixar Protocolo PDF</span>
      </button>

      {/* Tabs Navigation - Premium Segmented Control */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-emerald-100 shadow-none overflow-x-auto no-scrollbar print:hidden">
        <div className="max-w-4xl mx-auto px-2 py-2 flex gap-1 items-center justify-between">
          {tabCategories.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-300 min-w-[85px] ${isActive ? "text-emerald-800" : "text-gray-500 hover:text-emerald-600 hover:bg-white/50"
                  }`}
              >
                {/* Sliding indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-white shadow-none border border-emerald-200/50 rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}

                <span className="relative z-10 text-xl mb-1 transition-transform group-hover:scale-110">
                  {tab.icon}
                </span>
                <span className={`relative z-10 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors`}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Content wrapper for PDF */}
      <div ref={contentRef}>
        <div className="max-w-4xl mx-auto px-4 pb-20 pt-6">
          <div className="space-y-6 print:space-y-8">
            <style jsx global>{`
              @media print {
                @page {
                  size: A4;
                  margin: 25mm 15mm 20mm 15mm;
                }
                body {
                  background: white !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  font-family: var(--font-inter), sans-serif !important;
                }
                .print\\:hidden {
                  display: none !important;
                }
                header {
                  min-height: calc(297mm - 50mm) !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  position: relative !important;
                  display: flex !important;
                  align-items: center !important;
                  justify-content: center !important;
                  background-color: #064e3b !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                header * {
                  color: white !important;
                }
                header h1, header div, header p, header h2 {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  opacity: 1 !important;
                  visibility: visible !important;
                }
                h1, h2, h3, h4, h5, h6 {
                  -webkit-print-color-adjust: exact !important;
                }
                [data-section-content] {
                  display: block !important;
                  max-height: none !important;
                  opacity: 1 !important;
                  visibility: visible !important;
                }
                /* Content margins and vertical centering for pages after cover */
                main, .max-w-4xl {
                   width: 100% !important;
                   padding: 0 !important;
                   margin: 0 auto !important;
                }
                
                /* Sections will now inherit margins from @page */
                .max-w-4xl > div:not(.relative) {
                  width: 100% !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: flex-start !important;
                  padding: 0 !important;
                }

                header .max-w-4xl {
                   padding: 0 !important;
                   margin: 0 !important;
                   width: 100% !important;
                   max-width: none !important;
                   display: flex !important;
                   flex-direction: column !important;
                   justify-content: center !important;
                   align-items: center !important;
                }
                
                header .max-w-4xl > div {
                  padding: 40px !important;
                  width: 100% !important;
                }
                
                section, .rounded-xl {
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                  margin-bottom: 2rem !important;
                }
                h2, h3, h4 {
                  break-after: avoid !important;
                  page-break-after: avoid !important;
                }
                img {
                  break-inside: avoid !important;
                }
                .rounded-xl {
                  border: none !important;
                  box-shadow: none !important;
                  margin-bottom: 2rem !important;
                }
                /* Force visibility on all printable elements without breaking layouts */
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                
                /* Reset animations and opacity for print without forcing display mode */
                div, section, p, h1, h2, h3, h4, span, img {
                  opacity: 1 !important;
                  visibility: visible !important;
                  animation: none !important;
                  transition: none !important;
                }

                /* Ensure hidden containers (tabs) become visible for printing */
                .hidden.print\:block {
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                }

                [data-section-content], [data-active-tab] {
                  display: block !important;
                  opacity: 1 !important;
                  visibility: visible !important;
                }
                
                /* Specifically hide the success view during print */
                .print\:hidden {
                  display: none !important;
                }
              }
            `}</style>
            {/* --- FUNDAMENTOS --- */}
            <div className={activeTab === "fundamentos" ? "block space-y-4 animate-in fade-in duration-500" : "hidden print:block print:space-y-4"}>
              <div className="mb-6 flex items-center justify-between print:hidden">
                <h2 className="text-2xl font-black text-gray-800 uppercase flex items-center gap-3">
                  🦁 FUNDAMENTOS
                </h2>
                <div className="h-1 flex-1 ml-4 bg-emerald-200 rounded-full" />
              </div>
              {/* Introdução */}
              <Section
                id="intro"
                title="📖 INTRODUÇÃO"
                expanded={expandedSection === "intro"}
                onToggle={() => toggleSection("intro")}
              >
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-emerald-800 mb-3">O que é este protocolo?</h3>
                    <p className="text-gray-700 mb-4">
                      Este manual foi desenvolvido para pessoas que desejam {userData?.goal === "muscle-gain" ? "ganhar peso e massa muscular" : userData?.goal === "lose-weight" ? "perder gordura mantendo a massa magra" : "manter o peso com máxima vitalidade"} de forma saudável utilizando os
                      princípios da Dieta da Selva: alimentos ancestrais, densos em nutrientes e de alta qualidade
                      biológica.
                    </p>
                    <div
                      className="bg-slate-50 border-l-4 border-emerald-500 p-4 rounded-r-lg"
                      data-pdf-essential="false"
                    >
                      <p className="text-emerald-800">
                        💡 <strong>DICA INICIAL:</strong> {userData?.goal === "lose-weight" ? "Perder peso" : "Ganhar peso"} saudável não significa comer "qualquer coisa". A
                        qualidade dos alimentos determina se você {userData?.goal === "lose-weight" ? "preserva seus músculos enquanto queima gordura" : "ganha músculo ou apenas gordura"}. Escolha sempre
                        alimentos de verdade, não produtos industrializados.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-bold text-emerald-800 mb-3">O que você vai alcançar:</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          userData?.goal === "muscle-gain" ? "Ganho de 2-4kg por mês de massa muscular" : userData?.goal === "lose-weight" ? "Perda sustentável de 2-4kg de gordura por mês" : "Manutenção de um corpo atlético e saudável",
                          "Energia aumentada para treinos e atividades diárias",
                          "Força progressiva em todos os exercícios",
                          "Saúde metabólica otimizada",
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-2 bg-green-50 p-2 rounded-lg border border-green-100">
                            <span className="text-green-600 text-sm">✅</span>
                            <span className="text-green-800 text-sm font-medium">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-emerald-800 mb-3">Para quem é:</h3>
                      <ul className="grid grid-cols-1 gap-2 text-sm text-gray-700">
                        {userData?.goal === "lose-weight" ? (
                          <>
                            <li className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full" /> Pessoas que buscam secar mantendo massa</li>
                            <li className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full" /> Quem deseja melhorar a definição muscular</li>
                            <li className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full" /> Atletas em fase de cutting (definição)</li>
                          </>
                        ) : (
                          <>
                            <li className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full" /> Pessoas naturalmente magras (ectomorfos)</li>
                            <li className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full" /> Quem busca aumentar massa muscular</li>
                            <li className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full" /> Pessoas com metabolismo acelerado</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </Section>

              {/* Lista de Compras Ancestral - Moved to Fundamentos */}
              <Section
                id="compras"
                title="🛒 LISTA DE COMPRAS ANCESTRAL"
                expanded={expandedSection === "compras"}
                onToggle={() => toggleSection("compras")}
              >
                <div className="space-y-6">
                  <p className="text-gray-700">
                    A base do seu sucesso está no carrinho. Priorize alimentos de verdade.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Proteínas */}
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-none">
                      <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                        🥩 Proteínas
                      </h3>
                      <div className="space-y-3">
                        {[
                          "Ovos Inteiros",
                          "Carne Bovina (Acém, Músculo)",
                          "Frango (Coxa e Sobrecoxa com pele)",
                          "Fígado Bovino",
                          "Carne de Porco (Lombo/Copa)"
                        ].map((item, i) => (
                          <label key={i} className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                            <span className="text-gray-700 uppercase text-xs font-bold">{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Frutas/Gorduras */}
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-none">
                      <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                        🥑 Gorduras e Frutas
                      </h3>
                      <div className="space-y-3">
                        {[
                          "Abacates Maduros",
                          "Azeite Extra Virgem",
                          "Óleo de Coco",
                          "Manteiga",
                          "Bananas (Prata/Terra)",
                          "Coco Seco"
                        ].map((item, i) => (
                          <label key={i} className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                            <span className="text-gray-700 uppercase text-xs font-bold">{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Carboidratos */}
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-none">
                      <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
                        🍠 Carboidratos de Raiz
                      </h3>
                      <div className="space-y-3">
                        {[
                          "Mandioca",
                          "Batata Doce",
                          "Inhame / Cará",
                          "Batata Inglesa",
                          "Abóbora Cabotiá"
                        ].map((item, i) => (
                          <label key={i} className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                            <span className="text-gray-700 uppercase text-xs font-bold">{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Temperos */}
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-none">
                      <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                        🧉 Temperos Naturais
                      </h3>
                      <div className="space-y-3">
                        {[
                          "Sal Integral",
                          "Cúrcuma / Açafrão",
                          "Mel Natural",
                          "Vinagre de Maçã"
                        ].map((item, i) => (
                          <label key={i} className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                            <span className="text-gray-700 uppercase text-xs font-bold">{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Section>

              {/* Diagnóstico Corporal */}
              <Section
                id="diagnostico"
                title="🩺 DIAGNÓSTICO CORPORAL PERSONALIZADO"
                expanded={expandedSection === "diagnostico"}
                onToggle={() => toggleSection("diagnostico")}
              >
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row items-center gap-8 bg-white border border-gray-100 p-6 rounded-2xl relative overflow-hidden">
                    <div className="z-10 flex-1 space-y-4">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-xl border border-emerald-100">
                             <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Taxa Metabólica Basal (TMB)</p>
                             <p className="text-2xl font-black text-emerald-800">{dietPlan?.bmr} <span className="text-sm font-normal">kcal/dia</span></p>
                             <p className="text-[10px] text-gray-400 mt-1 italic">*Energia gasta em repouso absoluto.</p>
                          </div>
                          <div className="bg-white p-4 rounded-xl border border-emerald-100">
                             <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Gasto Energético Diário (TDEE)</p>
                             <p className="text-2xl font-black text-emerald-800">{dietPlan?.tdee} <span className="text-sm font-normal">kcal/dia</span></p>
                             <p className="text-[10px] text-gray-400 mt-1 italic">*Energia total considerando suas atividades.</p>
                          </div>
                       </div>

                       <div className="p-5 bg-emerald-900 text-white rounded-2xl relative">
                          <div className="flex justify-between items-center mb-6">
                             <div>
                                <p className="text-[10px] uppercase font-bold opacity-70 tracking-widest">Diagnóstico IMC</p>
                                <p className="text-xl font-black">
                                   {(() => {
                                      const bmi = userData ? userData.weight / Math.pow(userData.height / 100, 2) : 0;
                                      if (bmi < 18.5) return "Abaixo do Peso";
                                      if (bmi < 25) return "Peso Ideal";
                                      if (bmi < 30) return "Sobrepeso";
                                      return "Obesidade";
                                   })()}
                                </p>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] uppercase font-bold opacity-70">Índice Atual</p>
                                <p className="text-2xl font-black">{(userData ? userData.weight / Math.pow(userData.height / 100, 2) : 0).toFixed(1)}</p>
                             </div>
                          </div>

                          <div className="relative pt-4 pb-2">
                             {/* Marker Pointer */}
                             <div 
                                className="absolute top-0 transition-all duration-1000 ease-out"
                                style={{ 
                                   left: (() => {
                                      const bmi = userData ? userData.weight / Math.pow(userData.height / 100, 2) : 0;
                                      if (bmi < 18.5) return `${(bmi / 18.5) * 20}%`;
                                      if (bmi < 25) return `${20 + ((bmi - 18.5) / 6.5) * 30}%`;
                                      if (bmi < 30) return `${50 + ((bmi - 25) / 5) * 25}%`;
                                      return `${Math.min(75 + ((bmi - 30) / 10) * 25, 98)}%`;
                                   })(),
                                   transform: 'translateX(-50%)'
                                }}
                             >
                                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white"></div>
                             </div>

                             <div className="h-4 w-full bg-white/10 rounded-full flex overflow-hidden border border-white/10">
                                <div className="h-full bg-yellow-400 opacity-90" style={{ width: "20%" }} title="Abaixo" />
                                <div className="h-full bg-green-400 border-x border-emerald-900" style={{ width: "30%" }} title="Ideal" />
                                <div className="h-full bg-orange-400" style={{ width: "25%" }} title="Sobrepeso" />
                                <div className="h-full bg-red-400" style={{ width: "25%" }} title="Obesidade" />
                             </div>
                             
                             {/* Labels */}
                             <div className="flex justify-between mt-2 text-[8px] font-bold uppercase tracking-tighter opacity-60">
                                <span className="w-[20%] text-center">Abaixo</span>
                                <span className="w-[30%] text-center text-green-300">Ideal</span>
                                <span className="w-[25%] text-center">Sobrepeso</span>
                                <span className="w-[25%] text-center">Obesidade</span>
                             </div>
                          </div>
                          <p className="text-[9px] mt-4 opacity-40 italic text-center leading-tight">Referência: Organização Mundial da Saúde (OMS)</p>
                       </div>
                    </div>

                    <div className="md:w-56 flex flex-col items-center justify-center text-center">
                       <img 
                         src="/human-body-frontal.jpg" 
                         alt="Body Analysis" 
                         className="h-64 w-auto"
                       />
                       <p className="text-[10px] text-emerald-800 font-bold mt-2">Morfologia Analisada</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                     <div className="bg-white p-4 rounded-xl border border-emerald-100">
                        <h5 className="font-bold text-emerald-900 mb-2 underline">O que é a TMB?</h5>
                        <p className="text-gray-700 leading-relaxed">
                           É a quantidade mínima de energia que seu organismo precisa para realizar as funções vitais (respiração, batimentos, digestão) enquanto você dorme ou descansa. Conhecê-la é o primeiro passo para o controle calórico.
                        </p>
                     </div>
                     <div className="bg-white p-4 rounded-xl border border-emerald-100">
                        <h5 className="font-bold text-emerald-900 mb-2 underline">Por que o IMC é uma referência?</h5>
                        <p className="text-gray-700 leading-relaxed">
                           O IMC nos dá uma visão estatística rápida de saúde. No entanto, lembre-se: ele não distingue massa muscular de gordura. Um atleta pode ter IMC de "sobrepeso" sendo extremamente saudável!
                        </p>
                     </div>
                  </div>
                </div>
              </Section>

              {/* Cardápio Mensal - Movido para cá para fluxo do PDF */}
              <Section
                id="cardapio"
                title="📅 CARDÁPIO MENSAL COMPLETO"
                expanded={expandedSection === "cardapio"}
                onToggle={() => toggleSection("cardapio")}
              >
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-bold text-blue-800 mb-2">Como usar este cardápio:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Siga os horários sugeridos ou adapte à sua rotina</li>
                      <li>• As quantidades são referências para pessoa de 70kg</li>
                      <li>• Ajuste as porções conforme seu peso e necessidades</li>
                      <li>• Mantenha a urina clara ao longo do dia</li>
                    </ul>
                  </div>

                  {/* Segunda-feira */}
                  <div className="bg-white rounded-xl shadow-none overflow-hidden">
                    <div className="bg-emerald-600 text-white p-4">
                      <h4 className="text-xl font-bold">🗓️ SEGUNDA-FEIRA - Exemplo Completo</h4>
                    </div>
                    <div className="p-4 space-y-4">
                      <DayMeal
                        time="07:00"
                        name="Café da Manhã (Base Ancestral)"
                        calories={Math.round(dietPlan?.calories! * 0.20)}
                        items={[
                          `${Math.round(userData?.weight! * 0.07)} Ovos inteiros (mexidos na manteiga ou banha)`,
                          "1 Abacate médio (150-200g)",
                          "1 porção de Batata-doce ou Inhame (150g)",
                          "1 Banana-prata grande"
                        ]}
                        macros={{ 
                          protein: Math.round(dietPlan?.macros.protein! * 0.20), 
                          fat: Math.round(dietPlan?.macros.fats! * 0.25), 
                          carbs: Math.round(dietPlan?.macros.carbs! * 0.15) 
                        }}
                      />

                      <DayMeal
                        time="10:00"
                        name="Colação (Lanche Matinal)"
                        calories={Math.round(dietPlan?.calories! * 0.10)}
                        items={[
                          "30g de Coco seco ralado (sem açúcar)",
                          "1 porção de Frutas cítricas ou Uvas",
                          "1 punhado de Castanhas-do-pará (2-3 unidades)"
                        ]}
                        macros={{ 
                          protein: Math.round(dietPlan?.macros.protein! * 0.05), 
                          fat: Math.round(dietPlan?.macros.fats! * 0.15), 
                          carbs: Math.round(dietPlan?.macros.carbs! * 0.08) 
                        }}
                      />

                      <DayMeal
                        time="13:00"
                        name="Almoço (Força da Selva)"
                        calories={Math.round(dietPlan?.calories! * 0.25)}
                        items={[
                          "200g-250g de Carne Bovina (Acém, Fraldinha ou Músculo)",
                          "250g-300g de Mandioca ou Batata-inglesa",
                          "Salada de Cenoura e Beterraba com Azeite extra-virgem (2 col. sopa)",
                          "Sobremesa: 1 Manga ou 1 fatia grande de Mamão"
                        ]}
                        macros={{ 
                          protein: Math.round(dietPlan?.macros.protein! * 0.30), 
                          fat: Math.round(dietPlan?.macros.fats! * 0.20), 
                          carbs: Math.round(dietPlan?.macros.carbs! * 0.25) 
                        }}
                      />

                      <DayMeal
                        time="16:30"
                        name="Lanche da Tarde (Energia)"
                        calories={Math.round(dietPlan?.calories! * 0.15)}
                        items={[
                          "Smoothie: 2 Bananas + 200ml Leite de coco + 1 col. sopa Mel cru",
                          "2 colheres de sopa de Pasta de Coco ou Cacau"
                        ]}
                        macros={{ 
                          protein: Math.round(dietPlan?.macros.protein! * 0.10), 
                          fat: Math.round(dietPlan?.macros.fats! * 0.15), 
                          carbs: Math.round(dietPlan?.macros.carbs! * 0.20) 
                        }}
                      />

                      <DayMeal
                        time="19:30"
                        name="Jantar (Recuperação)"
                        calories={Math.round(dietPlan?.calories! * 0.20)}
                        items={[
                          "200g de Coxa/Sobrecoxa de Frango com pele ou Peixe gordo",
                          "2 Bananas-da-terra assadas ou grelhadas",
                          "Legumes variados (cozidos na manteiga)",
                          "1 fatia de Abacaxi de sobremesa"
                        ]}
                        macros={{ 
                          protein: Math.round(dietPlan?.macros.protein! * 0.25), 
                          fat: Math.round(dietPlan?.macros.fats! * 0.15), 
                          carbs: Math.round(dietPlan?.macros.carbs! * 0.22) 
                        }}
                      />

                      <DayMeal
                        time="22:00"
                        name="Lanche da Noite (Ceia Ancestral)"
                        calories={Math.round(dietPlan?.calories! * 0.10)}
                        items={[
                          "2 Ovos cozidos ou 50g de Coco seco",
                          "1 Banana com Mel e Canela",
                          "Chá de Camomila ou Erva-doce (sem açúcar)"
                        ]}
                        macros={{ 
                          protein: Math.round(dietPlan?.macros.protein! * 0.10), 
                          fat: Math.round(dietPlan?.macros.fats! * 0.10), 
                          carbs: Math.round(dietPlan?.macros.carbs! * 0.10) 
                        }}
                      />

                      <div className="bg-green-100 p-4 rounded-lg text-center">
                        <p className="text-green-800 font-bold text-lg">✅ Meta Diária Personalizada: ~{dietPlan?.calories} kcal</p>
                        <p className="text-green-700 font-medium">
                          {userData?.goal === "lose-weight" ? `(Foco em Déficit: -400 kcal/dia aplicado)` : `(Foco em Superávit: +400 kcal/dia aplicado)`}
                        </p>
                        <p className="text-green-700 font-medium mt-1">
                          Proteína: {dietPlan?.macros.protein}g | 
                          Gorduras: {dietPlan?.macros.fats}g | 
                          Carboidratos: {dietPlan?.macros.carbs}g
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rotação */}
                  <div className="bg-slate-50 p-6 rounded-xl">
                    <h4 className="text-xl font-bold text-purple-800 mb-4">📝 Rotação Semanal</h4>
                    <p className="text-gray-700 mb-4">
                      Este cardápio apresenta 1 dia completo como exemplo. Para as semanas seguintes, você deve rotacionar
                      as fontes:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-lg">
                        <h5 className="font-bold text-emerald-700">🥩 Proteínas</h5>
                        <p className="text-sm text-gray-600">
                          Alterne entre acém, fraldinha, músculo, coxa de frango, fígado, coração, moela
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-lg">
                        <h5 className="font-bold text-emerald-700">🍠 Carboidratos</h5>
                        <p className="text-sm text-gray-600">
                          Alterne entre batata-doce, mandioca, banana-da-terra, inhame, batata inglesa
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-lg">
                        <h5 className="font-bold text-emerald-700">🍌 Frutas</h5>
                        <p className="text-sm text-gray-600">
                          Alterne entre bananas, mangas, mamão, uvas, abacaxi, melancia
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-lg">
                        <h5 className="font-bold text-emerald-700">🥑 Gorduras</h5>
                        <p className="text-sm text-gray-600">
                          Alterne entre abacate, óleo de coco, azeite, manteiga, banha
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border-l-4 border-emerald-500 p-4 rounded-r-lg">
                    <p className="text-emerald-800">
                      📅 <strong>MEAL PREP:</strong> Separe 2-3 horas no domingo para preparar refeições da semana.
                      Cozinhe 3kg de frango, 2kg de batata-doce, 2kg de mandioca. Armazene em potes de vidro na geladeira!
                    </p>
                  </div>
                </div>
              </Section>

              {/* Princípios Fundamentais */}
              <Section
                id="principios"
                title="💪 PRINCÍPIOS FUNDAMENTAIS"
                expanded={expandedSection === "principios"}
                onToggle={() => toggleSection("principios")}
              >
                <div className="space-y-8">
                  {/* 1. Ajuste Calórico Inteligente */}
                  <div className="bg-emerald-50 p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-emerald-800 mb-3">
                      1. {userData?.goal === "lose-weight" ? "Déficit" : "Superávit"} Calórico Inteligente
                    </h3>
                    <p className="text-gray-700 mb-4">Não se trata de comer qualquer coisa.</p>
                    <ul className="space-y-2 text-gray-700">
                      <li>
                        • {userData?.goal === "lose-weight" ? "Déficit" : "Superávit"} de {userData?.goal === "maintenance" ? "0" : "400"} calorias por dia em relação ao seu gasto total (TDEE)
                      </li>
                      <li>• Prioridade: alimentos densos e nutritivos</li>
                      <li>• Evitar comida industrializada (mesmo que tenha {userData?.goal === "lose-weight" ? "poucas" : "muitas"} calorias)</li>
                    </ul>
                    <div
                      className="mt-4 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg"
                      data-pdf-essential="false"
                    >
                      <p className="text-green-800">
                        💰 <strong>ECONOMIA:</strong> Este protocolo prioriza cortes de carne mais acessíveis e igualmente
                        nutritivos. Acém, fraldinha, músculo bovino e coxa de frango com pele são opções excelentes e
                        econômicas!
                      </p>
                    </div>
                  </div>

                  {/* 2. Proteína */}
                  <div className="bg-emerald-50 p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-emerald-800 mb-3">2. Proteína Abundante</h3>
                    <p className="text-gray-600 mb-4">Sua Meta Personalizada: <strong>{dietPlan?.macros.protein}g</strong> de proteína por dia</p>

                    <h4 className="font-bold text-emerald-700 mb-2">Fontes da Selva (Acessíveis):</h4>
                    <ul className="space-y-1 text-gray-700 text-sm">
                      <li>
                        🥩 <strong>Carnes vermelhas:</strong> acém, músculo, fraldinha, contra-filé, alcatra, picanha,
                        costela (200-250g por refeição)
                      </li>
                      <li>
                        🫀 <strong>Miúdos:</strong> fígado bovino e de frango, coração bovino, moela (150-200g por
                        refeição)
                      </li>
                      <li>
                        🥚 <strong>Ovos orgânicos:</strong> 6-8 ovos inteiros por dia
                      </li>
                      <li>
                        🍗 <strong>Aves:</strong> coxa com sobrecoxa de frango com pele, peito de frango com pele
                        (200-250g por refeição)
                      </li>
                    </ul>

                    <div
                      className="mt-4 bg-slate-50 border-l-4 border-emerald-500 p-4 rounded-r-lg"
                      data-pdf-essential="false"
                    >
                      <p className="text-emerald-800">
                        💡 <strong>DICA PRO:</strong> Fígado bovino é um super-alimento extremamente barato! Rico em
                        vitaminas A, B12, ferro e proteínas. Coma 1x por semana para turbinar seus resultados.
                      </p>
                    </div>
                  </div>

                  {/* 3. Gorduras */}
                  <div className="bg-purple-50 p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-emerald-800 mb-3">3. Gorduras Saudáveis em Abundância</h3>
                    <p className="text-gray-700 mb-4">As gorduras são suas aliadas - 9 calorias por grama!</p>

                    <h4 className="font-bold text-emerald-700 mb-2">Fontes da Selva:</h4>
                    <ul className="space-y-1 text-gray-700 text-sm">
                      <li>🥑 Abacate: 1-2 unidades inteiras por dia</li>
                      <li>🥥 Óleo de coco: 3-4 colheres de sopa por dia</li>
                      <li>🫒 Azeite de oliva: extra-virgem, use generosamente</li>
                      <li>🥥 Coco seco ralado: até 30g por dia</li>
                      <li>🥚 Gemas de ovos: ricas em nutrientes</li>
                      <li>🧈 Manteiga ou banha de porco: gorduras naturais de qualidade</li>
                      <li>🍗 Pele de frango: não descarte! É rica em gorduras boas</li>
                    </ul>
                  </div>

                  {/* 4. Carboidratos */}
                  <div className="bg-purple-50 p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-emerald-800 mb-3">4. Carboidratos de Qualidade</h3>
                    <p className="text-gray-700 mb-4">Combustível para treinar e recuperar</p>

                    <h4 className="font-bold text-emerald-700 mb-2">Fontes da Selva:</h4>
                    <ul className="space-y-1 text-gray-700 text-sm">
                      <li>🍠 Batata-doce: 200-300g, 2-3 vezes ao dia</li>
                      <li>🥔 Mandioca/Aipim: 200-300g por refeição (muito acessível!)</li>
                      <li>🍌 Banana-da-terra: 2-3 unidades assadas em óleo de coco</li>
                      <li>🥔 Batata inglesa: 200-300g por refeição</li>
                      <li>🥔 Inhame, cará: raízes e tubérculos diversos</li>
                      <li>🍌 Frutas densas: bananas, mangas, mamão, jaca</li>
                    </ul>

                    <div className="mt-4 bg-slate-50 border-l-4 border-emerald-500 p-4 rounded-r-lg">
                      <p className="text-emerald-800">
                        🌟 <strong>SUPER DICA:</strong> Mandioca é extremamente barata e versátil! Pode ser cozida, assada
                        ou grelhada. Compre em feiras e mercados municipais para economizar ainda mais.
                      </p>
                    </div>
                  </div>

                  {/* 5. Frequência */}
                  <div className="bg-blue-50 p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-emerald-800 mb-3">5. Frequência de Refeições</h3>
                    <p className="text-gray-700 mb-4">2-6 refeições ao dia (conforme sua preferência e rotina)</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-white p-4 rounded-lg shadow">
                                                <h5 className="font-bold text-emerald-700 mb-2">📋 MODELO 1: 6 Refeições ({userData?.goal === "muscle-gain" ? "Ideal p/ Massa" : "Ideal p/ Saciedade"})</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>7h: Café da manhã (~20%)</li>
                          <li>10h: Colação (~10%)</li>
                          <li>13h: Almoço (~25%)</li>
                          <li>16h: Lanche da tarde (~15%)</li>
                          <li>19h: Jantar (~20%)</li>
                          <li>22h: Lanche da noite (~10%)</li>
                        </ul>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow">
                        <h5 className="font-bold text-emerald-700 mb-2">📋 MODELO 2: 4 Refeições (Prático)</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>7h: Café da manhã (~25%)</li>
                          <li>12h: Almoço (~30%)</li>
                          <li>16h: Lanche/Smoothie (~20%)</li>
                          <li>20h: Jantar (~25%)</li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-emerald-100 p-4 rounded-lg">
                      <p className="text-emerald-800 font-medium">
                        🎯 <strong>REGRA DE OURO:</strong> Não importa se você faz 2, 3 ou 4 refeições. O que importa é
                        atingir suas calorias e macronutrientes totais do dia!
                      </p>
                    </div>
                  </div>

                  {/* 6. Hidratação */}
                  <div className="bg-cyan-50 p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-emerald-800 mb-3">6. Hidratação Adequada</h3>
                    <h4 className="font-bold text-blue-700 mb-3">💧 A Regra da Urina Clara</h4>
                    <p className="text-gray-700 mb-4">Esqueça contagem de litros! Use sua urina como indicador.</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                      <div className="bg-emerald-200 p-3 rounded-lg text-center">
                        <div className="text-2xl mb-1">🟡</div>
                        <p className="text-xs font-medium">Amarelo escuro = DESIDRATADO</p>
                      </div>
                      <div className="bg-emerald-100 p-3 rounded-lg text-center">
                        <div className="text-2xl mb-1">🟡</div>
                        <p className="text-xs font-medium">Amarelo médio = Insuficiente</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg text-center border-2 border-green-500">
                        <div className="text-2xl mb-1">✅</div>
                        <p className="text-xs font-medium">Amarelo claro = IDEAL</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg text-center">
                        <div className="text-2xl mb-1">⚪</div>
                        <p className="text-xs font-medium">Transparente = Excesso</p>
                      </div>
                    </div>

                    <div className="bg-blue-100 p-4 rounded-lg">
                      <p className="text-blue-800 font-medium">
                        ☀️ <strong>PROTOCOLO MATINAL:</strong> Ao acordar, beba 500ml a 1 litro de água imediatamente.
                        Espere 15-20 minutos antes da primeira refeição.
                      </p>
                    </div>

                    <div className="mt-4 bg-emerald-100 p-4 rounded-lg">
                      <p className="text-emerald-800 font-medium">
                        🚽 <strong>REGRA DE OURO:</strong> Urinou? Beba Água! TODA VEZ que for ao banheiro urinar, beba
                        pelo menos 1 copo de água (200-300ml) logo em seguida.
                      </p>
                    </div>
                  </div>
                </div>
              </Section>

              {/* Macronutrientes */}
              <Section
                id="macros"
                title="📊 DISTRIBUIÇÃO DE MACRONUTRIENTES"
                expanded={expandedSection === "macros"}
                onToggle={() => toggleSection("macros")}
              >
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-emerald-800">
                    {userData?.goal === "muscle-gain" ? "Para Ganho de Peso Limpo:" : 
                     userData?.goal === "lose-weight" ? "Para Perda de Gordura com Preservação Muscular:" : 
                     "Para Manutenção e Performance:"}
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-emerald-600 text-white">
                          <th className="p-3 text-left">Macronutriente</th>
                          <th className="p-3 text-center">Percentual</th>
                          <th className="p-3 text-center">Gramas/kg</th>
                          <th className="p-3 text-left">Função</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-red-50">
                          <td className="p-3 font-bold">💪 PROTEÍNA</td>
                          <td className="p-3 text-center">30%</td>
                          <td className="p-3 text-center">2g/kg</td>
                          <td className="p-3">Construção muscular</td>
                        </tr>
                        <tr className="bg-green-50">
                          <td className="p-3 font-bold">🥑 GORDURAS</td>
                          <td className="p-3 text-center">40%</td>
                          <td className="p-3 text-center">1.5-2g/kg</td>
                          <td className="p-3">Densidade calórica</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-3 font-bold">🍠 CARBOIDRATOS</td>
                          <td className="p-3 text-center">30%</td>
                          <td className="p-3 text-center">3-4g/kg</td>
                          <td className="p-3">Energia e recuperação</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-emerald-100 p-6 rounded-xl">
                    <h4 className="font-bold text-emerald-800 mb-4">Seu Plano Prático ({userData?.weight}kg):</h4>
                    <div className="text-center mb-4">
                      <span className="text-4xl font-bold text-emerald-600">{dietPlan?.calories}</span>
                      <span className="text-xl text-gray-600 ml-2">calorias/dia</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-lg text-center">
                        <div className="text-3xl mb-2">💪</div>
                        <p className="font-bold text-emerald-800">Proteína</p>
                        <p className="text-2xl font-bold">{dietPlan?.macros.protein}g</p>
                        <p className="text-sm text-gray-500">= {Math.round(dietPlan?.macros.protein! * 4)} cal (30%)</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg text-center">
                        <div className="text-3xl mb-2">🥑</div>
                        <p className="font-bold text-emerald-800">Gorduras</p>
                        <p className="text-2xl font-bold">{dietPlan?.macros.fats}g</p>
                        <p className="text-sm text-gray-500">= {Math.round(dietPlan?.macros.fats! * 9)} cal (40%)</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg text-center">
                        <div className="text-3xl mb-2">🍠</div>
                        <p className="font-bold text-emerald-800">Carbos</p>
                        <p className="text-2xl font-bold">{dietPlan?.macros.carbs}g</p>
                        <p className="text-sm text-gray-500">= {Math.round(dietPlan?.macros.carbs! * 4)} cal (30%)</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg"
                    data-pdf-essential="false"
                  >
                    <p className="text-blue-800">
                      📱 <strong>APLICATIVO ÚTIL:</strong> Use apps gratuitos como MyFitnessPal ou FatSecret para rastrear
                      suas calorias nas primeiras semanas. Depois você já terá noção das quantidades!
                    </p>
                  </div>
                </div>
              </Section>
            </div>

            {/* --- O PROTOCOLO --- */}
            <div className={activeTab === "protocolo" ? "block space-y-4 animate-in fade-in duration-500" : "hidden print:block print:space-y-4"}>
              <div className="mb-6 flex items-center justify-between print:hidden">
                <h2 className="text-2xl font-black text-gray-800 uppercase flex items-center gap-3">
                  🥩 O PROTOCOLO
                </h2>
                <div className="h-1 flex-1 ml-4 bg-emerald-200 rounded-full" />
              </div>
              {/* Combinações */}
              <Section
                id="guia-montagem"
                title="🍽️ GUIA DE MONTAGEM DE PRATOS"
                expanded={expandedSection === "guia-montagem"}
                onToggle={() => toggleSection("guia-montagem")}
              >
                <div className="space-y-8">
                  <div className="bg-emerald-600 text-white p-6 rounded-xl text-center shadow-lg">
                     <h3 className="text-xl font-bold mb-2">A Regra de Ouro dos Três Pilares:</h3>
                     <p className="text-lg opacity-90">🍌 Frutas Doces + 🥔 Raízes Fortes + 🥩 Carnes Gordas</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
                       <h4 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">🍌 1. Carboidratos Reais</h4>
                       <p className="text-xs text-gray-500 mb-3">Escolha 1 raiz + 1-2 frutas base:</p>
                       <div className="flex flex-wrap gap-1">
                          {["Mandioca", "Batata-doce", "Inhame", "Banana", "Manga", "Tâmaras"].map(item => (
                             <span key={item} className="px-2 py-1 bg-white rounded-md text-[10px] border border-gray-200">{item}</span>
                          ))}
                       </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
                       <h4 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">🥩 2. Proteínas & Gorduras</h4>
                       <p className="text-xs text-gray-500 mb-3">Cortes com gordura natural para saciedade:</p>
                       <div className="flex flex-wrap gap-1">
                          {["Acém", "Fraldinha", "Coxa/Sobrecoxa", "Ovos", "Fígado", "Abacate"].map(item => (
                             <span key={item} className="px-2 py-1 bg-white rounded-md text-[10px] border border-gray-200">{item}</span>
                          ))}
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MealCard
                      icon="🍳"
                      title="EXEMPLO 1: Power Breakfast"
                      subtitle="Ovos + Abacate + Batata-doce"
                      items={["4 ovos mexidos", "1 abacate médio", "200g batata-doce", "2 bananas"]}
                      calories={800} protein={28} fat={48} carbs={65}
                    />
                    <MealCard
                      icon="🥩"
                      title="EXEMPLO 2: Muscle Lunch"
                      subtitle="Carne Vermelha + Mandioca + Vegetais"
                      items={["200g-250g carne gorda", "300g mandioca", "Cenoura ralada", "1 manga"]}
                      calories={900} protein={50} fat={50} carbs={70}
                    />
                  </div>

                  <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg">
                    <p className="text-emerald-800 text-sm italic">
                      🔄 <strong>VARIAÇÃO:</strong> Alterne as fontes diariamente para evitar a monotonia e garantir todos os micronutrientes ancestrais.
                    </p>
                  </div>
                </div>
              </Section>

              {/* Smoothies */}
              <Section
                id="smoothies"
                title="🥤 SMOOTHIES DE ALTA CALORIA"
                expanded={expandedSection === "smoothies"}
                onToggle={() => toggleSection("smoothies")}
              >
                <div className="space-y-6">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-purple-800">
                      ⚡ <strong>POR QUE SMOOTHIES FUNCIONAM:</strong> Alimentos líquidos são mais fáceis de consumir em
                      grande quantidade. Um smoothie de 800 calorias cabe em 1 copo, enquanto a mesma quantidade sólida
                      encheria 2 pratos! Perfeito para quem tem pouco apetite.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100 italic">
                       <p className="font-bold text-purple-800 mb-1">🍌 Mass Gainer:</p>
                       <p className="text-[10px] text-gray-600 leading-tight">3 Bananas + 1 Abacate + 300ml Leite de Coco + Mel + Óleo de Coco</p>
                       <p className="text-xs font-bold text-purple-700 mt-2">~950 kcal | 10g Prot</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100 italic">
                       <p className="font-bold text-purple-800 mb-1">🥭 Tropical Power:</p>
                       <p className="text-[10px] text-gray-600 leading-tight">2 Mangas + 1 Abacate + 2 Bananas + 200ml Leite de Coco + Coco Ralado</p>
                       <p className="text-xs font-bold text-purple-700 mt-2">~880 kcal | 8g Prot</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100 italic">
                       <p className="font-bold text-purple-800 mb-1">🍫 Chocolate Ancestral:</p>
                       <p className="text-[10px] text-gray-600 leading-tight">3 Bananas + 1 Abacate + Cacau em Pó + Coco Ralado + Leite de Coco + Mel</p>
                       <p className="text-xs font-bold text-purple-700 mt-2">~920 kcal | 12g Prot</p>
                    </div>
                  </div>

                  <div
                    className="bg-slate-50 p-6 rounded-xl"
                    data-pdf-essential="false"
                  >
                    <h4 className="font-bold text-emerald-800 mb-3">💡 Dicas de Preparo:</h4>
                    <ul className="space-y-2 text-gray-700">
                      <li>• Bata todos os ingredientes no liquidificador por 1-2 minutos até ficar cremoso</li>
                      <li>• Use frutas bem maduras para maior doçura e calorias</li>
                    </ul>
                  </div>

                  <div
                    className="bg-blue-50 p-4 rounded-lg"
                    data-pdf-essential="false"
                  >
                    <p className="text-blue-800">
                      🎯 <strong>MOMENTO IDEAL:</strong> Smoothies são perfeitos para lanche da manhã, pós-treino
                      imediato, lanche da tarde, ou antes de dormir (se tiver dificuldade para comer sólidos à noite).
                    </p>
                  </div>
                </div>
              </Section>

              {/* Suplementação */}
              <Section
                id="suplementacao"
                title="💊 SUPLEMENTAÇÃO ESTRATÉGICA"
                expanded={expandedSection === "suplementacao"}
                onToggle={() => toggleSection("suplementacao")}
              >
                <div className="space-y-6">
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                    <p className="text-red-800 font-medium">
                      ⚠️ <strong>PRIORIDADES:</strong>
                    </p>
                    <ol className="list-decimal list-inside mt-2 text-red-700">
                      <li>COMIDA DE VERDADE</li>
                      <li>TREINO CONSISTENTE</li>
                      <li>SONO ADEQUADO</li>
                      <li>Aí sim, suplementos</li>
                    </ol>
                  </div>

                  <h4 className="text-lg font-bold text-emerald-800">Suplementos Essenciais:</h4>

                  <div className="bg-slate-50 border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-emerald-800 text-white">
                          <th className="p-3">Suplemento</th>
                          <th className="p-3">Dose / Horário</th>
                          <th className="p-3">Benefício Principal</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="p-3 font-bold">Creatina</td>
                          <td className="p-3">5g / Qualquer hora</td>
                          <td className="p-3 italic">Força e volume muscular</td>
                        </tr>
                        <tr className="border-b border-gray-100 bg-white">
                          <td className="p-3 font-bold">Ômega-3</td>
                          <td className="p-3">3g / Com refeição</td>
                          <td className="p-3 italic">Recuperação e anti-inflamatório</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="p-3 font-bold">Vit D3+K2</td>
                          <td className="p-3">5.000UI / Manhã</td>
                          <td className="p-3 italic">Imunidade e Hormonal</td>
                        </tr>
                        <tr className="border-b border-gray-100 bg-white">
                          <td className="p-3 font-bold">Magnésio</td>
                          <td className="p-3">400mg / Noite</td>
                          <td className="p-3 italic">Sono e Relaxamento</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold">Zinco</td>
                          <td className="p-3">30mg / Noite</td>
                          <td className="p-3 italic">Testosterona e Imunidade</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-green-100 p-6 rounded-xl text-center">
                    <p className="text-green-800 font-bold text-lg">💰 CUSTO TOTAL MENSAL: R$ 60-120</p>
                    <p className="text-green-700">Protocolo completo custa menos que 1 lanche diário em fast-food!</p>
                  </div>

                  <div className="bg-white border-2 border-emerald-500/20 p-6 rounded-2xl">
                    <h4 className="text-lg font-bold text-emerald-800 mb-4 flex items-center gap-2">
                      ⏱️ CRONOGRAMA DE USO (MODO DE USO)
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
                        <div className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg text-sm w-32 text-center">AO ACORDAR</div>
                        <div className="flex-1">
                          <p className="font-bold">Multivitamínico (Opcional)</p>
                          <p className="text-sm text-gray-600">Com o café da manhã.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
                        <div className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg text-sm w-32 text-center">MANHÃ</div>
                        <div className="flex-1">
                          <p className="font-bold">Vitamina D3 + K2</p>
                          <p className="text-sm text-gray-600">Logo após a primeira refeição com gordura (ex: ovos ou abacate).</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
                        <div className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg text-sm w-32 text-center">ALMOÇO</div>
                        <div className="flex-1">
                          <p className="font-bold">Ômega-3</p>
                          <p className="text-sm text-gray-600">2-3 cápsulas durante o almoço para melhor absorção.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
                        <div className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg text-sm w-32 text-center">QUALQUER HORA</div>
                        <div className="flex-1">
                          <p className="font-bold">Creatina</p>
                          <p className="text-sm text-gray-600">5g diluído em água ou suco. Tome todos os dias, inclusive no descanso.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg text-sm w-32 text-center">ANTES DE DORMIR</div>
                        <div className="flex-1">
                          <p className="font-bold">Magnésio + Zinco</p>
                          <p className="text-sm text-gray-600">30-60 minutos antes de deitar. Melhora o sono e recuperação.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border-l-4 border-emerald-500 p-4 rounded-r-lg">
                    <p className="text-emerald-800">
                      ⚠️ <strong>AVISO LEGAL:</strong> Se tiver condições médicas ou estiver tomando medicamentos, consulte
                      um médico antes de suplementar. Suplementos não substituem comida de verdade.
                    </p>
                  </div>
                </div>
              </Section>
            </div>

            {/* --- PROGRESSO --- */}
            <div className={activeTab === "progresso" ? "block space-y-4 animate-in fade-in duration-500" : "hidden print:block print:space-y-4"}>
              <div className="mb-6 flex items-center justify-between print:hidden">
                <h2 className="text-2xl font-black text-gray-800 uppercase flex items-center gap-3">
                  📈 PROGRESSO
                </h2>
                <div className="h-1 flex-1 ml-4 bg-emerald-200 rounded-full" />
              </div>

              {/* Treino */}
              <Section
                id="treino"
                title="🏋️ TREINO COMPLEMENTAR"
                expanded={expandedSection === "treino"}
                onToggle={() => toggleSection("treino")}
              >
                <div className="space-y-6">
                  <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded-r-lg text-sm text-orange-900">
                     <strong>Foco:</strong> Hipertrofia Funcional. O treino sinaliza, a nutrição constrói.
                  </div>

                  <div className="bg-emerald-900 text-white rounded-xl p-4 shadow-md">
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                      {[
                        { label: "Freq.", value: "4-5x" },
                        { label: "Séries", value: "3-4" },
                        { label: "Reps", value: "8-12" },
                        { label: "Desc.", value: "60s" },
                        { label: "Duração", value: "50min" },
                      ].map((item, i) => (
                        <div key={i} className="text-center border-r border-emerald-800 last:border-0">
                          <p className="text-[10px] uppercase opacity-70">{item.label}</p>
                          <p className="font-bold text-sm">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <WorkoutDay
                      day="SEGUNDA-FEIRA"
                      focus="Peito + Tríceps"
                      exercises={[
                        "Supino reto (barra ou halteres) - 4x10",
                        "Supino inclinado - 3x12",
                        "Crucifixo - 3x12",
                        "Tríceps testa - 3x12",
                        "Tríceps corda - 3x15",
                      ]}
                    />

                    <WorkoutDay
                      day="TERÇA-FEIRA"
                      focus="Costas + Bíceps"
                      exercises={[
                        "Barra fixa (ou puxada) - 4x8-10",
                        "Remada curvada - 4x10",
                        "Remada cavalinho - 3x12",
                        "Rosca direta - 3x12",
                        "Rosca martelo - 3x12",
                      ]}
                    />

                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <p className="font-bold text-green-800">QUARTA-FEIRA - DESCANSO</p>
                      <p className="text-green-700">Recuperação ativa: caminhada leve 20-30min, alongamento</p>
                    </div>

                    <WorkoutDay
                      day="QUINTA-FEIRA"
                      focus="Pernas + Glúteos"
                      exercises={[
                        "Agachamento livre - 4x10",
                        "Leg press 45º - 4x12",
                        "Cadeira extensora - 3x15",
                        "Cadeira flexora - 3x15",
                        "Panturrilha em pé - 4x20",
                      ]}
                    />

                    <WorkoutDay
                      day="SEXTA-FEIRA"
                      focus="Ombros + Abdômen"
                      exercises={[
                        "Desenvolvimento militar - 4x10",
                        "Elevação lateral - 3x12",
                        "Elevação frontal - 3x12",
                        "Encolhimento - 3x15",
                        "Abdominais variados - 4x20",
                      ]}
                    />

                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <p className="font-bold text-green-800">SÁBADO/DOMINGO - DESCANSO ATIVO</p>
                      <p className="text-green-700">Caminhada, natação ou ciclismo leve, alongamento profundo</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-xl">
                    <h4 className="font-bold text-emerald-800 mb-3">💡 Dicas Importantes:</h4>
                    <ul className="space-y-2 text-gray-700">
                      <li>
                        • <strong>Progressão de carga:</strong> Aumente peso quando conseguir fazer 12 repetições
                        facilmente
                      </li>
                      <li>
                        • <strong>Técnica perfeita:</strong> Melhor fazer menos peso com boa forma
                      </li>
                      <li>
                        • <strong>Aquecimento:</strong> Sempre faça 5-10 minutos antes de começar
                      </li>
                      <li>
                        • <strong>Alimentação pré-treino:</strong> 1-2 horas antes, refeição com carboidrato + proteína
                      </li>
                      <li>
                        • <strong>Alimentação pós-treino:</strong> Dentro de 1 hora, refeição completa do cardápio
                      </li>
                    </ul>
                  </div>
                </div>
              </Section>


              {/* Acompanhamento */}
              <Section
                id="acompanhamento"
                title="📈 ACOMPANHAMENTO DE PROGRESSO"
                expanded={expandedSection === "acompanhamento"}
                onToggle={() => toggleSection("acompanhamento")}
              >
                <div className="space-y-6">
                  <p className="text-base text-gray-700 italic text-center">"O que não é medido não pode ser melhorado"</p>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { icon: "⚖️", title: "PESO CORPORAL", desc: "Pese-se sempre no mesmo dia e horário (em jejum)" },
                      {
                        icon: "📏",
                        title: "MEDIDAS",
                        desc: "Peitoral, braços, cintura, quadril, coxas - A cada 2 semanas",
                      },
                      { icon: "📸", title: "FOTOS", desc: "Frente, lado e costas com mesma roupa - A cada 2 semanas" },
                      { icon: "💪", title: "FORÇA", desc: "Anote o peso levantado nos principais exercícios" },
                      { icon: "⚡", title: "ENERGIA", desc: "Avalie de 1-10 sua energia ao longo do dia" },
                    ].map((item, i) => (
                      <div key={i} className="bg-white p-4 rounded-xl shadow text-center">
                        <div className="text-3xl mb-2">{item.icon}</div>
                        <h5 className="font-bold text-emerald-800 text-sm">{item.title}</h5>
                        <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-emerald-100 p-6 rounded-xl">
                    <h4 className="text-xl font-bold text-green-800 mb-4">🎯 Meta Realista:</h4>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-700">
                        {userData?.goal === "lose-weight" ? "0,5-1kg de gordura por semana" : "0,5-1kg de peso por semana"}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="bg-white p-3 rounded-lg">
                        <p className="font-bold text-emerald-700">Se {userData?.goal === "lose-weight" ? "perder" : "ganhar"} mais rápido:</p>
                        <p className="text-sm text-gray-600">
                          {userData?.goal === "lose-weight" ? "Pode estar perdendo massa magra. Aumente um pouco as calorias." : "Pode estar acumulando gordura. Reduza calorias levemente."}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <p className="font-bold text-emerald-700">Se {userData?.goal === "lose-weight" ? "perder" : "ganhar"} mais devagar:</p>
                        <p className="text-sm text-gray-600">
                          {userData?.goal === "lose-weight" ? "Reduza mais 200 calorias diárias das porções de raízes." : "Aumente 200-300 calorias diárias."}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <p className="font-bold text-emerald-700">Resultado ideal:</p>
                        <p className="text-sm text-gray-600">
                          {userData?.goal === "lose-weight" ? "Perda constante preservando as medidas musculares." : "Ganho constante com aumento de força."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 p-6 rounded-xl">
                    <h4 className="font-bold text-red-800 mb-3">🚨 Sinais de Alerta:</h4>
                    <ul className="space-y-2 text-red-700">
                      <li>
                        • <strong>{userData?.goal === "lose-weight" ? "Perda" : "Ganho"} muito rápido:</strong> Pode indicar perda de {userData?.goal === "lose-weight" ? "massa muscular" : "controle da gordura"}.
                      </li>
                      <li>
                        • <strong>Cintura {userData?.goal === "lose-weight" ? "estagnada" : "crescendo muito"}:</strong> {userData?.goal === "lose-weight" ? "Pode precisar de mais atividade física." : "Indica acúmulo de gordura visceral."}
                      </li>
                      <li>
                        • <strong>Força {userData?.goal === "lose-weight" ? "caindo" : "não aumenta"}:</strong> Você {userData?.goal === "lose-weight" ? "pode estar em um déficit muito agressivo." : "pode estar comendo pouco ou não recuperando."}
                      </li>
                      <li>
                        • <strong>Energia baixa constante:</strong> Sinal de desequilíbrio hormonal ou falta de calorias básicas.
                      </li>
                    </ul>
                  </div>
                </div>
              </Section>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 bg-emerald-800 text-white py-8 px-4 rounded-xl pdf-footer">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <img
                  src="/592accf5-9d8e-4ea0-bfbd-7ad00ed283b8.png"
                  alt="Logo"
                  className="w-28 h-auto brightness-0 invert"
                />
              </div>
              <h2 className="text-xl font-normal mb-1 opacity-50 tracking-widest">DIETA DA SELVA</h2>
              <p className="text-[10px] opacity-40 mb-4 font-normal">
                Protocolo de {userData?.goal === "muscle-gain" ? "Ganho de Peso" : userData?.goal === "lose-weight" ? "Queima de Gordura" : "Saúde e Vigor"} Saudável
              </p>
              <p className="text-[9px] opacity-30 font-normal">Alimentação Ancestral para Resultados Modernos</p>
              <p className="mt-4 text-[11px] font-normal opacity-40">Desenvolvido por Julimar Meneses - Nutricionista | @dr.julimar.meneses</p>
              <p className="text-[8px] opacity-20 mt-2 font-normal">© 2026 - Todos os direitos reservados</p>
            </div>
          </footer>
        </div>
      </div>
      </div>
    </div>
  )
}

function Section({
  id,
  title,
  expanded,
  onToggle,
  children,
}: {
  id: string
  title: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div id={id} className="bg-white rounded-lg shadow-none overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors pdf-header"
      >
        <h2 className="text-lg md:text-xl font-bold">{title}</h2>
        {expanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
      </button>
      <div
        className={expanded ? "p-8 md:p-10 block" : "hidden print:block print:p-8 print:md:p-10"}
        data-section-content
      >
        {children}
      </div>
    </div>
  )
}

function MealCard({
  icon,
  title,
  subtitle,
  items,
  calories,
  protein,
  fat,
  carbs,
}: {
  icon: string
  title: string
  subtitle: string
  items: string[]
  calories: number
  protein: number
  fat: number
  carbs: number
}) {
  return (
    <div className="bg-emerald-50 p-5 rounded-xl">
      <div className="text-3xl mb-2">{icon}</div>
      <h4 className="font-bold text-emerald-800">{title}</h4>
      <p className="text-sm text-gray-600 mb-3">{subtitle}</p>
      <ul className="text-sm text-gray-700 space-y-1 mb-4">
        {items.map((item, i) => (
          <li key={i}>• {item}</li>
        ))}
      </ul>
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-white p-2 rounded">
          <p className="font-bold text-emerald-700">{calories}</p>
          <p className="text-gray-500">cal</p>
        </div>
        <div className="bg-white p-2 rounded">
          <p className="font-bold text-red-600">{protein}g</p>
          <p className="text-gray-500">prot</p>
        </div>
        <div className="bg-white p-2 rounded">
          <p className="font-bold text-green-600">{fat}g</p>
          <p className="text-gray-500">gord</p>
        </div>
        <div className="bg-white p-2 rounded">
          <p className="font-bold text-green-600">{carbs}g</p>
          <p className="text-gray-500">carb</p>
        </div>
      </div>
    </div>
  )
}

function DayMeal({
  time,
  name,
  calories,
  items,
  macros,
}: {
  time: string
  name: string
  calories: number
  items: string[]
  macros: { protein: number; fat: number; carbs: number }
}) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-emerald-600 font-bold">{time}</span>
          <span className="text-gray-600 ml-2">{name}</span>
        </div>
        <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">~{calories} cal</span>
      </div>
      <ul className="text-sm text-gray-700 space-y-1 mb-2">
        {items.map((item, i) => (
          <li key={i}>• {item}</li>
        ))}
      </ul>
      <div className="flex gap-4 text-xs text-gray-500">
        <span>Proteína: {macros.protein}g</span>
        <span>Gorduras: {macros.fat}g</span>
        <span>Carboidratos: {macros.carbs}g</span>
      </div>
    </div>
  )
}

function SmoothieCard({
  icon,
  name,
  ingredients,
  calories,
  protein,
  fat,
  carbs,
}: {
  icon: string
  name: string
  ingredients: string[]
  calories: number
  protein: number
  fat: number
  carbs: number
}) {
  return (
    <div className="bg-teal-50 p-5 rounded-xl">
      <div className="text-4xl text-center mb-2">{icon}</div>
      <h4 className="font-bold text-teal-800 text-center mb-3">{name}</h4>
      <ul className="text-sm text-gray-700 space-y-1 mb-4">
        {ingredients.map((item, i) => (
          <li key={i}>• {item}</li>
        ))}
      </ul>
      <div className="grid grid-cols-4 gap-1 text-center text-xs">
        <div className="bg-white p-2 rounded">
          <p className="font-bold text-teal-700">{calories}</p>
          <p className="text-gray-500">cal</p>
        </div>
        <div className="bg-white p-2 rounded">
          <p className="font-bold text-red-600">{protein}g</p>
          <p className="text-gray-500">prot</p>
        </div>
        <div className="bg-white p-2 rounded">
          <p className="font-bold text-green-600">{fat}g</p>
          <p className="text-gray-500">gord</p>
        </div>
        <div className="bg-white p-2 rounded">
          <p className="font-bold text-green-600">{carbs}g</p>
          <p className="text-gray-500">carb</p>
        </div>
      </div>
    </div>
  )
}

function SupplementCard({
  name,
  dose,
  timing,
  benefits,
  note,
  cost,
}: {
  name: string
  dose: string
  timing: string
  benefits: string
  note: string
  cost: string
}) {
  return (
    <div className="bg-slate-50 p-5 rounded-xl border border-gray-200">
      <h4 className="font-bold text-emerald-800 mb-3">{name}</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between border-b border-gray-200/50 pb-1">
          <strong className="text-gray-700">Dose Recomendada:</strong>
          <span className="text-gray-600 font-medium">{dose}</span>
        </div>
        <div className="flex justify-between border-b border-gray-200/50 pb-1">
          <strong className="text-gray-700">Modo de Uso:</strong>
          <span className="text-gray-600 font-medium">{timing}</span>
        </div>
        <div>
          <strong className="text-gray-700 block mb-1">Principais Benefícios:</strong>
          <p className="text-gray-600 text-xs leading-relaxed">{benefits}</p>
        </div>
        {note && (
          <div className="bg-white/50 p-2 rounded text-xs italic text-gray-500 border border-gray-100 mt-2">
            Tip: {note}
          </div>
        )}
        <p className="text-green-700 font-bold mt-2">Investimento Médio: {cost}</p>
      </div>
    </div>
  )
}

function WorkoutDay({ day, focus, exercises }: { day: string; focus: string; exercises: string[] }) {
  return (
    <div className="bg-emerald-50 p-4 rounded-lg">
      <div className="flex items-center gap-3 mb-3">
        <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-bold">{day}</span>
        <span className="font-bold text-emerald-800">{focus}</span>
      </div>
      <ul className="text-sm text-gray-700 space-y-1">
        {exercises.map((exercise, i) => (
          <li key={i}>• {exercise}</li>
        ))}
      </ul>
    </div>
  )
}
