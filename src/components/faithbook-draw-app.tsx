"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  CalendarDays,
  Check,
  Flag,
  Heart,
  History,
  MessageCircle,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FallingPattern } from "@/components/ui/falling-pattern";
import { cn } from "@/lib/utils";
import type { Deck, DeckId, DeckTone, FaithbookCard } from "@/lib/types";

type HistoryEntry = {
  entryId: string;
  cardId: string;
  drawnAt: string;
  missionResult?: MissionResult;
};

type FailedMissionEntry = {
  entryId: string;
  cardId: string;
  drawnAt: string;
  failedAt: string;
};

type ActiveDraw = {
  entryId: string;
  card: FaithbookCard;
  drawnAt: string;
  source: "draw" | "history" | "failed";
};

type MissionResult = "completed" | "failed";

type ToneStyle = {
  deck: string;
  card: string;
  border: string;
  chip: string;
  icon: string;
  iconSoft: string;
  button: string;
  shadow: string;
  text: string;
};

const STORAGE_KEY = "faithbook.drawHistory.v1";
const FAILED_STORAGE_KEY = "faithbook.failedMissions.v1";
const MAX_HISTORY = 100;
const MAX_FAILED_MISSIONS = 100;

const deckIcons: Record<DeckId, LucideIcon> = {
  "real-talk": Heart,
  "life-event": CalendarDays,
  "casual-chat": MessageCircle,
  mission: Flag,
};

const deckBackImages: Record<DeckId, string> = {
  "real-talk": "/card-backs/real-talk-card.png",
  "life-event": "/card-backs/life-event-card.png",
  "casual-chat": "/card-backs/casual-card.png",
  mission: "/card-backs/mission-card.png",
};

const toneStyles: Record<DeckTone, ToneStyle> = {
  rose: {
    deck: "from-rose-100 via-pink-50 to-white",
    card: "from-rose-50 via-white to-pink-50",
    border: "border-rose-200/80",
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    icon: "bg-rose-500 text-white",
    iconSoft: "bg-rose-100 text-rose-700",
    button: "bg-rose-600 text-white hover:bg-rose-500",
    shadow: "shadow-[0_22px_55px_rgba(225,29,72,0.22)]",
    text: "text-rose-950",
  },
  sky: {
    deck: "from-sky-100 via-blue-50 to-white",
    card: "from-sky-50 via-white to-blue-50",
    border: "border-sky-200/80",
    chip: "border-sky-200 bg-sky-50 text-sky-700",
    icon: "bg-sky-500 text-white",
    iconSoft: "bg-sky-100 text-sky-700",
    button: "bg-sky-600 text-white hover:bg-sky-500",
    shadow: "shadow-[0_22px_55px_rgba(2,132,199,0.2)]",
    text: "text-sky-950",
  },
  amber: {
    deck: "from-amber-100 via-yellow-50 to-white",
    card: "from-amber-50 via-white to-yellow-50",
    border: "border-amber-200/90",
    chip: "border-amber-200 bg-amber-50 text-amber-800",
    icon: "bg-amber-500 text-white",
    iconSoft: "bg-amber-100 text-amber-800",
    button: "bg-amber-500 text-stone-950 hover:bg-amber-400",
    shadow: "shadow-[0_22px_55px_rgba(217,119,6,0.2)]",
    text: "text-stone-950",
  },
  emerald: {
    deck: "from-emerald-100 via-green-50 to-white",
    card: "from-emerald-50 via-white to-green-50",
    border: "border-emerald-200/80",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: "bg-emerald-600 text-white",
    iconSoft: "bg-emerald-100 text-emerald-800",
    button: "bg-emerald-600 text-white hover:bg-emerald-500",
    shadow: "shadow-[0_22px_55px_rgba(5,150,105,0.2)]",
    text: "text-emerald-950",
  },
};

