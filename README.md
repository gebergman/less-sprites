# node.js sprites generator for LESS

## Requirements
`less-sprites` uses [*ImageMagick*](http://www.imagemagick.org/), so install it first. 

## Installation
```
npm install less-sprites
```

## Usage
Write a list of source images into a `.json` file:
`{ "files": ["icon1.png", "icon2.png"] }`

Create the sprite:
```bash
less-sprites my-sprite.json
```

There are more options you can specify:
```JavaScript
{
	// Direction of image placement, default "bottom"
	"direction": "right|bottom",
	// Directory relative to the .json file where source files are located
	"dir": "icons-sprite",
	// List of source images (without directory) or "*" to use all PNG files
	"files": ["icon1.png", "icon2.png"]
	// Location and name of the final sprite, default is same as the .json file.
	"sprite": "icons-sprite.png",
	// The http path to the image (default: /images)
	"httpPath": '/images',
	// Space between the images in the sprite, default 0
	"spacing": 50,
	// Enable retina support, place all retina images in the same directory name with 2x at the end, eg.: icons-sprite2x
	"retina": true,
	// Location and name of the final LESS file, default is same as the .json file.
	"less": "../less/icon-sprite.less"
}
```

## Using the sprite in your LESS stylesheet
`less-sprites my-sprite.json` creates two files:
* `my-sprite.png` - the final sprite image
* `my-sprite.less` - positions of the images inside the sprite

In your stylesheet you target the original image, not the sprite; it will be translated during compilation.
### CSS without `less-sprites`
```css
.icon-first {
	background: url('/images/icons_sprite/icon1.png');
}
.icon-second {
	background: url('/images/icons_sprite/icon2.png');
}
```

### LESS with `less-sprites`
```less
@import "icons/icons-sprite.less"

.icon-first {
	.sprite('icon1.png');
}

// enabled auto dimensions
.icon-second {
	.sprite('icon2.png', true);
}
```
which is later compiled into final CSS:
```css
.icon-first {
	background: url("/images/icons-sprite.png") 0px 0px;
	background-repeat: no-repeat;
	background-position: 0px 0px;
}
.icon-second {
	height: 118px;
	width: 69px;
	background-repeat: no-repeat;
	background: url("/images/icons-sprite.png") 0px -20px;
}

```
Now when you need to add a new image to the sprite, you simply it to the `.json` file and call `less-sprites`.
No extra work is needed in your stylesheets.

### LESS with `less-sprites` and enabled retina in the sprite file
```less
@import "icons/icons-sprite.less"

.icon-first {
	.sprite('icon1.png');
}

// enabled auto dimensions
.icon-second {
	.sprite('icon2.png', true);
}
```
which is later compiled into final CSS:
```css
.icon-first {
	background: url("/images/icons-sprite.png") 0px 0px;
	background-repeat: no-repeat;
	background-position: 0px 0px;
}
.icon-second {
	height: 118px;
	width: 69px;
	background-repeat: no-repeat;
	background: url("/images/icons-sprite.png") 0px -20px;
}
@media (-webkit-min-device-pixel-ratio: 1.5), (min--moz-device-pixel-ratio: 1.5), (-o-min-device-pixel-ratio: 3/2), (min-device-pixel-ratio: 1.5) {
	.icon-first {
		background-image: url("/images/sprite-specs2x.png");
		background-position: 0px 0px;
		background-size: 270px auto;
	}
}

```
## Name conflicts
If you `@import` several sprites into global namespace there is a possibility of name conflict (imagine referencing two images from two different places as `../image.png`). The best way to avoid this is to always import inside a scope:
```less
.my-icons {
	@import "...";
	.icon-first {
		.sprite('...');
	}
}
```

## License
The MIT License.
