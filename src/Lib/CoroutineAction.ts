import { Action, Actor, coroutine, CoroutineInstance, Engine, nextActionId } from "excalibur";

export class CoroutineAction implements Action {
  id = nextActionId();
  private _stopped = false;
  private _coroutineInstance: CoroutineInstance | null = null;
  private _actor: Actor | null = null;

  /**
   * @param coroutineFactory - Function that creates the coroutine generator
   * @param ctx - Optional context object to pass to the coroutine
   */
  constructor(private coroutineFactory: (actor: Actor, ctx?: any) => Generator<any, void, number>, private ctx?: any) {}

  isComplete(actor: Actor): boolean {
    // Store actor reference for update method
    if (!this._actor) {
      this._actor = actor;
    }
    // Complete when coroutine finishes or is stopped
    return this._stopped || (this._coroutineInstance?.isComplete() ?? false);
  }

  update(elapsed: number): void {
    if (!this._coroutineInstance && !this._stopped && this._actor) {
      // Start the coroutine on first update
      const engine = Engine.useEngine();
      const actor = this._actor;
      const ctx = this.ctx;

      // Wrap in a CoroutineGenerator (no parameters)
      const generator = () => this.coroutineFactory.call(actor, actor, ctx);

      this._coroutineInstance = coroutine(actor, engine, generator, {
        autostart: true,
      });
    }
  }

  reset(): void {
    this._stopped = false;
    if (this._coroutineInstance) {
      this._coroutineInstance.cancel();
      this._coroutineInstance = null;
    }
  }

  stop(): void {
    this._stopped = true;
    if (this._coroutineInstance) {
      this._coroutineInstance.cancel();
    }
  }
}

export function coroutineAction(coroutine: (actor: Actor, ctx?: any) => Generator<any, void, number>, ctx?: any): CoroutineAction {
  return new CoroutineAction(coroutine, ctx);
}

/**
 *
 *  // Example 1: Simple wait and move
 * 
 * const actor1 = new Actor({ pos: new Vector(100, 100) });
 * actor1.actions.runAction(coroutineAction(waitAndMovePattern));
 * 
 * function* smoothMove(this: Actor, ctx: { targetX: number; speed: number }) {
 *   while (Math.abs(this.pos.x - ctx.targetX) > 1) {
 *     const elapsed: number = yield; // Elapsed ms since last frame
 *     const direction = Math.sign(ctx.targetX - this.pos.x);
 *     const deltaX = direction * ctx.speed * (elapsed / 1000); // Convert to seconds
    
    this.pos.x += deltaX;
  }
  
  // Snap to target
  this.pos.x = ctx.targetX;
} 
  
*/
