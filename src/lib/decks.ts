import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  CardKind,
  Choice,
  Deck,
  DeckId,
  DeckTone,
  FaithbookCard,
  MissionDetails,
} from "@/lib/types";

type DeckConfig = {
  id: DeckId;
  title: string;
  subtitle: string;
  sourceFile: string;
  tone: DeckTone;
  kind: CardKind;
  primaryField: string;
  promptLabel: string;
};

const DECK_CONFIGS: DeckConfig[] = [
  {
    id: "real-talk",
    title: "真心话",
    subtitle: "真实感受与信仰反思",
    sourceFile: "Faithbook_RealTalk_40_Cards_Details.md",
    tone: "rose",
    kind: "question",
    primaryField: "Question / 问题",
    promptLabel: "问题",
  },
  {
    id: "life-event",
    title: "生活事件",
    subtitle: "日常情境与选择",
    sourceFile: "Faithbook_LifeEvent_60_Cards_Details.md",
    tone: "sky",
    kind: "life-event",
    primaryField: "Scenario / 情境",
    promptLabel: "情境",
  },
  {
    id: "casual-chat",
    title: "轻松聊天",
    subtitle: "自然破冰与连接",
    sourceFile: "Faithbook_CasualChat_60_Cards_Details.md",
    tone: "amber",
    kind: "question",
    primaryField: "Question / 问题",
    promptLabel: "问题",
  },
  {
    id: "mission",
    title: "使命任务",
    subtitle: "一起服侍与行动",
    sourceFile: "Faithbook_Mission_30_Cards_Details.md",
    tone: "emerald",
    kind: "mission",
    primaryField: "Mission Description / 任务描述",
    promptLabel: "任务",
  },
];

export async function getDecks(): Promise<Deck[]> {
  return Promise.all(
    DECK_CONFIGS.map(async (config) => {
      const source = await readFile(path.join(/* turbopackIgnore: true */ process.cwd(), config.sourceFile), "utf8");

      return {
        id: config.id,
        title: config.title,
        subtitle: config.subtitle,
        sourceFile: config.sourceFile,
        tone: config.tone,
        cards: parseCards(source, config),
      };
    }),
  );
}

function parseCards(source: string, config: DeckConfig): FaithbookCard[] {
  const headers = [...source.matchAll(/^## Card\s+(\d+)\s+—\s+(.+)$/gm)];

  return headers.map((header, index) => {
    const start = header.index ?? 0;
    const end = headers[index + 1]?.index ?? source.length;
    const block = source.slice(start, end);
    const number = Number(header[1]);
    const title = cleanTitle(header[2]);
    const body = getField(block, config.primaryField);
    const choices = config.kind === "life-event" ? parseChoices(getField(block, "Choices / 选择")) : undefined;
    const mission = config.kind === "mission" ? parseMission(block) : undefined;

    return {
      id: `${config.id}-${number}`,
      deckId: config.id,
      number,
      title,
      kind: config.kind,
      promptLabel: config.promptLabel,
      body,
      choices,
      mission,
      imageDescription: getField(block, "Image Description / 图像描述"),
      mood: getField(block, "Suggested Mood / 氛围"),
    };
  });
}

function parseMission(block: string): MissionDetails {
  return {
    participants: getField(block, "Participants / 参与人数"),
    requirement: getField(block, "Requirement / 需求"),
    specialRequirement: getField(block, "Special Requirement / 限制"),
    reward: getField(block, "Reward / 奖励"),
  };
}

function parseChoices(source: string): Choice[] {
  return source
    .split("\n")
    .map((line) => line.trim().match(/^([ABC])\.\s*(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      label: match[1] as Choice["label"],
      text: match[2].trim(),
    }));
}

function getField(block: string, label: string): string {
  const pattern = new RegExp(
    `\\*\\*${escapeRegExp(label)}\\s*[:：]\\*\\*\\s*\\n([\\s\\S]*?)(?=\\n\\*\\*[^\\n]+?[:：]\\*\\*|\\n---|$)`,
    "m",
  );
  const match = block.match(pattern);

  return cleanText(match?.[1] ?? "");
}

function cleanTitle(title: string): string {
  return title.trim().replace(/^《(.+)》$/, "$1");
}

function cleanText(text: string): string {
  return text
    .replace(/  \n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
