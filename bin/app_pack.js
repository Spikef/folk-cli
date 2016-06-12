/**
 * Usage: 将主题或者插件进行打包
 * Author: Spikef < Spikef@Foxmail.com >
 * Copyright: Envirs Team < http://envirs.com >
 */

"use strict";

const fs = require('fs-arm');
const path = require('path');
const console = require('../lib/console');
const program = require('commander');
const inquirer = require('inquirer');
const crypts = require('crypts');
const pack = require('fo-pack');

const cfgFile = path.resolve(__dirname, '../configs/global.json');

const Types = {
    THEME: Symbol('theme'),
    PLUGIN: Symbol('plugin')
};

const folders = {[Types.THEME]: 'themes', [Types.PLUGIN]: 'plugins'};
const markers = {[Types.THEME]: 'T', [Types.PLUGIN]: 'P'};

program
    .command('pack')
    .description('Pack theme or plugin to folk installation package.')
    .action(() => {
        let configs = fs.existsSync(cfgFile) ? require(cfgFile) : {};

        if (!configs.work || !fs.existsSync(path.resolve(configs.work, 'vision'))) {
            console.warn('You didn\'t set a correct website location!');
            console.info('cd to your website folder, and run [fo init]!');

            return;
        }
        
        inquirer
            .prompt([{
                type: 'list',
                name: 'type',
                choices: Object.keys(Types),
                message: 'Select which type app you want to pack:',
                default: 0
            }])
            .then(answers => {
                let folder = path.resolve(configs.work, 'vision', folders[Types[answers.type]]);
                let list = [], type = Types[answers.type];
                fs.existsSync(folder) && fs.readdirSync(folder).forEach((name) => {
                    let value = path.resolve(folder, name);
                    let stat = fs.lstatSync(value);
                    
                    if (stat.isDirectory() && fs.existsSync(path.resolve(value, 'package.json'))) {
                        list.push({name, value});
                    }
                });
                
                return new Promise((resolve, reject) => {
                    if (!list.length) {
                        console.warn('No ' + answers.type + ' need to be packed!');
                        reject();
                    }else{
                        resolve({list, type});
                    }
                })
            })
            .then(obj => {
                inquirer
                    .prompt([{
                        type: 'list',
                        name: 'name',
                        message: 'Select which app you want to pack:',
                        choices: obj.list,
                        default: 0
                    }])
                    .then(answers => app_pack(answers.name, obj.type));
            });
    });

function app_pack(source, type) {
    try{
        let target = path.resolve(path.dirname(source), path.basename(source) + '.flk');
        
        let info = {}, key, val;

        fs.readdirsSync(source).files.forEach(filename => {
            if (/^\.DS_Store/i.test(filename)) {
                fs.removeSync(filename);
                return;
            }
            
            if (/license\.key$/.test(filename)) return;
            if (/package\.json/.test(filename)) return;

            key = crypts.sha1(path.relative(source, filename));
            val = crypts.sha1(crypts.crc32(filename) + '~CHECK-FILE-VALID!');

            info[key] = val;
        });

        let buf = new Buffer(JSON.stringify(info));
        for (let i=0, l=buf.length; i<l; i++) {
            buf[i] = 255 - buf[i];
        }

        fs.writeFileSync(path.resolve(source, 'license.key'), buf);

        let packet = fs.readJSONSync(path.resolve(source, 'package.json'));
        delete packet.dev;
        packet.mark = crypts.sha1(crypts.crc32(path.resolve(source, 'license.key')) + '-license.key');
        fs.writeFileSync(path.resolve(source, 'package.json'), JSON.stringify(packet, null, 4));

        let mark = markers[type];
        pack.combine(source, target, mark);
        
        console.info('Successfully packed the app at: \n' + target);
    }catch (e){
        console.error(e);
    }
}