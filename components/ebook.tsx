"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronUp, BookOpen, Download, Loader2, Play } from "lucide-react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import { motion, AnimatePresence } from "framer-motion"
import { calculateDiet, type UserData, type DietPlan } from "@/lib/diet-utils"
import { OnboardingForm } from "./onboarding-form"
import { Button } from "./ui/button"

const sections = [
  { id: "intro", title: "📖 Introdução", icon: "📖" },
  { id: "compras", title: "🛒 Lista de Compras Ancestral", icon: "🛒", category: "fundamentos" },
  { id: "principios", title: "💪 Princípios Fundamentais", icon: "💪" },
  { id: "macros", title: "📊 Distribuição de Macronutrientes", icon: "📊" },
  { id: "combinacoes", title: "🔧 Como Fazer Combinações", icon: "🔧" },
  { id: "melhores", title: "🍽️ Melhores Combinações", icon: "🍽️" },
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
      if (bgImage.includes("amber") || bgImage.includes("orange")) {
        el.style.background = "#fffbeb" // amber-50
      } else if (bgImage.includes("green") || bgImage.includes("emerald")) {
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
  const [appState, setAppState] = useState<"welcome" | "onboarding" | "loading" | "ebook">("welcome")
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
      setAppState("ebook")
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
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full bg-white rounded-3xl shadow-none overflow-hidden"
        >
          <div className="bg-gradient-to-r from-amber-600 to-orange-500 p-12 text-center text-white">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="mb-6 flex justify-center"
            >
              <img 
                src="/592accf5-9d8e-4ea0-bfbd-7ad00ed283b8.png" 
                alt="Dieta da Selva Logo" 
                className="w-24 h-24"
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
              <div className="p-4 bg-slate-50 rounded-2xl">
                <div className="text-2xl mb-1">📊</div>
                <div className="font-bold text-amber-800 text-sm">Cálculo Preciso</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl">
                <div className="text-2xl mb-1">🥩</div>
                <div className="font-bold text-amber-800 text-sm">Plano de Atalaia</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl">
                <div className="text-2xl mb-1">📄</div>
                <div className="font-bold text-amber-800 text-sm">PDF Completo</div>
              </div>
            </div>

            <Button 
              size="lg" 
              onClick={() => setAppState("onboarding")}
              className="w-full h-16 text-xl bg-amber-600 hover:bg-amber-700 text-white rounded-2xl shadow-none transition-all hover:scale-[1.02]"
            >
              Começar Agora <Play className="ml-2 fill-current" size={20} />
            </Button>
            <p className="text-xs text-gray-400">Desenvolvido por Julimar Meneses - Nutricionista</p>
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
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative w-24 h-24 mb-8">
          <motion.div
            className="absolute inset-0 border-4 border-amber-200 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 border-t-4 border-amber-600 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <img 
              src="/592accf5-9d8e-4ea0-bfbd-7ad00ed283b8.png" 
              alt="Logo" 
              className="w-12 h-12"
            />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Processando seus dados...</h2>
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
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-4">
            <img 
              src="/592accf5-9d8e-4ea0-bfbd-7ad00ed283b8.png" 
              alt="Logo" 
              className="w-28 h-28 mx-auto"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">DIETA DA SELVA</h1>
          <div className="hidden print:block text-2xl font-black mt-4 border-t border-white/30 pt-4 uppercase tracking-widest">
            Protocolo para: {userData?.name}
          </div>
          <p className="text-xl md:text-2xl opacity-90 mb-4 print:mt-2">🌴 Protocolo de {userData?.goal === "muscle-gain" ? "Ganho de Peso" : (userData?.goal === "lose-weight" ? "Emagrecimento" : "Bem-Estar")} Personalizado 🌴</p>
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 mt-6 inline-block print:bg-transparent print:border print:border-white/50 print:backdrop-blur-none">
            <p className="text-lg opacity-90 print:hidden">Olá, <span className="font-bold underlineDecoration-amber-400">{userData?.name}</span>! Aqui está seu plano calculado:</p>
            <div className="flex gap-8 justify-center mt-4">
              <div>
                <p className="text-3xl font-bold">{dietPlan?.calories}</p>
                <p className="text-xs opacity-70 uppercase tracking-wider">Kcal Diárias</p>
              </div>
              <div className="w-px h-12 bg-white/30" />
              <div>
                <p className="text-3xl font-bold">{dietPlan?.macros.protein}g</p>
                <p className="text-xs opacity-70 uppercase tracking-wider">Proteína</p>
              </div>
              <div className="w-px h-12 bg-white/30" />
              <div>
                <p className="text-3xl font-bold">{dietPlan?.macros.fats}g</p>
                <p className="text-xs opacity-70 uppercase tracking-wider">Gorduras</p>
              </div>
              <div className="w-px h-12 bg-white/30" />
              <div>
                <p className="text-3xl font-bold">{dietPlan?.macros.carbs}g</p>
                <p className="text-xs opacity-70 uppercase tracking-wider">Carboidratos</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* PDF Download Button - Fixed */}
      <button
        onClick={handleDownload}
        className="fixed bottom-6 right-6 z-50 bg-amber-600 hover:bg-amber-700 text-white rounded-full px-8 h-16 shadow-none flex items-center gap-3 transition-all hover:scale-105 active:scale-95 group print:hidden"
      >
        <Download className="w-6 h-6 group-hover:animate-bounce" />
        <span className="font-bold text-lg uppercase tracking-wider">Baixar Protocolo PDF</span>
      </button>

      {/* Tabs Navigation - Premium Segmented Control */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-amber-100 shadow-none overflow-x-auto no-scrollbar print:hidden">
        <div className="max-w-4xl mx-auto px-2 py-2 flex gap-1 items-center justify-between">
          {tabCategories.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-300 min-w-[85px] ${
                  isActive ? "text-amber-800" : "text-gray-500 hover:text-amber-600 hover:bg-white/50"
                }`}
              >
                {/* Sliding indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-white shadow-none border border-amber-200/50 rounded-xl"
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
                  margin: 15mm;
                }
                body {
                  background: white !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .print\\:hidden {
                  display: none !important;
                }
                [data-section-content] {
                  display: block !important;
                  max-height: none !important;
                  opacity: 1 !important;
                  visibility: visible !important;
                  padding-bottom: 2rem !important;
                }
                .bg-gradient-to-r {
                  background-image: none !important;
                  background-color: #f3f4f6 !important;
                  color: #1f2937 !important;
                  border-bottom: 2px solid #e5e7eb !important;
                }
                section, .rounded-xl {
                  break-inside: avoid;
                  border: 1px solid #e5e7eb !important;
                  margin-bottom: 2rem !important;
                }
                header {
                  background: #d97706 !important;
                  color: white !important;
                  -webkit-print-color-adjust: exact !important;
                  margin-bottom: 2rem !important;
                  border-radius: 1rem !important;
                }
                /* Force all tab containers to show during print */
                .hidden {
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                }
              }
            `}</style>
            {/* --- FUNDAMENTOS --- */}
            <div className={activeTab === "fundamentos" ? "block space-y-4 animate-in fade-in duration-500" : "hidden"}>
              <div className="mb-6 flex items-center justify-between print:hidden">
                <h2 className="text-2xl font-black text-gray-800 uppercase flex items-center gap-3">
                  🦁 FUNDAMENTOS
                </h2>
                <div className="h-1 flex-1 ml-4 bg-gradient-to-r from-amber-200 to-transparent rounded-full" />
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
                  <h3 className="text-xl font-bold text-amber-800 mb-3">O que é este protocolo?</h3>
                  <p className="text-gray-700 mb-4">
                    Este manual foi desenvolvido para pessoas que desejam ganhar peso de forma saudável utilizando os
                    princípios da Dieta da Selva: alimentos ancestrais, densos em nutrientes e de alta qualidade
                    biológica.
                  </p>
                  <div 
                    className="bg-slate-50 border-l-4 border-amber-500 p-4 rounded-r-lg"
                    data-pdf-essential="false"
                  >
                    <p className="text-amber-800">
                      💡 <strong>DICA INICIAL:</strong> Ganhar peso saudável não significa comer "qualquer coisa". A
                      qualidade dos alimentos determina se você ganha músculo ou apenas gordura. Escolha sempre
                      alimentos de verdade, não produtos industrializados.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-amber-800 mb-3">Para quem é este protocolo?</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Pessoas naturalmente magras (ectomorfos)</li>
                    <li>Quem busca aumentar massa muscular</li>
                    <li>Recuperação pós-doença</li>
                    <li>Atletas em fase de volume</li>
                    <li>Pessoas com metabolismo acelerado</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-amber-800 mb-3">O que você vai alcançar:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      "Ganho de 2-4kg por mês de massa muscular magra",
                      "Energia aumentada para treinos e atividades diárias",
                      "Força progressiva em todos os exercícios",
                      "Saúde metabólica otimizada",
                      "Corpo funcional e atlético",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 bg-green-50 p-3 rounded-lg">
                        <span className="text-green-600">✅</span>
                        <span className="text-green-800">{item}</span>
                      </div>
                    ))}
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
                          <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
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
                          <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                          <span className="text-gray-700 uppercase text-xs font-bold">{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Carboidratos */}
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-none">
                    <h3 className="font-bold text-amber-800 mb-4 flex items-center gap-2">
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
                          <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
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
                          <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                          <span className="text-gray-700 uppercase text-xs font-bold">{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
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
                {/* 1. Superávit Calórico */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-xl">
                  <h3 className="text-xl font-bold text-amber-800 mb-3">1. Superávit Calórico Inteligente</h3>
                  <p className="text-gray-700 mb-4">Não se trata de comer qualquer coisa.</p>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Superávit de 300-500 calorias por dia</li>
                    <li>• Prioridade: alimentos densos e nutritivos</li>
                    <li>• Evitar comida industrializada (mesmo que tenha calorias)</li>
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
                <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-xl">
                  <h3 className="text-xl font-bold text-amber-800 mb-3">2. Proteína Abundante</h3>
                  <p className="text-gray-600 mb-4">Sua Meta Personalizada: <strong>{dietPlan?.macros.protein}g</strong> de proteína por dia</p>

                  <h4 className="font-bold text-amber-700 mb-2">Fontes da Selva (Acessíveis):</h4>
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
                    className="mt-4 bg-slate-50 border-l-4 border-yellow-500 p-4 rounded-r-lg"
                    data-pdf-essential="false"
                  >
                    <p className="text-yellow-800">
                      💡 <strong>DICA PRO:</strong> Fígado bovino é um super-alimento extremamente barato! Rico em
                      vitaminas A, B12, ferro e proteínas. Coma 1x por semana para turbinar seus resultados.
                    </p>
                  </div>
                </div>

                {/* 3. Gorduras */}
                <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-xl">
                  <h3 className="text-xl font-bold text-amber-800 mb-3">3. Gorduras Saudáveis em Abundância</h3>
                  <p className="text-gray-700 mb-4">As gorduras são suas aliadas - 9 calorias por grama!</p>

                  <h4 className="font-bold text-amber-700 mb-2">Fontes da Selva:</h4>
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
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl">
                  <h3 className="text-xl font-bold text-amber-800 mb-3">4. Carboidratos de Qualidade</h3>
                  <p className="text-gray-700 mb-4">Combustível para treinar e recuperar</p>

                  <h4 className="font-bold text-amber-700 mb-2">Fontes da Selva:</h4>
                  <ul className="space-y-1 text-gray-700 text-sm">
                    <li>🍠 Batata-doce: 200-300g, 2-3 vezes ao dia</li>
                    <li>🥔 Mandioca/Aipim: 200-300g por refeição (muito acessível!)</li>
                    <li>🍌 Banana-da-terra: 2-3 unidades assadas em óleo de coco</li>
                    <li>🥔 Batata inglesa: 200-300g por refeição</li>
                    <li>🥔 Inhame, cará: raízes e tubérculos diversos</li>
                    <li>🍌 Frutas densas: bananas, mangas, mamão, jaca</li>
                  </ul>

                  <div className="mt-4 bg-slate-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                    <p className="text-amber-800">
                      🌟 <strong>SUPER DICA:</strong> Mandioca é extremamente barata e versátil! Pode ser cozida, assada
                      ou grelhada. Compre em feiras e mercados municipais para economizar ainda mais.
                    </p>
                  </div>
                </div>

                {/* 5. Frequência */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl">
                  <h3 className="text-xl font-bold text-amber-800 mb-3">5. Frequência de Refeições</h3>
                  <p className="text-gray-700 mb-4">2-4 refeições ao dia (conforme sua preferência e rotina)</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-lg shadow">
                      <h5 className="font-bold text-amber-700 mb-2">📋 MODELO 1: 4 Refeições</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>7h: Café da manhã (~700-800 cal)</li>
                        <li>12h: Almoço (~800-900 cal)</li>
                        <li>16h: Lanche/Smoothie (~500-700 cal)</li>
                        <li>20h: Jantar (~800-900 cal)</li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                      <h5 className="font-bold text-amber-700 mb-2">📋 MODELO 2: 3 Refeições</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>8h: Café reforçado (~900-1000 cal)</li>
                        <li>13h: Almoço completo (~1000-1200 cal)</li>
                        <li>19h: Jantar completo (~900-1000 cal)</li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                      <h5 className="font-bold text-amber-700 mb-2">📋 MODELO 3: 2 Refeições</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>12h: Primeira refeição (~1400-1600 cal)</li>
                        <li>19h: Segunda refeição (~1400-1600 cal)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-amber-100 p-4 rounded-lg">
                    <p className="text-amber-800 font-medium">
                      🎯 <strong>REGRA DE OURO:</strong> Não importa se você faz 2, 3 ou 4 refeições. O que importa é
                      atingir suas calorias e macronutrientes totais do dia!
                    </p>
                  </div>
                </div>

                {/* 6. Hidratação */}
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-6 rounded-xl">
                  <h3 className="text-xl font-bold text-amber-800 mb-3">6. Hidratação Adequada</h3>
                  <h4 className="font-bold text-blue-700 mb-3">💧 A Regra da Urina Clara</h4>
                  <p className="text-gray-700 mb-4">Esqueça contagem de litros! Use sua urina como indicador.</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    <div className="bg-yellow-200 p-3 rounded-lg text-center">
                      <div className="text-2xl mb-1">🟡</div>
                      <p className="text-xs font-medium">Amarelo escuro = DESIDRATADO</p>
                    </div>
                    <div className="bg-yellow-100 p-3 rounded-lg text-center">
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

                  <div className="mt-4 bg-amber-100 p-4 rounded-lg">
                    <p className="text-amber-800 font-medium">
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
                <h3 className="text-xl font-bold text-amber-800">Para Ganho de Peso Limpo:</h3>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-amber-600 text-white">
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

                <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-6 rounded-xl">
                  <h4 className="font-bold text-amber-800 mb-4">Seu Plano Prático ({userData?.weight}kg):</h4>
                  <div className="text-center mb-4">
                    <span className="text-4xl font-bold text-amber-600">{dietPlan?.calories}</span>
                    <span className="text-xl text-gray-600 ml-2">calorias/dia</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg text-center">
                      <div className="text-3xl mb-2">💪</div>
                      <p className="font-bold text-amber-800">Proteína</p>
                      <p className="text-2xl font-bold">{dietPlan?.macros.protein}g</p>
                      <p className="text-sm text-gray-500">= {Math.round(dietPlan?.macros.protein! * 4)} cal (30%)</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg text-center">
                      <div className="text-3xl mb-2">🥑</div>
                      <p className="font-bold text-amber-800">Gorduras</p>
                      <p className="text-2xl font-bold">{dietPlan?.macros.fats}g</p>
                      <p className="text-sm text-gray-500">= {Math.round(dietPlan?.macros.fats! * 9)} cal (40%)</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg text-center">
                      <div className="text-3xl mb-2">🍠</div>
                      <p className="font-bold text-amber-800">Carbos</p>
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
            <div className={activeTab === "protocolo" ? "block space-y-4 animate-in fade-in duration-500" : "hidden"}>
              <div className="mb-6 flex items-center justify-between print:hidden">
                <h2 className="text-2xl font-black text-gray-800 uppercase flex items-center gap-3">
                  🥩 O PROTOCOLO
                </h2>
                <div className="h-1 flex-1 ml-4 bg-gradient-to-r from-amber-200 to-transparent rounded-full" />
              </div>
                {/* Combinações */}
            <Section
              id="combinacoes"
              title="🔧 COMO FAZER COMBINAÇÕES PARA GANHAR PESO"
              expanded={expandedSection === "combinacoes"}
              onToggle={() => toggleSection("combinacoes")}
            >
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 rounded-xl text-center">
                  <h3 className="text-xl font-bold mb-2">A Fórmula Perfeita da Selva:</h3>
                  <p className="text-2xl font-bold">FRUTAS DOCES + RAÍZES/TUBÉRCULOS + CARNES GORDAS = GANHO DE PESO</p>
                </div>

                {/* Elemento 1: Frutas */}
                <div className="bg-slate-50 p-6 rounded-xl">
                  <h4 className="text-xl font-bold text-yellow-800 mb-3">
                    🍌 ELEMENTO 1: Frutas Doces e Ricas em Carboidratos
                  </h4>
                  <p className="text-gray-700 mb-4">
                    Fornecem energia rápida, vitaminas, minerais e fibras. São carboidratos naturais que não causam
                    inflamação.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { name: "Banana-prata/nanica", carbs: "26g/unidade" },
                      { name: "Banana-da-terra", carbs: "57g/unidade" },
                      { name: "Manga", carbs: "50g/unidade" },
                      { name: "Mamão papaya", carbs: "43g/unidade" },
                      { name: "Jaca", carbs: "95g/xícara" },
                      { name: "Tâmaras secas", carbs: "18g/unidade" },
                    ].map((fruit, i) => (
                      <div key={i} className="bg-white p-3 rounded-lg">
                        <p className="font-medium text-sm">{fruit.name}</p>
                        <p className="text-xs text-gray-500">{fruit.carbs}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Elemento 2: Raízes */}
                <div className="bg-slate-50 p-6 rounded-xl">
                  <h4 className="text-xl font-bold text-orange-800 mb-3">🥔 ELEMENTO 2: Raízes e Tubérculos</h4>
                  <p className="text-gray-700 mb-4">
                    Carboidratos complexos de longa duração, saciantes, ricos em nutrientes e extremamente acessíveis.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { name: "Batata-doce", carbs: "52g/200g" },
                      { name: "Mandioca/Aipim", carbs: "76g/200g" },
                      { name: "Batata-inglesa", carbs: "34g/200g" },
                      { name: "Inhame", carbs: "56g/200g" },
                      { name: "Cará", carbs: "50g/200g" },
                      { name: "Beterraba", carbs: "20g/200g" },
                    ].map((root, i) => (
                      <div key={i} className="bg-white p-3 rounded-lg">
                        <p className="font-medium text-sm">{root.name}</p>
                        <p className="text-xs text-gray-500">{root.carbs}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Elemento 3: Carnes */}
                <div className="bg-red-50 p-6 rounded-xl">
                  <h4 className="text-xl font-bold text-red-800 mb-3">🥩 ELEMENTO 3: Carnes Gordas</h4>
                  <p className="text-gray-700 mb-4">
                    Proteína de alta qualidade + gorduras saturadas saudáveis = construção muscular + densidade
                    calórica.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      "Acém",
                      "Músculo bovino",
                      "Fraldinha",
                      "Costela bovina",
                      "Coxa de frango COM PELE",
                      "Fígado bovino",
                      "Coração bovino",
                      "Moela",
                    ].map((meat, i) => (
                      <div key={i} className="bg-white p-3 rounded-lg">
                        <p className="font-medium text-sm">{meat}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 bg-green-100 border-l-4 border-green-500 p-4 rounded-r-lg">
                    <p className="text-green-800">
                      💰 <strong>ECONOMIA MÁXIMA:</strong> Negocie com açougues locais. Compre cortes mais baratos em
                      maior quantidade. Miúdos são extremamente baratos e nutritivos!
                    </p>
                  </div>
                </div>

                {/* Fórmula Prática */}
                <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-6 rounded-xl">
                  <h4 className="text-xl font-bold text-amber-800 mb-4">🎯 FÓRMULA PRÁTICA: Monte Sua Refeição</h4>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-center font-bold text-lg text-amber-800 mb-4">
                      ESTRUTURA DE CADA REFEIÇÃO (~700-900 cal)
                    </p>
                    <ul className="space-y-2 text-gray-700">
                      <li>
                        <strong>1 PORÇÃO PROTEÍNA:</strong> 200-250g de carne gorda
                      </li>
                      <li>
                        <strong>1 PORÇÃO CARBOIDRATO:</strong> 200-300g de raiz/tubérculo
                      </li>
                      <li>
                        <strong>1 PORÇÃO GORDURA:</strong> 3-4 col. sopa óleo/manteiga/banha
                      </li>
                      <li>
                        <strong>1-2 FRUTAS DOCES:</strong> Como sobremesa ou junto
                      </li>
                      <li>
                        <strong>VEGETAIS PERMITIDOS:</strong> Cenoura e beterraba
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </Section>

            {/* Melhores Combinações */}
            <Section
              id="melhores"
              title="🍽️ MELHORES COMBINAÇÕES DE ALIMENTOS"
              expanded={expandedSection === "melhores"}
              onToggle={() => toggleSection("melhores")}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MealCard
                  icon="🍳"
                  title="COMBINAÇÃO 1: Power Breakfast"
                  subtitle="Ovos + Abacate + Batata-doce"
                  items={[
                    "4 ovos inteiros mexidos em óleo de coco (2 col. sopa)",
                    "1 abacate inteiro (200g)",
                    "200g batata-doce assada",
                    "2 bananas prata de sobremesa",
                    "Sal rosa do Himalaia",
                  ]}
                  calories={800}
                  protein={28}
                  fat={48}
                  carbs={65}
                />

                <MealCard
                  icon="🥩"
                  title="COMBINAÇÃO 2: Muscle Lunch"
                  subtitle="Carne Vermelha + Mandioca + Vegetais"
                  items={[
                    "200g fraldinha ou acém",
                    "250g mandioca assada em banha (3 col. sopa)",
                    "Cenoura ralada com azeite (3 col. sopa)",
                    "1 manga grande de sobremesa",
                    "30g coco seco ralado",
                  ]}
                  calories={900}
                  protein={50}
                  fat={50}
                  carbs={70}
                />

                <MealCard
                  icon="🍗"
                  title="COMBINAÇÃO 3: Recovery Dinner"
                  subtitle="Frango + Banana-da-terra + Vegetais"
                  items={[
                    "2 coxas de frango com pele grelhadas",
                    "2 bananas-da-terra assadas em óleo de coco (3 col. sopa)",
                    "Beterraba cozida com manteiga",
                    "1 xícara de uvas de sobremesa",
                  ]}
                  calories={850}
                  protein={45}
                  fat={52}
                  carbs={60}
                />

                <MealCard
                  icon="🥤"
                  title="COMBINAÇÃO 4: Smoothie Denso"
                  subtitle="Shake de Alta Caloria"
                  items={[
                    "3 bananas grandes",
                    "3 col. sopa pasta de castanha-de-caju",
                    "1 abacate pequeno (100g)",
                    "200ml leite de coco integral",
                    "2 col. sopa mel cru",
                  ]}
                  calories={750}
                  protein={15}
                  fat={42}
                  carbs={85}
                />

                <MealCard
                  icon="🥥"
                  title="COMBINAÇÃO 5: Mix Energético"
                  subtitle="Mix de Coco e Frutas Secas"
                  items={[
                    "30g coco seco ralado",
                    "100g tâmaras secas",
                    "50g coco chips torrado",
                    "2 bananas frescas",
                    "1 manga ou mamão de sobremesa",
                  ]}
                  calories={650}
                  protein={8}
                  fat={22}
                  carbs={120}
                />
              </div>

              <div className="mt-6 bg-slate-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                <p className="text-amber-800">
                  🔄 <strong>VARIAÇÃO É CHAVE:</strong> Não coma as mesmas combinações todos os dias. Alterne as
                  proteínas, carboidratos e frutas para garantir variedade de nutrientes e evitar enjoar do protocolo!
                </p>
              </div>
            </Section>

            {/* Cardápio Mensal */}
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
                  <div className="bg-amber-600 text-white p-4">
                    <h4 className="text-xl font-bold">🗓️ SEGUNDA-FEIRA - Exemplo Completo</h4>
                  </div>
                  <div className="p-4 space-y-4">
                    <DayMeal
                      time="7:00"
                      name="Refeição 1"
                      calories={720}
                      items={[
                        "5 ovos mexidos em manteiga (2 col. sopa)",
                        "1 abacate inteiro (200g)",
                        "150g batata-doce assada",
                        "2 bananas prata",
                        "Café com leite de coco",
                      ]}
                      macros={{ protein: 32, fat: 45, carbs: 60 }}
                    />

                    <DayMeal
                      time="10:30"
                      name="Refeição 2"
                      calories={680}
                      items={[
                        "Smoothie: 3 bananas + 3 col. pasta de coco + 1 abacate pequeno + 200ml leite de coco + 1 col. mel",
                      ]}
                      macros={{ protein: 15, fat: 38, carbs: 75 }}
                    />

                    <DayMeal
                      time="13:30"
                      name="Refeição 3"
                      calories={880}
                      items={[
                        "250g fraldinha bovina grelhada",
                        "300g mandioca assada em óleo de coco (4 col.)",
                        "Cenoura e beterraba raladas com azeite (3 col.)",
                        "1 manga grande de sobremesa",
                        "30g coco seco ralado",
                      ]}
                      macros={{ protein: 52, fat: 48, carbs: 75 }}
                    />

                    <DayMeal
                      time="17:00"
                      name="Refeição 4"
                      calories={450}
                      items={["30g coco seco ralado", "2 bananas", "1 xícara de uvas", "50g tâmaras secas"]}
                      macros={{ protein: 18, fat: 28, carbs: 50 }}
                    />

                    <DayMeal
                      time="20:00"
                      name="Refeição 5"
                      calories={840}
                      items={[
                        "2 coxas + 2 sobrecoxas de frango com pele assadas",
                        "2 bananas-da-terra assadas em óleo de coco (3 col.)",
                        "Cenoura cozida com manteiga (2 col.)",
                        "1 mamão papaya pequeno de sobremesa",
                      ]}
                      macros={{ protein: 48, fat: 52, carbs: 62 }}
                    />

                    <div className="bg-green-100 p-4 rounded-lg text-center">
                      <p className="text-green-800 font-bold text-lg">✅ Total do Dia: ~3.570 calorias</p>
                      <p className="text-green-700">Proteína: 165g | Gorduras: 211g | Carboidratos: 322g</p>
                    </div>
                  </div>
                </div>

                {/* Rotação */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl">
                  <h4 className="text-xl font-bold text-purple-800 mb-4">📝 Rotação Semanal</h4>
                  <p className="text-gray-700 mb-4">
                    Este cardápio apresenta 1 dia completo como exemplo. Para as semanas seguintes, você deve rotacionar
                    as fontes:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg">
                      <h5 className="font-bold text-amber-700">🥩 Proteínas</h5>
                      <p className="text-sm text-gray-600">
                        Alterne entre acém, fraldinha, músculo, coxa de frango, fígado, coração, moela
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <h5 className="font-bold text-amber-700">🍠 Carboidratos</h5>
                      <p className="text-sm text-gray-600">
                        Alterne entre batata-doce, mandioca, banana-da-terra, inhame, batata inglesa
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <h5 className="font-bold text-amber-700">🍌 Frutas</h5>
                      <p className="text-sm text-gray-600">
                        Alterne entre bananas, mangas, mamão, uvas, abacaxi, melancia
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <h5 className="font-bold text-amber-700">🥑 Gorduras</h5>
                      <p className="text-sm text-gray-600">
                        Alterne entre abacate, óleo de coco, azeite, manteiga, banha
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                  <p className="text-amber-800">
                    📅 <strong>MEAL PREP:</strong> Separe 2-3 horas no domingo para preparar refeições da semana.
                    Cozinhe 3kg de frango, 2kg de batata-doce, 2kg de mandioca. Armazene em potes de vidro na geladeira!
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SmoothieCard
                    icon="🍌"
                    name="Mass Gainer da Selva"
                    ingredients={[
                      "3 bananas maduras",
                      "1 abacate inteiro",
                      "4 col. sopa coco ralado",
                      "300ml leite de coco integral",
                      "2 col. sopa mel cru",
                      "2 col. sopa óleo de coco",
                    ]}
                    calories={950}
                    protein={10}
                    fat={62}
                    carbs={90}
                  />

                  <SmoothieCard
                    icon="🥭"
                    name="Tropical Power"
                    ingredients={[
                      "2 mangas maduras",
                      "1 abacate",
                      "2 bananas",
                      "200ml leite de coco",
                      "3 col. sopa coco ralado",
                      "1 col. sopa mel",
                    ]}
                    calories={880}
                    protein={8}
                    fat={50}
                    carbs={105}
                  />

                  <SmoothieCard
                    icon="🍫"
                    name="Chocolate Ancestral"
                    ingredients={[
                      "3 bananas",
                      "1 abacate",
                      "3 col. sopa cacau cru em pó",
                      "4 col. sopa coco ralado",
                      "300ml leite de coco",
                      "2 col. sopa mel",
                    ]}
                    calories={920}
                    protein={12}
                    fat={58}
                    carbs={95}
                  />
                </div>

                <div 
                  className="bg-slate-50 p-6 rounded-xl"
                  data-pdf-essential="false"
                >
                  <h4 className="font-bold text-amber-800 mb-3">💡 Dicas de Preparo:</h4>
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

                <h4 className="text-xl font-bold text-amber-800">Suplementos Essenciais:</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SupplementCard
                    name="1. CREATINA MONOHIDRATADA"
                    dose="5g por dia (1 colher de chá)"
                    timing="Qualquer hora do dia, com água"
                    benefits="Aumenta força, ganho muscular e retenção de água"
                    note="Mais estudada e segura, não precisa de 'fase de carga'"
                    cost="R$ 50-80 (dura 2 meses)"
                  />

                  <SupplementCard
                    name="2. ÔMEGA-3 (EPA/DHA)"
                    dose="3g por dia (óleo de peixe)"
                    timing="Com refeições"
                    benefits="Reduz inflamação, melhora recuperação muscular"
                    note="Escolha marcas com certificação de pureza"
                    cost="R$ 40-90 (dura 1 mês)"
                  />

                  <SupplementCard
                    name="3. VITAMINA D3 + K2"
                    dose="5.000 UI D3 + 200mcg K2"
                    timing="Pela manhã com gordura"
                    benefits="Saúde óssea, produção hormonal, imunidade"
                    note="Maioria das pessoas é deficiente em D3"
                    cost="R$ 30-60 (dura 3-6 meses)"
                  />

                  <SupplementCard
                    name="4. MAGNÉSIO"
                    dose="400mg antes de dormir"
                    timing="1 hora antes de deitar"
                    benefits="Recuperação muscular, qualidade do sono"
                    note="Prefira magnésio glicinato ou treonato"
                    cost="R$ 25-50 (dura 2 meses)"
                  />

                  <SupplementCard
                    name="5. ZINCO"
                    dose="30mg por dia"
                    timing="À noite, longe do café"
                    benefits="Testosterona natural, sistema imune"
                    note="Não exceda 40mg/dia"
                    cost="R$ 20-40 (dura 3 meses)"
                  />
                </div>

                <div className="bg-green-100 p-6 rounded-xl text-center">
                  <p className="text-green-800 font-bold text-lg">💰 CUSTO TOTAL MENSAL: R$ 60-120</p>
                  <p className="text-green-700">Protocolo completo custa menos que 1 lanche diário em fast-food!</p>
                </div>

                <div className="bg-white border-2 border-amber-500/20 p-6 rounded-2xl">
                  <h4 className="text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">
                    ⏱️ CRONOGRAMA DE USO (MODO DE USO)
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
                      <div className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-lg text-sm w-32 text-center">AO ACORDAR</div>
                      <div className="flex-1">
                        <p className="font-bold">Multivitamínico (Opcional)</p>
                        <p className="text-sm text-gray-600">Com o café da manhã.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
                      <div className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-lg text-sm w-32 text-center">MANHÃ</div>
                      <div className="flex-1">
                        <p className="font-bold">Vitamina D3 + K2</p>
                        <p className="text-sm text-gray-600">Logo após a primeira refeição com gordura (ex: ovos ou abacate).</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
                      <div className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-lg text-sm w-32 text-center">ALMOÇO</div>
                      <div className="flex-1">
                        <p className="font-bold">Ômega-3</p>
                        <p className="text-sm text-gray-600">2-3 cápsulas durante o almoço para melhor absorção.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
                      <div className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-lg text-sm w-32 text-center">QUALQUER HORA</div>
                      <div className="flex-1">
                        <p className="font-bold">Creatina</p>
                        <p className="text-sm text-gray-600">5g diluído em água ou suco. Tome todos os dias, inclusive no descanso.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-lg text-sm w-32 text-center">ANTES DE DORMIR</div>
                      <div className="flex-1">
                        <p className="font-bold">Magnésio + Zinco</p>
                        <p className="text-sm text-gray-600">30-60 minutos antes de deitar. Melhora o sono e recuperação.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                  <p className="text-yellow-800">
                    ⚠️ <strong>AVISO LEGAL:</strong> Se tiver condições médicas ou estiver tomando medicamentos, consulte
                    um médico antes de suplementar. Suplementos não substituem comida de verdade.
                  </p>
                </div>
              </div>
            </Section>
            </div>

            {/* --- PROGRESSO --- */}
            <div className={activeTab === "progresso" ? "block space-y-4 animate-in fade-in duration-500" : "hidden"}>
              <div className="mb-6 flex items-center justify-between print:hidden">
                <h2 className="text-2xl font-black text-gray-800 uppercase flex items-center gap-3">
                  📈 PROGRESSO
                </h2>
                <div className="h-1 flex-1 ml-4 bg-gradient-to-r from-amber-200 to-transparent rounded-full" />
              </div>

            {/* Treino */}
            <Section
              id="treino"
              title="🏋️ TREINO COMPLEMENTAR"
              expanded={expandedSection === "treino"}
              onToggle={() => toggleSection("treino")}
            >
              <div className="space-y-6">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                  <p className="text-red-800 font-bold">⚠️ ATENÇÃO: Alimentação representa 70% dos resultados!</p>
                  <p className="text-red-700">
                    Você pode treinar perfeitamente, mas se não comer suficiente, NÃO VAI CRESCER.
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow p-6">
                  <h4 className="text-xl font-bold text-amber-800 mb-4">Estrutura do Treino:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { label: "Frequência", value: "4-5 dias/semana" },
                      { label: "Séries", value: "3-4 por exercício" },
                      { label: "Repetições", value: "8-12 (hipertrofia)" },
                      { label: "Descanso", value: "60-90 segundos" },
                      { label: "Duração", value: "45-60 minutos" },
                    ].map((item, i) => (
                      <div key={i} className="bg-slate-50 p-3 rounded-lg text-center">
                        <p className="text-sm text-gray-600">{item.label}</p>
                        <p className="font-bold text-amber-800">{item.value}</p>
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
                  <h4 className="font-bold text-amber-800 mb-3">💡 Dicas Importantes:</h4>
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
                <p className="text-lg text-gray-700 italic text-center">"O que não é medido não pode ser melhorado"</p>

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
                      <h5 className="font-bold text-amber-800 text-sm">{item.title}</h5>
                      <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-r from-green-100 to-teal-100 p-6 rounded-xl">
                  <h4 className="text-xl font-bold text-green-800 mb-4">🎯 Meta Realista:</h4>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-700">0,5-1kg por semana = 2-4kg por mês</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-white p-3 rounded-lg">
                      <p className="font-bold text-amber-700">Se ganhar mais rápido:</p>
                      <p className="text-sm text-gray-600">Pode estar acumulando gordura. Reduza calorias levemente.</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="font-bold text-amber-700">Se ganhar mais devagar:</p>
                      <p className="text-sm text-gray-600">Aumente 200-300 calorias diárias.</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="font-bold text-amber-700">Resultado ideal:</p>
                      <p className="text-sm text-gray-600">Ganho constante com aumento de força.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 p-6 rounded-xl">
                  <h4 className="font-bold text-red-800 mb-3">🚨 Sinais de Alerta:</h4>
                  <ul className="space-y-2 text-red-700">
                    <li>
                      • <strong>Ganho muito rápido (+2kg/semana):</strong> Provavelmente muita gordura. Reduza calorias.
                    </li>
                    <li>
                      • <strong>Cintura crescendo muito:</strong> Pode indicar acúmulo de gordura visceral.
                    </li>
                    <li>
                      • <strong>Força não aumenta:</strong> Pode estar comendo pouco ou não recuperando.
                    </li>
                    <li>
                      • <strong>Energia baixa constante:</strong> Pode ser excesso ou falta de carboidratos.
                    </li>
                  </ul>
                </div>
              </div>
            </Section>
          </div>
        </div>

          {/* Footer */}
          <footer className="mt-12 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 text-white py-8 px-4 rounded-xl pdf-footer">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <img 
                  src="/592accf5-9d8e-4ea0-bfbd-7ad00ed283b8.png" 
                  alt="Logo" 
                  className="w-20 h-20 brightness-0 invert"
                />
              </div>
              <h2 className="text-2xl font-bold mb-2">DIETA DA SELVA</h2>
              <p className="opacity-90 mb-4">Protocolo de Ganho de Peso Saudável</p>
              <p className="text-sm opacity-80">Alimentação Ancestral para Resultados Modernos</p>
              <p className="mt-4 font-medium">Desenvolvido por Julimar Meneses - Nutricionista</p>
              <p className="text-sm opacity-70 mt-2">© 2026 - Todos os direitos reservados</p>
            </div>
          </footer>
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
    <div id={id} className="bg-white rounded-xl shadow-none overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-colors pdf-header"
      >
        <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
        {expanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
      </button>
      <div 
        className={expanded ? "p-6 block" : "hidden"} 
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
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-xl">
      <div className="text-3xl mb-2">{icon}</div>
      <h4 className="font-bold text-amber-800">{title}</h4>
      <p className="text-sm text-gray-600 mb-3">{subtitle}</p>
      <ul className="text-sm text-gray-700 space-y-1 mb-4">
        {items.map((item, i) => (
          <li key={i}>• {item}</li>
        ))}
      </ul>
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-white p-2 rounded">
          <p className="font-bold text-amber-700">{calories}</p>
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
          <p className="font-bold text-orange-600">{carbs}g</p>
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
          <span className="text-amber-600 font-bold">{time}</span>
          <span className="text-gray-600 ml-2">{name}</span>
        </div>
        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">~{calories} cal</span>
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
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl">
      <div className="text-4xl text-center mb-2">{icon}</div>
      <h4 className="font-bold text-purple-800 text-center mb-3">{name}</h4>
      <ul className="text-sm text-gray-700 space-y-1 mb-4">
        {ingredients.map((item, i) => (
          <li key={i}>• {item}</li>
        ))}
      </ul>
      <div className="grid grid-cols-4 gap-1 text-center text-xs">
        <div className="bg-white p-2 rounded">
          <p className="font-bold text-purple-700">{calories}</p>
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
          <p className="font-bold text-orange-600">{carbs}g</p>
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
      <h4 className="font-bold text-amber-800 mb-3">{name}</h4>
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
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg">
      <div className="flex items-center gap-3 mb-3">
        <span className="bg-amber-600 text-white px-3 py-1 rounded-full text-sm font-bold">{day}</span>
        <span className="font-bold text-amber-800">{focus}</span>
      </div>
      <ul className="text-sm text-gray-700 space-y-1">
        {exercises.map((exercise, i) => (
          <li key={i}>• {exercise}</li>
        ))}
      </ul>
    </div>
  )
}
