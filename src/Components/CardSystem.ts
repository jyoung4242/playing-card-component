import {
  Actor,
  Component,
  Entity,
  Sprite,
  ScreenElement,
  Vector,
  lerp,
  PreUpdateEvent,
  Graphic,
  ExcaliburGraphicsContext,
  vec,
  Random,
  clamp,
  PointerAbstraction,
  lerpVector,
} from "excalibur";
import { coroutineAction } from "../Lib/CoroutineAction";

/*
 * Type Definitions
 */
//#region typdefs

export const CardResultStatus = {
  Success: "Success",
  Error: "Error",
} as const;
export type CardResultStatusType = (typeof CardResultStatus)[keyof typeof CardResultStatus];

export type CardResult =
  | {
      status: typeof CardResultStatus.Success;
      value: any;
    }
  | {
      status: typeof CardResultStatus.Error;
      message: string;
    };

export const CardStatus = {
  InDeck: "InDeck", // resides in Deck
  InHand: "InHand", // resides in Hand
  InPlay: "InPlay", // resides nowhere
  InZone: "InZone", // resides in Zone
  InStack: "InStack", // resides in Stack
} as const;
export type CardStatusType = (typeof CardStatus)[keyof typeof CardStatus];

export const ZoneMode = {
  Stack: "Stack",
  Card: "Card",
} as const;
export type ZoneModeType = (typeof ZoneMode)[keyof typeof ZoneMode];

export interface CardOptions {
  cardFace: Sprite;
  cardBack: Sprite;
  isFaceUp?: boolean;
  data?: any;
}

export interface CardDeckOptions {
  cardBack: Sprite;
  maxCards?: number;
  isTopCardShowing?: boolean;
  deckSize?: number;
  cardThickness?: number;
  autoSizing?: boolean;
  stackDirection?: Vector;
  maxShuffles?: number;
}

export interface CardHandOptions {
  maxCards?: number;
  spread: "flat" | "fan";
  maxCardspacing?: number;
  minCardspacing?: number;
  fanAngle?: number;
  fanRadius?: number;
}

export interface TableStackOptions {
  offset?: Vector;
  maxVisible?: number;
  topCardOnly?: boolean;
  maxCardCount?: number;
}

export interface PlayingCardOptions extends CardOptions {
  suit: PlayingCardSuitType;
  rank: PlayingCardRankType;
}

export const PlayingCardSuit = {
  Hearts: 0,
  Diamonds: 1,
  Clubs: 2,
  Spades: 3,
} as const;
export type PlayingCardSuitType = (typeof PlayingCardSuit)[keyof typeof PlayingCardSuit];

export const PlayingCardRank = {
  Ace: 0,
  Two: 1,
  Three: 2,
  Four: 3,
  Five: 4,
  Six: 5,
  Seven: 6,
  Eight: 7,
  Nine: 8,
  Ten: 9,
  Jack: 10,
  Queen: 11,
  King: 12,
  Joker: 13,
} as const;
export type PlayingCardRankType = (typeof PlayingCardRank)[keyof typeof PlayingCardRank];

// #endregion typdefs

/*
 * Card Components
 */
//#region Card Component
export class CardComponent extends Component {
  protected _isFaceUp = false;
  protected _status: CardStatusType = CardStatus.InDeck;
  protected _cardFace: Sprite;
  protected _cardBack: Sprite;
  protected _data: any;
  protected _isHovered = false;
  protected _isOwned = false;
  protected _isOwnedBy: number | null = null;
  protected pointerReference: any;

  constructor(config: CardOptions) {
    super();
    this._cardFace = config.cardFace;
    this._cardBack = config.cardBack;
    this._isFaceUp = config.isFaceUp ? config.isFaceUp : false;
    this._data = config.data;
  }

  get data() {
    return this._data;
  }

  set data(value: any) {
    this._data = value;
  }

  onAdd(owner: Entity): void {
    let card = qualifyEntity(owner);
    if (!card) return;

    card.graphics.add("cardFace", this._cardFace.clone());
    card.graphics.add("cardBack", this._cardBack.clone());

    if (this._isFaceUp) card.graphics.use("cardFace");
    else card.graphics.use("cardBack");
    owner.on("preupdate", this.update.bind(this));
  }

