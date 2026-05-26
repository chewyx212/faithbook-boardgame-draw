export type DeckId = "real-talk" | "life-event" | "casual-chat" | "mission";

export type DeckTone = "rose" | "sky" | "amber" | "emerald";

export type CardKind = "question" | "life-event" | "mission";

export type Choice = {
  label: "A" | "B" | "C";
  text: string;
};

export type MissionDetails = {
  participants: string;
  requirement: string;
  specialRequirement: string;
  reward: string;
};

export type FaithbookCard = {
  id: string;
  deckId: DeckId;
  number: number;
  title: string;
  kind: CardKind;
  promptLabel: string;
  body: string;
  choices?: Choice[];
  mission?: MissionDetails;
  imageDescription?: string;
  mood?: string;
};

export type Deck = {
  id: DeckId;
  title: string;
  subtitle: string;
  sourceFile: string;
  tone: DeckTone;
  cards: FaithbookCard[];
};
