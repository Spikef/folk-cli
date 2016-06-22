#!/usr/bin/env node

"use strict";

const fs = require('fs-arm');
const path = require('path');
const app = require('cmdu');
const console = require('../lib/console');
const inquirer = require('inquirer');

const cfgFile = path.resolve(__dirname, '../configs/global.json');

app.version = require('../package.json').version;

if (!fs.existsSync(cfgFile)) {
    if (!~process.argv.indexOf('init')) {
        console.info('Please run [fo init] first to set your website location.');
        process.exit(0);
    }
}

app.action(function (options) {
    if (!options.help && !options.version) {
        this.showHelp();
    }
});

app
    .command('init')
    .describe('Initialize configuration settings for fo!')
    .action(() => {
        let configs = fs.existsSync(cfgFile) ? require(cfgFile) : {};
        let questions = [
            {
                type: 'input',
                name: 'username',
                message: 'Your name: ',
                default: configs.username || ''
            },
            {
                type: 'input',
                name: 'email',
                message: 'Your email: ',
                default: configs.email || ''
            },
            {
                type: 'input',
                name: 'url',
                message: 'Your website: ',
                default: configs.url || ''
            }
        ];

        inquirer
            .prompt(questions)
            .then((answers) => {
                configs.work = process.cwd();
                configs.username = answers.username;
                configs.email = answers.email;
                configs.url = answers.url;

                if (fs.existsSync(path.resolve(configs.work, 'src'))) {
                    configs.work = path.resolve(configs.work, 'src');
                }

                fs.writeFileSync(cfgFile, JSON.stringify(configs, null, 4));
            });
    });

require('./application');
require('./app_pack');

app.listen();