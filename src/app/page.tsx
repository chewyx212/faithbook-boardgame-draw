import { FaithbookDrawApp } from "@/components/faithbook-draw-app";
import { getDecks } from "@/lib/decks";

export default async function Home() {
  const decks = await getDecks();

  return <FaithbookDrawApp decks={decks} />;
}
