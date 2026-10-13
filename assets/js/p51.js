var p51_container, p51_camera, p51_scene, p51_renderer, p51_controls;

// Only render while the model is being moved. A few trailing frames let
// TrackballControls apply wheel zooms, which fire start and end together.
var p51_dragging = false;
var p51_running = false;
var p51_idleFrames = 0;
var P51_TRAILING_FRAMES = 30;

initP51();

function initP51() {
    p51_container = document.getElementById('three-container');
    if (!p51_container) return;

    var w = p51_container.offsetWidth;
    var h = p51_container.offsetHeight;

    p51_camera = new THREE.PerspectiveCamera(45, w / h, 1, 2000);
    p51_camera.position.set(25, 25, 25);

    p51_scene = new THREE.Scene();

    // Lights
    var ambient = new THREE.AmbientLight(0x666666);
    p51_scene.add(ambient);

    var directionalLight = new THREE.DirectionalLight(0xffeedd);
    directionalLight.position.set(0, 70, 100).normalize();
    p51_scene.add(directionalLight);

    p51_renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    p51_renderer.setSize(w, h);
    p51_container.appendChild(p51_renderer.domElement);

    p51_controls = new THREE.TrackballControls(p51_camera, p51_renderer.domElement);
    p51_controls.staticMoving = true;
    p51_controls.addEventListener('start', function () { p51_dragging = true; wakeP51(); });
    p51_controls.addEventListener('end', function () { p51_dragging = false; wakeP51(); });

    var loader = new THREE.OBJMTLLoader();
    loader.load(
        'assets/models/p51/p51.obj',
        'assets/models/p51/p51.mtl',
        function (object) {
            object.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    // 1. Create the wireframe geometry
                    var wireframeGeom = new THREE.WireframeGeometry(child.geometry);

                    // 2. Set the color to a "Tech Blue" (0x0077ff)
                    var wireframeMat = new THREE.LineBasicMaterial({
                        color: 0x0077ff,
                        transparent: true,
                        opacity: 0.3 // Adjust from 0.1 (very light) to 1.0 (solid)
                    });
                    var wireframe = new THREE.LineSegments(wireframeGeom, wireframeMat);

                    // 3. Add the wireframe to the mesh
                    child.add(wireframe);

                    // 4. HIDE the original painted surface
                    child.material.visible = false;
                }
            });
            object.position.y = 0;
            object.scale.set(1.0, 1.0, 1.0);
            p51_scene.add(object);
            renderP51();

            // This removes the static image and fades in the 3D canvas
            document.getElementById('three-container').classList.add('model-loaded');
        }
    );

    window.addEventListener('resize', onP51WindowResize, false);
    renderP51();
}

function onP51WindowResize() {
    var w = p51_container.offsetWidth;
    var h = p51_container.offsetHeight;
    p51_camera.aspect = w / h;
    p51_camera.updateProjectionMatrix();
    p51_renderer.setSize(w, h);
    p51_controls.handleResize();
    renderP51();
}

function wakeP51() {
    p51_idleFrames = 0;
    if (p51_running) return;
    p51_running = true;
    requestAnimationFrame(animateP51);
}

function animateP51() {
    p51_controls.update();
    renderP51();

    if (p51_dragging || ++p51_idleFrames < P51_TRAILING_FRAMES) {
        requestAnimationFrame(animateP51);
    } else {
        p51_running = false;
    }
}

function renderP51() {
    p51_camera.lookAt(p51_scene.position);
    p51_renderer.render(p51_scene, p51_camera);
}
