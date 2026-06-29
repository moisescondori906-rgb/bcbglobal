import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { api } from '../../lib/api';

const RouletteWheel = ({ premios, spinning, onSpinComplete, targetIndex }) => {
  const wheelControls = useAnimation();
  const cumulativeRotationRef = useRef(0);
  const count = premios.length || 1;
  const SEG = 360 / count;
  const CX = 220;
  const CY = 220;
  const R_SEG = 186;
  const R_PEG = 188;
  const R_BOLT = 199;

  const punto = (anguloGrados, radio) => {
    const rad = (anguloGrados * Math.PI) / 180;
    return {
      x: CX + radio * Math.sin(rad),
      y: CY - radio * Math.cos(rad),
    };
  };

  useEffect(() => {
    if (spinning && targetIndex !== -1) {
      runSpinAnimation();
    }
  }, [spinning, targetIndex]);

  const runSpinAnimation = async () => {
    const segmentAngle = SEG;
    const extraRounds = 6;
    const targetAngle = (targetIndex * segmentAngle) + (segmentAngle / 2);
    const currentRotation = cumulativeRotationRef.current % 360;
    const finalTarget = (360 - targetAngle) % 360;
    let distance = finalTarget - currentRotation;
    if (distance < 0) distance += 360;
    const totalNewRotation = cumulativeRotationRef.current + (extraRounds * 360) + distance;
    cumulativeRotationRef.current = totalNewRotation;

    await wheelControls.start({
      rotate: totalNewRotation,
      transition: {
        duration: 5.4,
        ease: [0.17, 0.93, 0.16, 1]
      }
    });

    onSpinComplete();
  };

  return (
    <div className="relative" style={{ width: 420, height: 420, maxWidth: '92vw', maxHeight: '92vw' }}>
      <div
        className="absolute"
        style={{
          left: '8%',
          right: '8%',
          bottom: '-3%',
          height: '10%',
          background: 'radial-gradient(50% 100% at 50% 0%, rgba(0,0,0,0.55), transparent 70%)',
          filter: 'blur(6px)',
        }}
      />

      <svg viewBox="0 0 440 440" className="w-full h-full relative">
        <defs>
          <radialGradient id="latonRad" cx="40%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#fff4cf" />
            <stop offset="35%" stopColor="#f3cf6b" />
            <stop offset="62%" stopColor="#c79a32" />
            <stop offset="100%" stopColor="#7a5712" />
          </radialGradient>
          <radialGradient id="cromo" cx="38%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#d7dde6" />
            <stop offset="75%" stopColor="#8a93a3" />
            <stop offset="100%" stopColor="#3e4554" />
          </radialGradient>
          <radialGradient id="boltG" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#fff7da" />
            <stop offset="55%" stopColor="#caa54a" />
            <stop offset="100%" stopColor="#6e4f15" />
          </radialGradient>
          <radialGradient id="pegG" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#cfd6e0" />
            <stop offset="100%" stopColor="#5d6470" />
          </radialGradient>
          <radialGradient id="domo" cx="50%" cy="38%" r="72%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
            <stop offset="42%" stopColor="rgba(255,255,255,0)" />
            <stop offset="82%" stopColor="rgba(0,0,0,0.12)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
          </radialGradient>
          <radialGradient id="brillo" cx="34%" cy="24%" r="44%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <filter id="sombraRueda" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="9" floodColor="#000" floodOpacity="0.55" />
          </filter>
        </defs>

        {/* GRUPO QUE GIRA */}
        <motion.g
          animate={wheelControls}
          style={{
            transformOrigin: "220px 220px",
          }}
          filter="url(#sombraRueda)"
        >
          <circle cx={CX} cy={CY} r={212} fill="url(#latonRad)" />
          <circle cx={CX} cy={CY} r={212} fill="none" stroke="#5c3f0c" strokeWidth="3" />
          <circle cx={CX} cy={CY} r={189} fill="none" stroke="#5c3f0c" strokeWidth="3" />
          <circle cx={CX} cy={CY} r={189} fill="#100c24" />

          {premios.map((premio, i) => {
            const a1 = i * SEG;
            const a2 = (i + 1) * SEG;
            const p1 = punto(a1, R_SEG);
            const p2 = punto(a2, R_SEG);
            const path = `M ${CX} ${CY} L ${p1.x} ${p1.y} A ${R_SEG} ${R_SEG} 0 0 1 ${p2.x} ${p2.y} Z`;
            const centro = a1 + SEG / 2;
            return (
              <g key={i}>
                <path d={path} fill={premio.color || '#c81e2c'} stroke="#1a1330" strokeWidth="1.5" />
                <g transform={`rotate(${centro} ${CX} ${CY})`}>
                  {premio.imagen_url ? (
                    <foreignObject x="205" y="60" width="30" height="30">
                      <div
                        className="w-full h-full rounded-full overflow-hidden border border-white/30 shadow-md"
                        style={{
                          backgroundImage: `url(${api.getMediaUrl(premio.imagen_url)})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                    </foreignObject>
                  ) : (
                    <text x={CX} y={CY - 142} textAnchor="middle" fontSize="27">
                      🎁
                    </text>
                  )}
                  <text
                    x={CX}
                    y={CY - 86}
                    textAnchor="middle"
                    fontSize="14.5"
                    fontWeight="800"
                    fill="#ffffff"
                    style={{
                      paintOrder: "stroke",
                      stroke: "rgba(0,0,0,0.4)",
                      strokeWidth: 3,
                      letterSpacing: "0.2px",
                    }}
                  >
                    {premio.nombre}
                  </text>
                </g>
              </g>
            );
          })}

          {/* domo y brillo giran sutilmente con la rueda para realismo de esmalte */}
          <circle cx={CX} cy={CY} r={R_SEG} fill="url(#domo)" pointerEvents="none" />

          {/* clavos (pegs) en el borde */}
          {premios.map((_, i) => {
            const pos = punto(i * SEG, R_PEG);
            return (
              <g key={`peg-${i}`}>
                <circle cx={pos.x} cy={pos.y} r={6} fill="#2a2030" />
                <circle cx={pos.x} cy={pos.y} r={5} fill="url(#pegG)" />
              </g>
            );
          })}

          {/* tornillos del aro de latón */}
          {Array.from({ length: 20 }).map((_, i) => {
            const pos = punto(i * 18 + 9, R_BOLT);
            return (
              <circle key={`bolt-${i}`} cx={pos.x} cy={pos.y} r={4} fill="url(#boltG)" />
            );
          })}
        </motion.g>

        {/* brillo especular FIJO (la luz no gira) */}
        <circle cx={CX} cy={CY} r={R_SEG} fill="url(#brillo)" pointerEvents="none" />

        {/* cubo central cromado FIJO */}
        <circle cx={CX} cy={CY} r={40} fill="#1a1330" />
        <circle cx={CX} cy={CY} r={37} fill="url(#cromo)" />
        <circle cx={CX} cy={CY} r={37} fill="none" stroke="#2a2f3a" strokeWidth="2" />
        <circle cx={CX - 11} cy={CY - 12} r={8} fill="rgba(255,255,255,0.6)" />
        <circle cx={CX} cy={CY} r={13} fill="url(#boltG)" stroke="#5c3f0c" strokeWidth="2" />
      </svg>

      {/* PUNTERO / FLAPPER metálico fijo arriba */}
      <div
        className="absolute left-1/2 z-20 pointer-events-none"
        style={{
          top: "-14px",
          transformOrigin: "50% 16%",
          animation: spinning ? "flap 0.09s linear infinite" : "none",
          transform: "translateX(-50%)",
        }}
      >
        <svg width="58" height="74" viewBox="0 0 58 74">
          <defs>
            <linearGradient id="flapMetal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="45%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
          </defs>
          <circle cx="29" cy="14" r="11" fill="url(#flapMetal)" stroke="#5c3f0c" strokeWidth="2" />
          <circle cx="25" cy="11" r="3.5" fill="rgba(255,255,255,0.7)" />
          <path
            d="M29 60 L18 22 Q29 14 40 22 Z"
            fill="url(#flapMetal)"
            stroke="#5c3f0c"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

export default RouletteWheel;
