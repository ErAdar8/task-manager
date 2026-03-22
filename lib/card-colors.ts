export type CardColorSet = {
  bar: string;
  bg: string;
  border: string;
  accent: string;
  text: string;
};

const PALETTE: CardColorSet[] = [
  {
    bar: "bg-emerald-500/90",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    accent: "text-emerald-400/90",
    text: "text-emerald-100/90",
  },
  {
    bar: "bg-blue-500/90",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    accent: "text-blue-400/90",
    text: "text-blue-100/90",
  },
  {
    bar: "bg-violet-500/90",
    bg: "bg-violet-500/5",
    border: "border-violet-500/20",
    accent: "text-violet-400/90",
    text: "text-violet-100/90",
  },
  {
    bar: "bg-amber-500/90",
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    accent: "text-amber-400/90",
    text: "text-amber-100/90",
  },
  {
    bar: "bg-rose-500/90",
    bg: "bg-rose-500/5",
    border: "border-rose-500/20",
    accent: "text-rose-400/90",
    text: "text-rose-100/90",
  },
  {
    bar: "bg-cyan-500/90",
    bg: "bg-cyan-500/5",
    border: "border-cyan-500/20",
    accent: "text-cyan-400/90",
    text: "text-cyan-100/90",
  },
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getCardColor(id: string): CardColorSet {
  const idx = hashId(id) % PALETTE.length;
  return PALETTE[idx]!;
}