  onRemove(previousOwner: Entity): void {
    let card = qualifyEntity(previousOwner);
    if (!card) return;
    card.off("preupdate", this.update.bind(this));
  }

  update(): void {
    if (!this.pointerReference) this.pointerReference = this.owner!.scene!.engine.input.pointers.primary;
    let bounds = (this.owner as Actor).graphics.bounds;
    this._isHovered = bounds.contains((this.pointerReference as PointerAbstraction).lastWorldPos);
  }

  get isFaceUp() {
    return this._isFaceUp;
  }
  set isFaceUp(value: boolean) {
    this._isFaceUp = value;
  }

  get status() {
    return this._status;
  }
  set status(value: CardStatusType) {
    this._status = value;
  }

  flip(duration: number) {
    let card = qualifyEntity(this.owner as Entity);
    if (!card) return;
    card = this.owner as ScreenElement | Actor;
    card.actions.runAction(coroutineAction(flipCard, { duration, yoffset: 8 }));
  }

  set isOwned(value: boolean) {
    this._isOwned = value;
  }

  get isOwned() {
    return this._isOwned;
  }

  get isHovered() {
    return this._isHovered;
  }

  cancelPointerEvent() {}

  set isOwnedBy(value: number | null) {
    if (value && value < 0) value = null;

    if (value == null) this._isOwned = false;
    else this._isOwned = true;

    this._isOwnedBy = value;
  }

  get isOwnedBy() {
    return this._isOwnedBy;
  }
}

export class PlayingCardComponent extends CardComponent {
  private _suit: PlayingCardSuitType = PlayingCardSuit.Spades;
  private _rank: PlayingCardRankType = PlayingCardRank.Ace;

  constructor(config: PlayingCardOptions) {
    super(config);
    this._suit = config.suit;
    this._rank = config.rank;
  }
  get suit() {
    return this._suit;
  }

  get rank() {
    return this._rank;
  }
}

export class CardDeckComponent extends Component {
  private _cards: Actor[] = [];
  private _maxCards: number = Infinity;
  private _isTopCardShowing: boolean = false;
  private _deckSize: number = 0;
  private _newDeckSize: number = 0;
  private _cardBack: Sprite;
  private _cardThickness: number = 0;
  private _autoSizing: boolean = false;
  private _stackDirection: Vector = Vector.Down;
  private _maxShuffles: number = 1;

  constructor(config: CardDeckOptions) {
    super();
    this._cardBack = config.cardBack;
    this._maxCards = config.maxCards ? config.maxCards : Infinity;
    this._isTopCardShowing = config.isTopCardShowing ? config.isTopCardShowing : false;
    this._newDeckSize = config.deckSize ? config.deckSize : 0;
    this._cardThickness = config.cardThickness ? config.cardThickness : 1;
    this._autoSizing = config.autoSizing ? config.autoSizing : false;
    this._stackDirection = config.stackDirection ? config.stackDirection.normalize() : Vector.Down;
    this._maxShuffles = config.maxShuffles ? config.maxShuffles : 1;
  }

  onAdd(owner: Entity): void {
    let card = qualifyEntity(owner);

    if (!card) return;
    card.graphics.use(
      new DeckGraphics({
        cardBack: this._cardBack,
        isTopCardShowing: this._isTopCardShowing,
        cardThickness: this._cardThickness,
        size: this._newDeckSize,
        topCard: this._cards[this._cards.length - 1],
        cardSize: vec(this._cardBack.width, this._cardBack.height),
        stackDirection: this._stackDirection,
      })
    );
    card.on("preupdate", this.update.bind(this));
  }

  onRemove(previousOwner: Entity): void {
    let card = qualifyEntity(previousOwner);
    if (!card) return;
    card.off("preupdate", this.update.bind(this));
  }

