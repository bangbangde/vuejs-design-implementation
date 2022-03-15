it('', () => {
    watch(() => obj.text, async (nVal, oVal, onInvalidate) => {
        console.log('听到了', nVal, oVal);
        let expired = false;
        onInvalidate(() => expired = true); // 将 expired 控制权交给调度器
        await new Promise(resolve => setTimeout(resolve, 3000));
        if (!expired) {
            console.log(nVal, '没过期！')
        } else {
            console.log(nVal, '过期了！')
        }

    }, {
        immediate: true,
        flush: 'pre' // 还可以指定为 'post' | 'sync' # 指定调度函数的执行时机
    })

    const greet = computed(() => obj.title + ' ' + obj.text);
    effect(() => {
        console.log('effect', greet.value);
    }, {
        scheduler(fn) {
            jobQueue.add(fn);
            flushJob();
        }
    })
    obj.text += '!'
    setTimeout(() => {
        obj.text += '!'
    }, 2000)
})


it('getter', function () {
    effect(() => {
        console.log('effect:', obj.msg)
    });
    obj.text += '!'
});


it('for...in', () => {
    effect(() => {
        for(const c in obj.text) {
            console.log('effect-', c)
        }
    });
    obj.text += '!'
})

it('Reflect.set的反常线下', function () {
    function reactive(obj, label){
        return new Proxy(obj, {
            get(t, p, r){
                console.log('get', label, p);
                return Reflect.get(t, p, r);
            },
            set(t, p, v, r) {
                console.log('set', label, p);
                return Reflect.set(t, p, v, r);
            }
        });
    }

    var obj = {}
    var proto = {bar: 1}
    var child = reactive(obj, 'child-obj')
    var parent = reactive(proto, 'parent-proto')
    Reflect.setPrototypeOf(child, parent);
    console.log(child.bar);
    child.bar = 2; // 很奇怪，为什么会触发原型对象的 set 钩子么？
    console.log(parent.bar); // 而且还没有改变原型上的值
    /**
     * A: 规范规定，set 同样拦截继承属性的赋值操作： `Object.create(proxy)[foo] = bar`。
     * eg.
     * - 假设有一段代码执行 obj.name = "jen"， obj 不是一个 proxy，且自身不含 name 属性，
     * - 但是它的原型链上有一个 proxy，
     * - 那么，那个 proxy 的 set() 处理器会被调用，而此时，obj 会作为 receiver 参数传进来。
     */
    console.log(child.bar); // 属性加到 child 上了
});
it('should ', function () {
    const obj = {foo: 1};
    const proto = new Proxy(obj, {
        // set(target, p, value, receiver) {
        //     console.log('set:', target === obj, p, value, receiver === child);
        //     return Reflect.set(target, p, value, receiver);
        //     // target[p] = value;
        //     // return true;
        // }
    });
    const child = Object.create(proto);
    const t = {};
    Reflect.set(obj, 'bar', 2);
    // child.bar = 2;
    console.log(obj.hasOwnProperty('bar'))
});
