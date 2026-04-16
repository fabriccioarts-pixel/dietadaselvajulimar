const fs = require('fs');
let c = fs.readFileSync('components/ebook.tsx', 'utf8');

// 1. Breakfast Cleanup (Prioritize Protein over hidden fats)
c = c.replace(
  /items=\{\[\s*`\${Math\.round\(userData\?\.weight! \* \(userData\?\.goal === "muscle-gain" \? 0\.08 : \(userData\?\.goal === "lose-weight" \? 0\.05 : 0\.065\)\)\)} Ovos inteiros \(mexidos na manteiga ou banha\)`,\s*userData\?\.goal === "lose-weight" \? "1\/2 Abacate médio \(80-100g\)" : "1 Abacate médio \(150-200g\)",\s*`\${Math\.round\(150 \* \(userData\?\.goal === "muscle-gain" \? 1\.5 : \(userData\?\.goal === "lose-weight" \? 0\.6 : 1\)\)\)}g de Batata-doce ou Inhame`,\s*"1 Banana-prata grande"\s*\]\}/s,
  `items={[
                          \`\${Math.round(userData?.weight! * (userData?.goal === "muscle-gain" ? 0.08 : 0.06))} Ovos inteiros (cozidos ou mexidos)\`,
                          "100g de Carne Seca desfiada ou Frango (para bater proteína)",
                          userData?.goal === "lose-weight" ? "30g de Abacate (porção controlada)" : "60g de Abacate",
                          \`\${Math.round(150 * (userData?.goal === "muscle-gain" ? 1.2 : 0.7))}g de Raízes (Batata-doce/Inhame)\`,
                        ]}`
);

// Update Breakfast Macros Label
c = c.replace(
  /macros=\{\{ \s*protein: Math\.round\(dietPlan\?\.macros\.protein! \* 0\.20\), \s*fat: Math\.round\(dietPlan\?\.macros\.fats! \* 0\.25\), \s*carbs: Math\.round\(dietPlan\?\.macros\.carbs! \* 0\.15\) \s*\}\}/g,
  `macros={{ 
                          protein: Math.round(dietPlan?.macros.protein! * 0.25), 
                          fat: Math.round(dietPlan?.macros.fats! * 0.20), 
                          carbs: Math.round(dietPlan?.macros.carbs! * 0.15) 
                        }}`
);

// 2. Lunch Cleanup - More Meat, Better Carb Ratios
c = c.replace(
  /items=\{\[\s*`\${Math\.round\(200 \* \(userData\?\.goal === "muscle-gain" \? 1\.3 : \(userData\?\.goal === "lose-weight" \? 0\.8 : 1\)\)\)}-\${Math\.round\(250 \* \(userData\?\.goal === "muscle-gain" \? 1\.3 : \(userData\?\.goal === "lose-weight" \? 0\.8 : 1\)\)\)}g de Carne Bovina \(Acém, Fraldinha ou Músculo\)`,\s*`\${Math\.round\(250 \* \(userData\?\.goal === "muscle-gain" \? 1\.6 : \(userData\?\.goal === "lose-weight" \? 0\.5 : 1\)\)\)}-\${Math\.round\(300 \* \(userData\?\.goal === "muscle-gain" \? 1\.6 : \(userData\?\.goal === "lose-weight" \? 0\.5 : 1\)\)\)}g de Mandioca ou Batata-inglesa`,\s*userData\?\.goal === "lose-weight" \? "Salada abundante de folhas e legumes" : "Salada de Cenoura e Beterraba com Azeite \(2 col\. sopa\)",\s*"Sobremesa: 1 Fruta da estação \(Manga ou Mamão\)"\s*\]\}/s,
  `items={[
                          \`\${Math.round(250 * (userData?.goal === "muscle-gain" ? 1.2 : 1))}g de Carne Bovina Magra (Patinho/Alcatra)\`,
                          \`\${Math.round(200 * (userData?.goal === "muscle-gain" ? 1.5 : 0.8))}g de Mandioca ou Batata-doce\`,
                          "Salada de folhas verdes à vontade (sem óleos extras)",
                          "1 fatia de Abacaxi ou 1 Laranja (melhora absorção de ferro)"
                        ]}`
);

// 3. Afternoon Snack - THE BIG CHANGE (Add Real Protein)
c = c.replace(
  /items=\[\s*"Smoothie: 2 Bananas \+ 200ml Leite de coco \+ 1 col\. sopa Mel cru",\s*"2 colheres de sopa de Pasta de Coco ou Cacau"\s*\]/s,
  `items={[
                          "150g de Peito de Frango desfiado ou 4 Ovos cozidos",
                          "1 Banana grande",
                          "Chá verde ou Café (sem açúcar)"
                        ]}`
);

// Update Afternoon Snack Macros Label (Was highly overestimating protein)
c = c.replace(
  /macros=\{\{ \s*protein: Math\.round\(dietPlan\?\.macros\.protein! \* 0\.10\), \s*fat: Math\.round\(dietPlan\?\.macros\.fats! \* 0\.15\), \s*carbs: Math\.round\(dietPlan\?\.macros\.carbs! \* 0\.20\) \s*\}\}/g,
  `macros={{ 
                          protein: Math.round(dietPlan?.macros.protein! * 0.20), 
                          fat: Math.round(dietPlan?.macros.fats! * 0.10), 
                          carbs: Math.round(dietPlan?.macros.carbs! * 0.10) 
                        }}`
);

fs.writeFileSync('components/ebook.tsx', c);
console.log("Strategic macro correction complete.");
