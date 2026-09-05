import type { Passage } from "./types";

/** Public-domain texts, 60–120 words. Punctuation-rich for pause drills. */
export const PASSAGES: Passage[] = [
  {
    id: "hamlet-players",
    title: "Advice to the players",
    source: "Shakespeare, Hamlet",
    text:
      "Speak the speech, I pray you, as I pronounced it to you, trippingly on the tongue: but if you mouth it, as many of your players do, I had as lief the town-crier spoke my lines. Nor do not saw the air too much with your hand, thus, but use all gently; for in the very torrent, tempest, and, as I may say, the whirlwind of passion, you must acquire and beget a temperance that may give it smoothness.",
  },
  {
    id: "north-wind",
    title: "The North Wind and the Sun",
    source: "Aesop",
    text:
      "The North Wind and the Sun were disputing which was the stronger, when a traveler came along wrapped in a warm cloak. They agreed that the one who first succeeded in making the traveler take his cloak off should be considered stronger. The North Wind blew as hard as he could, but the more he blew, the more closely did the traveler fold his cloak around him. Then the Sun shone out warmly, and immediately the traveler took off his cloak. And so the North Wind was obliged to confess that the Sun was the stronger of the two.",
  },
  {
    id: "gettysburg",
    title: "Gettysburg Address (opening)",
    source: "Abraham Lincoln, 1863",
    text:
      "Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war. We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live.",
  },
  {
    id: "two-cities",
    title: "A Tale of Two Cities (opening)",
    source: "Charles Dickens, 1859",
    text:
      "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair, we had everything before us, we had nothing before us, we were all going direct to Heaven, we were all going direct the other way.",
  },
  {
    id: "road-not-taken",
    title: "The Road Not Taken (excerpt)",
    source: "Robert Frost, 1916",
    text:
      "Two roads diverged in a yellow wood, and sorry I could not travel both and be one traveler, long I stood and looked down one as far as I could to where it bent in the undergrowth. I shall be telling this with a sigh somewhere ages and ages hence: two roads diverged in a wood, and I, I took the one less traveled by, and that has made all the difference.",
  },
  {
    id: "if",
    title: "If— (excerpt)",
    source: "Rudyard Kipling, 1910",
    text:
      "If you can keep your head when all about you are losing theirs and blaming it on you; if you can trust yourself when all men doubt you, but make allowance for their doubting too; if you can wait and not be tired by waiting, or, being lied about, don't deal in lies, or, being hated, don't give way to hating, and yet don't look too good, nor talk too wise.",
  },
  {
    id: "walden",
    title: "Walden (excerpt)",
    source: "Henry David Thoreau, 1854",
    text:
      "I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived. I did not wish to live what was not life, living is so dear; nor did I wish to practise resignation, unless it was quite necessary.",
  },
  {
    id: "jfk-inaugural",
    title: "Inaugural Address (excerpt)",
    source: "John F. Kennedy, 1961",
    text:
      "In the long history of the world, only a few generations have been granted the role of defending freedom in its hour of maximum danger. I do not shrink from this responsibility; I welcome it. And so, my fellow Americans: ask not what your country can do for you; ask what you can do for your country.",
  },
  {
    id: "hope-feathers",
    title: "Hope is the thing with feathers",
    source: "Emily Dickinson",
    text:
      "Hope is the thing with feathers that perches in the soul, and sings the tune without the words, and never stops at all, and sweetest in the gale is heard; and sore must be the storm that could abash the little bird that kept so many warm. I've heard it in the chillest land, and on the strangest sea; yet, never, in extremity, it asked a crumb of me.",
  },
  {
    id: "verve-drill",
    title: "The drill",
    source: "Verve",
    text:
      "Practice is boring. Practice is quiet. Practice is the pen in your mouth, the timer on the table, the tape you don't want to watch. Nobody claps. Nobody sees it. And then, one day, in a room full of people, you open your mouth and something has changed: the words are crisp, the pauses are deliberate, the voice fills the space. They call it talent. You know what it is. It is Tuesday.",
  },
];

export const TWISTERS = [
  "Red leather, yellow leather, red leather, yellow leather.",
  "Unique New York, unique New York, you know you need unique New York.",
  "The lips, the teeth, the tip of the tongue.",
  "Peter Piper picked a peck of pickled peppers.",
  "She sells seashells by the seashore.",
  "Betty Botter bought some butter, but she said the butter's bitter.",
  "Six slippery snails slid slowly seaward.",
  "Irish wristwatch, Swiss wristwatch.",
  "A proper copper coffee pot.",
  "Good blood, bad blood, good blood, bad blood.",
  "Rubber baby buggy bumpers.",
  "Eleven benevolent elephants.",
  "Toy boat, toy boat, toy boat, toy boat.",
  "Fresh fried fish, fish fresh fried, fried fish fresh.",
  "Three free throws, three free throws.",
  "Truly rural, truly rural, truly rural.",
  "Which wristwatches are Swiss wristwatches?",
  "Greek grapes, Greek grapes, Greek grapes.",
  "The sixth sick sheikh's sixth sheep's sick.",
  "How much wood would a woodchuck chuck if a woodchuck could chuck wood?",
];

