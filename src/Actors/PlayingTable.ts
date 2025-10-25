import { Color, ScreenElement, Sprite, vec, Vector } from "excalibur";
import { TableComponent, TableStackComponent, TableZoneComponent } from "../Components/CardSystem";

export class PlayingTable extends ScreenElement {
  tableComponent: TableComponent;
  constructor() {
    super({ pos: vec(0, 0), width: 800, height: 600, color: Color.fromHex("#008651"), z: -1 });
    this.tableComponent = new TableComponent();
    this.addComponent(this.tableComponent);
  }

  getTable(): TableComponent {
    return this.tableComponent;
  }
}

export class LandingSpot extends ScreenElement {
  stack;
  zoneComponent: TableZoneComponent;
  constructor(name: string, pos: Vector, size: Vector, Image: Sprite) {
    super({ name, pos, width: size.x, height: size.y, z: 0, anchor: vec(0.5, 0.5) });
    this.zoneComponent = new TableZoneComponent(size, Image);
    this.addComponent(this.zoneComponent);

    this.stack = new CardStack();
    this.addChild(this.stack);
  }

  getZone(): TableZoneComponent {
    return this.zoneComponent;
  }

  getStack(): CardStack {
    return this.stack;
  }
}

export class CardStack extends ScreenElement {
  stackComponent: TableStackComponent;
  constructor() {
    super({ pos: vec(0, 0), width: 120, height: 180, z: 1 });
    this.stackComponent = new TableStackComponent({
      offset: vec(0, 40),
      topCardOnly: false,
      maxVisible: 5,
    });
    this.addComponent(this.stackComponent);
  }
}