  getTopCardPosition(): Vector {
    let x = 0;
    let y = 0;

    x = this._cards.length * (this._cardThickness * this._stackDirection.x);
    y = this._cards.length * (this._cardThickness * this._stackDirection.y);

    // x = this._deckSize * (this._cardThickness * this._stackDirection.x);
    // y = this._deckSize * (this._cardThickness * this._stackDirection.y);
    return new Vector(x, y);
  }

  get cards() {
    return this._cards;
  }

  get topCard() {
    return this._cards[this._cards.length - 1];
  }

  addCard(card: Actor) {
    //TODO
    // add validation to this
    this._cards.push(card);
  }

  addCards(cards: Actor[]) {
    //TODO
    // add validation to this
    this._cards.push(...cards);
  }

  removeCard(card: Actor) {
    const index = this._cards.indexOf(card);

    // if card is child of deck, remove parentage
    if (card.parent === this.owner) {
      this.owner.removeChild(card);
    }
    if (index !== -1) this._cards.splice(index, 1);
  }

  drawCards(numCards?: number): Actor[] | undefined {
    if (!numCards) numCards = 1;
    numCards = clamp(numCards, 0, this._maxCards);

    let drawn: Actor[] | undefined = [];
    for (let i = 0; i < numCards; i++) {
      let drawnCard = this._cards.pop();
      if (!drawnCard) break;
      drawn.push(drawnCard);
    }
    return drawn;
  }

  set displayedSize(numCards: number) {
    numCards = clamp(numCards, 0, this._maxCards);
    this._newDeckSize = numCards;
  }

  get displayedSize() {
    return this._deckSize;
  }

  shuffle(numShuffles?: number) {
    if (!numShuffles) numShuffles = 1;
    if (numShuffles && numShuffles > this._maxShuffles) numShuffles = this._maxShuffles;
    let rng = new Random();
    for (let i = 0; i < numShuffles; i++) this._cards = rng.shuffle(this._cards);
  }

  get count() {
    return this._cards.length;
  }

  update(evt: PreUpdateEvent) {
    if (!evt) return;
    let deck = qualifyEntity(this.owner as Entity);
    if (!deck) return;

    if (this._newDeckSize !== this._deckSize) {
      if (this._autoSizing) this._deckSize = this._cards.length;
      else this._deckSize = this._newDeckSize;
      this._deckSize = clamp(this._deckSize, 0, this._maxCards);

      (deck.graphics.current as DeckGraphics).updateDeckSize(this._deckSize);
    }
  }
}

export class CardHandComponent extends Component {
  private _cards: Actor[] = [];
  private _dirtyFlag: boolean = false;
  private _config: CardHandOptions;
  private maxCards: number = Infinity;
  private spread: "flat" | "fan" = "flat";
  private maxCardspacing: number = -1;
  private minCardspacing: number = -1;

  // Fan layout specific properties
  private fanAngle: number = 8; // Angle between each card in degrees
  private fanRadius: number = 400; // Radius of the arc

  constructor(config: CardHandOptions) {
    super();
    this._config = config;
    this.maxCards = config.maxCards ? config.maxCards : Infinity;
    this.spread = config.spread ? config.spread : "flat";
    this.maxCardspacing = config.maxCardspacing ? config.maxCardspacing : -1;
    this.minCardspacing = config.minCardspacing ? config.minCardspacing : -1;
    if (config.fanAngle) this.fanAngle = config.fanAngle;
    if (config.fanRadius) this.fanRadius = config.fanRadius;
  }

  get cards() {
    return this._cards;
  }

  onAdd(owner: Entity): void {
    let hand = qualifyEntity(owner);
    if (!hand) return;
    hand.on("preupdate", this.update.bind(this));
  }

  onRemove(previousOwner: Entity): void {
    let hand = qualifyEntity(previousOwner);
    if (!hand) return;
    hand.off("preupdate", this.update.bind(this));
  }

  addCard(card: Actor) {
    // Make card a child of the hand entity
    if (this.owner && card.parent !== this.owner) {
      this.owner.addChild(card);
      this._dirtyFlag = true;
    }
  }

  addCards(cards: Actor[]) {
    cards.forEach(card => this.addCard(card));
  }

  setDestination(card: Actor) {
    if (this._cards.length >= this.maxCards) {
      console.warn("Hand is full, cannot add more cards");
      return;
    }

    this._cards.push(card);
  }

