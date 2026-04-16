const fs = require('fs');
let c = fs.readFileSync('components/ebook.tsx', 'utf8');

// Helper to replace DayMeal items with more dynamic versions
// Breakfast
c = c.replace(
  /items=\[\s*`\${Math\.round\(userData\?\.weight! \* 0\.07\)} Ovos inteiros \(mexidos na manteiga ou banha\)`,\s*"1 Abacate médio \(150-200g\)",\s*"1 porção de Batata-doce ou Inhame \(150g\)",\s*"1 Banana-prata grande"\s*\]/s,
  `items={[
                          \`\${Math.round(userData?.weight! * (userData?.goal === "muscle-gain" ? 0.08 : (userData?.goal === "lose-weight" ? 0.05 : 0.065)))} Ovos inteiros (mexidos na manteiga ou banha)\`,
                          userData?.goal === "lose-weight" ? "1/2 Abacate médio (80-100g)" : "1 Abacate médio (150-200g)",
                          \`\${Math.round(150 * (userData?.goal === "muscle-gain" ? 1.5 : (userData?.goal === "lose-weight" ? 0.6 : 1)))}g de Batata-doce ou Inhame\`,
                          "1 Banana-prata grande"
                        ]}`
);

// Lunch
c = c.replace(
  /items=\[\s*"200g-250g de Carne Bovina \(Acém, Fraldinha ou Músculo\)",\s*"250g-300g de Mandioca ou Batata-inglesa",\s*"Salada de Cenoura e Beterraba com Azeite extra-virgem \(2 col\. sopa\)",\s*"Sobremesa: 1 Manga ou 1 fatia grande de Mamão"\s*\]/s,
  `items={[
                          \`\${Math.round(200 * (userData?.goal === "muscle-gain" ? 1.3 : (userData?.goal === "lose-weight" ? 0.8 : 1)))}-\${Math.round(250 * (userData?.goal === "muscle-gain" ? 1.3 : (userData?.goal === "lose-weight" ? 0.8 : 1)))}g de Carne Bovina (Acém, Fraldinha ou Músculo)\`,
                          \`\${Math.round(250 * (userData?.goal === "muscle-gain" ? 1.6 : (userData?.goal === "lose-weight" ? 0.5 : 1)))}-\${Math.round(300 * (userData?.goal === "muscle-gain" ? 1.6 : (userData?.goal === "lose-weight" ? 0.5 : 1)))}g de Mandioca ou Batata-inglesa\`,
                          userData?.goal === "lose-weight" ? "Salada abundante de folhas e legumes" : "Salada de Cenoura e Beterraba com Azeite (2 col. sopa)",
                          "Sobremesa: 1 Fruta da estação (Manga ou Mamão)"
                        ]}`
);

// Dinner
c = c.replace(
  /items=\[\s*"200g de Coxa\/Sobrecoxa de Frango com pele ou Peixe gordo",\s*"2 Bananas-da-terra assadas ou grelhadas",\s*"Legumes variados \(cozidos na manteiga\)",\s*"1 fatia de Abacaxi de sobremesa"\s*\]/s,
  `items={[
                          \`\${Math.round(200 * (userData?.goal === "muscle-gain" ? 1.2 : (userData?.goal === "lose-weight" ? 0.85 : 1)))}g de Coxa/Sobrecoxa de Frango com pele ou Peixe gordo\`,
                          userData?.goal === "lose-weight" ? "1 Banana-da-terra" : (userData?.goal === "muscle-gain" ? "3 Bananas-da-terra" : "2 Bananas-da-terra"),
                          "Legumes variados (cozidos na manteiga ou banha)",
                          "1 fatia de Abacaxi (digestivo natural)"
                        ]}`
);

fs.writeFileSync('components/ebook.tsx', c);
console.log("Portions made dynamic based on goal.");
