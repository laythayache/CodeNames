import { useCallback } from "react";
import type { Avatar } from "shared/types";
import { AvatarDisplay } from "./Avatar";

// ── Constants ──

const FEATURE_CONFIG = [
  { key: "eyes" as const, label: "Eyes", max: 10 },
  { key: "hair" as const, label: "Hair", max: 10 },
  { key: "eyebrows" as const, label: "Brows", max: 10 },
  { key: "mouth" as const, label: "Mouth", max: 10 },
  { key: "nose" as const, label: "Nose", max: 10 },
] as const;

const SKIN_COLORS = [
  { value: 0, color: "#FDDCB5", label: "Light" },
  { value: 1, color: "#E8B88A", label: "Tan" },
  { value: 2, color: "#C49A6C", label: "Olive" },
  { value: 3, color: "#8D5E3C", label: "Brown" },
  { value: 4, color: "#5C3A1E", label: "Dark" },
  { value: 5, color: "#3B2510", label: "Deep" },
];

const HAIR_COLORS = [
  { value: 0, color: "#1A1A2E", label: "Black" },
  { value: 1, color: "#6B3A2A", label: "Brown" },
  { value: 2, color: "#E8C84A", label: "Blonde" },
  { value: 3, color: "#C0392B", label: "Red" },
  { value: 4, color: "#3498DB", label: "Blue" },
  { value: 5, color: "#8E44AD", label: "Purple" },
  { value: 6, color: "#27AE60", label: "Green" },
  { value: 7, color: "#E84393", label: "Pink" },
];

const FEATURE_LABELS: Record<string, string[]> = {
  eyes: ["Round", "Almond", "Wink", "Sleepy", "Stars", "Hearts", "Angry", "Surprised", "Glasses", "Closed"],
  hair: ["Buzz", "Spiky", "Wavy", "Mohawk", "Afro", "Long", "Bald", "Ponytail", "Curly", "Beanie"],
  eyebrows: ["Thin", "Thick", "Arched", "Angry", "Sad", "Raised", "Unibrow", "Bushy", "None", "Zigzag"],
  mouth: ["Smile", "Grin", "Frown", "Open", "Tongue", "Smirk", "Teeth", "Kiss", "Neutral", "Shock"],
  nose: ["Small", "Button", "Pointy", "Wide", "Long", "Tiny", "Pig", "Clown", "Triangle", "Flat"],
};

// ── Subcomponents ──

function ArrowButton({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 active:bg-gray-400 transition-colors text-gray-600 font-bold text-sm select-none shrink-0"
      aria-label={direction === "left" ? "Previous" : "Next"}
    >
      {direction === "left" ? "\u25C0" : "\u25B6"}
    </button>
  );
}

function ColorSwatch({
  color,
  selected,
  onClick,
  label,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`w-8 h-8 rounded-full border-2 transition-all ${
        selected
          ? "border-blue-500 scale-110 shadow-md"
          : "border-gray-300 hover:border-gray-400"
      }`}
      style={{ backgroundColor: color }}
      aria-label={label}
      aria-pressed={selected}
    />
  );
}

// ── Main Component ──

interface AvatarBuilderProps {
  value: Avatar;
  onChange: (avatar: Avatar) => void;
}

export function AvatarBuilder({ value, onChange }: AvatarBuilderProps) {
  const cycleFeature = useCallback(
    (key: keyof Avatar, max: number, direction: 1 | -1) => {
      const current = value[key];
      const next = (current + direction + max) % max;
      onChange({ ...value, [key]: next });
    },
    [value, onChange],
  );

  const randomize = useCallback(() => {
    onChange({
      eyes: Math.floor(Math.random() * 10),
      hair: Math.floor(Math.random() * 10),
      eyebrows: Math.floor(Math.random() * 10),
      mouth: Math.floor(Math.random() * 10),
      nose: Math.floor(Math.random() * 10),
      skinColor: Math.floor(Math.random() * 6),
      hairColor: Math.floor(Math.random() * 8),
    });
  }, [onChange]);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm">
      {/* Avatar Preview */}
      <div className="bg-gray-100 rounded-2xl p-4 shadow-inner">
        <AvatarDisplay avatar={value} size={120} />
      </div>

      {/* Feature Controls */}
      <div className="w-full space-y-2">
        {FEATURE_CONFIG.map(({ key, label, max }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 w-12 text-right shrink-0">
              {label}
            </span>
            <ArrowButton
              direction="left"
              onClick={() => cycleFeature(key, max, -1)}
            />
            <span className="text-xs text-gray-600 flex-1 text-center truncate min-w-0">
              {FEATURE_LABELS[key]?.[value[key]] ?? `#${value[key]}`}
            </span>
            <ArrowButton
              direction="right"
              onClick={() => cycleFeature(key, max, 1)}
            />
          </div>
        ))}
      </div>

      {/* Skin Color Picker */}
      <div className="w-full">
        <p className="text-xs font-semibold text-gray-500 mb-1.5 text-center">
          Skin
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          {SKIN_COLORS.map((sc) => (
            <ColorSwatch
              key={sc.value}
              color={sc.color}
              selected={value.skinColor === sc.value}
              onClick={() => onChange({ ...value, skinColor: sc.value })}
              label={sc.label}
            />
          ))}
        </div>
      </div>

      {/* Hair Color Picker */}
      <div className="w-full">
        <p className="text-xs font-semibold text-gray-500 mb-1.5 text-center">
          Hair Color
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          {HAIR_COLORS.map((hc) => (
            <ColorSwatch
              key={hc.value}
              color={hc.color}
              selected={value.hairColor === hc.value}
              onClick={() => onChange({ ...value, hairColor: hc.value })}
              label={hc.label}
            />
          ))}
        </div>
      </div>

      {/* Randomize Button */}
      <button
        type="button"
        onClick={randomize}
        className="px-5 py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
      >
        Randomize
      </button>
    </div>
  );
}

export default AvatarBuilder;
