'use strict';

const data = {
    title: 'hello',
    text:  'world',
    get msg() {
        return this.text
    }
}
const bucket = new WeakMap();
const effectStack = [];
const jobQueue = new Set();
const p = Promise.resolve();
const ITERATE_KEY = Symbol();
let activeEffect;
let isFlushing = false;

function track(target, p) {
    if (!activeEffect) return;
    let depsMap = bucket.get(target);
    if (!depsMap) {
        bucket.set(target, (depsMap = new Map()));
    }
    let deps = depsMap.get(p);
    if (!deps) {
        depsMap.set(p, (deps = new Set()));
    }
    deps.add(activeEffect);
    activeEffect.deps.push(deps); // 使得 effectFn 能据此找到存储了它的 Set 对象
}

function trigger(target, p, type) {
    const depsMap = bucket.get(target);
    if (!depsMap) return;
    const effects = depsMap.get(p);
    const effectsToRun = new Set();
    effects && effects.forEach(effectFn => {
        if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn);
        }
    });
    if (type === 'ADD' || type === 'DELETE') {
        const iterateEffects = depsMap.get(ITERATE_KEY);
        iterateEffects && iterateEffects.forEach(effectFn => {
            if (effectFn !== activeEffect) {
                effectsToRun.add(effectFn);
            }
        })
    }
    effectsToRun.forEach(effectFn => {
        if (effectFn !== activeEffect) {
            if (effectFn.options.scheduler) {
                effectFn.options.scheduler(effectFn);
            } else {
                effectFn();
            }
        }
    });
}

function cleanup(effectFn) {
    effectFn.deps.forEach((deps) => {
        deps.delete(effectFn)
    });
    effectFn.deps.length = 0;
}

function createReactive(obj, isShallow = false, isReadonly = false) {
    return new Proxy(data, {
        get(target, p, receiver) {
            console.log('get:', p);
            if (p === '__raw__') {
                return target;
            }
            if (!isReadonly) {
                track(target, p);
            }

            const res =  Reflect.get(target, p, receiver);
            if (isShallow) return res;
            if (typeof res === 'objects' && res != null) {
                return isReadonly ? readonly(res) : reactive(res);
            }
            return res;
        },
        set(target, p, value, receiver) {
            if (isReadonly) {
                console.warn(`属性 ${p} 是只读的`);
                return true;
            }
            console.log('set:', p, value);
            const oldVal = target[p];
            const type = Array.isArray(target)
                ? Number(p) < target.length ? 'SET' : 'ADD'
                : Object.prototype.hasOwnProperty.call(target, p) ? 'SET' : 'ADD';

            const res = Reflect.set(target, p, value, receiver);
            if (target === receiver.__raw__) {
                if (oldVal !== value && (oldVal === oldVal || value === value)) {
                    trigger(target, p, type);
                }
            }
            return res;
        },
        ownKeys(target) {
            track(target, ITERATE_KEY);
            return Reflect.ownKeys(target);
        },
        deleteProperty(target, p) {
            if (isReadonly) {
                console.warn(`属性 ${p} 是只读的`);
                return true;
            }
            const hadKey = Object.prototype.hasOwnProperty.call(target, p);
            const res = Reflect.deleteProperty(target, p);
            if (res && hadKey) {
                trigger(target, p, 'DELETE');
            }
            return res;
        }
    })
}
const reactive = (obj) => createReactive(obj);
const shallowReactive = (obj) => createReactive(obj, true);
const readonly = (obj) => createReactive(obj, false, true);
const shallowReadonly = (obj) => createReactive(obj, true, true);

const obj = reactive(obj);

function flushJob() {
    if (isFlushing) return;
    isFlushing = true;
    p.then(() => {
        jobQueue.forEach(job => job());
    }).finally(() => {
        isFlushing = false;
    })
}

// 遍历读取
function traverse(value, seen = new Set()) {
    if (typeof value !== 'object' || value === null || seen.has(value)) return;
    seen.add(value);
    for (const k in value) {
        traverse(value[k], seen)
    }
    return value;
}

function effect(fn, options = {}) {
    const effectFn = (...args) => {
        cleanup(effectFn);
        activeEffect = effectFn;
        effectStack.unshift(effectFn);
        const res = fn(...args);
        effectStack.shift();
        activeEffect = effectStack[0];
        return res;
    }
    effectFn.options = options;
    effectFn.deps = [];
    !options.lazy && effectFn();
    return effectFn;
}

function computed(getter) {
    let value;
    let dirty = true;
    const effectFn = effect(getter, {
        lazy: true,
        scheduler(fn) {
            dirty = true;
            // fn(); 这里不会执行 effectFn，因为被回调了也拿不到新的计算值。需要触发外部的 effectFn，促使其重新读取脏值。
            trigger(obj, 'value')
        }
    });
    const obj = {
        get value() {
            console.log('computed:get:dirty:', dirty);
            if (dirty) {
                value = effectFn();
                dirty = false;
                track(obj, 'value'); // 跟踪当前计算属性，此时的 effectFn 是依赖此计算属性的 effect
            }
            return value;
        }
    };
    return obj;
}

// 统一监听，然后分发给应用层
function watch(source, cb, options = {}) {
    let getter;
    let oldValue, newValue;
    let cleanup;
    function onInvalidate(fn) {
        cleanup = fn;
    }

    function job() {
        newValue = effectFn();
        if (cleanup) {
            cleanup();
        }
        cb(newValue, oldValue, onInvalidate); // 用户通过 onInvalidate 传入 cleanup
        oldValue = newValue;
    }

    if (typeof source === 'function') {
        getter = source;
    } else {
        getter = () => traverse(source);
    }

    const effectFn = effect(() => getter(), {
        lazy: true, // 手动调用以获取初始值
       scheduler() {
            if (options.flush === 'post') {
                // post 放到微任务里
                Promise.resolve().then(job);
            } else {
                // sync 同步执行
                job();
            }
       }
    });

    if (options.immediate) {
        job(); // 取值 添加依赖 & 触发回调
    } else {
        oldValue = effectFn(); // 取值一次 添加依赖
    }
}

module.exports = {
    reactive,
    shallowReactive,
    shallowReadonly,
    effect,
    computed,
    watch
}