  removeCard(card: Actor) {
    const index = this._cards.indexOf(card);

    // Remove parentage if card is child of hand
    if (card.parent === this.owner) {
      this.owner.removeChild(card);
    }

    if (index !== -1) {
      this._cards.splice(index, 1);
      this._dirtyFlag = true;
    }
  }

  get count() {
    return this._cards.length;
  }

  update(evt: PreUpdateEvent) {
    if (!evt) return;

    if (this._dirtyFlag) {
      // relayout cards in hand
      this._dirtyFlag = false;
      if (this.spread === "flat") this.useFlatLayout();
      else if (this.spread === "fan") this.useFanLayout();
    }
  }

  useFlatLayout() {
    const cardCount = this._cards.length;

    this._cards.forEach((card, index) => {
      const pos = this.calculateFlatPosition(index, cardCount);

      // Set relative position (relative to hand entity)
      //card.pos.x = pos.x;
      //card.pos.y = pos.y;
      card.actions.moveTo({ pos: vec(pos.x, pos.y), duration: 300 });
      card.rotation = pos.rotation;
      card.z = pos.z;
    });
  }

  useFanLayout() {
    const cardCount = this._cards.length;
    this._cards.forEach((card, index) => {
      const pos: { x: number; y: number; rotation: number; z: number } = this.calculateFanPosition(index, cardCount);
      card.actions.moveTo({ pos: vec(pos.x, pos.y), duration: 300 });
      card.rotation = pos.rotation;
      card.z = pos.z;
    });
  }

  getNextCardPosition(): { x: number; y: number; rotation: number; z: number } {
    const futureCardCount = this._cards.length + 1;

    if (this.spread === "flat") {
      return this.calculateFlatPosition(this._cards.length, futureCardCount);
    } else {
      return this.calculateFanPosition(this._cards.length, futureCardCount);
    }
  }

  private calculateCardSpacing(cardCount: number, cardWidth: number): number {
    if (cardCount <= 1) return 0;

    // Start with card width as default spacing
    let spacing = cardWidth * 0.8;

    // Apply max spacing constraint
    if (this.maxCardspacing > 0) {
      spacing = Math.min(spacing, this.maxCardspacing);
    }

    // Apply min spacing constraint if cards would overlap too much
    if (this.minCardspacing > 0) {
      spacing = Math.max(spacing, this.minCardspacing);
    }

    return spacing;
  }

  private calculateFlatPosition(index: number, totalCards: number): { x: number; y: number; rotation: number; z: number } {
    if (totalCards === 0) {
      return { x: 0, y: 0, rotation: 0, z: 0 };
    }

    const hand = this.owner as Actor;
    if (!hand) {
      return { x: 0, y: 0, rotation: 0, z: 0 };
    }

    // Assume cards have a standard width - adjust based on your card size
    const cardWidth = 80; // Adjust this to match your actual card width
    const spacing = this.calculateCardSpacing(totalCards, cardWidth);

    // For odd number of cards, middle card is at center (position 0)
    // For even number, cards split evenly on both sides
    const middleIndex = Math.floor(totalCards / 2);
    const isOdd = totalCards % 2 === 1;

    const offsetX = isOdd ? (index - middleIndex) * spacing : (index - middleIndex + 0.5) * spacing;

    const x = 0 + offsetX;
    const y = 0;
    const rotation = 0;

    // Z-index: left to right, leftmost card has lowest z
    const z = index;

    return { x, y, rotation, z };
  }

