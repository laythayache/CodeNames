import type { Avatar } from "shared/types";

// ── Color Palettes ──

const SKIN_COLORS = [
  "#FDDCB5", // 0 - light peach
  "#E8B88A", // 1 - tan
  "#C49A6C", // 2 - olive
  "#8D5E3C", // 3 - brown
  "#5C3A1E", // 4 - dark brown
  "#3B2510", // 5 - very dark
];

const HAIR_COLORS = [
  "#1A1A2E", // 0 - black
  "#6B3A2A", // 1 - brown
  "#E8C84A", // 2 - blonde
  "#C0392B", // 3 - red
  "#3498DB", // 4 - blue
  "#8E44AD", // 5 - purple
  "#27AE60", // 6 - green
  "#E84393", // 7 - pink
];

// ── Feature Renderers ──

function renderEyes(variant: number): React.ReactNode {
  const baseY = 38;
  const lx = 33;
  const rx = 47;

  switch (variant) {
    case 0: // round
      return (
        <>
          <circle cx={lx} cy={baseY} r={3.5} fill="#fff" />
          <circle cx={rx} cy={baseY} r={3.5} fill="#fff" />
          <circle cx={lx + 0.5} cy={baseY} r={2} fill="#2C3E50" />
          <circle cx={rx + 0.5} cy={baseY} r={2} fill="#2C3E50" />
          <circle cx={lx + 1} cy={baseY - 1} r={0.7} fill="#fff" />
          <circle cx={rx + 1} cy={baseY - 1} r={0.7} fill="#fff" />
        </>
      );
    case 1: // almond
      return (
        <>
          <ellipse cx={lx} cy={baseY} rx={4} ry={2.5} fill="#fff" />
          <ellipse cx={rx} cy={baseY} rx={4} ry={2.5} fill="#fff" />
          <circle cx={lx + 0.5} cy={baseY} r={1.8} fill="#2C3E50" />
          <circle cx={rx + 0.5} cy={baseY} r={1.8} fill="#2C3E50" />
          <circle cx={lx + 1} cy={baseY - 0.5} r={0.6} fill="#fff" />
          <circle cx={rx + 1} cy={baseY - 0.5} r={0.6} fill="#fff" />
        </>
      );
    case 2: // wink
      return (
        <>
          <circle cx={lx} cy={baseY} r={3.5} fill="#fff" />
          <circle cx={lx + 0.5} cy={baseY} r={2} fill="#2C3E50" />
          <circle cx={lx + 1} cy={baseY - 1} r={0.7} fill="#fff" />
          <path d={`M${rx - 4} ${baseY} Q${rx} ${baseY + 3} ${rx + 4} ${baseY}`} fill="none" stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" />
        </>
      );
    case 3: // sleepy
      return (
        <>
          <ellipse cx={lx} cy={baseY} rx={3.5} ry={2} fill="#fff" />
          <ellipse cx={rx} cy={baseY} rx={3.5} ry={2} fill="#fff" />
          <circle cx={lx} cy={baseY + 0.3} r={1.5} fill="#2C3E50" />
          <circle cx={rx} cy={baseY + 0.3} r={1.5} fill="#2C3E50" />
          <line x1={lx - 4} y1={baseY - 2.5} x2={lx + 4} y2={baseY - 2.5} stroke="#2C3E50" strokeWidth="1" strokeLinecap="round" />
          <line x1={rx - 4} y1={baseY - 2.5} x2={rx + 4} y2={baseY - 2.5} stroke="#2C3E50" strokeWidth="1" strokeLinecap="round" />
        </>
      );
    case 4: // star-eyes
      return (
        <>
          <polygon points={`${lx},${baseY - 4} ${lx + 1.2},${baseY - 1.5} ${lx + 4},${baseY - 1} ${lx + 2},${baseY + 1} ${lx + 2.5},${baseY + 4} ${lx},${baseY + 2.5} ${lx - 2.5},${baseY + 4} ${lx - 2},${baseY + 1} ${lx - 4},${baseY - 1} ${lx - 1.2},${baseY - 1.5}`} fill="#F1C40F" />
          <polygon points={`${rx},${baseY - 4} ${rx + 1.2},${baseY - 1.5} ${rx + 4},${baseY - 1} ${rx + 2},${baseY + 1} ${rx + 2.5},${baseY + 4} ${rx},${baseY + 2.5} ${rx - 2.5},${baseY + 4} ${rx - 2},${baseY + 1} ${rx - 4},${baseY - 1} ${rx - 1.2},${baseY - 1.5}`} fill="#F1C40F" />
        </>
      );
    case 5: // heart-eyes
      return (
        <>
          <path d={`M${lx} ${baseY + 3} Q${lx - 4} ${baseY - 1} ${lx} ${baseY - 3} Q${lx + 4} ${baseY - 1} ${lx} ${baseY + 3}Z`} fill="#E74C3C" />
          <path d={`M${rx} ${baseY + 3} Q${rx - 4} ${baseY - 1} ${rx} ${baseY - 3} Q${rx + 4} ${baseY - 1} ${rx} ${baseY + 3}Z`} fill="#E74C3C" />
        </>
      );
    case 6: // angry
      return (
        <>
          <circle cx={lx} cy={baseY} r={3} fill="#fff" />
          <circle cx={rx} cy={baseY} r={3} fill="#fff" />
          <circle cx={lx + 0.5} cy={baseY + 0.5} r={2} fill="#2C3E50" />
          <circle cx={rx - 0.5} cy={baseY + 0.5} r={2} fill="#2C3E50" />
          <line x1={lx - 4} y1={baseY - 5} x2={lx + 3} y2={baseY - 3.5} stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" />
          <line x1={rx + 4} y1={baseY - 5} x2={rx - 3} y2={baseY - 3.5} stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" />
        </>
      );
    case 7: // surprised
      return (
        <>
          <circle cx={lx} cy={baseY} r={4.5} fill="#fff" />
          <circle cx={rx} cy={baseY} r={4.5} fill="#fff" />
          <circle cx={lx} cy={baseY} r={2.5} fill="#2C3E50" />
          <circle cx={rx} cy={baseY} r={2.5} fill="#2C3E50" />
          <circle cx={lx + 1} cy={baseY - 1} r={0.8} fill="#fff" />
          <circle cx={rx + 1} cy={baseY - 1} r={0.8} fill="#fff" />
        </>
      );
    case 8: // glasses
      return (
        <>
          <rect x={lx - 5} y={baseY - 4} width={10} height={8} rx={2} fill="none" stroke="#2C3E50" strokeWidth="1.5" />
          <rect x={rx - 5} y={baseY - 4} width={10} height={8} rx={2} fill="none" stroke="#2C3E50" strokeWidth="1.5" />
          <line x1={lx + 5} y1={baseY} x2={rx - 5} y2={baseY} stroke="#2C3E50" strokeWidth="1.5" />
          <circle cx={lx + 0.5} cy={baseY} r={2} fill="#2C3E50" />
          <circle cx={rx + 0.5} cy={baseY} r={2} fill="#2C3E50" />
          <circle cx={lx + 1} cy={baseY - 0.7} r={0.6} fill="#fff" />
          <circle cx={rx + 1} cy={baseY - 0.7} r={0.6} fill="#fff" />
          <line x1={lx - 5} y1={baseY} x2={lx - 8} y2={baseY - 1} stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" />
          <line x1={rx + 5} y1={baseY} x2={rx + 8} y2={baseY - 1} stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" />
        </>
      );
    case 9: // closed
      return (
        <>
          <path d={`M${lx - 3.5} ${baseY} Q${lx} ${baseY - 3} ${lx + 3.5} ${baseY}`} fill="none" stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" />
          <path d={`M${rx - 3.5} ${baseY} Q${rx} ${baseY - 3} ${rx + 3.5} ${baseY}`} fill="none" stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" />
          <line x1={lx - 1} y1={baseY + 1} x2={lx - 2} y2={baseY + 3} stroke="#2C3E50" strokeWidth="0.8" strokeLinecap="round" />
          <line x1={lx + 1} y1={baseY + 1} x2={lx + 2} y2={baseY + 3} stroke="#2C3E50" strokeWidth="0.8" strokeLinecap="round" />
          <line x1={rx - 1} y1={baseY + 1} x2={rx - 2} y2={baseY + 3} stroke="#2C3E50" strokeWidth="0.8" strokeLinecap="round" />
          <line x1={rx + 1} y1={baseY + 1} x2={rx + 2} y2={baseY + 3} stroke="#2C3E50" strokeWidth="0.8" strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}

function renderEyebrows(variant: number): React.ReactNode {
  const baseY = 32;
  const lx = 33;
  const rx = 47;

  switch (variant) {
    case 0: // thin
      return (
        <>
          <line x1={lx - 3} y1={baseY} x2={lx + 3} y2={baseY} stroke="#2C3E50" strokeWidth="0.8" strokeLinecap="round" />
          <line x1={rx - 3} y1={baseY} x2={rx + 3} y2={baseY} stroke="#2C3E50" strokeWidth="0.8" strokeLinecap="round" />
        </>
      );
    case 1: // thick
      return (
        <>
          <line x1={lx - 3.5} y1={baseY} x2={lx + 3.5} y2={baseY} stroke="#2C3E50" strokeWidth="2.5" strokeLinecap="round" />
          <line x1={rx - 3.5} y1={baseY} x2={rx + 3.5} y2={baseY} stroke="#2C3E50" strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
    case 2: // arched
      return (
        <>
          <path d={`M${lx - 4} ${baseY + 1} Q${lx} ${baseY - 3} ${lx + 4} ${baseY + 1}`} fill="none" stroke="#2C3E50" strokeWidth="1.2" strokeLinecap="round" />
          <path d={`M${rx - 4} ${baseY + 1} Q${rx} ${baseY - 3} ${rx + 4} ${baseY + 1}`} fill="none" stroke="#2C3E50" strokeWidth="1.2" strokeLinecap="round" />
        </>
      );
    case 3: // angry
      return (
        <>
          <line x1={lx - 4} y1={baseY - 2} x2={lx + 4} y2={baseY + 1} stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" />
          <line x1={rx - 4} y1={baseY + 1} x2={rx + 4} y2={baseY - 2} stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" />
        </>
      );
    case 4: // sad
      return (
        <>
          <line x1={lx - 4} y1={baseY + 1} x2={lx + 4} y2={baseY - 2} stroke="#2C3E50" strokeWidth="1.2" strokeLinecap="round" />
          <line x1={rx - 4} y1={baseY - 2} x2={rx + 4} y2={baseY + 1} stroke="#2C3E50" strokeWidth="1.2" strokeLinecap="round" />
        </>
      );
    case 5: // surprised
      return (
        <>
          <path d={`M${lx - 4} ${baseY} Q${lx} ${baseY - 5} ${lx + 4} ${baseY}`} fill="none" stroke="#2C3E50" strokeWidth="1.2" strokeLinecap="round" />
          <path d={`M${rx - 4} ${baseY} Q${rx} ${baseY - 5} ${rx + 4} ${baseY}`} fill="none" stroke="#2C3E50" strokeWidth="1.2" strokeLinecap="round" />
        </>
      );
    case 6: // unibrow
      return (
        <path d={`M${lx - 4} ${baseY + 1} Q${lx} ${baseY - 3} 40 ${baseY - 1} Q${rx} ${baseY - 3} ${rx + 4} ${baseY + 1}`} fill="none" stroke="#2C3E50" strokeWidth="2" strokeLinecap="round" />
      );
    case 7: // bushy
      return (
        <>
          <path d={`M${lx - 5} ${baseY + 1} Q${lx - 2} ${baseY - 3} ${lx} ${baseY - 2} Q${lx + 2} ${baseY - 3} ${lx + 5} ${baseY + 1}`} fill="#2C3E50" />
          <path d={`M${rx - 5} ${baseY + 1} Q${rx - 2} ${baseY - 3} ${rx} ${baseY - 2} Q${rx + 2} ${baseY - 3} ${rx + 5} ${baseY + 1}`} fill="#2C3E50" />
        </>
      );
    case 8: // none
      return null;
    case 9: // zigzag
      return (
        <>
          <polyline points={`${lx - 4},${baseY} ${lx - 2},${baseY - 2} ${lx},${baseY} ${lx + 2},${baseY - 2} ${lx + 4},${baseY}`} fill="none" stroke="#2C3E50" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={`${rx - 4},${baseY} ${rx - 2},${baseY - 2} ${rx},${baseY} ${rx + 2},${baseY - 2} ${rx + 4},${baseY}`} fill="none" stroke="#2C3E50" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    default:
      return null;
  }
}

function renderNose(variant: number): React.ReactNode {
  const cx = 40;
  const cy = 47;

  switch (variant) {
    case 0: // small
      return <circle cx={cx} cy={cy} r={1.5} fill="none" stroke="#2C3E50" strokeWidth="1" />;
    case 1: // button
      return <circle cx={cx} cy={cy} r={2.5} fill="rgba(0,0,0,0.1)" stroke="#2C3E50" strokeWidth="0.8" />;
    case 2: // pointy
      return <path d={`M${cx} ${cy - 4} L${cx + 3} ${cy + 2} L${cx - 3} ${cy + 2}Z`} fill="none" stroke="#2C3E50" strokeWidth="1" strokeLinejoin="round" />;
    case 3: // wide
      return (
        <>
          <path d={`M${cx - 1} ${cy - 2} Q${cx} ${cy - 4} ${cx + 1} ${cy - 2}`} fill="none" stroke="#2C3E50" strokeWidth="1" strokeLinecap="round" />
          <ellipse cx={cx} cy={cy} rx={4} ry={2} fill="none" stroke="#2C3E50" strokeWidth="1" />
        </>
      );
    case 4: // long
      return <path d={`M${cx} ${cy - 5} Q${cx + 2} ${cy} ${cx} ${cy + 3} Q${cx - 2} ${cy} ${cx} ${cy - 5}Z`} fill="none" stroke="#2C3E50" strokeWidth="1" />;
    case 5: // tiny
      return (
        <>
          <circle cx={cx - 1} cy={cy} r={0.8} fill="#2C3E50" />
          <circle cx={cx + 1} cy={cy} r={0.8} fill="#2C3E50" />
        </>
      );
    case 6: // pig
      return (
        <>
          <ellipse cx={cx} cy={cy} rx={3.5} ry={2.5} fill="rgba(0,0,0,0.08)" stroke="#2C3E50" strokeWidth="1" />
          <circle cx={cx - 1.2} cy={cy} r={0.8} fill="#2C3E50" />
          <circle cx={cx + 1.2} cy={cy} r={0.8} fill="#2C3E50" />
        </>
      );
    case 7: // clown
      return <circle cx={cx} cy={cy} r={3.5} fill="#E74C3C" />;
    case 8: // triangle
      return <path d={`M${cx} ${cy - 3} L${cx + 3} ${cy + 2} L${cx - 3} ${cy + 2}Z`} fill="rgba(0,0,0,0.08)" stroke="#2C3E50" strokeWidth="1" strokeLinejoin="round" />;
    case 9: // flat
      return <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" />;
    default:
      return null;
  }
}

function renderMouth(variant: number): React.ReactNode {
  const cx = 40;
  const cy = 55;

  switch (variant) {
    case 0: // smile
      return <path d={`M${cx - 5} ${cy} Q${cx} ${cy + 5} ${cx + 5} ${cy}`} fill="none" stroke="#2C3E50" strokeWidth="1.3" strokeLinecap="round" />;
    case 1: // grin
      return (
        <>
          <path d={`M${cx - 6} ${cy} Q${cx} ${cy + 7} ${cx + 6} ${cy}`} fill="#fff" stroke="#2C3E50" strokeWidth="1.3" />
          <line x1={cx - 4} y1={cy} x2={cx + 4} y2={cy} stroke="#2C3E50" strokeWidth="0.5" />
        </>
      );
    case 2: // frown
      return <path d={`M${cx - 5} ${cy + 3} Q${cx} ${cy - 3} ${cx + 5} ${cy + 3}`} fill="none" stroke="#2C3E50" strokeWidth="1.3" strokeLinecap="round" />;
    case 3: // open
      return <ellipse cx={cx} cy={cy + 1} rx={4} ry={3.5} fill="#2C3E50" />;
    case 4: // tongue-out
      return (
        <>
          <path d={`M${cx - 5} ${cy} Q${cx} ${cy + 5} ${cx + 5} ${cy}`} fill="none" stroke="#2C3E50" strokeWidth="1.3" strokeLinecap="round" />
          <ellipse cx={cx} cy={cy + 4} rx={2.5} ry={3} fill="#E74C3C" />
        </>
      );
    case 5: // smirk
      return <path d={`M${cx - 3} ${cy + 1} Q${cx + 2} ${cy + 4} ${cx + 5} ${cy}`} fill="none" stroke="#2C3E50" strokeWidth="1.3" strokeLinecap="round" />;
    case 6: // teeth
      return (
        <>
          <path d={`M${cx - 6} ${cy} L${cx + 6} ${cy} Q${cx + 6} ${cy + 5} ${cx} ${cy + 5} Q${cx - 6} ${cy + 5} ${cx - 6} ${cy}Z`} fill="#fff" stroke="#2C3E50" strokeWidth="1" />
          <line x1={cx - 4} y1={cy} x2={cx - 4} y2={cy + 4} stroke="#2C3E50" strokeWidth="0.5" />
          <line x1={cx - 2} y1={cy} x2={cx - 2} y2={cy + 4.5} stroke="#2C3E50" strokeWidth="0.5" />
          <line x1={cx} y1={cy} x2={cx} y2={cy + 5} stroke="#2C3E50" strokeWidth="0.5" />
          <line x1={cx + 2} y1={cy} x2={cx + 2} y2={cy + 4.5} stroke="#2C3E50" strokeWidth="0.5" />
          <line x1={cx + 4} y1={cy} x2={cx + 4} y2={cy + 4} stroke="#2C3E50" strokeWidth="0.5" />
        </>
      );
    case 7: // kiss
      return (
        <>
          <circle cx={cx} cy={cy + 1} r={2.5} fill="#E74C3C" />
          <circle cx={cx} cy={cy + 1} r={1} fill="#C0392B" />
        </>
      );
    case 8: // neutral
      return <line x1={cx - 5} y1={cy + 1} x2={cx + 5} y2={cy + 1} stroke="#2C3E50" strokeWidth="1.3" strokeLinecap="round" />;
    case 9: // shock
      return (
        <>
          <ellipse cx={cx} cy={cy + 1} rx={3.5} ry={5} fill="#2C3E50" />
          <ellipse cx={cx} cy={cy + 1} rx={2} ry={3.5} fill="#8B0000" />
        </>
      );
    default:
      return null;
  }
}

function renderHair(variant: number, hairColor: string): React.ReactNode {
  switch (variant) {
    case 0: // buzz
      return (
        <path
          d="M15 35 Q15 12 40 10 Q65 12 65 35"
          fill={hairColor}
          stroke={hairColor}
          strokeWidth="1"
        />
      );
    case 1: // spiky
      return (
        <g fill={hairColor}>
          <path d="M15 35 Q15 15 40 12 Q65 15 65 35 Z" />
          <polygon points="22,18 26,4 30,18" />
          <polygon points="32,14 36,0 40,13" />
          <polygon points="42,13 46,0 50,14" />
          <polygon points="52,18 56,4 58,18" />
        </g>
      );
    case 2: // wavy
      return (
        <path
          d="M13 38 Q13 14 40 10 Q67 14 67 38 Q60 32 55 35 Q50 28 45 33 Q40 27 35 33 Q30 28 25 35 Q20 32 13 38Z"
          fill={hairColor}
        />
      );
    case 3: // mohawk
      return (
        <g fill={hairColor}>
          <path d="M30 35 Q30 18 40 10 Q50 18 50 35 Z" />
          <path d="M35 15 Q40 -5 45 15 Z" />
          <path d="M36 10 Q40 -10 44 10 Z" />
        </g>
      );
    case 4: // afro
      return (
        <ellipse
          cx={40}
          cy={28}
          rx={28}
          ry={24}
          fill={hairColor}
        />
      );
    case 5: // long
      return (
        <g fill={hairColor}>
          <path d="M13 38 Q13 12 40 10 Q67 12 67 38 L67 60 Q67 68 60 68 L60 42 Q60 30 40 28 Q20 30 20 42 L20 68 Q13 68 13 60 Z" />
        </g>
      );
    case 6: // bald
      return (
        <>
          <path d="M25 28 Q25 26 28 27" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinecap="round" />
          <path d="M30 24 Q32 22 34 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" strokeLinecap="round" />
        </>
      );
    case 7: // ponytail
      return (
        <g fill={hairColor}>
          <path d="M15 35 Q15 12 40 10 Q65 12 65 35" />
          <ellipse cx={62} cy={22} rx={4} ry={3} />
          <path d="M62 25 Q68 35 65 50 Q63 55 60 52 Q62 40 58 30 Z" />
        </g>
      );
    case 8: // curly
      return (
        <g fill={hairColor}>
          <path d="M13 38 Q13 12 40 10 Q67 12 67 38" />
          <circle cx={14} cy={32} r={4} />
          <circle cx={16} cy={22} r={4} />
          <circle cx={24} cy={14} r={4} />
          <circle cx={34} cy={10} r={4} />
          <circle cx={46} cy={10} r={4} />
          <circle cx={56} cy={14} r={4} />
          <circle cx={64} cy={22} r={4} />
          <circle cx={66} cy={32} r={4} />
        </g>
      );
    case 9: // beanie
      return (
        <g>
          <path d="M13 35 Q13 12 40 10 Q67 12 67 35" fill={hairColor} />
          <rect x={12} y={28} width={56} height={8} rx={3} fill="#E74C3C" />
          <rect x={12} y={32} width={56} height={4} rx={2} fill="#C0392B" />
          <circle cx={40} cy={10} r={4} fill="#E74C3C" />
        </g>
      );
    default:
      return null;
  }
}

// ── Main Component ──

interface AvatarProps {
  avatar: Avatar;
  size?: number;
}

export function AvatarDisplay({ avatar, size = 80 }: AvatarProps) {
  const skin = SKIN_COLORS[avatar.skinColor] ?? SKIN_COLORS[0];
  const hair = HAIR_COLORS[avatar.hairColor] ?? HAIR_COLORS[0];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      {/* Head */}
      <circle cx={40} cy={42} r={28} fill={skin} />

      {/* Ears */}
      <ellipse cx={13} cy={42} rx={4} ry={5} fill={skin} />
      <ellipse cx={67} cy={42} rx={4} ry={5} fill={skin} />
      <ellipse cx={13} cy={42} rx={2.5} ry={3} fill="rgba(0,0,0,0.06)" />
      <ellipse cx={67} cy={42} rx={2.5} ry={3} fill="rgba(0,0,0,0.06)" />

      {/* Hair (behind or on top) */}
      {renderHair(avatar.hair, hair)}

      {/* Eyebrows */}
      {renderEyebrows(avatar.eyebrows)}

      {/* Eyes */}
      {renderEyes(avatar.eyes)}

      {/* Nose */}
      {renderNose(avatar.nose)}

      {/* Mouth */}
      {renderMouth(avatar.mouth)}

      {/* Subtle cheek blush */}
      <circle cx={27} cy={50} r={4} fill="rgba(255,150,150,0.2)" />
      <circle cx={53} cy={50} r={4} fill="rgba(255,150,150,0.2)" />
    </svg>
  );
}

export default AvatarDisplay;
