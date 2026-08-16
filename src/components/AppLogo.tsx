import React from "react";

interface AppLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "splash" | number;
  className?: string;
  glow?: boolean;
  animate?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = "md",
  className = "",
  glow = false,
  animate = false,
}) => {
  let dim = 44;
  if (typeof size === "number") {
    dim = size;
  } else {
    switch (size) {
      case "xs":
        dim = 24;
        break;
      case "sm":
        dim = 32;
        break;
      case "md":
        dim = 44;
        break;
      case "lg":
        dim = 64;
        break;
      case "xl":
        dim = 88;
        break;
      case "splash":
        dim = 112; // Natural normal centered size
        break;
    }
  }

  const uniqueId = React.useId().replace(/:/g, "_");

  return (
    <div
      style={{ width: `${dim}px`, height: `${dim}px` }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
    >
      {/* Optional ambient glow halo */}
      {glow && (
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/30 via-blue-600/30 to-indigo-500/30 blur-xl ${
            animate ? "animate-pulse" : ""
          }`}
          style={{ transform: "scale(1.25)" }}
        />
      )}

      <svg
        viewBox="0 0 512 512"
        width="100%"
        height="100%"
        className={`relative z-10 w-full h-full ${
          animate ? "transition-transform duration-300 hover:scale-105" : ""
        }`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Background radial gradient */}
          <radialGradient
            id={`bgGrad_${uniqueId}`}
            cx="40%"
            cy="35%"
            r="65%"
            fx="35%"
            fy="30%"
          >
            <stop offset="0%" stopColor="#141824" />
            <stop offset="60%" stopColor="#0a0c13" />
            <stop offset="100%" stopColor="#030407" />
          </radialGradient>

          {/* Smooth vivid 'G' gradient (Sky cyan to electric blue to rich royal indigo) */}
          <linearGradient
            id={`gGrad_${uniqueId}`}
            x1="18%"
            y1="10%"
            x2="85%"
            y2="92%"
          >
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="28%" stopColor="#0ea5e9" />
            <stop offset="55%" stopColor="#2563eb" />
            <stop offset="85%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>

          {/* Mountain foreground gradient */}
          <linearGradient
            id={`mountFront_${uniqueId}`}
            x1="10%"
            y1="0%"
            x2="90%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="45%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>

          {/* Mountain background peak gradient */}
          <linearGradient
            id={`mountBack_${uniqueId}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Letter 'Y' gradient (Pristine White with subtle blue base) */}
          <linearGradient
            id={`yGrad_${uniqueId}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#93c5fd" />
          </linearGradient>

          {/* Deep shadow behind 'Y' to create optical 3D layer separation over 'G' */}
          <filter
            id={`shadowY_${uniqueId}`}
            x="-25%"
            y="-25%"
            width="160%"
            height="160%"
          >
            <feDropShadow
              dx="-4"
              dy="5"
              stdDeviation="7"
              floodColor="#000000"
              floodOpacity="0.85"
            />
          </filter>

          {/* Soft glow on moon */}
          <filter
            id={`moonGlow_${uniqueId}`}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle inner shadow for the circular frame */}
          <filter
            id={`innerShadow_${uniqueId}`}
            x="-5%"
            y="-5%"
            width="110%"
            height="110%"
          >
            <feDropShadow
              dx="0"
              dy="6"
              stdDeviation="10"
              floodColor="#000000"
              floodOpacity="0.7"
            />
          </filter>
        </defs>

        {/* Outer Dark Circular Badge */}
        <circle
          cx="256"
          cy="256"
          r="248"
          fill={`url(#bgGrad_${uniqueId})`}
          stroke="#1e293b"
          strokeWidth="3.5"
          className="shadow-2xl"
        />

        {/* Fine edge highlight ring */}
        <circle
          cx="256"
          cy="256"
          r="245"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeOpacity="0.1"
        />

        {/* Inner cavity backdrop behind mountains */}
        <circle cx="256" cy="256" r="165" fill="#04060c" />

        {/* Luminous round Moon in sky */}
        <circle
          cx="204"
          cy="248"
          r="19"
          fill="#cffafe"
          filter={`url(#moonGlow_${uniqueId})`}
        />

        {/* Layered Mountain 1 (Back Ridge) */}
        <polygon
          points="140,345 198,285 268,355 140,355"
          fill={`url(#mountBack_${uniqueId})`}
          opacity="0.95"
        />

        {/* Layered Mountain 2 (Front Sharp Peak) */}
        <polygon
          points="174,355 240,268 316,355 174,355"
          fill={`url(#mountFront_${uniqueId})`}
        />

        {/* Stylized 'G' Curved Monogram Band */}
        <path
          d="M 370,172
             C 338,118 284,94 220,102
             C 142,112 88,175 88,256
             C 88,348 152,418 244,420
             C 310,422 364,380 392,320
             L 338,296
             C 320,340 282,366 238,364
             C 176,362 140,312 140,256
             C 140,196 178,152 232,148
             C 276,144 314,168 334,204
             Z"
          fill={`url(#gGrad_${uniqueId})`}
          filter={`url(#innerShadow_${uniqueId})`}
        />

        {/* Stylized Bold Modern 'Y' Glyph in Crisp White Overlapping Front-Right */}
        <g filter={`url(#shadowY_${uniqueId})`}>
          <path
            d="M 254,220
               L 338,220
               L 380,296
               L 435,220
               L 472,220
               L 398,322
               L 398,400
               L 378,418
               L 358,400
               L 358,322
               L 282,260
               L 254,220
               Z"
            fill={`url(#yGrad_${uniqueId})`}
          />
        </g>
      </svg>
    </div>
  );
};
