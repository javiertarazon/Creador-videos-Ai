/**
 * Biblioteca de música libre de derechos para videos
 * Incluye URLs de APIs públicas y música sin derechos
 */

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: number; // en segundos
  genre: string;
  mood: string;
  url: string;
  source: "pixabay" | "freepik" | "epidemic" | "artlist";
}

/**
 * Música libre de derechos recomendada para videos cortos
 * Estas son URLs de ejemplo - en producción usar APIs reales
 */
export const musicLibrary: MusicTrack[] = [
  // Música motivacional
  {
    id: "upbeat-1",
    title: "Energetic Morning",
    artist: "Free Music Archive",
    duration: 120,
    genre: "Electronic",
    mood: "Motivacional",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    source: "pixabay",
  },
  {
    id: "upbeat-2",
    title: "Positive Vibes",
    artist: "Bensound",
    duration: 180,
    genre: "Pop",
    mood: "Alegre",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    source: "freepik",
  },
  // Música relajante
  {
    id: "calm-1",
    title: "Peaceful Meditation",
    artist: "Ambient Music",
    duration: 240,
    genre: "Ambient",
    mood: "Relajante",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    source: "pixabay",
  },
  {
    id: "calm-2",
    title: "Soft Background",
    artist: "Royalty Free Music",
    duration: 150,
    genre: "Lo-Fi",
    mood: "Tranquilo",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    source: "freepik",
  },
  // Música corporativa
  {
    id: "corporate-1",
    title: "Professional Business",
    artist: "Corporate Music",
    duration: 120,
    genre: "Corporate",
    mood: "Profesional",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    source: "epidemic",
  },
  {
    id: "corporate-2",
    title: "Modern Tech",
    artist: "Tech Music",
    duration: 100,
    genre: "Electronic",
    mood: "Moderno",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    source: "artlist",
  },
  // Música dramática
  {
    id: "dramatic-1",
    title: "Epic Journey",
    artist: "Dramatic Music",
    duration: 180,
    genre: "Orchestral",
    mood: "Épico",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    source: "pixabay",
  },
  {
    id: "dramatic-2",
    title: "Cinematic Impact",
    artist: "Film Music",
    duration: 120,
    genre: "Cinematic",
    mood: "Impactante",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    source: "freepik",
  },
];

/**
 * Obtiene música por género
 */
export function getMusicByGenre(genre: string): MusicTrack[] {
  return musicLibrary.filter((track) =>
    track.genre.toLowerCase().includes(genre.toLowerCase())
  );
}

/**
 * Obtiene música por mood/sentimiento
 */
export function getMusicByMood(mood: string): MusicTrack[] {
  return musicLibrary.filter((track) =>
    track.mood.toLowerCase().includes(mood.toLowerCase())
  );
}

/**
 * Obtiene música recomendada para un tipo de video
 */
export function getRecommendedMusic(videoType: string): MusicTrack[] {
  const recommendations: Record<string, string[]> = {
    tutorial: ["Motivacional", "Moderno"],
    producto: ["Profesional", "Moderno"],
    viaje: ["Alegre", "Épico"],
    receta: ["Alegre", "Tranquilo"],
    motivacional: ["Motivacional", "Épico"],
    relajante: ["Tranquilo", "Relajante"],
  };

  const moods = recommendations[videoType.toLowerCase()] || ["Alegre"];
  const tracks: MusicTrack[] = [];

  for (const mood of moods) {
    tracks.push(...getMusicByMood(mood));
  }

  return tracks.slice(0, 5); // Retornar top 5
}

/**
 * Obtiene todas las pistas disponibles
 */
export function getAllMusic(): MusicTrack[] {
  return musicLibrary;
}

/**
 * Obtiene géneros únicos
 */
export function getAvailableGenres(): string[] {
  const genres = new Set(musicLibrary.map((track) => track.genre));
  return Array.from(genres);
}

/**
 * Obtiene moods únicos
 */
export function getAvailableMoods(): string[] {
  const moods = new Set(musicLibrary.map((track) => track.mood));
  return Array.from(moods);
}
