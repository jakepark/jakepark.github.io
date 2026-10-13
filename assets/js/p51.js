// Draws the P-51 wireframe with plain WebGL. The model is baked ahead of time by
// tools/build_wireframe.py, so the browser only has to unpack it and draw lines.
// Drag (or use the arrow keys) to turn it; it only redraws when something changes.
(function () {
    var stage = document.querySelector('[data-p51]');
    if (!stage) return;

    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    // Matches the old three.js camera: 45° field of view from (25, 25, 25).
    var FOV = 45 * Math.PI / 180;
    var DISTANCE = Math.sqrt(3) * 25;
    var yaw = Math.PI / 4;
    var pitch = Math.asin(1 / Math.sqrt(3));
    var segmentCount = 0;
    var frameQueued = false;

    var program = buildProgram(
        'attribute vec3 position;' +
        'uniform mat4 mvp;' +
        'void main() { gl_Position = mvp * vec4(position, 1.0); }',
        'precision mediump float;' +
        'uniform vec4 color;' +
        'void main() { gl_FragColor = color; }'
    );
    var mvpLocation = gl.getUniformLocation(program, 'mvp');
    var colorLocation = gl.getUniformLocation(program, 'color');

    fetch(stage.getAttribute('data-p51'))
        .then(function (response) {
            if (!response.ok) throw new Error('Could not load the P-51 model (' + response.status + ')');
            return response.arrayBuffer();
        })
        .then(function (buffer) {
            upload(decode(buffer));
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('tabindex', '0');
            canvas.setAttribute('aria-label', 'P-51D Mustang wireframe. Drag or use the arrow keys to turn it.');
            stage.appendChild(canvas);
            resize();
            bindControls();
            stage.classList.add('is-live');
        })
        .catch(function (error) {
            // The static image stays in place, which is a fine fallback.
            console.warn(error);
        });

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

    function upload(model) {
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, model.positions, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indices, gl.STATIC_DRAW);

        var position = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);

        gl.useProgram(program);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        segmentCount = model.indices.length;
    }

    function draw() {
        frameQueued = false;
        var aspect = canvas.width / canvas.height || 1;
        var eye = [
            DISTANCE * Math.cos(pitch) * Math.sin(yaw),
            DISTANCE * Math.sin(pitch),
            DISTANCE * Math.cos(pitch) * Math.cos(yaw)
        ];
        var mvp = multiply(perspective(FOV, aspect, 1, 2000), lookAt(eye));

        var rgb = getComputedStyle(stage).getPropertyValue('--wire').trim() || '0 119 255';
        var c = rgb.split(/\s+/).map(Number);

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniformMatrix4fv(mvpLocation, false, mvp);
        gl.uniform4f(colorLocation, c[0] / 255, c[1] / 255, c[2] / 255, 0.3);
        gl.drawElements(gl.LINES, segmentCount, gl.UNSIGNED_SHORT, 0);
    }

    function requestDraw() {
        if (frameQueued) return;
        frameQueued = true;
        requestAnimationFrame(draw);
    }

    function resize() {
        var ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(stage.clientWidth * ratio);
        canvas.height = Math.round(stage.clientHeight * ratio);
        requestDraw();
    }

    function turn(dx, dy) {
        yaw -= dx * 0.01;
        pitch = Math.max(-1.5, Math.min(1.5, pitch + dy * 0.01));
        requestDraw();
    }

    function bindControls() {
        var last = null;
        canvas.addEventListener('pointerdown', function (e) {
            last = { x: e.clientX, y: e.clientY };
            canvas.setPointerCapture(e.pointerId);
        });
        canvas.addEventListener('pointermove', function (e) {
            if (!last) return;
            turn(e.clientX - last.x, e.clientY - last.y);
            last = { x: e.clientX, y: e.clientY };
        });
        ['pointerup', 'pointercancel'].forEach(function (type) {
            canvas.addEventListener(type, function () { last = null; });
        });
        canvas.addEventListener('keydown', function (e) {
            var step = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[e.key];
            if (!step) return;
            e.preventDefault();
            turn(step[0], step[1]);
        });

        if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
        else window.addEventListener('resize', resize);

        // Redraw in the new line color when the system switches light/dark.
        if (window.matchMedia) {
            var scheme = window.matchMedia('(prefers-color-scheme: dark)');
            if (scheme.addEventListener) scheme.addEventListener('change', requestDraw);
        }
    }

    function buildProgram(vertexSource, fragmentSource) {
        var p = gl.createProgram();
        [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]].forEach(function (pair) {
            var shader = gl.createShader(pair[0]);
            gl.shaderSource(shader, pair[1]);
            gl.compileShader(shader);
            gl.attachShader(p, shader);
        });
        gl.linkProgram(p);
        return p;
    }

    // Column-major 4x4 matrix helpers.
    function perspective(fov, aspect, near, far) {
        var f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
        return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
    }

    function lookAt(eye) {
        var z = normalize(eye);
        var x = normalize(cross([0, 1, 0], z));
        var y = cross(z, x);
        return [
            x[0], y[0], z[0], 0,
            x[1], y[1], z[1], 0,
            x[2], y[2], z[2], 0,
            -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
        ];
    }

    function multiply(a, b) {
        var out = new Float32Array(16);
        for (var col = 0; col < 4; col++) {
            for (var row = 0; row < 4; row++) {
                var sum = 0;
                for (var k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
                out[col * 4 + row] = sum;
            }
        }
        return out;
    }

    function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    function normalize(v) { var l = Math.sqrt(dot(v, v)); return [v[0] / l, v[1] / l, v[2] / l]; }
})();