export const YES_AND_STATEMENTS = [
  "We're going on a road trip.",
  "The office is now on a boat.",
  "I've decided to learn the trumpet.",
  "Breakfast will be served on the roof.",
  "The cat has started a business.",
  "We're replacing all meetings with dance.",
  "My grandmother is a spy.",
  "The elevator only goes sideways now.",
  "Tomorrow, gravity is optional.",
  "The mayor has banned Mondays.",
  "Our team mascot is a traffic cone.",
  "There's a dragon in the parking lot.",
  "We're opening a restaurant that serves only soup.",
  "The moon has sent us a letter.",
  "I'm running for president of this bus.",
  "The plants in the lobby are unionizing.",
];

export const DISAGREE_STATEMENTS = [
  "Public speaking can't be learned. You either have it or you don't.",
  "Working from home is just an excuse to slack off.",
  "Reading fiction is a waste of time.",
  "Nobody needs to learn math past middle school.",
  "Small talk is pointless.",
  "Feedback should always be brutal to be useful.",
  "Confidence is the same as arrogance.",
  "Practice makes perfect.",
  "Talent matters more than effort.",
  "Meetings are always a waste of time.",
];

export const QUESTION_SETS: Record<string, string[]> = {
  opinion: [
    "What's the most overrated virtue?",
    "Is it better to be liked or respected?",
    "What should everyone learn before they turn 25?",
    "Do deadlines help or hurt creativity?",
    "What's one rule you think should be broken?",
    "Is comfort the enemy of growth?",
    "What makes someone trustworthy?",
    "Should we be more honest or more kind?",
    "What's the best way to learn something hard?",
    "Is it better to be early or perfect?",
    "What does a good day look like?",
    "What do most people get wrong about confidence?",
  ],
  interview: [
    "Tell me about yourself.",
    "What's your biggest weakness?",
    "Describe a time you failed.",
    "Why should we choose you?",
    "Where do you see yourself in five years?",
    "Tell me about a conflict you resolved.",
    "What are you most proud of?",
    "How do you handle pressure?",
    "What would your last manager say about you?",
    "Why are you leaving your current role?",
  ],
  hostile: [
    "Why should anyone trust you on this?",
    "Isn't this just a fad?",
    "You've failed at this before. Why is now different?",
    "Aren't you too inexperienced for this?",
    "Isn't that a waste of money?",
    "What makes you think you're qualified?",
    "Why has this taken so long?",
    "Isn't this just copying what others did?",
    "Who actually benefits from this? You?",
    "How do you respond to critics who say this is pointless?",
  ],
  offtopic: [
    "What did you have for breakfast?",
    "Do you think it will rain this weekend?",
    "What's your favorite movie?",
    "How was your commute?",
    "Are cats better than dogs?",
    "What's the best pizza topping?",
    "Did you watch the game last night?",
    "What's your opinion on pineapple on pizza?",
  ],
  smalltalk: [
    "How was your weekend?",
    "What have you been up to lately?",
    "How's work going?",
    "Any plans for the holidays?",
    "What are you into these days?",
    "How do you know the host?",
  ],
  mixed: [
    "What's your biggest weakness?",
    "Why should anyone trust you on this?",
    "What did you learn this year?",
    "Isn't this just a fad?",
    "What would you do with a free month?",
    "Describe a time you failed.",
    "What's the hardest decision you've made?",
    "Why has this taken so long?",
    "What's one thing you'd change about your industry?",
    "What's the best advice you've ever received?",
  ],
};

export const EXPERT_TOPICS = [
  "the history of the paperclip",
  "underwater basket weaving",
  "cloud naming",
  "competitive napping",
  "the psychology of pigeons",
  "professional puddle jumping",
  "medieval sandwich design",
  "the economics of lost socks",
  "elevator small talk",
  "extreme ironing",
  "the secret life of traffic cones",
  "snow globe engineering",
];

export const EXPERT_QUESTIONS = [
  "How did you get into this field?",
  "What's the biggest misconception people have?",
  "What's the most exciting recent breakthrough?",
  "What advice do you have for beginners?",
  "What does the future hold?",
  "What's a day in your life like?",
];