export function FaithbookDrawApp({ decks }: { decks: Deck[] }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [failedMissions, setFailedMissions] = useState<FailedMissionEntry[]>([]);
  const historyReady = useRef(false);
  const failedMissionsReady = useRef(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [failedOpen, setFailedOpen] = useState(false);
  const [activeDraw, setActiveDraw] = useState<ActiveDraw | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const cardMap = useMemo(() => {
    return new Map(decks.flatMap((deck) => deck.cards.map((card) => [card.id, card] as const)));
  }, [decks]);

  const resolvedHistory = useMemo(() => {
    return history
      .map((entry) => ({
        ...entry,
        card: cardMap.get(entry.cardId),
      }))
      .filter((entry): entry is HistoryEntry & { card: FaithbookCard } => Boolean(entry.card));
  }, [cardMap, history]);

  const resolvedFailedMissions = useMemo(() => {
    return failedMissions
      .map((entry) => ({
        ...entry,
        card: cardMap.get(entry.cardId),
      }))
      .filter((entry): entry is FailedMissionEntry & { card: FaithbookCard } => Boolean(entry.card));
  }, [cardMap, failedMissions]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        historyReady.current = true;
        return;
      }

      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed.filter(isHistoryEntry).slice(0, MAX_HISTORY));
        }
      } catch {
        setHistory([]);
      } finally {
        historyReady.current = true;
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!historyReady.current) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(FAILED_STORAGE_KEY);

      if (!stored) {
        failedMissionsReady.current = true;
        return;
      }

      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFailedMissions(parsed.filter(isFailedMissionEntry).slice(0, MAX_FAILED_MISSIONS));
        }
      } catch {
        setFailedMissions([]);
      } finally {
        failedMissionsReady.current = true;
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!failedMissionsReady.current) {
      return;
    }

    window.localStorage.setItem(FAILED_STORAGE_KEY, JSON.stringify(failedMissions));
  }, [failedMissions]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (activeDraw) {
        setActiveDraw(null);
      } else if (failedOpen) {
        setFailedOpen(false);
      } else if (historyOpen) {
        setHistoryOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeDraw, failedOpen, historyOpen]);

  const drawCard = (deck: Deck) => {
    if (deck.cards.length === 0) {
      return;
    }

    const card = deck.cards[Math.floor(Math.random() * deck.cards.length)];
    const drawnAt = new Date().toISOString();
    const entry: HistoryEntry = {
      entryId: createEntryId(),
      cardId: card.id,
      drawnAt,
    };

    if (card.kind !== "mission") {
      setHistory((current) => [entry, ...current].slice(0, MAX_HISTORY));
    }

    setActiveDraw({ ...entry, card, source: "draw" });
  };

  const openHistoryCard = (entry: HistoryEntry & { card: FaithbookCard }) => {
    setActiveDraw({
      entryId: entry.entryId,
      card: entry.card,
      drawnAt: entry.drawnAt,
      source: "history",
    });
    setHistoryOpen(false);
  };

  const openFailedMission = (entry: FailedMissionEntry & { card: FaithbookCard }) => {
    setActiveDraw({
      entryId: entry.entryId,
      card: entry.card,
      drawnAt: entry.drawnAt,
      source: "failed",
    });
    setFailedOpen(false);
  };

  const completeMission = () => {
    if (!activeDraw || activeDraw.card.kind !== "mission") {
      return;
    }

    const completedAt = activeDraw.source === "history" ? activeDraw.drawnAt : new Date().toISOString();
    const entry: HistoryEntry = {
      entryId: activeDraw.source === "history" ? activeDraw.entryId : createEntryId(),
      cardId: activeDraw.card.id,
      drawnAt: completedAt,
      missionResult: "completed",
    };

    if (activeDraw.source === "history") {
      setHistory((current) =>
        current.map((item) => (item.entryId === activeDraw.entryId ? { ...item, missionResult: "completed" } : item)),
      );
    } else {
      setHistory((current) => [entry, ...current].slice(0, MAX_HISTORY));
    }

    if (activeDraw.source === "failed") {
      setFailedMissions((current) => current.filter((item) => item.entryId !== activeDraw.entryId));
    }

    setActiveDraw(null);
  };

  const failMission = () => {
    if (!activeDraw || activeDraw.card.kind !== "mission") {
      return;
    }

    const failedAt = new Date().toISOString();
    const entry: FailedMissionEntry = {
      entryId: activeDraw.source === "failed" || activeDraw.source === "history" ? activeDraw.entryId : createEntryId(),
      cardId: activeDraw.card.id,
      drawnAt: activeDraw.drawnAt,
      failedAt,
    };

    if (activeDraw.source === "history") {
      setHistory((current) => current.filter((item) => item.entryId !== activeDraw.entryId));
    }

    if (activeDraw.source === "failed") {
      setFailedMissions((current) =>
        current.map((item) => (item.entryId === activeDraw.entryId ? { ...item, failedAt } : item)),
      );
    } else {
      setFailedMissions((current) => [entry, ...current].slice(0, MAX_FAILED_MISSIONS));
    }

    setActiveDraw(null);
  };

  return (
    <main className="relative min-h-svh overflow-hidden bg-white text-stone-950">
      <div className="absolute inset-0">
        <FallingPattern
          className="h-full [mask-image:radial-gradient(ellipse_at_center,transparent,var(--background))]"
          color={["#ef4444", "#2563eb", "#f59e0b", "#16a34a", "#8b5cf6", "#06b6d4"]}
          backgroundColor="#ffffff"
          duration={74}
          blurIntensity="0.14rem"
          density={1.45}
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.22)_58%,rgba(255,255,255,0.7))]" />

      <button
        type="button"
        onClick={() => setHistoryOpen(true)}
        className="fixed right-4 top-4 z-30 inline-flex size-12 items-center justify-center rounded-full border border-white/75 bg-white/80 text-stone-900 shadow-lg shadow-emerald-950/10 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:right-6 sm:top-6"
        aria-label="打开历史记录"
        title="历史记录"
      >
        <History className="size-5" aria-hidden="true" />
        {history.length > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white">
            {Math.min(history.length, 99)}
          </span>
        ) : null}
      </button>

      <section className="relative z-10 mx-auto grid min-h-svh w-full max-w-[1500px] place-items-center px-5 pb-10 pt-20 sm:px-8 sm:py-10 lg:px-10">
        <div className="w-full">
          <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {decks.map((deck, index) => (
              <DeckButton key={deck.id} deck={deck} index={index} onDraw={drawCard} reducedMotion={Boolean(shouldReduceMotion)} />
            ))}
          </div>
        </div>
      </section>

      <HistoryDrawer
        open={historyOpen}
        entries={resolvedHistory}
        onClose={() => setHistoryOpen(false)}
        onOpenCard={openHistoryCard}
        onClear={() => setHistory([])}
        reducedMotion={Boolean(shouldReduceMotion)}
      />

      <FailedMissionStack
        open={failedOpen}
        entries={resolvedFailedMissions}
        onToggle={() => setFailedOpen((current) => !current)}
        onClose={() => setFailedOpen(false)}
        onOpenCard={openFailedMission}
        reducedMotion={Boolean(shouldReduceMotion)}
      />

      <DrawDialog
        activeDraw={activeDraw}
        onClose={() => setActiveDraw(null)}
        onMissionComplete={completeMission}
        onMissionFail={failMission}
        reducedMotion={Boolean(shouldReduceMotion)}
      />
    </main>
  );
}

