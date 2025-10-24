import { Actor, Engine, vec, Vector } from "excalibur";
import { CardOptions, PlayingCardComponent, PlayingCardRankType, PlayingCardSuitType } from "../Components/CardSystem";
import { Resources } from "../resources";

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
  // highlight: CardHighlight;

  constructor(pos: Vector, suit: PlayingCardSuitType, rank: PlayingCardRankType, config: CardOptions) {
    super({ pos, scale: vec(3, 3), anchor: vec(0.5, 0.5) });
    this.pc = new PlayingCardComponent({
      suit: suit,
      rank: rank,
      ...config,
    });
    this.addComponent(this.pc);
    // this.highlight = new CardHighlight();
    // this.addChild(this.highlight);
    //this.highlight.hide();
  }

  onInitialize(engine: Engine): void {
    this.on("pointerup", () => {
      this.getCard().flip(750);
    });
  }

  getCard(): PlayingCardComponent {
    return this.pc;
  }
}
