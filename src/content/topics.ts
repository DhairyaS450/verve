import type { Topic, TopicCategory } from "./types";

const t = (category: TopicCategory, level: 1 | 2 | 3, ...items: string[]): Topic[] =>
  items.map((text) => ({ text, category, level }));

export const TOPICS: Topic[] = [
  // ---- Objects (easy, the classic wheel) ----
  ...t("object", 1,
    "Traffic cone", "Stapler", "Umbrella", "Rubber duck", "Paperclip", "Shopping cart", "Toaster", "Doorbell",
    "Sticky note", "Bicycle bell", "Pillow", "Garden hose", "Shoelace", "Fridge magnet", "Ice cube tray", "Spoon",
    "Kite", "Elevator button", "Candle", "Wristwatch", "Sandwich bag", "Bookmark", "Snow globe", "Mailbox",
    "Bubble wrap", "Skateboard", "Lawn chair", "Whistle", "Teabag", "Scissors", "Keychain", "Remote control",
    "Fire hydrant", "Hair dryer", "Tape measure", "Yoga mat", "Chess piece", "Coffee mug", "Trampoline", "Ladder",
    "Backpack", "Coat hanger", "Escalator", "Vending machine", "Park bench", "Sunglasses", "Bus ticket", "Dice",
  ),
  // ---- Abstract (medium) ----
  ...t("abstract", 2,
    "Patience", "Luck", "Boredom", "Silence", "Habits", "Deadlines", "Nostalgia", "Curiosity", "Jealousy",
    "Momentum", "Trust", "Rest", "Discipline", "Failure", "Reputation", "Attention", "Change", "Comfort",
    "Ambition", "Kindness", "Chaos", "Timing", "Regret", "Focus", "Gratitude", "Risk", "Loyalty", "Simplicity",
    "Courage", "Perfectionism", "Freedom", "Doubt", "Play", "Forgiveness", "Ownership", "Pressure", "Wonder",
  ),
  // ---- Opinion (medium–hard) ----
  ...t("opinion", 2,
    "Should schools teach public speaking every year?", "Is remote work better than the office?",
    "Are smartphones making us worse at conversation?", "Is it better to be a specialist or a generalist?",
    "Should everyone learn to code?", "Is failure necessary for success?", "Are group projects useful?",
    "Is it better to rent or to own?", "Should cities ban cars from downtown?", "Is social media good for democracy?",
    "Should we work four days a week?", "Are books better than movies?", "Is competition healthy?",
    "Should tipping be abolished?", "Is talent overrated?", "Should kids get homework?",
    "Is it okay to quit things?", "Should everyone travel alone once?", "Is ambition a virtue?",
    "Are meetings a waste of time?", "Should voting be mandatory?", "Is boredom good for you?",
  ),
  ...t("opinion", 3,
    "Is privacy dead, and does it matter?", "Should we colonize Mars?", "Is honesty always the best policy?",
    "Does money buy happiness after a point?", "Should AI be allowed to make hiring decisions?",
    "Is nuclear energy the answer to climate change?", "Should college be free?", "Is nostalgia harmful?",
    "Do we need heroes?", "Should we bring back extinct species?", "Is comfort the enemy of growth?",
  ),
  // ---- Memory / personal ----
  ...t("memory", 1,
    "A time you got lost", "The best meal you've ever had", "A teacher who changed you", "Your first job",
    "A time you were wrong", "The best advice you ignored", "A skill you learned the hard way",
    "A moment you felt proud", "A time you laughed until it hurt", "A place you'd go back to tomorrow",
    "Something you quit and don't regret", "A stranger who helped you", "Your worst haircut",
    "The last time you changed your mind", "A tradition you love", "A risk that paid off",
  ),
  // ---- Explain (how does X work) ----
  ...t("explain", 2,
    "How does compound interest work?", "How do vaccines work?", "Why is the sky blue?", "How does a credit score work?",
    "How does the internet get from a server to your phone?", "Why do we dream?", "How does inflation work?",
    "How do airplanes stay up?", "What is a black hole?", "How does caffeine work?", "Why do we procrastinate?",
    "How does a mortgage work?", "How do noise-cancelling headphones work?", "What is machine learning?",
    "How do elections get counted?", "Why do onions make you cry?", "How does GPS know where you are?",
    "What is jet lag?", "How do bees make honey?", "Why does music give you chills?",
  ),
  // ---- Sell ----
  ...t("sell", 2,
    "Sell me a pencil", "Sell me a used umbrella", "Sell me silence", "Sell me a Monday morning",
    "Sell me a one-way ticket to nowhere", "Sell me a rock", "Sell me a cold shower", "Sell me a library card",
    "Sell me a broken clock", "Sell me a paper map", "Sell me a walk with no phone", "Sell me this app",
  ),
  // ---- Would you rather ----
  ...t("wouldyourather", 1,
    "Would you rather be able to fly or be invisible?", "Would you rather always be early or always be late?",
    "Would you rather live without music or without movies?", "Would you rather know the future or change the past?",
    "Would you rather have more time or more money?", "Would you rather speak every language or play every instrument?",
    "Would you rather be famous or anonymous?", "Would you rather never be tired or never be hungry?",
  ),
  // ---- Story seeds (invented) ----
  ...t("story", 2,
    "A lighthouse keeper who is afraid of the dark", "The last day of a vending machine", "A dog who learns to read",
    "A city where nobody can lie", "A mailman who delivers letters from the future", "Two rivals stuck in an elevator",
    "The kid who could hear plants", "A chef who lost their sense of taste", "The night the internet went silent",
    "A robot's first snow day", "A librarian who guards one forbidden book", "A taxi driver with one rule",
  ),
  // ---- News-like situations (for What / So what / Now what) ----
  ...t("news", 2,
    "Your team's launch slipped by two weeks", "A competitor just cut prices in half", "Your city is adding bike lanes downtown",
    "Your favorite coffee shop is closing", "A new law limits work emails after 6pm", "Your school is dropping grades for pass/fail",
    "A big storm is forecast for the weekend", "Your company just went fully remote", "A friend is moving abroad",
    "Your gym doubled its prices", "A four-day week pilot starts next month", "The bus route you use is being cut",
  ),
  // ---- Talk topics (for longer talks) ----
  ...t("opinion", 3,
    "What everyone gets wrong about confidence", "The most underrated skill in the world", "Why practice beats talent",
    "The one habit that changed your year", "What you'd tell your younger self about fear", "Why boredom is a gift",
    "The problem with advice", "What makes a great teacher", "How to disagree with someone you love",
    "Why we should all learn to tell stories", "The case for doing hard things on purpose", "What silence taught you",
  ),
];