function DeckButton({
  deck,
  index,
  onDraw,
  reducedMotion,
}: {
  deck: Deck;
  index: number;
  onDraw: (deck: Deck) => void;
  reducedMotion: boolean;
}) {
  const tone = toneStyles[deck.tone];

  return (
    <motion.button
      type="button"
      onClick={() => onDraw(deck)}
      initial={reducedMotion ? false : { opacity: 0, y: 28 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.42, ease: "easeOut" }}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      className={cn(
        "relative aspect-[3/4] w-full overflow-hidden rounded-[28px] border bg-white text-center transition focus:outline-none focus:ring-2 focus:ring-emerald-600",
        tone.border,
        tone.shadow,
      )}
      aria-label={`抽一张${deck.title}卡`}
    >
      <Image
        src={deckBackImages[deck.id]}
        alt=""
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover"
        priority={index < 2}
      />
      <span className="sr-only">{deck.title}</span>
    </motion.button>
  );
}

function DrawDialog({
  activeDraw,
  onClose,
  onMissionComplete,
  onMissionFail,
  reducedMotion,
}: {
  activeDraw: ActiveDraw | null;
  onClose: () => void;
  onMissionComplete: () => void;
  onMissionFail: () => void;
  reducedMotion: boolean;
}) {
  return (
    <AnimatePresence>
      {activeDraw ? (
        <motion.div
          className="fixed inset-0 z-40 grid place-items-center bg-stone-950/42 px-4 py-6 backdrop-blur-sm"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="抽到的卡"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={onClose}
            aria-label="关闭卡片"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-full bg-white text-stone-800 shadow-xl shadow-stone-950/20 transition hover:-translate-y-0.5 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-white/80 sm:right-6 sm:top-6"
            aria-label="关闭"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <div className="relative z-10 flex w-[min(78vw,390px)] flex-col items-center gap-4 [perspective:1400px] sm:w-[min(58vw,420px)]">
            <motion.div
              key={activeDraw.entryId}
              className="relative aspect-[3/4] w-full"
              initial={{ rotateY: reducedMotion ? 180 : 0 }}
              animate={{ rotateY: 180 }}
              transition={{ duration: reducedMotion ? 0 : 0.62, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <CardBack card={activeDraw.card} />
              <CardFront card={activeDraw.card} />
            </motion.div>
            {activeDraw.card.kind === "mission" ? (
              <div className="grid w-full grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onMissionFail}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-rose-200 bg-white/92 px-5 text-base font-black text-rose-700 shadow-lg shadow-stone-950/10 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300"
                >
                  <X className="size-5" aria-hidden="true" />
                  失败
                </button>
                <button
                  type="button"
                  onClick={onMissionComplete}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-base font-black text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <Check className="size-5" aria-hidden="true" />
                  完成
                </button>
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function CardBack({ card }: { card: FaithbookCard }) {
  const tone = toneStyles[getCardTone(card.deckId)];

  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden rounded-[30px] border bg-white",
        tone.border,
        tone.shadow,
      )}
      style={{ backfaceVisibility: "hidden" }}
      aria-hidden="true"
    >
      <Image
        src={deckBackImages[card.deckId]}
        alt=""
        fill
        sizes="min(100vw, 440px)"
        className="object-cover"
        priority
      />
      <span className="absolute right-6 top-6 rounded-full bg-white/88 px-3 py-1 text-sm font-black text-stone-900 shadow-md shadow-stone-950/15">
        {formatCardNumber(card.number)}
      </span>
    </div>
  );
}

function CardFront({ card }: { card: FaithbookCard }) {
  const tone = toneStyles[getCardTone(card.deckId)];

  if (card.kind === "mission" && card.mission) {
    return <MissionCardFront card={card} tone={tone} />;
  }

  return (
    <article
      className={cn(
        "absolute inset-0 grid place-items-center overflow-hidden rounded-[30px] border bg-white p-10",
        tone.border,
        tone.shadow,
      )}
      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
    >
      <span className="absolute right-6 top-6 text-sm font-black text-stone-400" aria-label={`卡号 ${formatCardNumber(card.number)}`}>
        {formatCardNumber(card.number)}
      </span>
      <p className="max-h-full overflow-y-auto whitespace-pre-line text-center text-[clamp(1.8rem,5vw,2.6rem)] font-black leading-snug tracking-normal text-stone-950">
        {card.body}
      </p>
    </article>
  );
}

function MissionCardFront({ card, tone }: { card: FaithbookCard; tone: ToneStyle }) {
  const mission = card.mission;

  if (!mission) {
    return null;
  }

  const hasSpecialRequirement = mission.specialRequirement && mission.specialRequirement !== "无";

  return (
    <article
      className={cn(
        "absolute inset-0 flex flex-col overflow-hidden rounded-[30px] border bg-[#fffdf8] p-4",
        tone.border,
        tone.shadow,
      )}
      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
    >
      <span className="absolute right-5 top-5 z-10 text-sm font-black text-stone-400" aria-label={`卡号 ${formatCardNumber(card.number)}`}>
        {formatCardNumber(card.number)}
      </span>

      <div className="relative mt-3 h-[41%] w-full shrink-0 overflow-hidden rounded-[22px] bg-emerald-50">
        <Image
          src={getMissionImageSrc(card.number)}
          alt=""
          fill
          sizes="min(100vw, 420px)"
          className="object-cover"
          priority
        />
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <h2 className="text-[1.45rem] font-black leading-tight tracking-normal text-stone-950">{card.title}</h2>
        <p className="mt-1.5 whitespace-pre-line text-sm font-bold leading-5 text-stone-700">{card.body}</p>

        <dl className="mt-2.5 space-y-1.5">
          <MissionInfo label="参与" value={mission.participants} />
          <MissionInfo label="需求" value={mission.requirement} />
          {hasSpecialRequirement ? <MissionInfo label="限制" value={mission.specialRequirement} tone="warn" /> : null}
          <MissionInfo label="奖励" value={mission.reward} tone="reward" />
        </dl>
      </div>
    </article>
  );
}

function MissionInfo({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "reward" | "warn";
}) {
  const toneClass = {
    default: "border-emerald-100 bg-emerald-50/80 text-emerald-950",
    reward: "border-amber-100 bg-amber-50/90 text-amber-950",
    warn: "border-rose-100 bg-rose-50/90 text-rose-950",
  }[tone];

  return (
    <div className={cn("grid grid-cols-[3rem_1fr] gap-2 rounded-2xl border px-3 py-1.5 text-sm leading-5", toneClass)}>
      <dt className="font-black">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

function FailedMissionStack({
  open,
  entries,
  onToggle,
  onClose,
  onOpenCard,
  reducedMotion,
}: {
  open: boolean;
  entries: Array<FailedMissionEntry & { card: FaithbookCard }>;
  onToggle: () => void;
  onClose: () => void;
  onOpenCard: (entry: FailedMissionEntry & { card: FaithbookCard }) => void;
  reducedMotion: boolean;
}) {
  if (entries.length === 0) {
    return null;
  }

  const previewEntries = entries.slice(0, 3);

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-30 flex items-end gap-2 rounded-[26px] border border-white/80 bg-white/86 px-3 py-3 text-left shadow-xl shadow-stone-950/15 backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 sm:bottom-6 sm:right-6"
        aria-label="打开失败任务"
      >
        <span className="relative h-[66px] w-[58px]" aria-hidden="true">
          {previewEntries.map((entry, index) => (
            <span
              key={entry.entryId}
              className="absolute bottom-0 block aspect-[3/4] w-10 overflow-hidden rounded-xl border border-white bg-white shadow-md shadow-stone-950/15"
              style={{
                right: `${index * 8}px`,
                transform: `rotate(${(index - 1) * -5}deg)`,
              }}
            >
              <Image src={deckBackImages.mission} alt="" fill sizes="40px" className="object-cover" />
            </span>
          ))}
          <span className="absolute -right-1 -top-1 grid min-w-6 place-items-center rounded-full bg-rose-600 px-1.5 text-xs font-black text-white">
            {Math.min(entries.length, 99)}
          </span>
        </span>
        <span className="pb-1">
          <span className="block text-sm font-black text-stone-950">失败任务</span>
          <span className="block text-xs font-bold text-stone-500">点击重试</span>
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.aside
            className="fixed bottom-28 right-4 z-40 flex max-h-[48svh] w-[min(88vw,320px)] flex-col rounded-[28px] border border-white/80 bg-white/94 p-4 shadow-2xl shadow-stone-950/18 backdrop-blur-xl sm:right-6"
            initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            aria-label="失败任务列表"
          >
            <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-3">
              <div>
                <p className="text-xs font-black text-rose-600">失败任务</p>
                <h2 className="text-lg font-black tracking-normal text-stone-950">等待重试</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid size-9 place-items-center rounded-full border border-stone-200 bg-white text-stone-700 transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-rose-300"
                aria-label="关闭失败任务"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-3 min-h-0 space-y-2 overflow-y-auto pr-1">
              {entries.map((entry) => (
                <button
                  key={entry.entryId}
                  type="button"
                  onClick={() => onOpenCard(entry)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white/76 p-2 text-left shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                >
                  <span className="relative aspect-[3/4] w-10 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
                    <Image src={getMissionImageSrc(entry.card.number)} alt="" fill sizes="40px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-black text-stone-950">{entry.card.title}</span>
                      <span className="shrink-0 text-xs font-black text-stone-400">{formatCardNumber(entry.card.number)}</span>
                    </span>
                    <span className="mt-0.5 block text-xs font-bold text-stone-500">{formatDate(entry.failedAt)}</span>
                  </span>
                </button>
              ))}
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function HistoryDrawer({
  open,
  entries,
  onClose,
  onOpenCard,
  onClear,
  reducedMotion,
}: {
  open: boolean;
  entries: Array<HistoryEntry & { card: FaithbookCard }>;
  onClose: () => void;
  onOpenCard: (entry: HistoryEntry & { card: FaithbookCard }) => void;
  onClear: () => void;
  reducedMotion: boolean;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="关闭历史记录"
            className="fixed inset-0 z-40 bg-stone-950/20 backdrop-blur-[2px]"
            onClick={onClose}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
          />
          <motion.aside
            className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col border-l border-white/70 bg-[#fbfff7]/95 p-5 shadow-2xl shadow-stone-950/20 backdrop-blur-xl"
            initial={reducedMotion ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reducedMotion ? undefined : { x: "100%" }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            aria-label="历史记录"
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-4">
              <div>
                <p className="text-sm font-bold text-emerald-700">历史记录</p>
                <h2 className="mt-1 text-2xl font-black tracking-normal text-stone-950">已抽到的卡</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid size-10 place-items-center rounded-full border border-stone-200 bg-white text-stone-700 transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="关闭历史记录"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="font-bold text-stone-600">{entries.length} 张</span>
              {entries.length > 0 ? (
                <button
                  type="button"
                  onClick={onClear}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-2 font-bold text-stone-500 transition hover:bg-white hover:text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  清空
                </button>
              ) : null}
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
              {entries.length === 0 ? (
                <div className="grid h-full place-items-center rounded-3xl border border-dashed border-stone-300 bg-white/55 px-8 text-center">
                  <div>
                    <History className="mx-auto size-8 text-stone-400" aria-hidden="true" />
                    <p className="mt-4 text-lg font-black text-stone-800">还没有抽卡记录</p>
                    <p className="mt-2 text-sm leading-6 text-stone-500">抽一张卡后，这里会保存本机历史。</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry) => {
                    const tone = toneStyles[getCardTone(entry.card.deckId)];
                    const DeckIcon = deckIcons[entry.card.deckId];

                    return (
                      <button
                        key={entry.entryId}
                        type="button"
                        onClick={() => onOpenCard(entry)}
                        className="group flex w-full items-start gap-3 rounded-3xl border border-stone-200 bg-white/70 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <span className={cn("mt-1 grid size-10 shrink-0 place-items-center rounded-full", tone.icon)}>
                          <DeckIcon className="size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-black text-stone-950">{entry.card.title}</span>
                            <span className="flex shrink-0 items-center gap-2">
                              {entry.card.kind === "mission" ? (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700">
                                  完成
                                </span>
                              ) : null}
                              <span className="text-xs font-bold text-stone-400">{String(entry.card.number).padStart(2, "0")}</span>
                            </span>
                          </span>
                          <span className="mt-1 block text-xs font-bold text-stone-500">
                            {getDeckTitle(entry.card.deckId)} · {formatDate(entry.drawnAt)}
                          </span>
                          <span className="mt-2 line-clamp-2 block text-sm leading-6 text-stone-600">{entry.card.body}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function getCardTone(deckId: DeckId): DeckTone {
  const tones: Record<DeckId, DeckTone> = {
    "real-talk": "rose",
    "life-event": "sky",
    "casual-chat": "amber",
    mission: "emerald",
  };

  return tones[deckId];
}

function getDeckTitle(deckId: DeckId): string {
  const titles: Record<DeckId, string> = {
    "real-talk": "真心话",
    "life-event": "生活事件",
    "casual-chat": "轻松聊天",
    mission: "使命任务",
  };

  return titles[deckId];
}

function getMissionImageSrc(number: number): string {
  return `/mission-images/mission-${formatCardNumber(number)}.png`;
}

function formatCardNumber(number: number): string {
  return String(number).padStart(2, "0");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function createEntryId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<HistoryEntry>;
  const missionResult = candidate.missionResult;

  return (
    typeof candidate.entryId === "string" &&
    typeof candidate.cardId === "string" &&
    typeof candidate.drawnAt === "string" &&
    (missionResult === undefined || missionResult === "completed" || missionResult === "failed")
  );
}

function isFailedMissionEntry(value: unknown): value is FailedMissionEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FailedMissionEntry>;
  return (
    typeof candidate.entryId === "string" &&
    typeof candidate.cardId === "string" &&
    typeof candidate.drawnAt === "string" &&
    typeof candidate.failedAt === "string"
  );
}
