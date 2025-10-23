import { Actor, Engine, ScreenElement, vec, Vector } from "excalibur";
import { cardBack, deckSS } from "../resources";
import { CardDeckComponent, CardHandComponent, moveAndFlipCard, PlayingCardRank, PlayingCardSuit } from "../Components/CardSystem";
import { PlayingCard } from "./PlayingCard";
import { coroutineAction } from "../Lib/CoroutineAction";

export class PlayingDeck extends Actor {
  deckComponent: CardDeckComponent | null = null;

  constructor(pos: Vector) {
    super({ pos, scale: vec(3, 3) });
  }

  onInitialize(engine: Engine): void {
    const scene = engine.currentScene;

    this.deckComponent = new CardDeckComponent({
      cardBack,
      maxCards: 52,
      isTopCardShowing: true,
      deckSize: 25,
      cardThickness: 0.25,
      autoSizing: true,
      stackDirection: vec(2, 1),
    });
    this.addComponent(this.deckComponent);

    this.on("pointerup", () => {
      if (!this.deckComponent) return;
      //draw card from deck and place in hand
      let hand = engine.currentScene.entities.find(e => e.has(CardHandComponent));
      if (!hand) return;
      let handComponent = hand.get(CardHandComponent);
      if (!handComponent) return;

      // let nextCardPosition = handComponent.getNextCardPosition();
      // get the top card from the deck and place it in the hand
      let cards = this.deckComponent.drawCards();
      if (!cards) return;
      let drawnCard = cards[0] as PlayingCard;

      // remove card from deck
      const topCardPosition = this.deckComponent.getTopCardPosition();
      drawnCard.pos = this.pos.add(topCardPosition);
      drawnCard.z = this.z + 1;
      scene.add(drawnCard);

      let handScreenPosition = (hand as ScreenElement).pos.clone();
      // Convert duration (500ms) to speed
      // debugger;
      // let cardActions = new ParallelActions([
      //   new MoveTo(drawnCard, handScreenPosition.x - drawnCard.width / 2, handScreenPosition.y - drawnCard.height / 2, speed),
      //   new RotateTo(drawnCard, nextCardPosition.rotation, 500),
      //   new FlipCardAction(drawnCard.getCard(), drawnCard, 500),
      // ]);

      drawnCard.actions
        .runAction(
          coroutineAction(moveAndFlipCard, {
            targetX: handScreenPosition.x - drawnCard.width / 2,
            targetY: handScreenPosition.y - drawnCard.height / 2,
            speed: 750,
            duration: 600,
          })
        )
        .toPromise()
        .then(() => {
          handComponent.addCard(drawnCard);
        });

      // drawnCard.actions
      //   .runAction(cardActions)
      //   .toPromise()
      //   .then(() => {
      //     handComponent.addCard(drawnCard);
      //   });
    });

    this.setDefaultDeck();
  }

  getSuit(i: number): keyof typeof PlayingCardSuit {
    switch (i) {
      case 0:
        return "Hearts";
      case 1:
        return "Diamonds";
      case 2:
        return "Clubs";
      case 3:
        return "Spades";
      default:
        return "Spades";
    }
  }

  getRank(j: number): keyof typeof PlayingCardRank {
    switch (j) {
      case 0:
        return "Ace";
      case 1:
        return "Two";
      case 2:
        return "Three";
      case 3:
        return "Four";
      case 4:
        return "Five";
      case 5:
        return "Six";
      case 6:
        return "Seven";
      case 7:
        return "Eight";
      case 8:
        return "Nine";
      case 9:
        return "Ten";
      case 10:
        return "Jack";
      case 11:
        return "Queen";
      case 12:
        return "King";
      default:
        return "Ace";
    }
  }

  setDefaultDeck() {
    if (!this.deckComponent) return;
    let cards: PlayingCard[] = [];

    for (let i = 0; i <= 3; i++) {
      for (let j = 0; j <= 12; j++) {
        let cardFront = deckSS.getSprite(j, i);
        let card = new PlayingCard(vec(0, 0), PlayingCardSuit[this.getSuit(i)], PlayingCardRank[this.getRank(j)], {
          cardFace: cardFront.clone(),
          cardBack: cardBack,
          isFaceUp: false,
        });
        cards.push(card);
      }
    }
    if (!this.getDeck()) return;
    this.getDeck()!.addCards(cards);
    this.getDeck()!.shuffle(3);
  }

  getDeck() {
    return this.deckComponent;
  }
}