  private calculateFanPosition(index: number, totalCards: number): { x: number; y: number; rotation: number; z: number } {
    if (totalCards === 0) {
      return { x: 0, y: 0, rotation: 0, z: 0 };
    }

    const hand = this.owner as Actor;
    if (!hand) {
      return { x: 0, y: 0, rotation: 0, z: 0 };
    }

    // Calculate angle for this card based on per-card separation
    // const middleIndex = (totalCards - 1) / 2;

    let angle: number;
    if (totalCards === 1) {
      angle = 0;
    } else {
      // Each card is separated by fanAngle degrees
      const totalArcAngle = this.fanAngle * (totalCards - 1);
      const startAngle = -totalArcAngle / 2;
      angle = startAngle + index * this.fanAngle;
    }

    const angleRad = (angle * Math.PI) / 180;

    // Calculate position on the arc
    const offsetX = Math.sin(angleRad) * this.fanRadius;
    const offsetY = (1 - Math.cos(angleRad)) * this.fanRadius;

    const x = offsetX;
    const y = offsetY;

    // Cards rotate to follow the arc (convert to radians)
    const rotation = angleRad;

    // Z-index: left to right, so rightmost cards overlap leftmost
    const z = index;
    return { x, y, rotation, z };
  }

  canTakeCard(): boolean {
    return this._cards.length < this.maxCards;
  }
}
export class TableZoneComponent extends Component {
  private _cards: Actor[] = [];
  zoneSprite: Sprite | null = null;
  size: Vector;
  mode: ZoneModeType;

  constructor(size: Vector, mode: ZoneModeType, sprite?: Sprite) {
    super();
    if (sprite) this.zoneSprite = sprite;
    this.size = size;
    this.mode = mode;
  }

  onAdd(owner: Entity): void {
    if (!owner) return;
    if (!(owner instanceof Actor || owner instanceof ScreenElement)) return;

    if (this.zoneSprite && owner.graphics) {
      owner.graphics.use(this.zoneSprite);
      owner.graphics.current!.width = this.size.x;
      owner.graphics.current!.height = this.size.y;
    }
  }

  get cards() {
    return this._cards;
  }

  addCard(card: Actor) {
    // snap card to zone's position
    if (!this.owner) return;
    if (!(this.owner instanceof Actor || this.owner instanceof ScreenElement)) return;

    card.pos = this.owner.pos.clone();
    this._cards.push(card);
  }

  removeCard(card: Actor) {
    const index = this._cards.indexOf(card);
    if (index !== -1) this._cards.splice(index, 1);
  }

  clear() {
    this._cards = [];
  }

  get count() {
    return this._cards.length;
  }
}

export class TableStackComponent extends Component {
  _offset: Vector = vec(0, 0);
  _maxVisible: number = 0;
  _topCardOnly: boolean = true;
  _cards: Actor[] = [];
  _dirtyFlag: boolean = false;
  _maxCardCount: number = 0;

  constructor(config: TableStackOptions) {
    super();
    this._offset = config.offset ? config.offset : vec(0, 0);
    this._maxVisible = config.maxVisible ? config.maxVisible : 0;
    this._topCardOnly = config.topCardOnly ? config.topCardOnly : true;
    this._maxCardCount = config.maxCardCount ? config.maxCardCount : 0;
  }

  onAdd(owner: Entity): void {
    let stack = qualifyEntity(owner);
    if (!stack) return;

    stack.on("preupdate", this.update.bind(this));
  }
  onRemove(previousOwner: Entity): void {
    let stack = qualifyEntity(previousOwner);
    if (!stack) return;
    stack.off("preupdate", this.update.bind(this));
  }

  // getters and setters
  get cards() {
    return this._cards;
  }

  get maxVisible() {
    return this._maxVisible;
  }

  get topCardOnly() {
    return this._topCardOnly;
  }

  get offset() {
    return this._offset;
  }

  set offset(value: Vector) {
    this._offset = value;
  }

  get dirtyFlag() {
    return this._dirtyFlag;
  }

  set dirtyFlag(value: boolean) {
    this._dirtyFlag = value;
  }

  clear() {
    this._cards = [];
  }

  get count() {
    return this._cards.length;
  }

  get topCard() {
    return this._cards[this._cards.length - 1];
  }

  canTakeCard(): boolean {
    if (this._maxCardCount === 0) return true;
    return this._cards.length < this._maxCardCount;
  }

  // class utilities
  addCard(card: Actor) {
    this.owner?.addChild(card);
    card.pos = this.getNextCardPosition();
    this.dirtyFlag = true;
  }

