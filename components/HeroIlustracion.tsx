// Ilustración editorial original en SVG para el hero. Composición inspirada en
// un escritorio de investigador: cuaderno abierto con anotaciones, pluma, libro
// de tapa dura, planta y taza de café. Todo dibujado a mano en SVG — sin
// imágenes de banco. Colores cálidos y sobrios (marfil/tierra/verde salvia).
export default function HeroIlustracion({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 520 460"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        role="img"
        aria-label="Ilustración editorial: cuaderno abierto, libro, planta y taza"
      >
        {/* Fondo cálido */}
        <defs>
          <radialGradient id="fondoHero" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#f5f0e6" />
            <stop offset="100%" stopColor="#e8dfcf" />
          </radialGradient>
          <linearGradient id="pagCuad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbf7ee" />
            <stop offset="100%" stopColor="#f4ecda" />
          </linearGradient>
          <linearGradient id="tapaLibro" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2d3d3a" />
            <stop offset="100%" stopColor="#1a2624" />
          </linearGradient>
          <pattern id="rayado" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 3 L6 3" stroke="#c4a985" strokeWidth="0.3" opacity="0.4" />
          </pattern>
        </defs>

        {/* Superficie de escritorio */}
        <rect width="520" height="460" fill="url(#fondoHero)" rx="16" />

        {/* Sombras suaves globales */}
        <ellipse cx="260" cy="420" rx="180" ry="14" fill="#b8a07f" opacity="0.15" />

        {/* Planta — hojas simples estilo lineal */}
        <g transform="translate(85, 60)">
          {/* Maceta */}
          <path d="M0 110 L60 110 L54 155 L6 155 Z" fill="#e8dcc8" stroke="#a0876a" strokeWidth="1.2" />
          <ellipse cx="30" cy="110" rx="30" ry="4" fill="#c9b088" />
          {/* Tallo y hojas */}
          <path d="M30 110 L30 40" stroke="#5f7a4d" strokeWidth="1.5" fill="none" />
          <path d="M30 55 Q10 45 5 20 Q15 30 30 55 Z" fill="#7d9668" stroke="#5f7a4d" strokeWidth="1" />
          <path d="M30 40 Q55 30 60 5 Q45 20 30 40 Z" fill="#8ba676" stroke="#5f7a4d" strokeWidth="1" />
          <path d="M30 70 Q8 65 3 45 Q18 55 30 70 Z" fill="#98b085" stroke="#5f7a4d" strokeWidth="1" />
          <path d="M30 80 Q52 75 58 55 Q40 65 30 80 Z" fill="#7d9668" stroke="#5f7a4d" strokeWidth="1" />
        </g>

        {/* Libro cerrado — tapa dura oscura (referencia visual: libro grueso) */}
        <g transform="translate(340, 130) rotate(-6)">
          <rect x="0" y="0" width="140" height="200" rx="3" fill="url(#tapaLibro)" />
          {/* Lomo superior visible */}
          <rect x="0" y="0" width="140" height="6" fill="#0f1a18" opacity="0.6" />
          {/* Título del libro grabado */}
          <text
            x="70"
            y="55"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize="14"
            fill="#e8d9b8"
            fontWeight="600"
          >
            EL OFICIO
          </text>
          <text
            x="70"
            y="72"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize="14"
            fill="#e8d9b8"
            fontWeight="600"
          >
            DE INVESTIGAR
          </text>
          <line x1="30" y1="85" x2="110" y2="85" stroke="#e8d9b8" strokeWidth="0.5" opacity="0.7" />
          <text
            x="70"
            y="102"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize="7"
            fill="#c9b58a"
            letterSpacing="1.5"
          >
            CIENCIAS SOCIALES
          </text>
          <text
            x="70"
            y="113"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize="7"
            fill="#c9b58a"
            letterSpacing="1.5"
          >
            Y COMPROMISO PÚBLICO
          </text>
          {/* Marca al pie */}
          <text
            x="70"
            y="180"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize="8"
            fontStyle="italic"
            fill="#c9b58a"
          >
            Raúl Dubón
          </text>
        </g>

        {/* Cuaderno abierto — dos páginas */}
        <g transform="translate(140, 175)">
          {/* Sombra del cuaderno */}
          <rect x="4" y="6" width="220" height="150" rx="4" fill="#7d6a4a" opacity="0.18" />
          {/* Página izquierda con rayado */}
          <rect x="0" y="0" width="110" height="150" rx="3" fill="url(#pagCuad)" stroke="#c9b58a" strokeWidth="0.5" />
          <rect x="0" y="0" width="110" height="150" rx="3" fill="url(#rayado)" />
          {/* Página derecha */}
          <rect x="110" y="0" width="110" height="150" rx="3" fill="url(#pagCuad)" stroke="#c9b58a" strokeWidth="0.5" />
          <rect x="110" y="0" width="110" height="150" rx="3" fill="url(#rayado)" />
          {/* Encuadernación central */}
          <rect x="107" y="0" width="6" height="150" fill="#c9b58a" opacity="0.3" />
          <line x1="110" y1="0" x2="110" y2="150" stroke="#a68e63" strokeWidth="0.4" />

          {/* "Diagrama árbol" en página izquierda — como el de la referencia */}
          <g stroke="#5c4a2f" strokeWidth="0.8" fill="none" opacity="0.7">
            <path d="M55 30 L55 100" />
            <path d="M55 45 L40 55" />
            <path d="M55 45 L70 55" />
            <path d="M55 65 L38 78" />
            <path d="M55 65 L72 78" />
            <path d="M55 85 L42 95" />
            <path d="M55 85 L68 95" />
          </g>
          <g fill="#5c4a2f" opacity="0.7">
            <circle cx="55" cy="30" r="2.5" />
            <circle cx="40" cy="55" r="1.8" />
            <circle cx="70" cy="55" r="1.8" />
            <circle cx="38" cy="78" r="1.5" />
            <circle cx="72" cy="78" r="1.5" />
            <circle cx="42" cy="95" r="1.2" />
            <circle cx="68" cy="95" r="1.2" />
          </g>
          {/* Notas manuscritas suaves */}
          <g stroke="#8a7250" strokeWidth="0.4" opacity="0.5">
            <path d="M10 120 L100 120" />
            <path d="M10 128 L85 128" />
            <path d="M10 136 L95 136" />
          </g>

          {/* Notas página derecha */}
          <g stroke="#8a7250" strokeWidth="0.4" opacity="0.55">
            <path d="M120 20 L210 20" />
            <path d="M120 28 L200 28" />
            <path d="M120 36 L215 36" />
            <path d="M120 44 L190 44" />
            <path d="M120 52 L205 52" />
            <path d="M120 60 L195 60" />
            <path d="M120 68 L210 68" />
            <path d="M120 76 L180 76" />
            <path d="M120 92 L215 92" />
            <path d="M120 100 L200 100" />
            <path d="M120 108 L210 108" />
            <path d="M120 116 L195 116" />
            <path d="M120 124 L215 124" />
            <path d="M120 132 L185 132" />
          </g>
          {/* Marca tachada — como en la referencia */}
          <rect x="130" y="14" width="45" height="10" fill="#8a7250" opacity="0.35" />
        </g>

        {/* Pluma inclinada sobre el cuaderno */}
        <g transform="translate(300, 300) rotate(35)">
          {/* Cuerpo negro brillante */}
          <rect x="0" y="0" width="130" height="7" rx="3" fill="#1c1c1c" />
          <rect x="0" y="0" width="130" height="2" rx="1" fill="#3a3a3a" opacity="0.8" />
          {/* Punta plateada */}
          <path d="M130 0 L145 3.5 L130 7 Z" fill="#8a8a8a" />
          <path d="M130 0 L138 3.5 L130 7 Z" fill="#606060" />
          {/* Aro plateado */}
          <rect x="90" y="-1" width="4" height="9" fill="#a8a8a8" />
        </g>

        {/* Taza de café humeante */}
        <g transform="translate(410, 300)">
          {/* Platillo */}
          <ellipse cx="45" cy="90" rx="60" ry="10" fill="#f0e6d0" stroke="#b89a70" strokeWidth="0.8" />
          <ellipse cx="45" cy="87" rx="55" ry="8" fill="#faf3e1" />
          {/* Taza */}
          <path d="M15 40 Q15 88 45 88 Q75 88 75 40 Z" fill="#faf3e1" stroke="#b89a70" strokeWidth="0.8" />
          {/* Café en el interior */}
          <ellipse cx="45" cy="42" rx="28" ry="6" fill="#3f2a17" />
          <ellipse cx="45" cy="41" rx="26" ry="5" fill="#5c3d21" opacity="0.7" />
          {/* Asa */}
          <path
            d="M75 50 Q95 50 95 65 Q95 80 75 78"
            fill="none"
            stroke="#b89a70"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Vapor */}
          <g opacity="0.5" stroke="#a8a08a" strokeWidth="1.2" fill="none" strokeLinecap="round">
            <path d="M32 30 Q28 20 34 12 Q30 4 36 -4" />
            <path d="M45 28 Q41 18 47 10 Q43 2 49 -6" />
            <path d="M58 30 Q54 20 60 12 Q56 4 62 -4" />
          </g>
        </g>

        {/* Detalles editoriales sutiles — asterisco esquina */}
        <text
          x="480"
          y="45"
          fontFamily="Georgia, serif"
          fontSize="24"
          fill="#c9a875"
          opacity="0.5"
        >
          ✦
        </text>
      </svg>
    </div>
  );
}
