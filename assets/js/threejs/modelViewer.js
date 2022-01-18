var SCREEN_WIDTH = window.innerWidth * 0.5;
var SCREEN_HEIGHT = window.innerHeight * 0.5;

// var SCREEN_WIDTH = 900;
// var SCREEN_HEIGHT = 600;

var container, parent;

var camera, scene, cameraControls;
var canvasRenderer, webglRenderer;

var mesh, zmesh, geometry;

var windowHalfX = SCREEN_WIDTH / 2;
var windowHalfY = SCREEN_HEIGHT / 2;

var meshes = [];

var clock = new THREE.Clock();

init();
animate();

function init() {
	container = document.createElement('div');
	container.className = "model-container"

	// document.body.appendChild(container);

	parent = document.getElementById('modelView');
	parent.appendChild(container);
	// container = document.getElementById('modelView');


	camera = new THREE.PerspectiveCamera(45, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 2000);
	camera.position.x = 25;
	camera.position.y = 25;
	camera.position.z = 25;


	scene = new THREE.Scene();





	// LIGHTS
	var ambient = new THREE.AmbientLight(0x666666);
	scene.add(ambient);

	var directionalLight = new THREE.DirectionalLight(0xffeedd);
	directionalLight.position.set(0, 70, 100).normalize();
	scene.add(directionalLight);

	// RENDERER
	webglRenderer = new THREE.WebGLRenderer();
	webglRenderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
	webglRenderer.domElement.style.position = "relative";

	// container.appendChild(webglRenderer.domElement);
	container.appendChild(webglRenderer.domElement);


	// CAMERA CONTROLS

	cameraControls = new THREE.TrackballControls(camera, webglRenderer.domElement);
	cameraControls.target.set(0, 0, 0);

	// MODEL


	var onProgress = function ( xhr ) {
		if ( xhr.lengthComputable ) {
			var percentComplete = xhr.loaded / xhr.total * 100;
			console.log( Math.round(percentComplete, 2) + '% downloaded' );
		}
	};
	var onError = function ( xhr ) {
	};
	THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );
  var loader = new THREE.OBJMTLLoader();
	loader.load( 'assets/models/p51/p51.obj', 'assets/models/p51/p51.mtl', function ( object ) {
		object.position.y = 0;
		scene.add( object );
	}, onProgress, onError );

	window.addEventListener('resize', onWindowResize, false);
	container.addEventListener('click', onClick);
}

function onClick() {
  debugger
}

function createScene(geometry, materials, x, y, z, scale, tmap) {
	// zmesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({map: THREE.ImageUtils.loadTexture(tmap)}));
	zmesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial(materials));
	zmesh.position.set(x, y, z);
	zmesh.scale.set(scale, scale, scale);
	meshes.push(zmesh);
	scene.add(zmesh);
}
function onWindowResize() {

	windowHalfX = window.innerWidth / 2;
	windowHalfY = window.innerHeight / 2;

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	webglRenderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
	var delta = clock.getDelta();

  requestAnimationFrame(animate);

  cameraControls.update(delta);


	render();

}

function render() {
	camera.lookAt(scene.position);
	webglRenderer.render(scene, camera);
}
