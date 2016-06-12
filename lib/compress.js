/**
 * Usage: 使用UglifyJS对js文件压缩
 * Author: Spikef < Spikef@Foxmail.com >
 * Copyright: Envirs Team < http://envirs.com >
 */

"use strict";

const fs = require('fs');
const UglifyJS  = require('uglify-js');

module.exports = function(source) {
    try{
        let result = UglifyJS.minify(source);
        fs.writeFileSync(source, result.code);
    }catch(e){
        console.log('Get error when compress: ' + source);
        throw e;
    }
};