#!/usr/bin/env node

"use strict";

const fs = require('fs-arm');
const path = require('path');
const console = require('../lib/console');
const program = require('commander');
const inquirer = require('inquirer');

const version = require('../package.json').version;
const cfgFile = path.resolve(__dirname, '../configs/global.json');

program
    .version(version, '-v, --version')
    .parse(process.argv);

if (!fs.existsSync(cfgFile)) {
    if (!~process.argv.indexOf('init')) {
        console.info('Please run [fo init] first to set your website location.');
        process.exit(0);
    }
}

program
    .command('init')
    .description('Initialize configuration settings for fo!')
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
require('./language');
require('./translate');
require('./build');

program.parse(process.argv);
