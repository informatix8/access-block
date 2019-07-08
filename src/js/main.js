import ShortUniqueId from 'short-unique-id';
import merge from 'lodash.merge';

class AccessBlock {
    /**
     @class AccessBlock
     @summary Access block
     @param {Object} options - Supplied configuration
     @param {String} [options.id=null] Id attribute of chrome, also is used as prefix for inner elements ids
     @param {String|HTMLElement} [options.focusAfterClose=null] Selector string or node, that will be focused after AccessBlock is closed
     @param {String} [options.role="alertdialog"] Role attribute of chrome
     @param {Number} [options.overlayOpacity=0.8] Opacity of overlay element
     @param {Number} [options.zIndex=100] Z-index of overlay element
     @param {Boolean} [options.writeInlineStyles=true] Will apply all inline styles if true
     @param {Number} [options.defaultAnimationTime=2] Default loader image animation duration, in seconds
     @param {String} [options.imageSrc=null] Src of loader image src attribute
     @param {Object} [options.cssClassMap] - User supplied class for elements
     @param {String} [options.cssClassMap.chrome="access-block"] - Chrome (main) element
     @param {String} [options.cssClassMap.overlay="access-block-overlay"] - Overlay element
     @param {String} [options.cssClassMap.content="access-block-content"] - Content element (contains interior element)
     @param {String} [options.cssClassMap.interior="access-block-interior"] - Interior element (contains title, description, image elements)
     @param {String} [options.cssClassMap.title="access-block-title"] - Title element
     @param {String} [options.cssClassMap.description="access-block-description"] - Description element
     @param {String} [options.cssClassMap.image="access-block-image"] - Image loader element
     @param {String} [options.cssClassMap.ariaHidden="access-block-aria-hidden"] - Aria hidden element, will contain all body content when AccessDropdown is opened
     @param {Object} [options.callbacks] - User supplied functions to execute at given stages of the component lifecycle
     @param {Object} [options.focusableSelectorList] - Selector of elements, that may get focus
     @param {Function} options.callbacks.preOpen
     @param {Function} options.callbacks.postOpen
     @param {Function} options.callbacks.preClose
     @param {Function} options.callbacks.postClose
     */
    constructor(options) {
        let defaults;

        if (options === undefined) {
            options = {};
        }

        if (document.body.getAttribute('data-access-blocks-opened') === null) {
            document.body.setAttribute('data-access-blocks-opened', '0');
        }

        defaults = {
            id: null,
            focusAfterClose: null,
            role: 'alertdialog',
            overlayOpacity: 0.8,
            zIndex: 100,
            writeInlineStyles: true,
            defaultAnimationTime: 2,
            imageSrc: null,
            cssClassMap: {
                chrome: 'access-block',
                overlay: 'access-block-overlay',
                content: 'access-block-content',
                interior: 'access-block-interior',
                title: 'access-block-title',
                description: 'access-block-description',
                image: 'access-block-image',
                ariaHidden: 'access-block-aria-hidden'
            },
            focusableSelectorList: [
                'a[href]:not([tabindex="-1"])',
                'area[href]:not([tabindex="-1"])',
                'input:not([disabled]):not([tabindex="-1"])',
                'select:not([disabled]):not([tabindex="-1"])',
                'textarea:not([disabled]):not([tabindex="-1"])',
                'button:not([disabled]):not([tabindex="-1"])',
                'iframe:not([tabindex="-1"])',
                '[tabindex]:not([tabindex="-1"])',
                '[contentEditable=true]:not([tabindex="-1"])'
            ]
        };

        this.options = merge(defaults, options);

        if (this.options.role !== 'dialog' && this.options.role !== 'alertdialog') {
            throw new Error('You must set role=`dialog` or role=`alertdialog` in the block options.');
        }

        if (!this.options.id) {
            let uid = new ShortUniqueId();
            this.options.id = 'access-block-' + uid.randomUUID(6);
        }

        this.chrome = null;
        this.ariaHidden = document.createElement('div');
        this.ariaHidden.setAttribute('aria-hidden', true);
        this.ariaHidden.style.position = 'relative';
        this.ariaHidden.style.zIndex = '1';

        this.ariaHidden.classList.add(this.options.cssClassMap.ariaHidden);
    }

    /**
     *
     * @returns {AccessBlock.isOpened}
     */
    isOpened() {
        return this.chrome;
    }