export const STORY_PROMPTS: Record<string, string[]> = {
  personal: [
    "A time you were completely out of your depth",
    "The moment you realized you were wrong about someone",
    "A day that didn't go to plan",
    "Your most embarrassing moment (that you can laugh at now)",
    "The first time you did something you were afraid of",
    "A conversation that changed your mind",
    "A time you got caught",
    "A small kindness you still remember",
    "A time you surprised yourself",
    "The worst job you ever had",
    "A moment you felt completely alive",
    "A time you had to choose between two good things",
  ],
  sensory: [
    "The kitchen of your childhood home",
    "The last time you were caught in the rain",
    "A crowded place you'll never forget",
    "The best morning of last year",
    "A meal you can still taste",
    "The night before something big",
  ],
  stakes: [
    "A time you almost lost something important",
    "A deadline you nearly missed",
    "A moment where one decision changed everything",
    "A time you had to speak up or stay quiet",
    "A time you took a risk that could have gone badly",
    "The day you almost quit",
  ],
  invent: [
    "A lighthouse keeper who is afraid of the dark",
    "A city where nobody can lie",
    "A dog who learns to read",
    "The last day of a vending machine",
    "A taxi driver with one rule",
    "Two rivals stuck in an elevator",
    "The kid who could hear plants",
    "A robot's first snow day",
  ],
  lesson: [
    "Something you learned the hard way",
    "Advice you'd give your younger self, with the story behind it",
    "A mistake that became a rule you live by",
    "A time you underestimated someone",
    "The moment you understood what you actually wanted",
  ],
  signature: [
    "Childhood: a moment that shaped who you are",
    "Failure: the one you learned the most from",
    "Win: a moment you earned something",
    "Mentor: someone who changed how you see things",
    "Turning point: the day your direction changed",
  ],
  funny: [
    "A misunderstanding that spiraled",
    "The worst date, meeting, or interview you've had",
    "A plan that went hilariously wrong",
    "A time you tried to look cool and failed",
    "A family tradition that makes no sense",
  ],
  pitch: [
    "A change you want at work",
    "A habit your household should adopt",
    "A tool your team should stop using",
    "Something your city should build",
    "A rule your school or company should drop",
  ],
  belief: [
    "Something you believe that most people don't",
    "Why you do the work you do",
    "A cause worth an hour of everyone's week",
    "What you'd build if money didn't matter",
  ],
  update: [
    "A project you're working on right now",
    "Something you finished this month",
    "A problem you're stuck on",
    "A goal you're halfway through",
  ],
  vision: [
    "How learning should work",
    "How cities should feel",
    "How work should feel in ten years",
    "What communication could look like if everyone trained it",
    "The future of your field",
  ],
  persuade: [
    "Convince us to practice speaking daily",
    "Convince us to delete one app",
    "Convince us to call an old friend tonight",
    "Convince us to take a walk without a phone",
    "Convince us to learn something hard this year",
  ],
  fact: [
    "A fact about your work",
    "A number that matters in your life",
    "Something true about your city",
    "A fact about how you spend your time",
  ],
  toast: [
    "A toast at your best friend's wedding",
    "A toast for a colleague who's leaving",
    "A toast for your parent's birthday",
    "A toast to a mentor at their retirement",
    "A toast to your team after a hard year",
  ],
  leadership: [
    "Tell your team the plan changed and why",
    "Announce a hard decision you stand behind",
    "Rally a tired team for one more push",
    "Own a mistake in front of everyone",
    "Introduce yourself as the new leader",
  ],
  "signature-talk": [
    "The talk only you could give",
    "The idea you'd defend on any stage",
    "What you know now that you wish everyone knew",
  ],
};

export const PARAGRAPHS = [
  "Most people think practice means repetition. It doesn't. Repetition without feedback just makes you consistent at whatever you already do, good or bad. Real practice has three parts: you attempt something slightly beyond your level, you get quick, specific feedback, and you adjust before the next attempt. That loop, run daily, is what separates people who get better from people who just get older.",
  "A pause does three jobs at once. It gives the listener time to process what you just said. It signals that the next thing matters. And it gives you a breath, which means the next sentence starts on air instead of on a filler word. Speakers avoid pauses because silence feels long from the inside. From the outside, it reads as control.",
  "Stories work because the brain can't tell the difference between watching something and hearing it described well. When you say 'the door slams', the listener's motor cortex flinches. When you report 'there was a loud noise', nothing happens. The difference is not vocabulary. It is whether you are reliving the moment or summarizing it.",
  "Filler words are not a vocabulary problem. They are a timing problem. You say 'um' when your mouth is ready before your brain is. The fix is not to think faster. The fix is to close your mouth, breathe in, and let the thought finish. You cannot say 'um' while inhaling.",
];

export function randomPassage(exclude: string[] = []): Passage {
  const pool = PASSAGES.filter((p) => !exclude.includes(p.id));
  const src = pool.length ? pool : PASSAGES;
  return src[Math.floor(Math.random() * src.length)];
}