  setDestination(card: Actor) {
    //validate card has card component
    let validCard = validateCard(card);
    if (!validCard) return;

    if (this._maxCardCount !== 0 && this._cards.length >= this._maxCardCount) {
      console.warn("Stack is full, cannot add more cards");
      return;
    }

    this._cards.push(card);
  }

  addCards(cards: Actor[]) {
    cards.forEach(card => this.addCard(card));
  }

  removeCard(card: Actor) {
    const index = this._cards.indexOf(card);
    // remove child if card is child of stack
    if (card.parent === this.owner) this.owner?.removeChild(card);
    if (index !== -1) this._cards.splice(index, 1);
    this.dirtyFlag = true;
  }
  removeCards(cards: Actor[]) {
    cards.forEach(card => this.removeCard(card));
  }

  getNextCardPosition(): Vector {
    const owner = this.owner as Actor;
    if (!owner) return vec(0, 0);
    const basePos = owner.pos.clone();
    const offsetAmount = this._offset.scale(this._cards.length - 1);
    return basePos.add(offsetAmount);
  }

  update(evt: PreUpdateEvent) {
    if (!evt) return;

    // Only update positions if dirty flag is set
    if (!this._dirtyFlag) return;

    let owner = this.owner as Actor;
    if (!owner) return;

    const basePos = owner.pos.clone();

    // Loop through cards and reposition them
    this._cards.forEach((card, index) => {
      // Calculate position with offset
      //confirm card is child of owner
      if (card.parent !== this.owner) return;
      const offsetAmount = this._offset.scale(index);
      card.pos = basePos.add(offsetAmount);
      // Set z-index (higher index = higher z)
      card.z = owner.z + index + 1;
    });

    // Clear the dirty flag after updating
    this._dirtyFlag = false;
  }
}

export class TableComponent extends Component {
  zones: Record<string, TableZoneComponent> = {};
  zonesToAdd: Record<string, TableZoneComponent> = {};

  onAdd(owner: Entity): void {
    if (!owner) return;
    if (!(owner instanceof Actor || owner instanceof ScreenElement)) return;
    owner.on("preupdate", this.update.bind(this));
  }

  onRemove(previousOwner: Entity): void {
    if (!previousOwner) return;
    if (!(previousOwner instanceof Actor || previousOwner instanceof ScreenElement)) return;
    previousOwner.off("preupdate", this.update.bind(this));
  }

  addZone(name: string, zone: Actor | ScreenElement) {
    if (!zone.has(TableZoneComponent)) return;
    this.zonesToAdd[name] = zone.get(TableZoneComponent);
  }

  getZone(name: string) {
    return this.zones[name];
  }

  update() {
    if (!this.owner) return;

    // check zone add for scheduled zones to add
    for (let zoneName in this.zonesToAdd) {
      let zone = this.zonesToAdd[zoneName];
      if (!zone.owner) continue;
      this.zones[zoneName] = this.zonesToAdd[zoneName];
      this.owner.addChild(zone.owner);
      delete this.zonesToAdd[zoneName];
    }
  }
}

//#endregion Card Component

/**
 * Card Actions
 */
// #region Card Actions

/**
 * Flips a card
 */
