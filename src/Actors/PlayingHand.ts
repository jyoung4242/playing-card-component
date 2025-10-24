import { ScreenElement, Vector, Rectangle, Color, vec } from "excalibur";
import { CardHandComponent, CardHandOptions } from "../Components/CardSystem";

export class PlayingHand extends ScreenElement {
  border: Rectangle;

  pHComponent: CardHandComponent;
  constructor(pos: Vector, width: number, height: number, borderThickness: number) {
    super({ pos, width, height, anchor: vec(0.5, 0.5) });
    let config: CardHandOptions = { maxCards: 7, spread: "fan", maxCardspacing: -1, minCardspacing: -1 };
    this.border = new Rectangle({ width, height, strokeColor: Color.Blue, color: Color.Transparent, lineWidth: borderThickness });
    this.pHComponent = new CardHandComponent(config);
    this.addComponent(this.pHComponent);
    this.graphics.use(this.border);
  }

  getHand(): CardHandComponent {
    return this.pHComponent;
  }
}
