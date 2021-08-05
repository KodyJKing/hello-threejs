import * as THREE from "three"
import { Vector2 } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass'
import HelloWorldPass from "./HelloWorldPass"
import RenderPixelatedPass from "./RenderPixelatedPass"

let camera: THREE.Camera, scene: THREE.Scene, renderer: THREE.WebGLRenderer, composer: EffectComposer

init()

function init() {

    let renderResolution = new Vector2( 256, 256 )
    // let renderResolution = new Vector2( 1024, 1024 )
    // let screenResolution = new Vector2( window.innerWidth, window.innerHeight )
    let screenResolution = renderResolution.clone().multiplyScalar( 3 )
    let aspectRatio = screenResolution.x / screenResolution.y

    // camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 10 )
    camera = new THREE.OrthographicCamera( -aspectRatio, aspectRatio, 1, -1, .01, 10 )
    camera.position.z = 0.9480823308542135
    camera.position.y = 0.7907471388920719

    scene = new THREE.Scene()

    let lambertMaterial = new THREE.MeshLambertMaterial()
    let normalMaterial = new THREE.MeshNormalMaterial()
    function addBox( boxSideLength: number, x: number, z: number, rotation: number ) {
        let mesh = new THREE.Mesh( new THREE.BoxGeometry( boxSideLength, boxSideLength, boxSideLength ), lambertMaterial )
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.rotation.y = rotation
        mesh.position.y = boxSideLength / 2
        mesh.position.set( x, boxSideLength / 2, z )
        scene.add( mesh )
    }
    addBox( .4, 0, 0, Math.PI / 4 )
    addBox( .2, -.4, -.15, Math.PI / 4 )

    const planeSideLength = 2
    let lambert2SidedMaterial = new THREE.MeshLambertMaterial( { side: THREE.DoubleSide } )
    let planeMesh = new THREE.Mesh( new THREE.PlaneGeometry( planeSideLength, planeSideLength ), lambert2SidedMaterial )
    planeMesh.receiveShadow = true
    planeMesh.rotation.x = -Math.PI / 2
    scene.add( planeMesh )

    let directionalLight = new THREE.DirectionalLight( 0xfffc9c, .5 )
    directionalLight.castShadow = true
    directionalLight.shadow.radius = 0
    directionalLight.position.set( 100, 100, 100 )
    scene.add( directionalLight )
    scene.add( new THREE.AmbientLight( 0x2d3645, 1.25 ) )

    renderer = new THREE.WebGLRenderer( { antialias: false } )
    renderer.shadowMap.enabled = true
    renderer.setSize( screenResolution.x, screenResolution.y )
    document.body.appendChild( renderer.domElement )

    composer = new EffectComposer( renderer )
    // composer.addPass( new RenderPass( scene, camera ) )
    composer.addPass( new RenderPixelatedPass( renderResolution, scene, camera ) )


    let controls = new OrbitControls( camera, renderer.domElement )
}

animate()
function animate() {
    requestAnimationFrame( animate )
    composer.render()
}