    /**
     *
     */
    open() {
        this.callCustom('preOpen');

        // Already opened
        if (this.chrome) {
            return;
        }

        this.chrome = this.buildChromeHtml();
        // Remember what had focus before opening block, if certain element is not set
        if (!this.options.focusAfterClose) {
            this.lastActiveElement = document.activeElement;
        }

        // Hide everything in the DOM from screen readers by making an new aria-hidden element and moving all chromes beneath
        while (document.body.childNodes.length) {
            this.ariaHidden.appendChild(document.body.firstChild);
        }

        document.body.appendChild(this.ariaHidden);

        // Freeze body, if this is first block
        if (document.body.getAttribute('data-access-blocks-opened') === '0') {
            AccessBlock.injectBodyFreezeCssClass();
            document.body.classList.add('access-block-body');
        }

        // Show the block chrome - make it the first position in the DOM
        document.body.insertBefore(this.chrome, document.body.firstChild);

        document.body.setAttribute('data-access-blocks-opened',
            document.body.getAttribute('data-access-blocks-opened') * 1 + 1);

        // Ensure the tabindex === 0 on the block content
        this.content.setAttribute('tabindex', 0);

        // Focus the block window itself
        this.content.focus();

        // Restrict focus
        this.onFocusBind = this.onFocus.bind(this);

        [].forEach.call(document.querySelectorAll(this.options.focusableSelectorList.join(',')), anyElement => {
            anyElement.addEventListener('focus', this.onFocusBind);
        });

        this.callCustom('postOpen');
    }

    /**
     *
     */
    close() {
        this.callCustom('preClose');

        // Mve everything out of the aria-hidden wrapper back to the original positions in the body
        while (this.ariaHidden.childNodes.length) {
            this.ariaHidden.parentNode.appendChild(this.ariaHidden.firstChild);
        }

        this.chrome.parentNode.removeChild(this.ariaHidden);
        document.body.setAttribute('data-access-blocks-opened',
            document.body.getAttribute('data-access-blocks-opened') * 1 - 1);

        // Unfreeze the body scroll when last block is removed
        if (document.body.getAttribute('data-access-blocks-opened') === '0') {
            AccessBlock.removeBodyFreezeCssClass();
            document.body.classList.remove('access-block-body');
        }

        if (this.isDefaultImgUsed) {
            this.removeAnimationCssClass();
        }

        // Restore focusability on everything else
        if (this.onFocusBind !== null) {
            [].forEach.call(document.querySelectorAll(this.options.focusableSelectorList.join(',')), anyElement => {
                anyElement.removeEventListener('focus', this.onFocusBind);
            });

            // Done with this listener, destroy it
            this.onFocusBind = null;
        }

        // Destroy the chrome (remove from DOM)
        this.chrome.parentNode.removeChild(this.chrome);

        // Restore focus to previous page chrome after block has closed, or set focus to given in options selector or node
        if (this.lastActiveElement) {
            this.lastActiveElement.focus();
        } else if (this.options.focusAfterClose) {
            let focusAfterCloseEl;
            if (typeof this.options.focusAfterClose === 'string') {
                focusAfterCloseEl = document.querySelector(this.options.focusAfterClose);
            } else {
                focusAfterCloseEl = this.options.focusAfterClose;
            }
            if (focusAfterCloseEl && typeof focusAfterCloseEl.focus === 'function') {
                focusAfterCloseEl.focus();
            }
        }

        this.callCustom('postClose');
    }

