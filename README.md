# Access Block

Full page loading screen that blocks user interactions.

## Features
- Disallows mouse scrolling, clicking, and focus movement within the body via `Tab` key while open
- Cannot be closed by the user. It must be programmatically closed.
- Disallows all other body content from being read with a screen reader via `aria-hidden`
- Allows focus to escape to the browser with `Shift` + `Tab`
- Uses ARIA role `alertdialog`,  `aria-describedby` and `aria-labelledby` to properly notify screen readers
- Inline styles can be disabled
- After dismissal, focus is returned to the last focused element or a designated element
- Pre and post user defined functions can be called during significant events

## Usage

### Install

```shell
npm install @informatix8/access-block --save-dev
```

### CDN

```html
<script src="https://unpkg.com/@informatix8/access-block/dist/access-block.all.umd.js"></script>
```

### Vanilla Javascript
```javascript
var accessBlock = new AccessBlock({
    overlayOpacity: 0.4,
    title: 'Loading',
    description: 'Please wait'
});

var trigger = document.getElementById('trigger');
trigger.addEventListener('click', function () {
    accessBlock.open();

    // Example to close it
    setTimeout(function () {
        accessBlock.close();
    }, 3000);
});
```

## Example Styles

```css
.access-block-content {
    align-items: center;
    display: flex;
    justify-content: center;
}

.access-block-interior {
    display: block;
    text-align: center;
    width: 12.5rem;
}

.access-block-image {
    display: block;
    fill: #fff;
    height: 3rem;
    margin: 0 auto;
    width: 3rem;
}

.access-block-title {
    font-size: 2rem;
}
```

## Development

```shell
npm run dev
```

## Build

```shell
npm run build
```

## Release

```shell
npm run build
git tag -a vX.Y.Z
git push origin master
git push origin --tags
npm publish --access=public .
```
