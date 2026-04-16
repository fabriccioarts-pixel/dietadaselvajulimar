const fs = require('fs');
let c = fs.readFileSync('components/ebook.tsx', 'utf8');

// 1. Breakfast Lose Weight specific items
c = c.replace(
  /items=\{\[\s*`\${Math\.round\(userData\?\.weight! \* \(userData\?\.goal === "muscle-gain" \? 0\.08 : 0\.06\)\)} Ovos inteiros \(cozidos ou mexidos\)`,\s*"100g de Carne Seca desfiada ou Frango \(para bater proteína\)",\s*userData\?\.goal === "lose-weight" \? "30g de Abacate \(porção controlada\)" : "60g de Abacate",\s*`\${Math\.round\(150 \* \(userData\?\.goal === "muscle-gain" \? 1\.2 : 0\.7\)\)}g de Raízes \(Batata-doce\/Inhame\)`,\s*\]\}/s,
  `items={userData?.goal === "lose-weight" ? [
                          \`\${Math.round(userData?.weight! * 0.05)} Ovos (sendo 2 inteiros + demais apenas claras)\`,
                          "120g de Peito de Frango desfiado (Proteína Limpa)",
                          "30g de Abacate ou 1 colher de sopa de Azeite",
                          "100g de Mandioca ou Batata-doce",
                          "Café preto sem açúcar"
                        ] : [
                          \`\${Math.round(userData?.weight! * (userData?.goal === "muscle-gain" ? 0.08 : 0.065))} Ovos inteiros (cozidos ou mexidos)\`,
                          "100g de Carne Seca desfiada ou Frango",
                          "60g de Abacate",
                          \`\${Math.round(150 * (userData?.goal === "muscle-gain" ? 1.2 : 1))}g de Raízes (Batata-doce/Inhame)\`,
                        ]}`
);

// 2. Colação (Colação morning snack)
c = c.replace(
  /items=\{\[\s*"30g de Coco seco ralado \(sem açúcar\)",\s*"1 porção de Frutas cítricas ou Uvas",\s*"1 punhado de Castanhas-do-pará \(2-3 unidades\)"\s*\]\}/s,
  `items={userData?.goal === "lose-weight" ? [
                          "3 Ovos cozidos (apenas claras)",
                          "1 Maçã ou 1 Pera",
                          "1 Castanha-do-pará (selênio e gordura boa limitada)"
                        ] : [
                          "30g de Coco seco ralado (sem açúcar)",
                          "1 porção de Frutas cítricas ou Uvas",
                          "1 punhado de Castanhas-do-pará (2-3 unidades)"
                        ]}`
);

// 3. Lunch (Almoço)
c = c.replace(
  /items=\{\[\s*`\${Math\.round\(250 \* \(userData\?\.goal === "muscle-gain" \? 1\.2 : 1\)\)}g de Carne Bovina Magra \(Patinho\/Alcatra\)`,\s*`\${Math\.round\(200 \* \(userData\?\.goal === "muscle-gain" \? 1\.5 : 0\.8\)\)}g de Mandioca ou Batata-doce`,\s*"Salada de folhas verdes à vontade \(sem óleos extras\)",\s*"1 fatia de Abacaxi ou 1 Laranja \(melhora absorção de ferro\)"\s*\]\}/s,
  `items={userData?.goal === "lose-weight" ? [
                          "200g-250g de Peito de Frango ou Peixe Branco grelhado",
                          "120g de Mandioca ou Batata-doce",
                          "Prato fundo de Salada de Folhas + Brócolis/Couve-flor ao vapor",
                          "1 fatia de Abacaxi (enzimas digestivas)"
                        ] : [
                          \`\${Math.round(250 * (userData?.goal === "muscle-gain" ? 1.2 : 1))}g de Carne Bovina Magra (Patinho/Alcatra)\`,
                          \`\${Math.round(200 * (userData?.goal === "muscle-gain" ? 1.5 : 0.8))}g de Mandioca ou Batata-doce\`,
                          "Salada de folhas verdes à vontade (sem óleos extras)",
                          "1 fatia de Abacaxi ou 1 Laranja"
                        ]}`
);

// 4. Afternoon Snack (Lanche da Tarde)
c = c.replace(
  /items=\{\[\s*"150g de Peito de Frango desfiado ou 4 Ovos cozidos",\s*"1 Banana grande",\s*"Chá verde ou Café \(sem açúcar\)"\s*\]\}/s,
  `items={userData?.goal === "lose-weight" ? [
                          "150g de Iogurte Grego Natural ou 100g de Frango desfiado",
                          "1 xícara de Frutas Vermelhas (Morango/Mirtilo)",
                          "Chá verde ou Hibisco (diurético natural)"
                        ] : [
                          "150g de Peito de Frango desfiado ou 4 Ovos cozidos",
                          "1 Banana grande",
                          "Chá verde ou Café (sem açúcar)"
                        ]}`
);

// 5. Dinner (Jantar)
c = c.replace(
  /items=\{\[\s*`\${Math\.round\(200 \* \(userData\?\.goal === "muscle-gain" \? 1\.2 : \(userData\?\.goal === "lose-weight" \? 0\.85 : 1\)\)\)}g de Coxa\/Sobrecoxa de Frango com pele ou Peixe gordo`,\s*userData\?\.goal === "lose-weight" \? "1 Banana-da-terra" : \(userData\?\.goal === "muscle-gain" \? "3 Bananas-da-terra" : "2 Bananas-da-terra"\),\s*"Legumes variados \(cozidos na manteiga ou banha\)",\s*"1 fatia de Abacaxi \(digestivo natural\)"\s*\]\}/s,
  `items={userData?.goal === "lose-weight" ? [
                          "180g de Filé de Tilápia ou Peito de Frango",
                          "Mix de vegetais refogados (Cenoura, Chuchu, Abobrinha)",
                          "Salada de Alface e Pepino à vontade",
                          "Sobremesa: 1 fatia de Melancia (alta hidratação)"
                        ] : [
                          \`\${Math.round(200 * (userData?.goal === "muscle-gain" ? 1.2 : 1))}g de Coxa/Sobrecoxa de Frango ou Peixe Gordo\`,
                          \`\${userData?.goal === "muscle-gain" ? "3 Bananas-da-terra" : "2 Bananas-da-terra"}\`,
                          "Legumes variados (cozidos na manteiga ou banha)",
                          "1 fatia de Abacaxi (digestivo natural)"
                        ]}`
);

fs.writeFileSync('components/ebook.tsx', c);
console.log("Fat loss specific diet items added.");
