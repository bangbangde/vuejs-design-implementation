describe('语言特性实验', () => {
    it('typeof function', function () {
        const fn = () => {}
        const fn2 = function () {}
        console.log(typeof fn, typeof fn2)
    });

    it('getter', function () {
        const obj = {
            a: {
                get value() {
                    return 0;
                }
            }
        };
        console.log(obj.a.value)
    });
})
