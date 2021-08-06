import * as THREE from "three"
import { GreaterEqualDepth, Vector2 } from "three"
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

let docecahedron: THREE.Mesh

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
    let renderResolution = screenResolution.clone().divideScalar( 6 )
    renderResolution.x |= 0
    renderResolution.y |= 0
    let aspectRatio = screenResolution.x / screenResolution.y

    camera = new THREE.OrthographicCamera( -aspectRatio, aspectRatio, 1, -1, .01, 10 )
    camera.position.z = 1
    camera.position.y = Math.tan( Math.PI / 6 )
    scene = new THREE.Scene()
    scene.background = new THREE.Color( 0x151729 )
    // scene.background = new THREE.Color( 0xffffff )

    const loader = new THREE.TextureLoader()
    const tex_warningStripes = pixelTex( loader.load( warningStipesURL ) )
    const tex_checker = pixelTex( loader.load( "https://threejsfundamentals.org/threejs/resources/images/checker.png" ) )
    const tex_checker2 = pixelTex( loader.load( "https://threejsfundamentals.org/threejs/resources/images/checker.png" ) )
    tex_checker.repeat.set( 5, 5 )
    tex_checker2.repeat.set( 1.5, 1.5 )

    // Geometry
    // let boxMaterial = new THREE.MeshNormalMaterial()
    let boxMaterial = new THREE.MeshPhongMaterial( { map: tex_checker2 } )
    // let boxMaterial = new THREE.MeshPhongMaterial()
    function addBox( boxSideLength: number, x: number, z: number, rotation: number ) {
        let mesh = new THREE.Mesh( new THREE.BoxGeometry( boxSideLength, boxSideLength, boxSideLength ), boxMaterial )
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.rotation.y = rotation
        mesh.position.y = boxSideLength / 2
        mesh.position.set( x, boxSideLength / 2 + .0001, z )
        scene.add( mesh )
        return mesh
    }
    addBox( .4, 0, 0, Math.PI / 4 )
    addBox( .2, -.4, -.15, Math.PI / 4 )

    const planeSideLength = 2
    let planeMesh = new THREE.Mesh(
        new THREE.PlaneGeometry( planeSideLength, planeSideLength ),
        new THREE.MeshPhongMaterial( {
            map: tex_checker,
            // side: THREE.DoubleSide
        } )
        // new THREE.MeshPhongMaterial( { side: THREE.DoubleSide } )
    )
    planeMesh.receiveShadow = true
    planeMesh.rotation.x = -Math.PI / 2
    scene.add( planeMesh )

    {
        const radius = .2
        const geometry = new THREE.DodecahedronGeometry( radius )
        docecahedron = new THREE.Mesh(
            geometry,
            new THREE.MeshPhongMaterial( {
                color: 0x2379cf
            } )
        )
        docecahedron.receiveShadow = true
        docecahedron.castShadow = true
        scene.add( docecahedron )
    }

    // Lights
    let directionalLight = new THREE.DirectionalLight( 0xfffc9c, .5 )
    directionalLight.position.set( 100, 100, 100 )
    directionalLight.castShadow = true
    directionalLight.shadow.radius = 0
    directionalLight.shadow.mapSize.set( 2048, 2048 )
    scene.add( directionalLight )

    scene.add( new THREE.AmbientLight( 0x2d3645, 1.5 ) )

    // let pointLight = new THREE.PointLight( 0xff8800, 2, 100, 2 )
    // pointLight.position.set( .6, .6, .8 )
    // pointLight.castShadow = true
    // pointLight.shadow.radius = 0
    // pointLight.shadow.mapSize.set( 1024, 1024 )
    // scene.add( pointLight )

    let spotLight = new THREE.SpotLight( 0xff8800, 1, 10, Math.PI / 12, .02, 2 )
    // spotLight.position.set( .6, 1, 1 )
    spotLight.position.set( .6, 1.5, 1 )
    // spotLight.target = docecahedron
    spotLight.castShadow = true
    scene.add( spotLight )

    // Renderer
    renderer = new THREE.WebGLRenderer( { antialias: false } )
    // renderer.toneMapping = THREE.ReinhardToneMapping
    // renderer.toneMappingExposure = 1
    renderer.shadowMap.enabled = true
    renderer.setSize( screenResolution.x, screenResolution.y )
    document.body.appendChild( renderer.domElement )

    composer = new EffectComposer( renderer )
    // composer.addPass( new RenderPass( scene, camera ) )
    composer.addPass( new RenderPixelatedPass( renderResolution, scene, camera ) )
    // let bloomPass = new UnrealBloomPass( renderResolution, .5, .5, .5 )
    // composer.addPass( bloomPass )
    // composer.addPass( new GlitchPass() )


    let controls = new OrbitControls( camera, renderer.domElement )
}

animate()
function animate() {
    requestAnimationFrame( animate )
    let t = performance.now() / 1000
    // docecahedron.rotation.y = t
    docecahedron.rotation.setFromQuaternion( camera.quaternion )
    docecahedron.rotation.x += Math.PI / 4
    docecahedron.rotation.y += Math.PI / 4
    docecahedron.rotation.z += Math.PI / 4
    docecahedron.position.y = .7 + Math.sin( t * 2 ) * .05
    composer.render()
}