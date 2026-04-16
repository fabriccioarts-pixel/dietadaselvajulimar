const fs = require('fs');
let c = fs.readFileSync('components/ebook.tsx', 'utf8');

// 1. Breakfast Lose Weight Correction
c = c.replace(
  /items=\{userData\?\.goal === "lose-weight" \? \[\s*`\${Math\.round\(userData\?\.weight! \* 0\.05\)} Ovos \(sendo 2 inteiros \+ demais apenas claras\)`,\s*"120g de Peito de Frango desfiado \(Proteína Limpa\)",\s*"30g de Abacate ou 1 colher de sopa de Azeite",\s*"100g de Mandioca ou Batata-doce",\s*"Café preto sem açúcar"\s*\]/s,
  `items={userData?.goal === "lose-weight" ? [
                          "4 Ovos (2 inteiros + 2 claras)",
                          "80g de Peito de Frango desfiado",
                          "30g de Abacate ou Azeite",
                          "80g de Mandioca ou Batata-doce",
                          "Café preto sem açúcar"
                        ]`
);

// Update Breakfast Macros for Lose Weight (Label Fix)
c = c.replace(
  /calories=\{Math\.round\(dietPlan\?\.calories! \* 0\.20\)\}\s*items=\{userData\?\.goal === "lose-weight"/s,
  `calories={userData?.goal === "lose-weight" ? 450 : Math.round(dietPlan?.calories! * 0.20)}\n                        items={userData?.goal === "lose-weight"`
);

// 2. Lunch Macro Label Alignment for Lose Weight
c = c.replace(
  /calories=\{Math\.round\(dietPlan\?\.calories! \* 0\.25\)\}\s*items=\{userData\?\.goal === "lose-weight"/s,
  `calories={userData?.goal === "lose-weight" ? 550 : Math.round(dietPlan?.calories! * 0.25)}\n                        items={userData?.goal === "lose-weight"`
);

fs.writeFileSync('components/ebook.tsx', c);
console.log("Precision Breakfast and Lunch labels/portions corrected.");