export function* flipCard(
  actor: Actor | ScreenElement,
  ctx: {
    duration?: number;
    yOffset?: number;
  } = {}
) {
  const duration = ctx.duration ?? 200;
  const yOffset = ctx.yOffset ?? 10;

  const startY = actor.pos.y;
  const startRotation = actor.rotation;
  const startScaleX = actor.scale.x;
  const startScaleY = actor.scale.y;

  let elapsedTime = 0;
  let flipped = false;

  const cardComp = actor.get(CardComponent);
  if (!cardComp) {
    console.warn("Actor does not have CardComponent");
    return;
  }

  const halfDuration = duration / 2;

  while (elapsedTime < duration) {
    const deltaTime: number = yield;
    elapsedTime += deltaTime;

    if (!flipped) {
      const progress = Math.min(elapsedTime / halfDuration, 1);
      const scaleX = Math.abs(startScaleX) * (1 - progress);

      actor.rotation = startRotation;
      actor.scale.x = scaleX;
      actor.scale.y = startScaleY;
      actor.pos.y = lerp(startY, startY - yOffset, progress);

      if (elapsedTime >= halfDuration) {
        cardComp.isFaceUp = !cardComp.isFaceUp;
        if (actor.graphics) {
          actor.graphics.use(cardComp.isFaceUp ? "cardFace" : "cardBack");
        }
        flipped = true;
      }
    } else {
      const progress = Math.min((elapsedTime - halfDuration) / halfDuration, 1);
      const scaleX = Math.abs(startScaleX) * progress;

      // Flip rotation by 180° for the second half
      actor.rotation = startRotation - Math.PI;
      actor.scale.x = scaleX;
      actor.scale.y = startScaleY;
      actor.pos.y = lerp(startY - yOffset, startY, progress);
    }
  }

  // Ensure final state (with flipped rotation)
  actor.scale.x = startScaleX;
  actor.scale.y = startScaleY;
  actor.rotation = startRotation + Math.PI;
  actor.pos.y = startY;
}
export function* moveAndFlipCard(
  actor: Actor,
  ctx: {
    targetX: number;
    targetY: number;
    duration: number; // Total animation duration in ms
    flipDuration?: number; // Duration of flip animation in ms (defaults to half of duration)
  }
) {
  const startX = actor.pos.x;
  const startY = actor.pos.y;
  const startScaleX = actor.scale.x;

  const flipDur = ctx.flipDuration ?? ctx.duration / 2;
  let elapsedTime = 0;
  let flipped = false;

  while (elapsedTime < ctx.duration) {
    const deltaTime: number = yield; // Get elapsed time since last frame
    elapsedTime += deltaTime;

    // Calculate progress (0 to 1)
    const progress = Math.min(elapsedTime / ctx.duration, 1);

    // Ease-out cubic for smooth movement
    const eased = 1 - Math.pow(1 - progress, 3);

    // Interpolate position
    actor.pos.x = startX + (ctx.targetX - startX) * eased;
    actor.pos.y = startY + (ctx.targetY - startY) * eased;

    // Flip animation (shrink to 0 then grow back)
    const flipProgress = Math.min(elapsedTime / flipDur, 1);
    if (flipProgress < 0.5) {
      // First half: scale down to 0
      actor.scale.x = startScaleX * (1 - flipProgress * 2);
    } else {
      // Second half: scale back up to original
      actor.scale.x = startScaleX * ((flipProgress - 0.5) * 2);
    }

    if (elapsedTime >= ctx.duration / 2 && !flipped) {
      //@ts-ignore
      let cardComponent = actor.getCard();
      //@ts-ignore
      cardComponent.isFaceUp = !cardComponent.isFaceUp;
      if (actor.graphics) {
        actor.graphics.use(cardComponent.isFaceUp ? "cardFace" : "cardBack");
      }
      flipped = true;
    }
  }

  // Ensure final position and scale
  actor.pos.x = ctx.targetX;
  actor.pos.y = ctx.targetY;
  actor.scale.x = startScaleX;
  actor.rotation = 0;
}

export function* moveAndRotateCard(
  actor: Actor,
  ctx: {
    targetX: number;
    targetY: number;
    duration: number; // Total animation duration in ms
    rotationSpeed?: number;
  }
) {
  const startPos = actor.pos.clone();
  const startRotation = actor.rotation;
  const targetVector = vec(ctx.targetX, ctx.targetY);
  const duration = ctx.duration;
  const rotationSpeed = (Math.PI * 2) / duration;
  let elapsedTime = 0;

  while (elapsedTime < duration) {
    const deltaTime: number = yield; // Get elapsed time since last frame
    // Calculate progress (0 to 1)
    const progress = Math.min(elapsedTime / ctx.duration, 1);
    elapsedTime += deltaTime;
    actor.pos = lerpVector(startPos, targetVector, progress);
    actor.rotation = startRotation + rotationSpeed * elapsedTime;
  }

  // Ensure final state
  actor.pos.x = ctx.targetX;
  actor.pos.y = ctx.targetY;
  actor.rotation = startRotation;
}

// #endregion Card Actions

/**
 * Card Events
 */