export const OBJECTS = TOPICS.filter((x) => x.category === "object").map((x) => x.text);

export const ABSTRACT_WORDS = TOPICS.filter((x) => x.category === "abstract").map((x) => x.text);

/** Plain nouns for word association. */
export const ASSOCIATION_WORDS = [
  "river", "ladder", "pepper", "engine", "window", "harvest", "compass", "velvet", "thunder", "pencil",
  "orbit", "kitchen", "anchor", "whisper", "carnival", "lantern", "tunnel", "feather", "mirror", "glacier",
  "saddle", "puzzle", "meadow", "rocket", "cactus", "blanket", "harbor", "trophy", "pillow", "cannon",
  "island", "violin", "bucket", "shadow", "ticket", "canyon", "helmet", "garden", "magnet", "ribbon",
  "cinema", "hammer", "sunrise", "bridge", "jacket", "pocket", "castle", "dragon", "silver", "jungle",
  "button", "tractor", "circus", "desert", "needle", "planet", "salmon", "trumpet", "wallet", "yogurt",
];

export function pickTopic(set?: string, exclude: string[] = []): Topic {
  let pool: Topic[];
  switch (set) {
    case "easy":
      pool = TOPICS.filter((x) => x.level === 1 && (x.category === "object" || x.category === "memory" || x.category === "wouldyourather"));
      break;
    case "hard":
      pool = TOPICS.filter((x) => x.level >= 2 && (x.category === "abstract" || x.category === "opinion" || x.category === "explain"));
      break;
    case "opinion":
      pool = TOPICS.filter((x) => x.category === "opinion");
      break;
    case "abstract":
      pool = TOPICS.filter((x) => x.category === "abstract");
      break;
    case "explain":
      pool = TOPICS.filter((x) => x.category === "explain");
      break;
    case "news":
      pool = TOPICS.filter((x) => x.category === "news");
      break;
    case "talk":
      pool = TOPICS.filter((x) => x.category === "opinion" && x.level === 3);
      break;
    case "story":
      pool = TOPICS.filter((x) => x.category === "story");
      break;
    default:
      pool = TOPICS.filter((x) => x.category !== "news" && x.category !== "story");
  }
  const fresh = pool.filter((x) => !exclude.includes(x.text));
  const src = fresh.length > 0 ? fresh : pool;
  return src[Math.floor(Math.random() * src.length)];
}

export function pickMany<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  return out;
}
