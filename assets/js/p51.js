// The P-51 wireframe, drawn with three.js and TrackballControls: drag to rotate,
// scroll or pinch to zoom, right-drag to pan. The model is baked ahead of time by
// tools/build_wireframe.py, so there's no OBJ to parse in the browser.
(function () {
    var stage = document.querySelector('[data-p51]');
    if (!stage || !window.THREE) return;

    // Only render while the model is moving. A few trailing frames let
    // TrackballControls apply wheel zooms, which fire start and end together.
    var TRAILING_FRAMES = 30;
    var dragging = false;
    var running = false;
    var idleFrames = 0;

    var camera = new THREE.PerspectiveCamera(45, stage.clientWidth / stage.clientHeight, 1, 2000);
    camera.position.set(25, 25, 25);

    var scene = new THREE.Scene();
    var material = new THREE.LineBasicMaterial({ color: wireColor(), transparent: true, opacity: 0.3 });

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(stage.clientWidth, stage.clientHeight);

    var controls;

    fetch(stage.getAttribute('data-p51'))
        .then(function (response) {
            if (!response.ok) throw new Error('Could not load the P-51 model (' + response.status + ')');
            return response.arrayBuffer();
        })
        .then(function (buffer) {
            var model = decode(buffer);
            var geometry = new THREE.BufferGeometry();
            geometry.addAttribute('position', new THREE.BufferAttribute(model.positions, 3));
            geometry.setIndex(new THREE.BufferAttribute(model.indices, 1));
            scene.add(new THREE.LineSegments(geometry, material));

            var canvas = renderer.domElement;
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', 'P-51D Mustang wireframe. Drag to rotate, scroll to zoom.');
            stage.appendChild(canvas);

            controls = new THREE.TrackballControls(camera, canvas);
            controls.staticMoving = true;
            controls.addEventListener('start', function () { dragging = true; wake(); });
            controls.addEventListener('end', function () { dragging = false; wake(); });

            bindResize();
            render();
            stage.classList.add('is-live');
        })
        .catch(function (error) {
            // The static image stays in place, which is a fine fallback.
            console.warn(error);
        });

    // See tools/build_wireframe.py for the file layout.
    function decode(buffer) {
        var view = new DataView(buffer);
        var vertexCount = view.getUint32(4, true);
        var segments = view.getUint32(8, true);
        var lo = [], span = [];
        for (var i = 0; i < 3; i++) {
            lo[i] = view.getFloat32(12 + i * 4, true);
            span[i] = view.getFloat32(24 + i * 4, true) - lo[i];
        }

        var positions = new Float32Array(vertexCount * 3);
        var offset = 36;
        for (var v = 0; v < vertexCount * 3; v++, offset += 2) {
            positions[v] = lo[v % 3] + view.getUint16(offset, true) / 65535 * span[v % 3];
        }

        var bytes = new Uint8Array(buffer, offset);
        var indices = new Uint16Array(segments * 2);
        var cursor = 0;
        var a = 0;
        function readVarint() {
            var value = 0, shift = 0, b;
            do {
                b = bytes[cursor++];
                value |= (b & 0x7f) << shift;
                shift += 7;
            } while (b & 0x80);
            return value;
        }
        for (var s = 0; s < segments; s++) {
            a += readVarint();
            indices[s * 2] = a;
            indices[s * 2 + 1] = a + readVarint();
        }
        return { positions: positions, indices: indices };
    }

    function wireColor() {
        var rgb = getComputedStyle(stage).getPropertyValue('--wire').trim().split(/\s+/).map(Number);
        return rgb.length === 3 ? new THREE.Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255) : new THREE.Color(0x0077ff);
    }

    function wake() {
        idleFrames = 0;
        if (running) return;
        running = true;
        requestAnimationFrame(animate);
    }

    function animate() {
        controls.update();
        render();
        if (dragging || ++idleFrames < TRAILING_FRAMES) {
            requestAnimationFrame(animate);
        } else {
            running = false;
        }
    }

    function render() {
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
    }

    function bindResize() {
        function resize() {
            camera.aspect = stage.clientWidth / stage.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(stage.clientWidth, stage.clientHeight);
            controls.handleResize();
            render();
        }
        if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
        else window.addEventListener('resize', resize);

        // Switch to the other theme's line color when the system goes light/dark.
        if (window.matchMedia) {
            var scheme = window.matchMedia('(prefers-color-scheme: dark)');
            if (scheme.addEventListener) {
                scheme.addEventListener('change', function () {
                    material.color = wireColor();
                    render();
                });
            }
        }
    }
})();
