import { AccessorType, LifecycleFlags } from '../observation.js';
import type { IIndexable } from '@aurelia/kernel';
import type { InterceptorFunc } from '../bindable.js';
import type { IPropertyObserver, ISubscriber, ILifecycle } from '../observation.js';
export interface BindableObserver extends IPropertyObserver<IIndexable, string> {
}
export declare class BindableObserver {
    readonly lifecycle: ILifecycle;
    readonly obj: IIndexable;
    readonly propertyKey: string;
    private readonly $set;
    currentValue: unknown;
    oldValue: unknown;
    inBatch: boolean;
    observing: boolean;
    type: AccessorType;
    private readonly callback?;
    private readonly propertyChangedCallback?;
    private readonly hasPropertyChangedCallback;
    private readonly shouldInterceptSet;
    constructor(lifecycle: ILifecycle, obj: IIndexable, propertyKey: string, cbName: string, $set: InterceptorFunc);
    handleChange(newValue: unknown, oldValue: unknown, flags: LifecycleFlags): void;
    getValue(): unknown;
    setValue(newValue: unknown, flags: LifecycleFlags): void;
    subscribe(subscriber: ISubscriber): void;
    private createGetterSetter;
}
//# sourceMappingURL=bindable-observer.d.ts.map