// resources.ts
import { ImageSource, Loader, SpriteSheet, vec } from "excalibur";
import deck from "./Assets/deck.png"; // replace this
import zone from "./Assets/landingspot.png";
import highlight from "./Assets/cardHighlight.png";

export const Resources = {
  deck: new ImageSource(deck),
  zone: new ImageSource(zone),
  highlight: new ImageSource(highlight),
};

export const loader = new Loader();

export const deckSS = SpriteSheet.fromImageSource({
  image: Resources.deck,
  grid: {
    rows: 4,
    columns: 14,
    spriteHeight: 60,
    spriteWidth: 42,
  },
  spacing: {
    originOffset: vec(11, 2),
    margin: vec(22, 4),
  },
});

export const cardBack = deckSS.getSprite(13, 1);

for (let res of Object.values(Resources)) {
  loader.addResource(res);
}
