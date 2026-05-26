<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Context

Faithbook is a Chinese-only board-game card draw web app. It is built with Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Framer Motion, and lucide-react.

Data comes from four Markdown files in the project root:

- `Faithbook_RealTalk_40_Cards_Details.md`
- `Faithbook_LifeEvent_60_Cards_Details.md`
- `Faithbook_CasualChat_60_Cards_Details.md`
- `Faithbook_Mission_30_Cards_Details.md`

The four deck-back images live in `public/card-backs/`:

- `real-talk-card.png` for 真心话
- `life-event-card.png` for 生活事件
- `casual-card.png` for 轻松聊天
- `mission-card.png` for 使命任务

Current UI state:

- Landing screen shows only four large 3:4 deck cards and the hidden-history button in the top-right.
- The page background is a white, colorful `FallingPattern` animation.
- Draws are random and may repeat.
- Draw history is stored in `localStorage` under `faithbook.drawHistory.v1`.
- Non-Mission revealed cards stay minimal: a 3:4 white card with only the centered question/body, a small card number in the top-right, and a floating close button outside the card.
- Life Event cards show A/B/C choice buttons below the card; choosing an option saves that choice into normal history and closes the card.
- Mission revealed cards use generated artwork from `public/mission-images/mission-XX.png`, show mission details from markdown, and include `完成` / `失败` buttons below the card.
- Failed Mission cards are stored separately in `localStorage` under `faithbook.failedMissions.v1` and shown as a bottom-right retry stack.

Implementation notes:

- Main interactive UI: `src/components/faithbook-draw-app.tsx`
- Markdown parsing and deck normalization: `src/lib/decks.ts`
- Falling background component: `src/components/ui/falling-pattern.tsx`
- Preserve the minimal revealed-card face for Real Talk, Casual Chat, and the Life Event scenario area unless the user explicitly asks to bring metadata/details back.
