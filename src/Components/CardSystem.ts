import {
  Actor,
  Component,
  Entity,
  Sprite,
  System,
  SystemType,
  Action,
  nextActionId,
  ScreenElement,
  Vector,
  lerp,
  PreUpdateEvent,
  Graphic,
  ExcaliburGraphicsContext,
  vec,
  Random,
  clamp,
} from "excalibur";

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

    card.graphics.add("cardFace", this._cardFace);
    card.graphics.add("cardBack", this._cardBack);

    if (this._isFaceUp) card.graphics.use("cardFace");
    else card.graphics.use("cardBack");

    // Add pointer hover logic
    card.on("pointerenter", () => {
      this._isHovered = true;
    });

    card.on("pointerleave", () => {
      this._isHovered = false;
    });

    // Change cursor style on hover
    card.pointer.useGraphicsBounds = true;
    card.on("pointerenter", () => {
      document.body.style.cursor = "pointer";
    });

    card.on("pointerleave", () => {
      document.body.style.cursor = "default";
    });
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
    card.actions.runAction(new FlipCardAction(this, card, duration));
  }

  set isOwned(value: boolean) {
    this._isOwned = value;
  }

  get isOwned() {
    return this._isOwned;
  }

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
    this.dirtyFlag = true;
  }

  setDestination(card: Actor) {
    //validate card has card component
    let validCard = validateCard(card);
    if (!validCard) return;

    if (this._maxCardCount !== 0 && this._cards.length >= this.maxVisible) {
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

    const owner = this.owner as Actor;
    if (!owner) return;

    const basePos = owner.pos.clone();

    // Loop through cards and reposition them
    this._cards.forEach((card, index) => {
      // Calculate position with offset
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

  addZone(name: string, zone: TableZoneComponent) {
    this.zonesToAdd[name] = zone;
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

/*
 * Card Game System
 */
// #region Card Game System
export class CardGameSystem extends System {
  systemType = SystemType.Update;
  constructor() {
    super();
  }

  /**
   * Draw a card from a deck into a hand
   */
  drawCard(deck: CardDeckComponent, hand: CardHandComponent) {
    const cards = deck.drawCards();
    if (!cards) return null;
    hand.addCards(cards);
    cards.forEach(card => {
      const cardComp = card.get(CardComponent);
      if (cardComp) cardComp.status = "InHand";
    });
    return cards;
  }

  /**
   * Play a card from a hand to a table zone
   */
  playCard(hand: CardHandComponent, card: Actor, table: TableComponent, zoneName: string) {
    // Remove from hand
    hand.removeCard(card);

    // Place on table
    const zone = table.getZone(zoneName);
    if (!zone) throw new Error(`Zone "${zoneName}" does not exist`);

    zone.addCard(card);

    // Update card state
    const cardComp = card.get(CardComponent);
    if (cardComp) {
      cardComp.status = "InPlay";
      cardComp.isFaceUp = true;
    }

    return card;
  }

  /**
   * Move a card from one zone to another on the table
   */
  moveCardOnTable(table: TableComponent, fromZoneName: string, toZoneName: string, card: Actor) {
    const fromZone = table.getZone(fromZoneName);
    const toZone = table.getZone(toZoneName);

    if (!fromZone || !toZone) throw new Error(`One or both zones do not exist`);

    fromZone.removeCard(card);
    toZone.addCard(card);
  }

  /**
   * Shuffle a deck
   */
  shuffleDeck(deck: CardDeckComponent) {
    deck.shuffle();
  }

  update(): void {}
}

export class TableSystem extends System {
  systemType: SystemType = SystemType.Update;

  placeCard(table: TableComponent, zoneName: string, card: Actor) {
    const zone = table.getZone(zoneName);
    if (!zone) throw new Error(`Zone ${zoneName} does not exist`);

    zone.addCard(card);

    const cardComp = card.get(CardComponent);
    if (cardComp) {
      cardComp.status = "InPlay";
      cardComp.isFaceUp = true;
    }
  }

  removeCard(table: TableComponent, zoneName: string, card: Actor) {
    const zone = table.getZone(zoneName);
    if (!zone) return;

    zone.removeCard(card);

    const cardComp = card.get(CardComponent);
    if (cardComp) {
      cardComp.status = "InHand"; // or InDeck depending on context
    }
  }

  clearZone(table: TableComponent, zoneName: string) {
    const zone = table.getZone(zoneName);
    if (!zone) return;
    zone.clear();
  }

  update(): void {}
}
// #endregion Card Game System

/**
 * Card Actions
 */
// #region Card Actions

/**
 * Flips a card
 */
export class FlipCardAction implements Action {
  id = nextActionId();
  private _complete = false;
  private _flipped = false;
  private _elapsed = 0;
  private _duration: number;
  private _card: CardComponent;
  private _entity: Actor | ScreenElement;
  private _originalXScale: number;
  private _originalPos: Vector;
  private _yoffsetFactor: number = 10;

  constructor(card: CardComponent, entity: Actor | ScreenElement, duration = 200) {
    this._card = card;
    this._entity = entity;
    this._duration = duration;
    this._originalXScale = entity.scale.x;
    this._originalPos = entity.pos.clone();
  }

  isComplete(): boolean {
    return this._complete;
  }

  reset(): void {
    this._complete = false;
    this._elapsed = 0;
  }

  stop(): void {
    this._complete = true;
  }

  update(elapsed: number): void {
    if (this._complete) return;

    this._elapsed += elapsed;

    if (!this._flipped) {
      //shrink graphic
      let halfDuration = this._duration / 2;
      let scale = this._originalXScale * (1 - this._elapsed / halfDuration);
      const actor = this._entity as Actor | ScreenElement;
      actor.scale.x = scale;
      actor.pos.y = lerp(this._originalPos.y, this._originalPos.y - this._yoffsetFactor, this._elapsed / halfDuration);
    } else {
      // grow graphic
      const halfDuration = this._duration / 2;
      const progress = (this._elapsed - halfDuration) / halfDuration;
      const scale = this._originalXScale * progress;
      const actor = this._entity as Actor | ScreenElement;
      actor.scale.x = Math.min(scale, this._originalXScale); // clamp to full scale
      actor.pos.y = lerp(this._originalPos.y - this._yoffsetFactor, this._originalPos.y, progress);
    }

    // Simple flip at halfway point
    if (this._elapsed >= this._duration / 2 && !this._flipped) {
      const actor = this._entity as Actor | ScreenElement;
      //@ts-ignore
      actor.getCard().isFaceUp = !actor.getCard().isFaceUp;
      if (actor.graphics) {
        actor.graphics.use(this._card.isFaceUp ? "cardFace" : "cardBack");
      }
      this._flipped = true;
    }

    if (this._elapsed >= this._duration) {
      this._complete = true;
    }
  }
}

/**
 * Stubbed in for now
 */
// export class MoveandFlipCardAction implements Action {
//   id = nextActionId();
//   private _complete = false;
//   private _elapsed = 0;
//   private _duration: number;

//   constructor(duration: number) {
//     this._duration = duration;
//   }

//   isComplete(): boolean {
//     return this._complete;
//   }

//   reset(): void {
//     this._complete = false;
//     this._elapsed = 0;
//   }

//   stop(): void {
//     this._complete = true;
//   }

//   update(elapsed: number): void {
//     if (this._complete) return;

//     this._elapsed += elapsed;

//     if (this._elapsed >= this._duration) {
//       this._complete = true;
//     }
//   }
// }

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

    // Simple flip at halfway point
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
