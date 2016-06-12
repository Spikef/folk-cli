/**
 * Usage: 生成升级文件
 * Author: Spikef < Spikef@Foxmail.com >
 * Copyright: Envirs Team < http://envirs.com >
 */

"use strict";

const fs = require('fs-arm');
const path = require('path');
const zip = require('./zip');
const pack = require('fo-pack');
const semver = require('semver');

var databaseUpdates = {};

/**
 * 生成升级文件包
 * @param version: 当前版本
 * @param mode: node或者asp
 * @param temp: 临时文件夹
 */
module.exports = function(version, mode, temp) {
    let update = path.resolve(temp, '../update');
    let flag = 'check_' + mode + '_v';
    let table_folder = path.resolve(update, 'database');
    let release_codes = path.resolve(update, 'release_codes');
    let newCodeFile, oldCodeFile, newCodes, oldCodes, newDBVer, oldDBVer;
    newDBVer = semver.minor(version);
    newCodeFile = 'check_' + mode + '_v' + version + '.json';
    newCodes = fs.readJSONSync(path.resolve(release_codes, newCodeFile));
    fs.readdirSync(release_codes).forEach(function(file){
        let arr = file.split(/_v|_|\.(?=json)/);
        let m = arr[1], v = arr[2];
        if (semver.gte(v, version)) return;
        if (/\.json$/.test(file) && !file.indexOf(flag) ) {
            oldCodeFile = path.resolve(release_codes, file);
            oldCodes = fs.readJSONSync(oldCodeFile);
            if (oldCodes.engine !== m) throw new Error('Error check code file: ' + file);
            if (oldCodes.version !== v) throw new Error('Error check code file: ' + file);

            // 比较文件和目录
            let result = compare(oldCodes, newCodes);

            // 数据库版本不一致
            oldDBVer = semver.minor(oldCodes.version);
            if (newDBVer !== oldDBVer) {
                let from_to = oldDBVer + '_' + newDBVer;
                if (!databaseUpdates[from_to]) {
                    let oldTables = fs.readJSONSync(path.resolve(table_folder, oldDBVer + '.json'));
                    let newTables = fs.readJSONSync(path.resolve(table_folder, newDBVer + '.json'));
                    databaseUpdates[from_to] = database(oldTables, newTables);
                }
                merge(databaseUpdates[from_to], result);
            }

            // 处理对比结果
            let bundle = path.resolve(update, 'bundle', mode, mode + '_' + v + '_to_' + version);
            let save = path.resolve(update, 'save');
            result.filesToUpdate.forEach(file => {
                let source = path.resolve(temp, file);
                let target = path.resolve(save, file);
                fs.copySync(source, target);
            });

            if (result.filesToUpdate.length) {
                zip.compress(save, bundle + '.zip');
                pack.combine(save, bundle + '.flk', 'U');
                fs.removeSync(save);
            }

            fs.writeFileSync(bundle + '.json', JSON.stringify(result, null, 2));
        }
    });
};

function compare(oldCodes, newCodes) {
    let foldersToCreate = [],
        foldersToRemove = [],
        filesToUpdate = [],
        filesToRemove = [];

    newCodes.folders.forEach(folder => {
        if (!~oldCodes.folders.indexOf(folder) && !/^install/.test(folder)) {
            foldersToCreate.push(folder);
        }
    });

    oldCodes.folders.forEach(folder => {
        if (!~newCodes.folders.indexOf(folder) && !/^install/.test(folder)) {
            foldersToRemove.push(folder);
        }
    });

    Object.keys(newCodes.files).forEach(file => {
        if (/^install/.test(file)) return;
        if (!oldCodes.files[file] || oldCodes.files[file] !== newCodes.files[file]) {
            filesToUpdate.push(file);
        }
    });

    Object.keys(oldCodes.files).forEach(function(file){
        if (/^install/.test(file)) return;
        if (!newCodes.files[file]) filesToRemove.push(file);
    });
    
    return { foldersToCreate, foldersToRemove, filesToUpdate, filesToRemove };
}

function database(oldTables, newTables) {
    let tablesToCreate = [],
        tablesToRemove = [],
        tablesToUpdate = {};

    // 创建新表
    for (let n in newTables) {
        if (!newTables.hasOwnProperty(n)) continue;
        if (!oldTables[n]) tablesToCreate.push(n);
    }
    // 更新旧表
    for (let o in oldTables) {
        if (!oldTables.hasOwnProperty(o)) continue;
        if (!newTables[o]) {
            tablesToRemove.push(o);
        } else {
            let oldFields = {};
            let newFields = {};
            oldTables[o].forEach(field => {
                let name = field.replace(/\s.*$/, '');
                oldFields[name] = field;
            });
            newTables[o].forEach(field => {
                let name = field.replace(/\s.*$/, '');
                newFields[name] = field;
            });
            let fieldsToRemove = [], 	// 待删除字段
                fieldsToCreate = [];	// 待增加字段
            // 更新旧字段
            for (let p in oldFields) {
                if (!oldFields.hasOwnProperty(p)) continue;
                if (newFields[p] !== oldFields[p]) fieldsToRemove.push(p);
            }
            // 创建新字段
            for (let q in newFields) {
                if (!newFields.hasOwnProperty(q)) continue;
                if (oldFields[q] !== newFields[q]) fieldsToCreate.push(newFields[q]);
            }
            if (fieldsToCreate.length || fieldsToRemove.length) {
                tablesToUpdate[o] = { fieldsToRemove, fieldsToCreate };
            }
        }
    }
}

function merge(source, target) {
    for (let i in source) {
        if (!source.hasOwnProperty(i)) continue;
        target[i] = source[i];
    }
    return target;
}