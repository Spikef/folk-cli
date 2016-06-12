/**
 * Usage: 提取源码中所有中文
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
    .command('language')
    .description('Get all Chinese characters from source code for building language package.')
    .action(() => {
        let configs = fs.existsSync(cfgFile) ? require(cfgFile) : {};

        if (!configs.work || !fs.existsSync(path.resolve(configs.work, '../src'))) {
            console.warn('This command is only for development usage!');
        }else{
            try{
                language();
            }catch (e){
                console.error(e);
            }
        }
    });

function language() {
    let configs = require(cfgFile);
    let regStr = /('[^']*'|"(?!<)[^"]*")/g;
    let regHan = /[\u4e00-\u9fa5]/;
    let match;
    let codes;
    let files = [];
    let list = [];
    let base = path.resolve(configs.work, 'system');
    let text;
    let folder;

    // index
    files.push(path.resolve(base, '../index.js'));
    files.push(path.resolve(base, '../start.js'));

    // editor
    files.push(path.resolve(base, 'assets/editor/editor.ejs'));

    // api
    folder = path.resolve(base, 'api');
    files = files.concat(fs.readdirsSync(folder).files);

    // control
    folder = path.resolve(base, 'control');
    files = files.concat(fs.readdirsSync(folder).files);

    // library
    folder = path.resolve(base, 'library');
    files = files.concat(fs.readdirsSync(folder).files);

    // stage
    folder = path.resolve(base, 'stage');
    files = files.concat(fs.readdirsSync(folder).files);

    files.forEach(file => {
        codes = fs.readFileSync(file, 'utf8').split(/\r?\n/);
        codes.forEach(code => {
            match = code.match(regStr);

            if (!match) return;

            match.forEach(block => {
                if (regHan.test(block) && block.indexOf('\n') === -1) {
                    text = block.replace(/^'|^"|'$|"$/g, '');
                    let i = -1, args = [];
                    text = text.replace(/\{([^}]+)}/g, function($0, $1) {
                        i++;
                        args.push($1);
                        return '{' + i + '}';
                    });
                    !~list.indexOf(text) && list.push(text);
                }
            })
        });
    });

    let new_lines = [];
    let old_lines = fs.readFileSync(path.resolve(configs.work, '../language/zh-cn.txt'), 'utf8').split(/\n/);
    list.forEach(line => {
        if ( !~old_lines.indexOf(line) ) new_lines.push(line);
    });
    new_lines.sort();

    let target = path.resolve(configs.work, '../language/trans.txt');
    fs.writeFileSync(target, new_lines.join('\n\n'));
    
    console.info('Successfully save all text, translate them and then run [fo translate]: \n' + target);
}