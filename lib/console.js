/**
 * Usage: 自定义console, 使用颜色输出
 * Author: Spikef < Spikef@Foxmail.com >
 * Copyright: Envirs Team < http://envirs.com >
 */

"use strict";

const util = require('util');
const colors = require('colors');

class Console {
    constructor() {}

    static log() {
        console.log.apply(this, arguments);
    }

    static info() {
        let log = util.format.apply(this, arguments);
        console.log(log.cyan);
    }

    static warn() {
        let log = util.format.apply(this, arguments);
        console.log(log.yellow);
    }

    static error() {
        let log = util.format.apply(this, arguments);
        console.error(log.red);
    }

    static trace() {
        console.trace.apply(this, arguments);
    }

    static dir() {
        console.dir.apply(this, arguments);
    }

    static assert() {
        console.assert.apply(this, arguments);
    }

    static time() {
        console.time.apply(this, arguments);
    }

    static timeEnd() {
        console.timeEnd.apply(this, arguments);
    }
}

module.exports = Console;
