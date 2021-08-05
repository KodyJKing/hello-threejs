import * as THREE from "three"
import { Vector2 } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import HelloWorldPass from "./HelloWorldPass"
import RenderPixelatedPass from "./RenderPixelatedPass"

// @ts-ignore
import warningStipesURL from "./assets/warningStripes.png"

let camera: THREE.Camera, scene: THREE.Scene, renderer: THREE.WebGLRenderer, composer: EffectComposer

init()

function pixelTex( tex: THREE.Texture ) {
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    tex.generateMipmaps = false
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    return tex
}

function init() {

    let screenResolution = new Vector2( window.innerWidth, window.innerHeight )
    let renderResolution = screenResolution.clone().divideScalar( 4 )
    renderResolution.x |= 0
    renderResolution.y |= 0
    // let renderResolution = new Vector2( 256, 256 )
    // let screenResolution = renderResolution.clone().multiplyScalar( 3 )
    let aspectRatio = screenResolution.x / screenResolution.y

    // camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 10 )
    camera = new THREE.OrthographicCamera( -aspectRatio, aspectRatio, 1, -1, .01, 10 )
    camera.position.z = 0.9480823308542135
    camera.position.y = 0.7907471388920719
    scene = new THREE.Scene()
    // scene.background = new THREE.Color( 0xb5b3a7 )

    const loader = new THREE.TextureLoader()
    const tex_warningStripes = pixelTex( loader.load( warningStipesURL ) )
    const tex_checker = pixelTex( loader.load( "https://threejsfundamentals.org/threejs/resources/images/checker.png" ) )
    tex_checker.repeat.set( 10, 10 )

    // Geometry
    let lambertMaterial = new THREE.MeshLambertMaterial()
    let lambert2SidedMaterial = new THREE.MeshLambertMaterial( { map: tex_checker, side: THREE.DoubleSide } )
    let normalMaterial = new THREE.MeshNormalMaterial()
    let phongMaterial = new THREE.MeshPhongMaterial( { map: tex_warningStripes } )
    function addBox( boxSideLength: number, x: number, z: number, rotation: number ) {
        let mesh = new THREE.Mesh( new THREE.BoxGeometry( boxSideLength, boxSideLength, boxSideLength ), phongMaterial )
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.rotation.y = rotation
        mesh.position.y = boxSideLength / 2
        mesh.position.set( x, boxSideLength / 2 + .0001, z )
        scene.add( mesh )
    }
    addBox( .4, 0, 0, Math.PI / 4 )
    addBox( .2, -.4, -.15, Math.PI / 4 )

    const planeSideLength = 2
    let planeMesh = new THREE.Mesh( new THREE.PlaneGeometry( planeSideLength, planeSideLength ), lambert2SidedMaterial )
    planeMesh.receiveShadow = true
    planeMesh.rotation.x = -Math.PI / 2
    scene.add( planeMesh )

    // Lights
    let directionalLight = new THREE.DirectionalLight( 0xfffc9c, .5 )
    directionalLight.position.set( 100, 100, 100 )
    directionalLight.castShadow = true
    directionalLight.shadow.radius = 0
    scene.add( directionalLight )

    scene.add( new THREE.AmbientLight( 0x2d3645, 1.25 ) )

    let pointLight = new THREE.PointLight( 0xff8800, 2, 10, 2 )
    pointLight.position.set( .6, .6, .8 )
    pointLight.castShadow = true
    pointLight.shadow.radius = 0
    scene.add( pointLight )

    // Renderer
    renderer = new THREE.WebGLRenderer( { antialias: false } )
    renderer.toneMapping = THREE.ReinhardToneMapping
    renderer.toneMappingExposure = 1
    renderer.shadowMap.enabled = true
    renderer.setSize( screenResolution.x, screenResolution.y )
    document.body.appendChild( renderer.domElement )

    composer = new EffectComposer( renderer )
    // composer.addPass( new RenderPass( scene, camera ) )
    composer.addPass( new RenderPixelatedPass( renderResolution, scene, camera ) )
    let bloomPass = new UnrealBloomPass( renderResolution, .5, 1, .25 )
    // composer.addPass( new GlitchPass() )
    composer.addPass( bloomPass )


    let controls = new OrbitControls( camera, renderer.domElement )
}

animate()
function animate() {
    requestAnimationFrame( animate )
    composer.render()
}