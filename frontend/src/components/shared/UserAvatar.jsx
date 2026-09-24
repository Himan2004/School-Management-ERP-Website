/**
 * UserAvatar — shared profile picture component
 *
 * Shows a photo if `src` is provided and loads successfully,
 * otherwise falls back to coloured initials derived from `name`.
 *
 * Props:
 *   name      string   Required. Used for initials fallback and alt text.
 *   src       string   Optional. URL of the user's photo.
 *   size      number   Optional. Pixel size of the avatar. Default: 32
 *   className string   Optional. Extra Tailwind classes on the wrapper.
 *   onClick   fn       Optional. Click handler (e.g. open image in new tab).
 *   rounded   string   Optional. Tailwind rounded class. Default: "rounded-full"
 */

import { useState } from "react";

// Deterministic colour from name string
const PALETTE = [
  "bg-blue-500",    "bg-violet-500", "bg-teal-500",   "bg-emerald-500",
  "bg-amber-500",   "bg-rose-500",   "bg-indigo-500", "bg-pink-500",
  "bg-cyan-500",    "bg-orange-500", "bg-lime-600",   "bg-sky-500",
  "bg-purple-500",  "bg-fuchsia-500","bg-red-500",    "bg-green-600",
];

function colorFromName(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function UserAvatar({
  name     = "",
  src,
  size     = 32,
  className = "",
  onClick,
  rounded  = "rounded-full",
}) {
  const [imgError, setImgError] = useState(false);
  const showPhoto = src && !imgError;
  const bg        = colorFromName(name);
  const letters   = initials(name) || "?";

  const style = { width: size, height: size, minWidth: size, fontSize: size * 0.38 };

  const base = `inline-flex items-center justify-center overflow-hidden select-none shrink-0 ${rounded} ${className} ${
    onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
  }`;

  return (
    <div
      className={`${base} ${showPhoto ? "" : `${bg} text-white font-black`}`}
      style={style}
      onClick={onClick}
      title={name}
    >
      {showPhoto ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span style={{ fontSize: size * 0.38, lineHeight: 1 }}>{letters}</span>
      )}
    </div>
  );
}
