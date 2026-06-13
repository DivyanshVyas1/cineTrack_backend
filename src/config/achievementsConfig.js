const ACHIEVEMENT_TRACKS = [
  {
    id: "genreSpecialist",
    title: "The Genre Specialist",
    description: "Focus on a single genre",
    milestones: [5, 20, 50, 100],
    icon: "🎭"
  },
  {
    id: "audiophile",
    title: "The Audiophile",
    description: "Add songs to your library",
    milestones: [5, 20, 50, 100],
    icon: "🎧"
  },
  {
    id: "critic",
    title: "The Pen & Paper Critic",
    description: "Write detailed text reviews",
    milestones: [5, 20, 50, 100],
    icon: "✍️"
  },
  {
    id: "grandLibrarian",
    title: "The Grand Librarian",
    description: "Total Movies & Shows logged",
    milestones: [10, 40, 100, 200],
    icon: "📚"
  },
  {
    id: "bibliophile",
    title: "The Bibliophile",
    description: "Log books in your library",
    milestones: [5, 20, 50, 100],
    icon: "📖"
  },
  {
    id: "soulmate",
    title: "The Soulmate",
    description: "Compare taste with different users",
    milestones: [5, 20, 50, 100],
    icon: "🤝"
  },
  {
    id: "masterpieceHunter",
    title: "The Masterpiece Hunter",
    description: "Give a perfect rating (10/10)",
    milestones: [3, 7, 15, 30],
    icon: "🎯"
  },
  {
    id: "executioner",
    title: "The Executioner",
    description: "Move items from Watchlist to Watched",
    milestones: [5, 20, 50, 100],
    icon: "⚔️"
  },
  {
    id: "marathonRunner",
    title: "The Marathon Runner",
    description: "Log a single title with massive watchtime (hours)",
    milestones: [15, 30, 70, 120],
    icon: "🏃‍♂️"
  },
  {
    id: "totalLifeWasted",
    title: "Total Life Wasted",
    description: "Total watchtime across all logged items (days)",
    milestones: [3, 20, 60, 100],
    icon: "💀"
  }
];

const TIER_COLORS = {
  bronze: {
    bg: "linear-gradient(135deg, rgba(205, 127, 50, 0.15), rgba(205, 127, 50, 0.05))",
    border: "rgba(205, 127, 50, 0.4)",
    text: "#cd7f32",
    glow: "rgba(205, 127, 50, 0.6)",
    color: "#cd7f32"
  },
  silver: {
    bg: "linear-gradient(135deg, rgba(192, 192, 192, 0.15), rgba(192, 192, 192, 0.05))",
    border: "rgba(192, 192, 192, 0.4)",
    text: "#c0c0c0",
    glow: "rgba(192, 192, 192, 0.6)",
    color: "#c0c0c0"
  },
  gold: {
    bg: "linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 215, 0, 0.05))",
    border: "rgba(255, 215, 0, 0.4)",
    text: "#ffd700",
    glow: "rgba(255, 215, 0, 0.6)",
    color: "#ffd700"
  },
  diamond: {
    bg: "linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 255, 255, 0.05))",
    border: "rgba(0, 255, 255, 0.4)",
    text: "#00ffff",
    glow: "rgba(0, 255, 255, 0.6)",
    color: "#00ffff"
  },
  heroic: {
    bg: "linear-gradient(135deg, rgba(255, 50, 50, 0.15), rgba(255, 50, 50, 0.05))",
    border: "rgba(255, 50, 50, 0.4)",
    text: "#ff3232",
    glow: "rgba(255, 50, 50, 0.8)",
    color: "#ff3232"
  }
};

module.exports = { ACHIEVEMENT_TRACKS, TIER_COLORS };
