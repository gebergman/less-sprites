#!/usr/bin/env node

var async = require('async'),
    path = require('path'),
    util = require('util'),
    gm = require('gm'),
    im = gm.subClass({
      imageMagick: true
    }),
    fs = require('fs'),
    Q = require('q');


function Sprites() {
  this.specs = {
    appendRight: false
  };
  this.readArgs();
}

Sprites.prototype.createSprite = function (sourceDir, sourceFiles, destPath, lessPath, relativePath, spacing) {
  var stats;
  if (sourceDir !== false) {
    this.sourceDir = sourceDir;
  } else {
    this.sourceDir = '.'; // default is current directory
    stats = fs.existsSync(sourceFiles[0]);
    if (sourceFiles.length === 1) {
      if (!stats) {
        throw new Error('Source file "' + sourceFiles[0] + '" does not exist.');
      }

      if (stats.isDirectory()) {
        this.sourceDir = sourceFiles[0];
        sourceFiles = fs.readdirSync(this.sourceDir);
      }
    }
  }

  this.destPath = path.resolve(destPath);
  this.lessPath = path.resolve(lessPath);
  this.relativePath = relativePath || '/images';
  this.spacing = spacing / 2 || 0;
  this.files = [];

  this.spriteFile = im();
  this.spriteFile.out('-background', 'none');

  sourceFiles = this.getSourceFiles(sourceFiles);
  if (sourceFiles[0] === '*') {
    var files = fs.readdirSync(this.sourceDir);
    sourceFiles = [];
    files.forEach(function (element) {
      if (element.match(/.png/i) !== null) {
        sourceFiles.push(element);
      }
    });
  }

  if (!sourceFiles.length) {
    throw new Error('No valid source files were provided.');
  }

  this.tmpOutput = this.sourceDir + '/.images';
  this.tempDirectory(this.tmpOutput, true);

  this.combine(sourceFiles)
    .then(function () {
      this.spriteFile.write(this.destPath, function (err) {
        if (err) throw err;
        this.tempDirectory(this.tmpOutput);
      }.bind(this));
      this.writeStyles();

    }.bind(this));
};

Sprites.prototype.tempDirectory = function (destSource, create) {
  var tmpfiles;
  create = create || false;

  if (fs.existsSync(destSource)) {
    tmpfiles = fs.readdirSync(destSource);

    tmpfiles.forEach(function (element) {
      fs.unlinkSync(destSource + '/' + element);
    });
    fs.rmdirSync(destSource);
  }

  if (create) {
    fs.mkdirSync(destSource);
  }
};

Sprites.prototype.getSourceFiles = function (files) {
  var file,
      sourceFiles = [],
      i;

  for (i = 0, l = files.length; i < l; i++) {
    file = path.basename(files[i]);
    if (file.match(/.*\.png$/i) && file != this.destPath || file === "*") {
      sourceFiles.push(file);
    }
  }

  return sourceFiles;
};

Sprites.prototype.combine = function (files) {
  var deferred = Q.defer();
  async.each(files, this.processFile.bind(this), function (err) {
    if (err) {
      deferred.reject(new Error(err));
    } else {
      deferred.resolve();
    }
  });
  return deferred.promise;
};

Sprites.prototype.processFile = function (fileName, callback) {
  var _this = this,
      filePath = this.sourceDir + '/' + fileName,
      newFile = this.tmpOutput + '/' + fileName;

  if (!fs.existsSync(filePath)) {
    throw new Error('Source file "' + filePath + '" does not exist.');
  }

  im(filePath)
    .size(function (err, size) {
      this.out('-background', 'none');
      this.extent(size.width + _this.spacing, size.height + _this.spacing);
      this.write(newFile, function (error) {
        if (error) throw error;
        im(newFile)
          .size(function (err, size) {
            if (err) throw err;
            this.spriteFile.append(newFile, this.specs.appendRight);
            this.files.push({
              name: fileName,
              size: size
            });
            callback();
          }.bind(_this));
      });
    });
};

Sprites.prototype.writeStyles = function () {
  var relPath = this.relativePath,
      spriteFile = relPath + '/' + path.basename(this.destPath),
      content = '',
      x = 0,
      y = 0;

  for (var i = 0, l = this.files.length; i < l; i++) {
    content += util.format(
      '.sprite("%s") {\n' +
        '\tbackground-image: url("%s");\n' +
        '\tbackground-position: %dpx %dpx;' +
      '}\n',
      this.files[i].name,
      spriteFile,
      x,
      y
    );

    if (this.specs.appendRight) {
      x -= this.files[i].size.width;
    } else {
      y -= this.files[i].size.height;
    }
  }

  fs.writeFile(this.lessPath, content, function (err) {
    if (err) throw err;
  });
};

Sprites.prototype.readArgs = function () {
  var argv = process.argv.splice(2),
      specsFile = argv[0],
      specs;

  if (!argv.length || argv[0] == '-h' || argv[0] == '--help') {
    this.printUsage();
    process.exit();
  }

  if (!fs.existsSync(specsFile)) {
    console.log('Error: Specs file "' + specsFile + '" does not exist.');
    process.exit();
  }
  specsFile = path.resolve(specsFile);
  specs = require(specsFile);
  if (!specs['dir']) {
    specs['dir'] = '.';
  }

  // default directory is same as the json
  if (!specs['sprite']) {
    specs['sprite'] = path.basename(specsFile, '.json') + '.png';
  }
  // relative to the specsFile directory.
  if (specs['sprite'][0] != '/') {
    specs['sprite'] = path.dirname(specsFile) + '/' + specs['sprite'];
  }

  if (!specs['less']) {
    specs['less'] = path.basename(specsFile, '.json') + '.less';
  }

  if (specs['less'][0] != '/') {
    specs['less'] = path.dirname(specsFile) + '/' + specs['less'];
  }

  if (!specs['files']) {
    throw new Error('Missing "files" property.');
  }
  if (specs['direction']) {
    this.specs.appendRight = specs['direction'] == 'right';
  }

  this.createSprite(
    path.resolve(specsFile, '..', specs['dir']),
    specs['files'],
    specs['sprite'],
    specs['less'],
    specs['httpPath'],
    specs['spacing']
  );
};

Sprites.prototype.printUsage = function () {
  console.log('Usage: less-sprites sprite-specs.json');
};

new Sprites();
