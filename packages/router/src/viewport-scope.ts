import { CustomElementType } from '@aurelia/runtime';
import { ComponentAppellation, INavigatorInstruction, IRoute, RouteableComponentType } from './interfaces';
import { IRouter } from './router';
import { ViewportInstruction } from './viewport-instruction';
import { IScopeOwner, IScopeOwnerOptions, Scope } from './scope';
import { arrayRemove } from './utils';

export interface IViewportScopeOptions extends IScopeOwnerOptions {
  catches?: string | string[];
  collection?: boolean;
  source?: unknown[] | null;
}

export class ViewportScope implements IScopeOwner {
  public connectedScope: Scope;

  public path: string | null = null;

  public content: ViewportInstruction | null = null;
  public nextContent: ViewportInstruction | null = null;

  public available: boolean = true;
  public sourceItem: unknown | null = null;
  public sourceItemIndex: number = -1;

  private remove: boolean = false;
  private add: boolean = false;

  public constructor(
    public name: string,
    public readonly router: IRouter,
    public element: Element | null,
    owningScope: Scope | null,
    scope: boolean,
    public rootComponentType: CustomElementType | null = null, // temporary. Metadata will probably eliminate it
    public options: IViewportScopeOptions = {
      catches: [],
      source: null,
    },
  ) {
    this.connectedScope = new Scope(router, scope, owningScope, null, this);
    let catches: string | string[] = this.options.catches || [];
    if (typeof catches === 'string') {
      catches = catches.split(',');
    }
    if (catches.length > 0) {
      this.content = router.createViewportInstruction(catches[0]);
    }
  }

  public get scope(): Scope {
    return this.connectedScope.scope!;
  }
  public get owningScope(): Scope {
    return this.connectedScope.owningScope!;
  }

  public get enabled(): boolean {
    return this.connectedScope.enabled;
  }
  public set enabled(enabled: boolean) {
    this.connectedScope.enabled = enabled;
  }

  public get isViewport(): boolean {
    return false;
  }
  public get isViewportScope(): boolean {
    return true;
  }

  public get passThroughScope(): boolean {
    return this.rootComponentType === null && (this.options.catches === void 0 || this.options.catches.length === 0);
  }

  public get siblings(): ViewportScope[] {
    const parent: Scope | null = this.connectedScope.parent;
    if (parent === null) {
      return [this];
    }
    return parent.enabledChildren
      .filter(child => child.isViewportScope && child.viewportScope!.name === this.name)
      .map(child => child.viewportScope!);
  }

  public get source(): unknown[] | null {
    return this.options.source || null;
    // let source: unknown[] | undefined = this.connectedScope!.parent!.childCollections[this.name];
    // if (source === void 0) {
    //   source = [];
    //   source.push({});
    //   this.connectedScope.parent!.childCollections[this.name] = source;
    // }
    // return source;
  }

  public setNextContent(content: ComponentAppellation | ViewportInstruction, instruction: INavigatorInstruction): boolean {
    let viewportInstruction: ViewportInstruction;
    if (content instanceof ViewportInstruction) {
      viewportInstruction = content;
    } else {
      if (typeof content === 'string') {
        viewportInstruction = this.router.instructionResolver.parseViewportInstruction(content);
      } else {
        viewportInstruction = this.router.createViewportInstruction(content);
      }
    }
    viewportInstruction.viewportScope = this;

    this.remove = this.router.instructionResolver.isClearViewportInstruction(viewportInstruction)
      || this.router.instructionResolver.isClearAllViewportsInstruction(viewportInstruction);
    this.add = this.router.instructionResolver.isAddViewportInstruction(viewportInstruction)
      && Array.isArray(this.source);

    if (this.add) {
      this.addSourceItem();
    }
    if (this.remove && Array.isArray(this.source)) {
      this.removeSourceItem();
    }

    this.nextContent = viewportInstruction;
    return true;
  }

  public canLeave(): Promise<boolean> {
    return Promise.resolve(true);
  }
  public canEnter(): Promise<boolean | ViewportInstruction[]> {
    return Promise.resolve(true);
  }

  public enter(): Promise<boolean> {
    return Promise.resolve(true);
  }

  public loadContent(): Promise<boolean> {
    this.content = !this.remove ? this.nextContent : null;
    this.nextContent = null;

    return Promise.resolve(true);
  }

  public finalizeContentChange(): void {
    console.log('ViewportScope finalizing', this.content);
  }
  public async abortContentChange(): Promise<void> {
    this.nextContent = null;
    if (this.remove) {
      this.source!.splice(this.sourceItemIndex, 0, this.sourceItem);
    }
    if (this.add) {
      const index: number = this.source!.indexOf(this.sourceItem);
      this.source!.splice(index, 1);
      this.sourceItem = null;
    }
  }

  public acceptSegment(segment: string): boolean {
    if (segment === null && segment === void 0 || segment.length === 0) {
      return true;
    }
    if (segment === this.router.instructionResolver.clearViewportInstruction
      || segment === this.router.instructionResolver.addViewportInstruction
      || segment === this.name) {
      return true;
    }

    let catches: string | string[] = this.options.catches || [];
    if (typeof catches === 'string') {
      catches = catches.split(',');
    }
    if (catches.length === 0) {
      return true;
    }

    if (catches.includes(segment as string)) {
      return true;
    }
    if (catches.filter((value) => value.includes('*')).length) {
      return true;
    }
    return false;
  }

  public binding(): void {
    let source: unknown[] = this.source || [];
    if (source.length > 0 && this.sourceItem === null) {
      this.sourceItem = this.getAvailableSourceItem();
    }
  }
  public unbinding(): void {
    if (this.sourceItem !== null && this.source !== null) {
      arrayRemove(this.source!, (item: unknown) => item === this.sourceItem);
    }
    this.sourceItem = null;
  }

  public getAvailableSourceItem(): unknown | null {
    if (this.source === null) {
      return null;
    }
    const siblings: ViewportScope[] = this.siblings;
    for (const item of this.source) {
      if (siblings.every(sibling => sibling.sourceItem !== item)) {
        return item;
      }
    }
    return null;
  }
  public addSourceItem(): void {
    this.source!.push({ id: Math.max(...this.source!.map(w => (w as any).id)) + 1 });
  }
  public removeSourceItem(): void {
    this.sourceItemIndex = this.source!.indexOf(this.sourceItem);
    if (this.sourceItemIndex >= 0) {
      this.source!.splice(this.sourceItemIndex, 1);
    }
  }

  public getRoutes(): IRoute[] | null {
    if (this.rootComponentType !== null) {
      return (this.rootComponentType as RouteableComponentType & { routes: IRoute[] }).routes;
    }
    return null;
  }
}