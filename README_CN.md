# folk-cli

> [Click here to read the English documents.](https://github.com/Spikef/folk-cli/blob/master/README.md)

Folk命令行工具(用户版)!

## 安装

首先你必需安装[Node.js](https://nodejs.org), 请选择4.0以上的版本。

然后使用`NPM`来安装此命令行工具。

```bash
$ npm install -g folk-cli
```

## 命令

### init

设置网站位置, 以及主题/插件作者信息等。

```bash
$ cd [your website location]
$ folk init
```

### plugin

在当前网站下新建一个插件。

```bash
$ folk plugin
```

### theme

在当前网站下新建一个主题。

```bash
$ folk theme
```

### pack

Pack a theme or plugin to an installation package.

```bash
$ folk pack
```