export type Gender = "male" | "female"
export type ActivityLevel = "sedentary" | "light" | "moderate" | "heavy" | "athlete"
export type Goal = "muscle-gain" | "maintenance" | "lose-weight"

export interface UserData {
  name: string
  age: number
  weight: number // kg
  height: number // cm
  gender: Gender
  activityLevel: ActivityLevel
  goal: Goal
}

export interface DietPlan {
  bmr: number
  tdee: number
  calories: number
  macros: {
    protein: number // grams
    fats: number // grams
    carbs: number // grams
  }
}

const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  heavy: 1.725,
  athlete: 1.9,
}

export function calculateDiet(data: UserData): DietPlan {
  const { weight, height, age, gender, activityLevel, goal } = data

  // BMR Calculation (Mifflin-St Jeor)
  let bmr = 10 * weight + 6.25 * height - 5 * age
  bmr = gender === "male" ? bmr + 5 : bmr - 161

  // TDEE Calculation
  const tdee = bmr * activityMultipliers[activityLevel]

  // Target Calories based on Goal
  let targetCalories = tdee
  if (goal === "muscle-gain") {
    targetCalories += 400 // Slight surplus
  } else if (goal === "lose-weight") {
    targetCalories -= 400 // Slight deficit
  }

  // Macro Calculation (30% Protein, 40% Fats, 30% Carbs)
  // Per Dieta da Selva principles
  const proteinCals = targetCalories * 0.3
  const fatsCals = targetCalories * 0.4
  const carbsCals = targetCalories * 0.3

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories: Math.round(targetCalories),
    macros: {
      protein: Math.round(proteinCals / 4),
      fats: Math.round(fatsCals / 9),
      carbs: Math.round(carbsCals / 4),
    },
  }
}
