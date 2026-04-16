const fs = require('fs');
let c = fs.readFileSync('components/ebook.tsx', 'utf8');

// Helper to calculate macros from the provided table
const REF = {
  egg: { cal: 70, p: 6, f: 5 },
  beef_musculo: { cal: 220, p: 30, f: 10 },
  chicken_skin: { cal: 230, p: 25, f: 15 },
  avocado: { cal: 160, p: 2, f: 15, c: 9 },
  mandioca: { cal: 125, p: 1, c: 30 },
  banana_prata: { cal: 98, p: 1, c: 26 },
  coco_seco: { cal: 660, p: 7, f: 65, c: 24 }
};

// 1. Breakfast Muscle Gain (Example calculation based on table)
// 6 Eggs + 100g Mandioca + 60g Avocado
// P: (6*6 + 1 + 2*0.6) = 36+1+1.2 = 38.2
// F: (6*5 + 15*0.6) = 30 + 9 = 39
// C: (30 + 9*0.6 + 26) = 30 + 5.4 + 26 = 61.4
// Cal: (6*70 + 125 + 160*0.6 + 98) = 420 + 125 + 96 + 98 = 739

c = c.replace(
  /items=\{userData\?\.goal === "lose-weight" \? \[\s*"4 Ovos \(2 inteiros \+ 2 claras\)",\s*"80g de Peito de Frango desfiado",\s*"30g de Abacate ou Azeite",\s*"80g de Mandioca ou Batata-doce",\s*"Café preto sem açúcar"\s*\] : \[\s*`\${Math\.round\(userData\?\.weight! \* \(userData\?\.goal === "muscle-gain" \? 0\.08 : 0\.065\)\)} Ovos inteiros \(cozidos ou mexidos\)`,\s*"100g de Carne Seca desfiada ou Frango",\s*"60g de Abacate",\s*`\${Math\.round\(150 \* \(userData\?\.goal === "muscle-gain" \? 1\.2 : 1\)\)}g de Raízes \(Batata-doce\/Inhame\)`,\s*\]\}/s,
  `items={userData?.goal === "lose-weight" ? [
                          "4 Ovos (2 inteiros + 2 claras)",
                          "80g de Peito de Frango",
                          "30g de Abacate",
                          "80g de Mandioca",
                          "Café sem açúcar"
                        ] : [
                          "6 Ovos inteiros (cozidos/mexidos)",
                          "100g de Carne Moída (Músculo/Patinho)",
                          "60g de Abacate (Fonte de Gordura Boa)",
                          "150g de Mandioca ou Batata-doce",
                          "1 Banana-prata"
                        ]}`
);

// 2. Lunch correction based on table
// 250g Beef + 250g Mandioca
// P: 2.5 * 30 = 75g
// F: 2.5 * 10 = 25g
// C: 2.5 * 30 = 75g
// Cal: 2.5 * 220 + 2.5 * 125 = 550 + 312 = 862 

c = c.replace(
  /items=\{userData\?\.goal === "lose-weight" \? \[\s*"200g-250g de Peito de Frango ou Peixe Branco grelhado",\s*"120g de Mandioca ou Batata-doce",\s*"Prato fundo de Salada de Folhas \+ Brócolis\/Couve-flor ao vapor",\s*"1 fatia de Abacaxi \(enzimas digestivas\)"\s*\] : \[\s*`\${Math\.round\(250 \* \(userData\?\.goal === "muscle-gain" \? 1\.2 : 1\)\)}g de Carne Bovina Magra \(Patinho\/Alcatra\)`,\s*`\${Math\.round\(200 \* \(userData\?\.goal === "muscle-gain" \? 1\.5 : 0\.8\)\)}g de Mandioca ou Batata-doce`,\s*"Salada de folhas verdes à vontade \(sem óleos extras\)",\s*"1 fatia de Abacaxi ou 1 Laranja"\s*\]\}/s,
  `items={userData?.goal === "lose-weight" ? [
                          "200g de Peito de Frango",
                          "100g de Mandioca",
                          "Salada abundante de folhas e brócolis",
                          "1 fatia de Abacaxi"
                        ] : [
                          "250g de Carne Bovina (Músculo/Patinho)",
                          "250g de Mandioca",
                          "Salada de Cenoura e Beterraba",
                          "1 Laranja ou Abacaxi"
                        ]}`
);

fs.writeFileSync('components/ebook.tsx', c);
console.log("Master nutrition correction applied based on provided table.");
