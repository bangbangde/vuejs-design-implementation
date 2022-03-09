/**
 * 结论：
 * 1. 数组的修改不会改变每一轮循环中的 index 值
 * 2. 每一轮的 item 是根据当前轮 index 与上一轮数组状态取的
 */
describe('数组变化对 forEach 的影响', function () {
    it('length 变小会影响循环次数', function () {
        let arr = [[1], [2], [3]];
        arr.forEach((item, index, target) => {
            arr.length = 1;
            console.log(item, index, target);
        })
    });
    it('length 变大不会影响循环次数', function () {
        let arr = [[1], [2], [3]];
        arr.forEach((item, index, target) => {
            arr.length = 4;
            console.log(item, index, target);
        })
    });
    it('arr 赋 null 不会影响循环', function () {
        let arr = [[1], [2], [3]];
        arr.forEach((item, index, target) => {
            arr = null; // 同理赋其他值也不影响
            console.log(item, index, target);
        })
        console.log(arr);
    });
    it('unshift 会影响后续的循环', function () {
        let arr = [[1], [2], [3]];
        arr.forEach((item, index, target) => {
            arr.unshift(`u-${index}`);
            console.log(item, index, target);
        })
    });
    it('shift 会影响后续的循环', function () {
        let arr = [[1], [2], [3]];
        arr.forEach((item, index, target) => {
            arr.shift();
            console.log(item, index, target);
        })
    });
    it('pop 会影响后续的循环', function () {
        let arr = [[1], [2], [3]];
        arr.forEach((item, index, target) => {
            arr.pop();
            console.log(item, index, target);
        })
    });
    it('push 不会影响后续的循环', function () {
        let arr = [[1], [2], [3]];
        arr.forEach((item, index, target) => {
            arr.push(`p-${index}`);
            console.log(item, index, target);
        })
    });
});
