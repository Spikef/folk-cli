/**
 * Usage: 将翻译好的结果存入语言文件
 * Author: Spikef < Spikef@Foxmail.com >
 * Copyright: Envirs Team < http://envirs.com >
 */

"use strict";

const fs = require('fs-arm');
const path = require('path');
const console = require('../lib/console');
const program = require('commander');
const inquirer = require('inquirer');

const cfgFile = path.resolve(__dirname, '../configs/global.json');

program
    .command('translate')
    .description('Build language package from translated texts.')
    .action(() => {
        let configs = fs.existsSync(cfgFile) ? require(cfgFile) : {};

        if (!configs.work || !fs.existsSync(path.resolve(configs.work, '../src'))) {
            console.warn('This command is only for development usage!');
        }else{
            try{
                translate();
            }catch (e){
                console.error(e);
            }
        }
    });

function translate() {
    let configs = require(cfgFile);
    let trans = path.resolve(configs.work, '../language/trans.txt');
    let cn = path.resolve(configs.work, '../language/zh-cn.txt');
    let en = path.resolve(configs.work, '../language/en-us.txt');
    let lans = {
        trans: fs.readFileSync(trans, 'utf8').split(/\n/),
        cn: fs.readFileSync(cn, 'utf8').split(/\n/),
        en: fs.readFileSync(en, 'utf8').split(/\n/)
    };

    for (var i=0, l=lans.trans.length-1;i<l;i=i+2) {
        let line_cn = lans.trans[i];
        let line_en = lans.trans[i+1];

        if (!~lans.cn.indexOf(line_cn)) {
            lans.cn.push(line_cn);
            lans.en.push(line_en);
        }
    }

    fs.writeFileSync(cn, lans.cn.join('\n'));
    fs.writeFileSync(en, lans.en.join('\n'));

    let target = {
        cn: path.resolve(configs.work, 'system/language/zh-cn.json'),
        en: path.resolve(configs.work, 'system/language/en-us.json')
    };

    let source = {
        cn: fs.readJSONSync(target.cn),
        en: fs.readJSONSync(target.en)
    };

    source.cn.system = lans.cn;
    source.en.system = lans.en;

    source.cn = JSON.stringify(source.cn, null, 2);
    source.en = JSON.stringify(source.en, null, 2);

    fs.writeFileSync(target.cn, source.cn);
    fs.writeFileSync(target.en, source.en);
    
    fs.removeSync(trans);

    console.info('Successfully build the language package!');
}