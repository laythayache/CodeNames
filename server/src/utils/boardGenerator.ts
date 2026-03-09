import { Card, CardType } from "shared/types";
import { WORDS } from "../words";
import {
  BOARD_SIZE,
  RED_CARD_COUNT,
  BLUE_CARD_COUNT,
  NEUTRAL_CARD_COUNT,
  ASSASSIN_CARD_COUNT,
} from "../config";

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateBoard(): Card[] {
  // Pick 25 random words
  const shuffledWords = shuffle(WORDS).slice(0, BOARD_SIZE);

  // Create card type assignments: 9 red, 8 blue, 7 neutral, 1 assassin
  const types: CardType[] = [
    ...Array(RED_CARD_COUNT).fill(CardType.RED),
    ...Array(BLUE_CARD_COUNT).fill(CardType.BLUE),
    ...Array(NEUTRAL_CARD_COUNT).fill(CardType.NEUTRAL),
    ...Array(ASSASSIN_CARD_COUNT).fill(CardType.ASSASSIN),
  ];
  const shuffledTypes = shuffle(types);

  return shuffledWords.map((word, i) => ({
    word,
    type: shuffledTypes[i],
    revealed: false,
    position: i,
    votes: [],
  }));
}
