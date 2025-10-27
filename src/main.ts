// main.ts
import "./style.css";

import { UI } from "@peasy-lib/peasy-ui";
import { Engine, DisplayMode, vec, Color } from "excalibur";
import { model, template } from "./UI/UI";
import { loader, Resources } from "./resources";
import { PlayingDeck } from "./Actors/Deck";
import { LandingSpot, PlayingTable } from "./Actors/PlayingTable";
import { PlayingHand } from "./Actors/PlayingHand";

await UI.create(document.body, model, template).attached;

export const game = new Engine({
  width: 800, // the width of the canvas
  height: 600, // the height of the canvas
  canvasElementId: "cnv", // the DOM canvas element ID, if you are providing your own
  displayMode: DisplayMode.Fixed, // the display mode
  pixelArt: true,
  backgroundColor: Color.White,
  suppressPlayButton: true,
});

await game.start(loader);

let deck = new PlayingDeck(vec(150, 100));

let zone1 = new LandingSpot("zone1", vec(350, 100), vec(120, 180), Resources.zone.toSprite());
let zone2 = new LandingSpot("zone2", vec(500, 100), vec(120, 180), Resources.zone.toSprite());
let zone3 = new LandingSpot("zone3", vec(650, 100), vec(120, 180), Resources.zone.toSprite());
let hand = new PlayingHand(vec(400, 500), 600, 200, 4);
let table = new PlayingTable();

table.getTable().addZone("zone1", zone1);
table.getTable().addZone("zone2", zone2);
table.getTable().addZone("zone3", zone3);

game.add(deck);
game.add(table);
game.add(hand);
