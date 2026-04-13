"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, ChevronLeft, User, Ruler, Activity, Target as TargetIcon, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserData, Gender, ActivityLevel, Goal } from "@/lib/diet-utils"

interface OnboardingFormProps {
  onComplete: (data: UserData) => void
}

export function OnboardingForm({ onComplete }: OnboardingFormProps) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<Partial<UserData>>({
    gender: "male",
    activityLevel: "moderate",
    goal: "muscle-gain",
  })

  const totalSteps = 4

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1)
    else onComplete(data as UserData)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const updateData = (fields: Partial<UserData>) => {
    setData((prev) => ({ ...prev, ...fields }))
  }

  const containerVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  }

  return (
    <div className="max-w-md mx-auto h-full flex flex-col justify-center py-12 px-6">
      <div className="mb-8 overflow-hidden rounded-full h-2 bg-amber-100">
        <motion.div
          className="h-full bg-amber-600"
          initial={{ width: "0%" }}
          animate={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                  <User className="text-amber-600 w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Olá! Qual seu nome?</h2>
                <p className="text-gray-500">Para começarmos sua jornada na Dieta da Selva.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  placeholder="Seu nome"
                  value={data.name || ""}
                  onChange={(e) => updateData({ name: e.target.value })}
                  className="text-lg h-12"
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                  <Activity className="text-amber-600 w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Dados Básicos</h2>
                <p className="text-gray-500">Isso ajuda a calcular seu metabolismo basal.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Idade</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="25"
                    value={data.age || ""}
                    onChange={(e) => updateData({ age: Number(e.target.value) })}
                    className="text-lg h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Sexo</Label>
                  <Select
                    value={data.gender}
                    onValueChange={(val: Gender) => updateData({ gender: val })}
                  >
                    <SelectTrigger className="h-12 text-lg">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                  <Ruler className="text-amber-600 w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Suas Medidas</h2>
                <p className="text-gray-500">Quanto mais preciso, melhor o plano.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="70.5"
                    value={data.weight || ""}
                    onChange={(e) => updateData({ weight: Number(e.target.value) })}
                    className="text-lg h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="175"
                    value={data.height || ""}
                    onChange={(e) => updateData({ height: Number(e.target.value) })}
                    className="text-lg h-12"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                  <TargetIcon className="text-amber-600 w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Objetivo & Estilo</h2>
                <p className="text-gray-500">Defina sua meta e atividade física.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goal">Seu Objetivo</Label>
                  <Select
                    value={data.goal}
                    onValueChange={(val: Goal) => updateData({ goal: val })}
                  >
                    <SelectTrigger className="h-12 text-lg">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="muscle-gain">Ganhar Massa Muscular 🦁</SelectItem>
                      <SelectItem value="maintenance">Manter Peso Saudável 💪</SelectItem>
                      <SelectItem value="lose-weight">Perder Gordura 🔥</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity">Nível de Atividade</Label>
                  <Select
                    value={data.activityLevel}
                    onValueChange={(val: ActivityLevel) => updateData({ activityLevel: val })}
                  >
                    <SelectTrigger className="h-12 text-lg">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentário (Trabalho de escritório)</SelectItem>
                      <SelectItem value="light">Leve (Atividade 1-3x/sem)</SelectItem>
                      <SelectItem value="moderate">Moderado (Atividade 3-5x/sem)</SelectItem>
                      <SelectItem value="heavy">Pesado (Treino intenso diário)</SelectItem>
                      <SelectItem value="athlete">Atleta (2 treinos/dia)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-12 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={step === 1}
          className="text-gray-500"
        >
          <ChevronLeft className="mr-2 w-4 h-4" /> Voltar
        </Button>
        <Button
          size="lg"
          onClick={handleNext}
          disabled={step === 1 ? !data.name : (step === 3 ? (!data.weight || !data.height) : (step === 2 ? !data.age : false))}
          className="bg-amber-600 hover:bg-amber-700 text-white px-8"
        >
          {step === totalSteps ? "Gerar Minha Dieta" : "Próximo"} <ChevronRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