    /**
     *
     * @returns {HTMLDivElement | HTMLDivElement | *}
     */
    buildChromeHtml() {
        let chrome;

        chrome = document.createElement('div');
        chrome.classList.add(this.options.cssClassMap.chrome);
        chrome.style.position = 'relative';
        chrome.style.zIndex = '2';
        chrome.setAttribute('role', this.options.role);
        chrome.setAttribute('id', this.options.id);
        // Ensure the tabindex === -1 on the block chrome
        chrome.setAttribute('tabindex', -1);

        this.overlay = document.createElement('div');
        this.overlay.classList.add(this.options.cssClassMap.overlay);
        if (this.options.writeInlineStyles) {
            this.overlay.style.backgroundColor = 'rgba(0, 0, 0, ' + this.options.overlayOpacity + ')';
            this.overlay.style.pointerEvents = 'none';
            this.overlay.style.position = 'fixed';
            this.overlay.style.zIndex = this.options.zIndex;
            this.overlay.style.top = '0';
            this.overlay.style.right = '0';
            this.overlay.style.bottom = '0';
            this.overlay.style.left = '0';
            this.overlay.style.height = '100%';
            this.overlay.style.width = '100%';
        }

        this.content = document.createElement('div');
        this.content.classList.add(this.options.cssClassMap.content);
        if (this.options.writeInlineStyles) {
            this.content.style.position = 'fixed';
            this.content.style.zIndex = this.options.zIndex + 1;
            this.content.style.top = '0';
            this.content.style.right = '0';
            this.content.style.bottom = '0';
            this.content.style.left = '0';
            this.content.style.height = '100%';
            this.content.style.width = '100%';
            this.content.style.color = 'rgb(255, 255, 255)';
        }

        this.interior = document.createElement('div');
        this.interior.classList.add(this.options.cssClassMap.interior);
        this.content.appendChild(this.interior);

        if (this.options.imageSrc) {
            this.isDefaultImgUsed = false;
            this.image = document.createElement('img');
            this.image.classList.add(this.options.cssClassMap.image);
            this.image.setAttribute('src', this.options.imageSrc);
        } else {
            this.isDefaultImgUsed = true;

            let path, uid;
            uid = new ShortUniqueId();

            path =  document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M12,1.6C6.3,1.6,1.6,6.3,1.6,12S6.3,22.4,12,22.4S22.4,17.7,22.4,12h-1.6c0,4.9-3.9,8.8-8.8,8.8S3.2,16.9,3.2,12 S7.1,3.2,12,3.2V1.6z');

            this.image = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            this.image.setAttribute('version', '1.1');
            this.image.setAttribute('id', 'access-block-image-' + uid.randomUUID(6));
            this.image.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            this.image.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
            this.image.setAttribute('viewBox', '0 0 24 24');
            this.image.setAttribute('width', '24');
            this.image.setAttribute('height', '24');
            this.image.classList.add(this.options.cssClassMap.image);
            this.image.classList.add('access-block-default-image');
            this.image.appendChild(path);

            this.injectAnimationCssClass();
        }

        this.interior.appendChild(this.image);

        this.title = document.createElement('div');
        this.title.classList.add(this.options.cssClassMap.title);
        this.title.textContent = this.options.title;
        this.title.setAttribute('id', this.options.id + '-title');
        this.interior.appendChild(this.title);

        this.description = document.createElement('div');
        this.description.classList.add(this.options.cssClassMap.description);
        this.description.textContent = this.options.description;
        this.description.setAttribute('id', this.options.id + '-description');

        this.interior.appendChild(this.description);

        // Add overlay and content
        chrome.appendChild(this.overlay);
        chrome.appendChild(this.content);

        chrome.setAttribute('aria-labelledby', this.options.id + '-title');
        chrome.setAttribute('aria-describedby', this.options.id + '-description');

        return chrome;
    }

    /**
     *
     * @param userFn
     */
    callCustom(userFn) {
        let sliced;

        sliced = Array.prototype.slice.call(arguments, 1);

        if (this.options.callbacks !== undefined && this.options.callbacks[userFn] !== undefined && typeof this.options.callbacks[userFn] === 'function'
        ) {
            this.options.callbacks[userFn].apply(this, sliced);
        }
    }

    /**
     * Stop focus from anything outside the block
     *
     * @param event
     */
    onFocus(event) {
        if (!this.content.contains(event.target)) {
            event.stopPropagation();
            this.content.focus();
        }
    }

    /**
     *
     */
    static injectBodyFreezeCssClass() {
        let style;

        if (document.getElementById('access-block-body-freeze-css-class')) {
            return;
        }

        style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.setAttribute('id', 'access-block-body-freeze-css-class');
        style.innerHTML = '.access-block-body {overflow: hidden;}';

        document.getElementsByTagName('head')[0].appendChild(style);
    }

    /**
     *
     */
    static removeBodyFreezeCssClass() {
        let style;

        style = document.getElementById('access-block-body-freeze-css-class');
        if (style) {
            style.parentNode.removeChild(style);
        }
    }

    /**
     *
     */
    injectAnimationCssClass() {
        let style, id;

        id = this.image.getAttribute('id');

        if (document.getElementById('style-' + id)) {
            return;
        }

        style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.setAttribute('id', 'style-' + id);
        style.innerHTML = '#' + id + ' {\n' +
            '    animation-name: accessBlockDefaultImageAnimation;\n' +
            '    animation-duration: ' + this.options.defaultAnimationTime + 's;\n' +
            '    animation-timing-function: linear;\n' +
            '    animation-iteration-count: infinite;\n' +
            '}' +
            '\n' +
            '@keyframes accessBlockDefaultImageAnimation {\n' +
            '    0% {\n' +
            '       transform: rotate(0deg);\n' +
            '    }\n' +
            '    100% {\n' +
            '       transform: rotate(360deg);\n' +
            '    }\n' +
            '}';

        document.getElementsByTagName('head')[0].appendChild(style);
    }

    /**
     *
     */
    removeAnimationCssClass() {
        let style;

        style = document.getElementById('style-' + this.image.getAttribute('id'));
        if (style) {
            style.parentNode.removeChild(style);
        }
    }
}

export default AccessBlock;
