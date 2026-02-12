var p51_container, p51_camera, p51_scene, p51_renderer, p51_controls;
var p51_clock = new THREE.Clock();

initP51();
animateP51();

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

    // Renderer (Alpha: true makes the background transparent)
    p51_renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    p51_renderer.setSize(w, h);
    p51_container.appendChild(p51_renderer.domElement);

    // Controls
    p51_controls = new THREE.TrackballControls(p51_camera, p51_renderer.domElement);
    p51_controls.staticMoving = true;

    // Loader - Path updated to your assets folder
    var loader = new THREE.OBJMTLLoader();
    loader.load(
        'assets/models/p51/p51.obj', 
        'assets/models/p51/p51.mtl', 
        function (object) {
            object.position.y = 0;
            object.scale.set(1.45, 1.45, 1.45);
            p51_scene.add(object);
        }
    );

    window.addEventListener('resize', onP51WindowResize, false);
}

function onP51WindowResize() {
    var w = p51_container.offsetWidth;
    var h = p51_container.offsetHeight;
    p51_camera.aspect = w / h;
    p51_camera.updateProjectionMatrix();
    p51_renderer.setSize(w, h);
}

function animateP51() {
    requestAnimationFrame(animateP51);
    if (p51_controls) p51_controls.update(p51_clock.getDelta());
    renderP51();
}

function renderP51() {
    p51_camera.lookAt(p51_scene.position);
    p51_renderer.render(p51_scene, p51_camera);
}