// #region Card Events

//Events: card:created
//Events: card:flipped
//Events: card:played
//Events: card:drawn
//Events: card:discarded
//Events: card:moved
//Events: card:destroyed
//Events: card:selected
//Events: card:hovered

//Deck Events
//Events: deck:shuffled
//Events: deck:cardadded
//Events: deck:cardremoved
//Events: deck:cleared

//Hand Events
//Events: hand:cardadded
//Events: hand:cardremoved
//Events: hand:cleared
//Events: hand:full

//Table/Zone Events
//Events: zone:cardadded
//Events: zone:cardremoved
//Events: zone:cleared
//Events: table:zonecreated
//Events: table:zoneremoved

//Card Actions
//Events: action:created
//Events: action:started
//Events: action:completed

// #endregion

/**
 * Card System Graphics
 */

export class DeckGraphics extends Graphic {
  size: number;
  cardBack: Sprite;
  cardThickness: number = 1;
  stackDirection: Vector = Vector.Down;
  config: {
    size: number;
    cardBack: Sprite;
    isTopCardShowing: boolean;
    cardThickness: number;
    topCard: Actor | null;
    cardSize: Vector;
    stackDirection: Vector;
  };

  constructor(config: {
    size: number;
    cardBack: Sprite;
    isTopCardShowing: boolean;
    cardThickness: number;
    topCard: Actor | null;
    cardSize: Vector;
    stackDirection: Vector;
  }) {
    super({});
    this.config = config;
    this.size = config.size;
    this.cardBack = config.cardBack;
    this.cardThickness = config.cardThickness;
    this.width = config.cardSize.x;
    this.height = config.cardSize.y;
    this.stackDirection = config.stackDirection;
  }

  protected _drawImage(ex: ExcaliburGraphicsContext, x: number, y: number): void {
    for (let i = 0; i < this.size - 1; i++) {
      this.cardBack.draw(ex, x, y);
      x += this.cardThickness * this.stackDirection.x;
      y += this.cardThickness * this.stackDirection.y;
    }
  }

  updateDeckSize(newSize: number) {
    this.size = newSize;
  }

  clone(): Graphic {
    return new DeckGraphics(this.config);
  }
}

function qualifyEntity(ent: Entity): Actor | ScreenElement | null {
  if (ent instanceof Actor || ent instanceof ScreenElement) return ent as Actor | ScreenElement;
  return null;
}

function validateCard(ent: Entity): Actor | null {
  if (!(ent instanceof Actor)) return null;
  if (!(ent.has(CardComponent) || ent.has(PlayingCardComponent))) return null;
  return ent as Actor;
}

// function applyLocalScale(actor: Actor | ScreenElement, localScaleX: number, localScaleY: number, rotation: number) {
//   // Create rotation matrix
//   const cos = Math.cos(rotation);
//   const sin = Math.sin(rotation);

//   // Apply local scale then rotation: R * S
//   // Where S = [sx, 0; 0, sy] and R = [cos, -sin; sin, cos]
//   // Result: [sx*cos, -sy*sin; sx*sin, sy*cos]

//   const scaleXCos = localScaleX * cos;
//   const scaleXSin = localScaleX * sin;
//   const scaleYCos = localScaleY * cos;
//   const scaleYSin = localScaleY * sin;

//   // Set the transform matrix directly
//   actor.scale.x = Math.sqrt(scaleXCos * scaleXCos + scaleXSin * scaleXSin);
//   actor.scale.y = Math.sqrt(scaleYCos * scaleYCos + scaleYSin * scaleYSin);

//   // Adjust rotation to maintain direction
//   if (localScaleX < 0) {
//     actor.rotation = rotation + Math.PI;
//   } else {
//     actor.rotation = rotation;
//   }
// }

// function applyLocalScale(actor: Actor | ScreenElement, localScaleX: number, localScaleY: number, originalRotation: number) {
//   // Set scale in local space (when rotation is 0)
//   actor.rotation = 0;
//   actor.scale.x = localScaleX;
//   actor.scale.y = localScaleY;
//   // Re-apply rotation
//   actor.rotation = originalRotation;
// }
