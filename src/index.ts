import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass'
import HelloWorldPass from "./HelloWorldPass"
import HelloRenderPass from "./HelloRenderPass"

let camera, scene, renderer: THREE.WebGLRenderer
let geometry, material, mesh: THREE.Mesh
let controls, composer: EffectComposer

init()

function init() {

    let outResolution = { x: window.innerWidth, y: window.innerHeight }
    let aspectRatio = outResolution.x / outResolution.y

    // camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 10 )
    camera = new THREE.OrthographicCamera( -aspectRatio, aspectRatio, 1, -1, .01, 10 )
    camera.position.z = 1

    scene = new THREE.Scene()

    geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 )
    material = new THREE.MeshNormalMaterial()

    mesh = new THREE.Mesh( geometry, material )
    scene.add( mesh )


    renderer = new THREE.WebGLRenderer( { antialias: true } )
    renderer.setSize( window.innerWidth, window.innerHeight )
    document.body.appendChild( renderer.domElement )

    composer = new EffectComposer( renderer )
    composer.addPass( new RenderPass( scene, camera ) )
    // composer.addPass( new GlitchPass() )
    // composer.addPass( new HelloWorldPass() )
    composer.addPass( new HelloRenderPass( { x: 256, y: 256 }, scene, camera ) )


    controls = new OrbitControls( camera, renderer.domElement )
}

animate()
function animate() {
    requestAnimationFrame( animate )
    mesh.rotation.y = Math.PI / 4
    mesh.rotation.x = .61547
    // renderer.render( scene, camera )
    composer.render()
}