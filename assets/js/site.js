(function () {
    partsList();
    garageReveal();
    loadP51WhenVisible();

    // Parts list: number each part, count the builds that use it, and highlight
    // those builds on hover (preview) or click (stays until clicked again).
    function partsList() {
        var list = document.querySelector('[data-parts-list]');
        var status = document.querySelector('[data-parts-status]');
        if (!list || !status) return;

        var builds = Array.prototype.slice.call(document.querySelectorAll('article[data-parts]'));
        var buttons = Array.prototype.slice.call(list.querySelectorAll('[data-part]'));
        var pinned = null;

        // A data-parts tag only shows up if the parts list has a button for it.
        builds.forEach(function (b) {
            b.getAttribute('data-parts').split(/\s+/).forEach(function (part) {
                if (!list.querySelector('[data-part="' + part + '"]')) {
                    console.warn('Parts list has no button for "' + part + '" (used by #' + b.id + ')');
                }
            });
        });

        buttons.forEach(function (button, i) {
            var users = buildsUsing(button.getAttribute('data-part'));
            var name = button.textContent;
            button.textContent = '';
            button.appendChild(span('pn', 'PN-' + String(i + 1).padStart(2, '0')));
            button.appendChild(span('part-name', name));
            button.appendChild(span('qty', '×' + users.length));
            button.setAttribute('aria-pressed', 'false');

            button.addEventListener('click', function () {
                pinned = pinned === button ? null : button;
                buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === pinned)); });
                show(pinned);
            });
            button.addEventListener('mouseenter', function () { show(button); });
            button.addEventListener('focus', function () { show(button); });
            button.addEventListener('blur', function () { show(pinned); });
        });

        // Reset only when the mouse leaves the whole list, so moving between
        // parts never flashes back to the pinned (or empty) state.
        list.addEventListener('mouseleave', function () { show(pinned); });

        function buildsUsing(part) {
            return builds.filter(function (b) {
                return b.getAttribute('data-parts').split(/\s+/).indexOf(part) !== -1;
            });
        }

        function show(button) {
            var users = button ? buildsUsing(button.getAttribute('data-part')) : [];
            builds.forEach(function (b) {
                b.classList.toggle('is-match', !!button && users.indexOf(b) !== -1);
                b.classList.toggle('is-dim', !!button && users.indexOf(b) === -1);
            });

            status.textContent = '';
            if (!button) {
                status.textContent = 'No part selected.';
                return;
            }
            var name = button.querySelector('.part-name').textContent;
            status.appendChild(document.createTextNode(name + ' is used in ' + users.length + (users.length === 1 ? ' build: ' : ' builds: ')));
            users.forEach(function (b, i) {
                if (i) status.appendChild(document.createTextNode(', '));
                var link = document.createElement('a');
                link.href = '#' + b.id;
                link.textContent = b.querySelector('h3').textContent;
                status.appendChild(link);
            });
        }

        function span(className, text) {
            var el = document.createElement('span');
            el.className = className;
            el.textContent = text;
            return el;
        }
    }

    // Garage: a slider (drag, tap, or arrow keys) sweeps from teardown to finished
    // bike; on a mouse it also follows the pointer. Shows a note until photos exist.
    function garageReveal() {
        var reveal = document.querySelector('[data-reveal]');
        if (!reveal) return;
        var slider = reveal.querySelector('input');
        var images = reveal.querySelectorAll('img');

        Array.prototype.forEach.call(images, function (img) {
            img.addEventListener('error', function () { reveal.classList.add('is-empty'); });
            if (img.complete && img.naturalWidth === 0 && img.getAttribute('loading') !== 'lazy') reveal.classList.add('is-empty');
        });

        function set(value) {
            reveal.style.setProperty('--pos', value + '%');
        }
        slider.addEventListener('input', function () { set(slider.value); });

        if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            reveal.addEventListener('mousemove', function (e) {
                var box = reveal.getBoundingClientRect();
                var value = Math.round((e.clientX - box.left) / box.width * 100);
                slider.value = value;
                set(value);
            });
        }
    }

    // Load the P-51 renderer once the page has loaded and the plane is on screen,
    // so it never competes with the first paint.
    function loadP51WhenVisible() {
        var stage = document.querySelector('[data-p51]');
        if (!stage) return;

        var scripts = [
            'assets/js/threejs/three.min.js',
            'assets/js/threejs/TrackballControls.js',
            'assets/models/p51.wire.js',
            'assets/js/p51.js'
        ];

        function load(i) {
            i = i || 0;
            if (i >= scripts.length) return;
            var script = document.createElement('script');
            script.src = scripts[i];
            script.onload = function () { load(i + 1); };
            document.body.appendChild(script);
        }

        function whenVisible() {
            if (!('IntersectionObserver' in window)) return load();
            var observer = new IntersectionObserver(function (entries) {
                if (!entries[0].isIntersecting) return;
                observer.disconnect();
                load();
            });
            observer.observe(stage);
        }

        function afterLoad() {
            if ('requestIdleCallback' in window) window.requestIdleCallback(whenVisible, { timeout: 2000 });
            else setTimeout(whenVisible, 0);
        }

        if (document.readyState === 'complete') afterLoad();
        else window.addEventListener('load', afterLoad);
    }
})();
