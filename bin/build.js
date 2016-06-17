/**
 * Usage: 打包安装包
 * Author: Spikef < Spikef@Foxmail.com >
 * Copyright: Envirs Team < http://envirs.com >
 */

"use strict";

const fs = require('fs-arm');
const path = require('path');
const app = require('cmdu');
const inquirer = require('inquirer');
const crypts = require('crypts');
const pack = require('fo-pack');
const semver = require('semver');
const colors = require('colors');
const zip = require('../lib/zip');
const console = require('../lib/console');
const compress = require('../lib/compress');

const cfgFile = path.resolve(__dirname, '../configs/global.json');

app
    .command('build [mode]', {noHelp: true})
    .describe('Build the installation package.')
    .describe('mode', 'Release [asp] or [node]')
    .option('-d, --debug', 'Whether build the debug package or not')
    .option('-u, --update', 'Whether build the upgrade package or not')
    .action((mode, options) => {
        mode = /a/.test(mode) ? 'asp' : 'node';
        options.debug = !!options.debug;
        options.update = !!options.update;

        let configs = fs.existsSync(cfgFile) ? require(cfgFile) : {};

        if (!configs.work || !fs.existsSync(path.resolve(configs.work, '../src'))) {
            console.warn('This command is only for development usage!');
        }else{
            try{
                build(mode, options.debug, options.update);
            }catch (e){
                console.error(e);
                process.exit(0);
            }
        }
    });

