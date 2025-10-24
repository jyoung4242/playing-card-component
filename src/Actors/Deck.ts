import { Actor, Engine, PointerButton, vec, Vector } from "excalibur";
import { cardBack, deckSS } from "../resources";
import {
  CardDeckComponent,
  CardHandComponent,
  CardStatus,
  moveAndFlipCard,
  PlayingCardRank,
  PlayingCardSuit,
  TableStackComponent,
  TableZoneComponent,
} from "../Components/CardSystem";
import { PlayingCard } from "./PlayingCard";
import { coroutineAction } from "../Lib/CoroutineAction";
import { PlayingHand } from "./PlayingHand";

export class PlayingDeck extends Actor {
  deckComponent: CardDeckComponent | null = null;

  latchLeftClick: boolean = false;
  latchRightClick: boolean = false;
  rightclickCount: number = 0;

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

    this.on("pointerup", evt => {
      if (!this.deckComponent) return;

      if (evt.button == PointerButton.Left) {
        if (this.latchLeftClick) return;
        this.latchLeftClick = true;
        //draw card from deck and place in hand
        let hand = engine.currentScene.entities.find(e => e.has(CardHandComponent));
        if (!hand) return;
        let handComponent = hand.get(CardHandComponent);
        if (!handComponent) return;
        if (handComponent.canTakeCard() === false) return;
        // get the top card from the deck and place it in the hand
        let cards = this.deckComponent.drawCards();
        if (!cards) return;

        let drawnCard = cards[0] as PlayingCard;
        handComponent.setDestination(drawnCard);

        // remove card from deck
        const topCardPosition = this.deckComponent.getTopCardPosition();
        drawnCard.pos = this.pos.add(topCardPosition);
        drawnCard.z = 10000;
        scene.add(drawnCard);

        let handScreenPosition = handComponent.getNextCardPosition();
        let nextPosition = vec(handScreenPosition.x, handScreenPosition.y).add((hand as PlayingHand).pos);

        drawnCard.actions
          .runAction(
            coroutineAction(moveAndFlipCard, {
              targetX: nextPosition.x - drawnCard.width / 2,
              targetY: nextPosition.y - drawnCard.height / 2,
              speed: 750,
              duration: 600,
            })
          )
          .toPromise()
          .then(() => {
            handComponent.addCard(drawnCard);
            drawnCard.pos = nextPosition.sub((hand as PlayingHand).pos);
            let drawnCardComponent = drawnCard.getCard();
            drawnCardComponent.status = CardStatus.InHand;
            drawnCardComponent.isOwnedBy = hand.id;
          });
        this.latchLeftClick = false;
      } else if (evt.button == PointerButton.Right) {
        this.rightclickCount++;
        if (this.latchRightClick) return;
        this.latchRightClick = true;
        let stack = engine.currentScene.entities.find(e => e.has(TableStackComponent));
        let zone = engine.currentScene.entities.find(e => e.has(TableZoneComponent)) as Actor;
        if (!stack) return;
        let stackComponent = stack.get(TableStackComponent);
        if (!stackComponent) return;
        if (stackComponent.canTakeCard() === false) return;
        if (!zone) return;
        let zoneComponent = zone.get(TableZoneComponent);
        if (!zoneComponent) return;
        let cards = this.deckComponent.drawCards();
        if (!cards) return;

        let drawnCard = cards[0] as PlayingCard;
        stackComponent.setDestination(drawnCard);

        // remove card from deck
        const topCardPosition = this.deckComponent.getTopCardPosition();
        drawnCard.pos = this.pos.add(topCardPosition);
        drawnCard.z = 10000;

        let stackPosition = stackComponent.getNextCardPosition();
        let nextPosition = vec(stackPosition.x, stackPosition.y).add(zone.pos);
        scene.add(drawnCard);
        drawnCard.actions
          .runAction(
            coroutineAction(moveAndFlipCard, {
              targetX: nextPosition.x - drawnCard.width / 2,
              targetY: nextPosition.y - drawnCard.height / 2,
              duration: 750,
            })
          )
          .toPromise()
          .then(() => {
            stackComponent.addCard(drawnCard);
            drawnCard.pos = nextPosition;
            let drawnCardComponent = drawnCard.getCard();
            drawnCardComponent.status = CardStatus.InStack;
            drawnCardComponent.isOwnedBy = stack.id;
          });
        this.latchRightClick = false;
      }
    });

    this.setDefaultDeck();
  }

  leftClickHandler() {}

  rightClickHandler() {}

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
