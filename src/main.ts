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

const game = new Engine({
  width: 800, // the width of the canvas
  height: 600, // the height of the canvas
  canvasElementId: "cnv", // the DOM canvas element ID, if you are providing your own
  displayMode: DisplayMode.Fixed, // the display mode
  pixelArt: true,
  backgroundColor: Color.White,
});

await game.start(loader);

let deck = new PlayingDeck(vec(300, 100));

let zone1 = new LandingSpot(vec(500, 300), vec(40, 60), Resources.zone.toSprite());
let hand = new PlayingHand(vec(400, 500), 600, 200, 4);
let table = new PlayingTable();
table.getTable().addZone("zone1", zone1.getZone());

game.add(deck);
game.add(table);
game.add(hand);
