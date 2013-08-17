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
  if (sourceDir) {
    this.sourceDir = sourceDir;
    this.retinaSourceDir = sourceDir + '2x';
  }

  this.destPath = path.resolve(destPath);

  if (this.retina) {
    this.retinaDestPath = path.resolve(this.retinaDestPath);
  }

  this.lessPath = path.resolve(lessPath);
  this.relativePath = relativePath || '/images';
  this.spacing = spacing || 0;
  this.files = [];
  this.retinaFiles = [];
  this.renderRetina = false;

  this.setSpriteInstance();

  sourceFiles = this.getSourceFiles(sourceFiles).sort();

  if (!sourceFiles.length) {
    throw new Error('No valid source files were provided.');
  }

  this.tmpOutput = this.sourceDir + '/.images';
  this.tempDirectory(this.tmpOutput, true);

  this.combine(sourceFiles)
    .then(function () {
      this.spriteFile.write(this.destPath, function (err) {
        if (err) throw err;
        if (this.retina) {
          this.renderRetina = true;
          this.setSpriteInstance();
          this.combine(sourceFiles)
            .then(function () {
              this.spriteFile.write(this.retinaDestPath, function (err) {
                if (err) throw err;
                this.tempDirectory(this.tmpOutput);
                this.writeStyles();
              }.bind(this));
            }.bind(this));
        } else {
          this.tempDirectory(this.tmpOutput);
          this.writeStyles();
        }
      }.bind(this));
    }.bind(this));
};

Sprites.prototype.setSpriteInstance = function () {
  this.spriteFile = im();
  this.spriteFile.out('-background', 'none');
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
    if (file.match(/.*\.png$/i) && file != this.destPath) {
      sourceFiles.push(file);
    } else if (file === '*' && i === 0) {
      sourceFiles = [];
      fs.readdirSync(this.sourceDir).forEach(function (element) {
        if (element.match(/.png/i) !== null) {
          sourceFiles.push(element);
        }
      });
    }
  }

  return sourceFiles;
};

Sprites.prototype.combine = function (files) {
  var deferred = Q.defer();
  async.eachLimit(files, 1, this.processFile.bind(this), function (err) {
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
      path = this.renderRetina ? this.retinaSourceDir : this.sourceDir,
      filePath = path + '/' + fileName,
      newFile = this.tmpOutput + '/' + fileName,
      data;

  if (!fs.existsSync(filePath)) {
    throw new Error('Source file "' + filePath + '" does not exist.');
  }

  im(filePath)
    .size(function (err, size) {
      this.out('-background', 'none');
      this.extent(size.width, size.height + _this.spacing);
      this.write(newFile, function (error) {
        if (error) throw error;
        im(newFile)
          .size(function (err, size) {
            if (err) throw err;
            this.spriteFile.append(newFile, this.specs.appendRight);
            data = {
              name: fileName,
              size: size
            };
            if (this.renderRetina) {
              this.retinaFiles.push(data);
            } else {
              this.files.push(data);
            }
            callback();
          }.bind(_this));
      });
    });
};

Sprites.prototype.writeStyles = function () {
  var relPath = this.relativePath,
      spriteFile = relPath + '/' + path.basename(this.destPath),
      content = '',
      backgroundSize,
      retinaQuery = '',
      retinaSpritePath,
      width,
      height,
      x = 0,
      y = 0,
      x2x = 0,
      y2x = 0;

  var createFile = function () {
    for (var i = 0, l = this.files.length; i < l; i++) {

      if (this.retina) {
        retinaQuery = util.format(
          '  @media all and (-webkit-min-device-pixel-ratio: 1.5),\n' +
          '  (min--moz-device-pixel-ratio: 1.5),\n' +
          '  (-o-min-device-pixel-ratio: 3/2), (min-device-pixel-ratio: 1.5) {\n' +
          '    background-image: url("%s");\n' +
          '    background-position: %dpx %dpx;\n' +
          '    background-size: %dpx auto;\n' +
          '    -moz-background-size: %dpx auto;\n' +
          '    -o-background-size: %dpx auto;\n' +
          '    -webkit-background-size: %dpx auto;\n' +
          '  }\n',
          retinaSpritePath, x2x, y2x, backgroundSize, backgroundSize, backgroundSize, backgroundSize
        );
      }

      height = this.files[i].size.height;
      width = this.files[i].size.width;
      content += util.format(
        '.sprite("%s", @dimension: false) {\n' +
        '  .size() when (@dimension) {\n' +
        '    height: %dpx;\n' +
        '    width: %dpx;\n' +
        '  }\n' +
        '  .size;\n' +
        '  background-image: url("%s");\n' +
        '  background-repeat: no-repeat;\n' +
        '  background-position: %dpx %dpx;\n%s' +
        '}\n',
        this.files[i].name, height - this.spacing, width, spriteFile, x, y, retinaQuery
      );

      if (this.specs.appendRight) {
        x -= this.files[i].size.width;
      } else {
        y -= this.files[i].size.height;
      }

      if (this.retina && this.specs.appendRight) {
        x2x -= this.retinaFiles[i].size.width;
      } else if (this.retina) {
        y2x -= this.retinaFiles[i].size.height / 2;
      }
    }

    fs.writeFile(this.lessPath, content, function (err) {
      if (err) throw err;
    });
  }.bind(this);

  if (this.retina) {
    retinaSpritePath = relPath + '/' + path.basename(this.retinaDestPath);

    gm(this.retinaDestPath).size(function (err, size) {
      if (err) throw err;
      backgroundSize = Math.ceil(size.width / 2);
      createFile();
    });
  } else {
    createFile()
  }
};

Sprites.prototype.readArgs = function () {
  var argv = process.argv.splice(2),
      specsFile = argv[0],
      specs;

  this.retina = false;

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

  if (specs['retina']) {
    this.retina = true;
    this.retinaDestPath = path.basename(specsFile, '.json') + '2x.png';
    this.retinaDestPath = path.dirname(specsFile) + '/' + this.retinaDestPath;
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
