const fs = require('fs');
let c = fs.readFileSync('components/ebook.tsx', 'utf8');

// 1. Re-add imports
if (!c.includes('import SplitText from "./ui/split-text"')) {
  c = c.replace(
    'import { useState, useRef, useEffect } from "react"',
    'import { useState, useRef, useEffect } from "react"\nimport SplitText from "./ui/split-text"'
  );
}

// 2. Success Screen Header
c = c.replace(
  /<h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight uppercase">\s*Protocolo Pronto!\s*<\/h2>/s,
  `<div className="mb-4">
                <SplitText
                  text="Protocolo Pronto!"
                  className="text-4xl md:text-6xl font-black text-gradient premium-glow tracking-tight uppercase"
                  delay={50}
                  duration={1.5}
                  ease="power3.out"
                  from={{ opacity: 0, y: 30 }}
                  to={{ opacity: 1, y: 0 }}
                  tag="h2"
                />
              </div>`
);

// 3. Capa Header
c = c.replace(
  /<h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white !leading-none uppercase shadow-emerald-500\/20">\s*DIETA DA <span className="text-emerald-500">SELVA<\/span>\s*<\/h1>/s,
  `<div className="text-center font-black tracking-tighter !leading-none uppercase shadow-emerald-500/20">
            <SplitText
              text="DIETA DA"
              className="text-5xl md:text-8xl text-white inline-block mr-4"
              delay={50}
              duration={1.5}
              ease="power3.out"
              splitType="words"
              from={{ opacity: 0, y: 30 }}
              to={{ opacity: 1, y: 0 }}
              tag="span"
            />
            <SplitText
              text="SELVA"
              className="text-5xl md:text-8xl text-emerald-500 inline-block"
              delay={80}
              duration={1.5}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, scale: 0.5, rotationY: 90 }}
              to={{ opacity: 1, scale: 1, rotationY: 0 }}
              tag="span"
            />
            </div>`
);

fs.writeFileSync('components/ebook.tsx', c);
console.log("Premium touches re-applied.");
