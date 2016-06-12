/**
 * Usage: 使用jszip进行压缩和解压
 * Author: Spikef < Spikef@Foxmail.com >
 * Copyright: Envirs Team < http://envirs.com >
 */

"use strict";

const fs = require('fs-arm');
const path = require('path');
const jszip = require('jszip');

class Zip {
    constructor() {}
    
    static compress(folder, zipFile) {
        // 遍历文件夹
        let dir = fs.readdirsSync(folder);

        let zip = new jszip();
        let relative;
        // 将文件夹压入zip
        dir.folders.forEach(function(fd) {
            relative = path.relative(folder, fd);
            relative = relative.replace(/\\/g, '/');
            zip.folder(relative);
        });

        // 将文件内容压入zip
        dir.files.forEach(function(fl) {
            relative = path.relative(folder, fl);
            relative = relative.replace(/\\/g, '/');
            zip.file(relative, fs.readFileSync(fl));
        });

        // 保存zip文件
        let content = zip.generate({compression:'DEFLATE',type:"nodebuffer"});
        fs.writeFileSync(zipFile, content);
    }
    
    static extract(zipFile, folder) {
        let data = fs.readFileSync(zipFile);
        let zip = new jszip(data);
        let fds = zip.folder(/.+/);
        let fls = zip.file(/.+/);

        // 创建文件夹
        fs.mkdirsSync(folder);	// 解包根目录
        fds.forEach(function(fd) {
            fs.mkdirsSync(path.resolve(folder, fd.name));
        });

        // 读取并创建文件
        fls.forEach(function(fl) {
            let content = zip.file(fl.name).asNodeBuffer();
            fs.writeFileSync(path.resolve(folder, fl.name), content);
        });
    }
}

module.exports = Zip;