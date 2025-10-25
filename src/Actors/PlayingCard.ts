import { Actor, Engine, vec, Vector } from "excalibur";
import {
  CardHandComponent,
  CardOptions,
  CardStatus,
  moveAndRotateCard,
  PlayingCardComponent,
  PlayingCardRankType,
  PlayingCardSuitType,
  TableStackComponent,
  TableZoneComponent,
} from "../Components/CardSystem";
import { Resources } from "../resources";
import { Signal } from "../Lib/Signals";
import { PlayingHand } from "./PlayingHand";
import { coroutineAction } from "../Lib/CoroutineAction";
import { LandingSpot } from "./PlayingTable";

class CardHighlight extends Actor {
  constructor() {
    super({
      pos: Vector.Zero,
      width: Resources.highlight.width,
      height: Resources.highlight.height,
    });
    this.graphics.use(Resources.highlight.toSprite());
  }

  show() {
    this.graphics.use(Resources.highlight.toSprite());
  }

  hide() {
    this.graphics.hide();
  }
}
export class PlayingCard extends Actor {
  pc: PlayingCardComponent;
  highlight: CardHighlight;
  highlightSignal: Signal = new Signal("highlight");

  constructor(pos: Vector, suit: PlayingCardSuitType, rank: PlayingCardRankType, config: CardOptions) {
    super({ pos, scale: vec(3, 3), anchor: vec(0.5, 0.5) });
    this.pc = new PlayingCardComponent({
      suit: suit,
      rank: rank,
      ...config,
    });
    this.addComponent(this.pc);
    this.highlight = new CardHighlight();
    this.addChild(this.highlight);
    this.highlight.hide();
  }

  onInitialize(): void {
    this.on("pointerup", evt => {
      //play this card into the stack in zone 2

      if (!this.scene) return;
      let hand = this.scene.engine.currentScene.entities.find(e => e.has(CardHandComponent));
      if (!hand) return;
      //validate this card
      if (this.pc.status === CardStatus.InHand && this.pc.isHovered && this.pc.isOwnedBy == hand.id) {
        //get zone 2
        let zone2 = this.scene.engine.currentScene.entities.find(e => e.has(TableZoneComponent) && e.name === "zone2");
        let stack = (zone2 as LandingSpot).getStack();
        let stackComponent = stack.get(TableStackComponent);
        let currentCardPosition = this.globalPos.clone();
        if (!zone2) return;
        (hand as PlayingHand).getHand().removeCard(this);
        this.pos = currentCardPosition;
        (hand as PlayingHand).scene!.add(this);
        this.z = 10000;
        stackComponent.setDestination(this);
        let stackPosition = stackComponent.getNextCardPosition().add((zone2 as LandingSpot).pos);

        this.actions
          .runAction(
            coroutineAction(moveAndRotateCard, {
              targetX: stackPosition.x - this.width / 2,
              targetY: stackPosition.y - this.height / 2,
              duration: 600,
              rotationSpeed: Math.PI,
            })
          )
          .toPromise()
          .then(() => {
            //add card to zone 2's stack
            stackComponent.addCard(this);
            this.rotation = 0;
            let drawnCardComponent = this.getCard();
            drawnCardComponent.status = CardStatus.InStack;
            drawnCardComponent.isOwnedBy = stack.id;
          });
      }
      evt.cancel();
    });

    this.highlightSignal.listen((evt: CustomEvent) => {
      const highlightId = evt.detail.params[0];
      if (this.id !== highlightId) this.highlight.hide();
    });
  }

  getCard(): PlayingCardComponent {
    return this.pc;
  }

  onPreUpdate(engine: Engine): void {
    let hand = engine.currentScene.entities.find(e => e.has(CardHandComponent));
    if (!hand) return;
    if (this.pc.status === CardStatus.InHand && this.pc.isHovered && this.pc.isOwnedBy == hand.id) {
      this.highlight.show();
      this.highlightSignal.send([this.id]);
    } else {
      this.highlight.hide();
    }
  }
}
