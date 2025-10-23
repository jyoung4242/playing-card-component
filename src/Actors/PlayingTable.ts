import { Color, ScreenElement, Sprite, vec, Vector } from "excalibur";
import { TableComponent, TableZoneComponent, ZoneMode } from "../Components/CardSystem";

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
  zoneComponent: TableZoneComponent;
  constructor(pos: Vector, size: Vector, Image: Sprite) {
    super({ pos, width: size.x, height: size.y, z: 0, scale: vec(3, 3), anchor: vec(0.5, 0.5) });
    this.zoneComponent = new TableZoneComponent(size, ZoneMode.Card, Image);
    this.addComponent(this.zoneComponent);
  }

  getZone(): TableZoneComponent {
    return this.zoneComponent;
  }
}
