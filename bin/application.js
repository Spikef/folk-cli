/**
 * Usage: 生成主题或者插件模板
 * Author: Spikef < Spikef@Foxmail.com >
 * Copyright: Envirs Team < http://envirs.com >
 */

"use strict";

const fs = require('fs-arm');
const path = require('path');
const app = require('cmdu');
const console = require('../lib/console');
const inquirer = require('inquirer');

const cfgFile = path.resolve(__dirname, '../configs/global.json');

app
    .command('theme')
    .describe('Create a new theme.')
    .action(() => application('theme'));

app
    .command('plugin')
    .describe('Create a new plugin')
    .action(() => application('plugin'));

function application(mode) {
    let configs = fs.existsSync(cfgFile) ? require(cfgFile) : {};

    if (!configs.work || !fs.existsSync(path.resolve(configs.work, 'vision'))) {
        console.warn('You didn\'t set a correct website location!');
        console.info('cd to your website folder, and run [fo init]!');

        return;
    }

    let questions = [
        {
            type: 'input',
            name: 'name',
            message: 'Your ' + mode + ' name: ',
            default: path.basename(process.cwd()),
            validate: input => input ? true : 'The name shouldn\'t keep empty!'
        },
        {
            type: 'input',
            name: 'description',
            message: 'Description: ',
            validate: input => input ? true : 'The description shouldn\'t keep empty!'
        },
        {
            type: 'input',
            name: 'username',
            message: 'Your name: ',
            default: configs.username || '',
            validate: input => input ? true : 'The username shouldn\'t keep empty!'
        },
        {
            type: 'input',
            name: 'email',
            message: 'Your email: ',
            default: configs.email || '',
            validate: input => input ? true : 'The email shouldn\'t keep empty!'
        },
        {
            type: 'input',
            name: 'url',
            message: 'Your website: ',
            default: configs.url || '',
            validate: input => input ? true : 'The url shouldn\'t keep empty!'
        },
        {
            type: 'input',
            name: 'homepage',
            message: 'Project\'s homepage: ',
            default: ''
        }
    ];

    inquirer
        .prompt(questions)
        .then(answers => {
            return new Promise((resolve, reject) => {
                let folder = mode === 'theme' ? 'themes' : 'plugins';
                let target = path.resolve(configs.work, 'vision', folder, answers.name);

                answers.target = target;

                if (!fs.existsSync(target) || !fs.readdirSync(target).length) {
                    resolve(answers);
                }else{
                    inquirer
                        .prompt([{
                            type: 'confirm',
                            name: 'overwrite',
                            message: 'The target folder is not empty, do you want to overwrite?',
                            default: false
                        }])
                        .then(_answers => {
                            if (_answers.overwrite) {
                                resolve(answers);
                            }else {
                                reject();
                            }
                        })
                }
            });
        })
        .then(answers => {
            let theme = mode === 'theme';
            let plugin = mode === 'plugin';

            let questions = [
                {
                    type: 'confirm',
                    name: 'options',
                    message: 'Do you need custom options?',
                    default: true
                },
                {
                    type: 'confirm',
                    name: 'scripts',
                    message: 'Do you need custom scripts?',
                    default: true,
                    when: theme
                },
                {
                    type: 'confirm',
                    name: 'language',
                    message: 'Do you need multiple language support?',
                    default: true
                },
                {
                    type: 'confirm',
                    name: 'table',
                    message: 'Do you need custom data table?',
                    default: false,
                    when: plugin
                },
                {
                    type: 'confirm',
                    name: 'control',
                    message: 'Do you need control panel?',
                    default: false,
                    when: plugin
                },
                {
                    type: 'confirm',
                    name: 'navigator',
                    message: 'Do you need navigator?',
                    default: false,
                    when: plugin
                },
                {
                    type: 'confirm',
                    name: 'hook',
                    message: 'Do you need hook support?',
                    default: false,
                    when: plugin
                }
            ];

            return new Promise((resolve, reject) => {
                inquirer
                    .prompt(questions)
                    .then(_answers => {
                        Object.keys(_answers).forEach(key => answers[key] = _answers[key]);
                        resolve(answers);
                    })
            })
        })
        .then(answers => {
            var source = path.resolve(__dirname, '../templates');
            var target = answers.target;
            var packet = fs.readJSONSync(path.resolve(source, 'package.json'));

            fs.copySync(path.resolve(source, mode), target, true);

            packet.name = answers.name;
            packet.description = answers.description;
            packet.author.name = answers.username;
            packet.author.email = answers.email;
            packet.author.url = answers.url;
            packet.homepage = answers.homepage;

            if (mode === 'theme') {
                packet.plugins = {};

                try{
                    let plugins = require(path.resolve(configs.work, 'vision/caches/plugins.json')).data;
                    for (let i in plugins) {
                        if (!plugins.hasOwnProperty(i)) continue;

                        let p = plugins[i];
                        packet.plugins[p.name] = '>=' + p.version;
                    }
                }catch(e){}
            }else{
                if (answers.control) {
                    packet.control = {
                        name: 'Control',
                        icon: 'fa-plug',
                        pages: answers.name
                    }
                }
                if (answers.navigator) {
                    packet.navigator = {
                        name: answers.name,
                        icon: 'fa-plug',
                        pages: answers.name,
                        method: null
                    }
                }
            }

            const resolve = function () {
                let args = [target].concat(Array.prototype.slice.call(arguments));
                return path.resolve.apply(path, args);
            };

            fs.writeFileSync(resolve('package.json'), JSON.stringify(packet, null, 4));

            if (mode === 'theme') {
                if (!answers.options) fs.removeSync(resolve('options.json'));
                if (!answers.language) fs.removeSync(resolve('language'));
                if (!answers.scripts) fs.removeSync(resolve('scripts'));
            }else{
                if (!answers.options) fs.removeSync(resolve('options.json'));
                if (!answers.language) fs.removeSync(resolve('language'));
                if (!answers.hook) fs.removeSync(resolve('hook.js'));
                if (!answers.control) {
                    fs.removeSync(resolve('assets'));
                    fs.removeSync(resolve('scripts'));
                    fs.removeSync(resolve('views'));
                }else{
                    fs.rename(resolve('assets/css/demo.css'), resolve('assets/css/' + answers.name + '.css'));
                    fs.rename(resolve('assets/js/demo.js'), resolve('assets/js/' + answers.name + '.js'));
                    fs.rename(resolve('scripts/demo.js'), resolve('scripts/' + answers.name + '.js'));
                    fs.rename(resolve('views/demo.ejs'), resolve('views/' + answers.name + '.ejs'));
                }
                if (!answers.table) {
                    fs.removeSync(resolve('table.js'));
                }else{
                    let table = fs.readFileSync(resolve('table.json'), 'utf8');
                    table = table.replace(/demo/g, answers.name);
                    fs.writeFileSync(resolve('table.json'), table);
                }
            }

            console.info('Successfully create the ' + mode + ' ' + answers.name + '!');
            console.info('Locals: ' + answers.target);
        });
}