function build(mode, debug, update) {
    let configs = require(cfgFile);
    let resolve = function() {
        let args = [configs.work].concat(Array.prototype.slice.call(arguments));
        return path.resolve.apply(path, args);
    };

    let version = require(resolve('../package.json')).version;

    let ui = new inquirer.ui.BottomBar();

    ui.updateBottomBar('Begin to build the ' + mode + ' Folk installation package');

    // step 1: 删除自动生成的.DS_Store文件
    ui.updateBottomBar('Clearing the cache file');
    let project = resolve('../');
    fs.readdirsSync(project).files.forEach(file => /\.DS_Store/.test(file) && fs.unlinkSync(file));

    // step 2: 创建或清空temp目录
    ui.updateBottomBar('Creating the temp folder');
    let temp = resolve('../temp');  // 临时目录
    let base = resolve('../');      // 程序所在目录

    fs.emptydirSync(temp);   // 创建或清空目标文件夹

    // step3: 复制需要打包的文件
    ui.updateBottomBar('Copying the target files');
    (function(){
        let config = path.resolve(__dirname, '../configs/' + mode + '_files.ini');
        if (!fs.existsSync(config)) return;

        let configs = fs.readFileSync(config, 'utf8');
        let list = configs.split(/\r?\n/);
        let from = base;
        let root = temp;
        let source, target, folder, pattern, mark, name;

        list.forEach(line => {
            if ( line.length === 0 || /^#|;/.test(line) ) return;

            if ( /^\[/.test(line) ) {
                folder = line.replace(/(^\[|]$)/g, '').split('|');
                folder[1] = folder[1] || folder[0];
                from = path.resolve(base, folder[0]);
                root = path.resolve(temp, folder[1]);

                return;
            }

            if (/=|!/.test(line)) {
                mark = line.search(/=|!/);
                folder = path.resolve(from, line.substr(0, mark));

                pattern = line.substr(mark + 1);
                pattern = new RegExp('^' + pattern + '$', 'i');

                fs.readdirsSync(folder).files.forEach(function(file) {
                    name = path.relative(folder, file).replace(/\\/g, '/');
                    let b = (/^[^!]+=/.test(line) && pattern.test(name)) || (/^[^=]+!/.test(line) && !pattern.test(name));

                    if ( b ) {
                        source = file;
                        target = path.resolve(root, path.relative(from, file));
                        fs.copySync(source, target);
                    }
                });

                return;
            }

            if ( /(\/|\\)$/.test(line) ) {
                folder = path.resolve(from, line);
                if (fs.existsSync(folder)) {
                    target = path.resolve(root, path.relative(from, folder));
                    fs.mkdirsSync(target);
                }
                return;
            }

            source = path.resolve(from, line);
            target = path.resolve(root, path.relative(from, source));
            fs.existsSync(source) && fs.copySync(source, target);
        });

        if (mode === 'asp') {
            fs.copySync(resolve(temp, 'default.asp'), resolve(temp, 'api.asp'));
            fs.copySync(resolve(temp, 'default.asp'), resolve(temp, 'article.asp'));
            fs.copySync(resolve(temp, 'default.asp'), resolve(temp, 'control.asp'));
            fs.copySync(resolve(temp, 'default.asp'), resolve(temp, 'list.asp'));
            fs.copySync(resolve(temp, 'default.asp'), resolve(temp, 'plugin.asp'));
        } else {
            fs.copySync(resolve('../package.json'), resolve(temp, 'package.json'));
            fs.renameSync(resolve(temp, 'start.js'), resolve(temp, 'index.js'));
        }
    }());

    // step4: 生成版本号
    ui.updateBottomBar('Save version to configs');
    (function(){
        let optFile = resolve(temp, 'install/data/config.json');
        let configs = require(optFile);
        configs.version = version;
        fs.writeFileSync(optFile, JSON.stringify(configs, null, 4));
    }());

    // step5: 生成并替换语言文件
    ui.updateBottomBar('Replacing language');
    (function(){
        let list = fs.readFileSync(path.resolve(configs.work, '../language/zh-cn.txt'), 'utf8').split(/\r?\n/);
        let regStr = /('[^']*'|"(?!<)[^"]*")/g;
        let regHan = /[\u4e00-\u9fa5]/;
        let match;
        let codes;
        let index;
        let quote;
        let value;
        let files = [];
        let base = path.resolve(temp, 'system');
        let text;
        let folder;

        // index
        files.push(path.resolve(base, '../index.js'));

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
            codes = codes.map(code => {
                match = code.match(regStr);

                if (!match) return code;

                return code.replace(regStr, function(block) {
                    if (regHan.test(block) && !~block.indexOf('\n')) {
                        quote = /^'/.test(block) ? "'" : '"';
                        text = block.replace(/^'|^"|'$|"$/g, '');
                        let i = -1, args = [];
                        text = text.replace(/\{([^}]+)}/g, ($0, $1) => {
                            i++;
                            args.push($1);
                            return '{' + i + '}';
                        });
                        index = list.indexOf(text);
                        if (!!~index) {
                            if (/\.json$/i.test(file)) {
                                value = index;
                            } else if (/\.ejs/i.test(file)) {
                                args = args.length ? ', ' + args.join(', ') : '';
                                value = 'lan(' + index + args + ')';
                            } else {
                                args = args.length ? ', ' + args.join(', ') : '';
                                value = 'blog.lan(' + index + args + ')';
                            }
                            return value;
                        } else {
                            return block;
                        }
                    } else {
                        return block;
                    }
                });
            });

            codes = codes.join('\n');

            fs.writeFileSync(file, codes);
        });

        let menu = path.resolve(base, 'control/scripts/index.js');
        codes = fs.readFileSync(menu, 'utf8');
        codes = codes.replace(/\/\/ :-> ([^\n]+)\n[^\n]+/g, '$1');
        fs.writeFileSync(menu, codes);
    }());

    // step6: 混淆代码
    (function(){
        if (debug) return;

        ui.updateBottomBar('Compression javascript codes');

        let config = path.resolve(__dirname, '../configs/' + mode + '_blurs.ini');
        if (!fs.existsSync(config)) return;

        let configs = fs.readFileSync(config, 'utf8');
        let list = configs.split(/\r?\n/);
        let root = temp, file, folder, pattern, mark, name;

        list.forEach(line => {
            if ( line.length === 0 || /^#|;/.test(line) ) return;

            if ( /^\[/.test(line) ) {
                root = path.resolve(temp, line.replace(/(^\[|]$)/g, ''));
                return;
            }

            if (/=|!/.test(line)) {
                mark = line.search(/=|!/);
                folder = path.resolve(root, line.substr(0, mark));

                pattern = line.substr(mark + 1);
                pattern = new RegExp('^' + pattern + '$', 'i');

                fs.readdirsSync(folder).files.forEach(file =>  {
                    name = path.relative(folder, file).replace(/\\/g, '/');
                    let b = (/^[^!]+=/.test(line) && pattern.test(name)) || (/^[^=]+!/.test(line) && !pattern.test(name));

                    if ( b ) compress(file);
                });

                return;
            }

            if ( /(\/|\\)$/.test(line) ) {
                folder = path.resolve(root, line);

                fs.readdirsSync(folder).files.forEach(file => {
                    compress(file);
                });

                return;
            }

            folder = path.resolve(root, line);
            if (fs.existsSync(folder)) {
                let stat = fs.lstatSync(folder);
                if (stat.isDirectory()) {
                    fs.readdirsSync(folder).files.forEach(file => {
                        compress(file);
                    });
                } else if (stat.isFile()) {
                    file = folder;
                    compress(file);
                }
            }
        });
    }());

    // step7: 扫描文件crc32校验码, 用于生成升级包
    ui.updateBottomBar('Calculating the files crc32 codes');
    (function(){
        let code = {
            engine: mode,
            version: version,
            folders: [],
            files: {}
        };

        let crc32 = require('crypts/lib/crc32');
        let result = fs.readdirsSync(temp);

        for (let folder of result.folders) {
            let name = path.relative(temp, folder).replace(/\\/g, '/');
            code.folders.push(name);
        }
        
        for (let file of result.files) {
            let name = path.relative(temp, file).replace(/\\/g, '/');
            code.files[name] = crc32(file);
        }

        fs.writeFileSync(resolve('../update/release_codes/check_' + mode + '_v' + version + '.json'), JSON.stringify(code, null, 4));
    }());

    // step8: 拷贝数据库文件
    ui.updateBottomBar('Copying the database contractor');
    (function(){
        var minor = semver.minor(version);
        var source = resolve(temp, 'install/data/table.json');
        var target = resolve('../update/database/' + minor + '.json');
        !fs.existsSync(target) && fs.copySync(source, target);
    }());

    // step9: 拷贝安装必要文件
    ui.updateBottomBar('Copying the installation application files');
    (function() {
        let ReadMe;
        fs.emptydirSync(resolve('../publish'));
        fs.emptydirSync(resolve('../publish/install'));
        if (mode === 'asp') {
            ReadMe = [
                '将install文件夹(包括install文件夹本身)上传到网站根目录',
                '然后访问[http://你的网站域名/install]进行安装',
                '',
                'Upload the install folder(include install) to the root dir of your website',
                'Open browser to visit [http://yourdomain/install] to install Folk'
            ].join('\r\n');
            fs.moveSync(resolve(temp, 'install/default.asp'), resolve('../publish/install/default.asp'));
            fs.moveSync(resolve(temp, 'install/NodeAsp.min.asp'), resolve('../publish/install/NodeAsp.min.asp'));
            fs.moveSync(resolve(temp, 'install/index.js'), resolve('../publish/install/index.js'));
            fs.writeFileSync(resolve('../publish/ReadMe.txt'), ReadMe);
        }else{
            ReadMe = [
                '将install文件夹(包括install文件夹本身)上传到网站根目录',
                '然后在命令行执行[node install]进行安装',
                '',
                'Upload the install folder(include install) to the root dir of your website',
                'Open terminal or cmd to run [node install] to install Folk'
            ].join('\r\n');
            fs.moveSync(resolve(temp, 'install/index.js'), resolve('../publish/install/index.js'));
            fs.writeFileSync(resolve('../publish/ReadMe.txt'), ReadMe);
        }
    }());

    // step10: 打包flk文件
    ui.updateBottomBar('Packing the folk installation file');
    (function(){
        var source = temp;
        var target = resolve('../publish/install/install.flk');

        pack.combine(source, target, 'F');
    }());

    // step11: 升级
    (function(){
        if (!update || debug) return;
        ui.updateBottomBar('Generating the upgrade packages');
        var Update = require('../lib/update');
        Update(version, mode, temp);
    }());

    // step11: 压缩
    ui.updateBottomBar('Compressing the installation package');
    zip.compress(resolve('../publish'), resolve('../release/install_' + mode + '_v' + version + '.zip'));
    fs.removeSync(temp);

    // step11: 结束
    let timer = String(process.uptime()).red;
    ui.updateBottomBar('Everything is done, cost ' + timer + ' s.');
    console.info('\nLocation:  ' + resolve('../release'));
    process.exit(0);
}