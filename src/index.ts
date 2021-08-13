import * as THREE from "three"
import { Vector2 } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import RenderPixelatedPass from "./RenderPixelatedPass"

let camera: THREE.Camera, scene: THREE.Scene, renderer: THREE.WebGLRenderer, composer: EffectComposer
let controls: OrbitControls
let crystalMesh: THREE.Mesh, mech: THREE.Object3D

init()
animate()

function init() {

    let screenResolution = new Vector2( window.innerWidth, window.innerHeight )
    let renderResolution = screenResolution.clone().divideScalar( 6 )
    renderResolution.x |= 0
    renderResolution.y |= 0
    let aspectRatio = screenResolution.x / screenResolution.y

    camera = new THREE.OrthographicCamera( -aspectRatio, aspectRatio, 1, -1, 0.1, 10 )
    scene = new THREE.Scene()
    scene.background = new THREE.Color( 0x151729 )

    renderer = new THREE.WebGLRenderer( { antialias: false } )
    renderer.shadowMap.enabled = true
    renderer.setSize( screenResolution.x, screenResolution.y )
    document.body.appendChild( renderer.domElement )

    composer = new EffectComposer( renderer )
    composer.addPass( new RenderPixelatedPass( renderResolution, scene, camera ) )

    controls = new OrbitControls( camera, renderer.domElement )
    controls.target.set( 0, 0, 0 )
    camera.position.z = 2
    camera.position.y = 2 * Math.tan( Math.PI / 6 )
    controls.update()
    // controls.minPolarAngle = controls.maxPolarAngle = controls.getPolarAngle()

    const texLoader = new THREE.TextureLoader()
    const tex_checker = pixelTexture( texLoader.load( "https://threejsfundamentals.org/threejs/resources/images/checker.png" ) )
    const tex_checker2 = pixelTexture( texLoader.load( "https://threejsfundamentals.org/threejs/resources/images/checker.png" ) )
    tex_checker.repeat.set( 3, 3 )
    tex_checker2.repeat.set( 1.5, 1.5 )

    // Setup geometry
    {
        let boxMaterial = new THREE.MeshPhongMaterial( { map: tex_checker2 } )
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
        addBox( .5, -.5, -.5, Math.PI / 4 )
    }

    {
        const planeSideLength = 2
        let planeMesh = new THREE.Mesh(
            new THREE.PlaneGeometry( planeSideLength, planeSideLength ),
            new THREE.MeshPhongMaterial( { map: tex_checker } )
        )
        planeMesh.receiveShadow = true
        planeMesh.rotation.x = -Math.PI / 2
        scene.add( planeMesh )
    }
    {
        const radius = .2
        const geometry = new THREE.IcosahedronGeometry( radius )
        crystalMesh = new THREE.Mesh(
            geometry,
            new THREE.MeshPhongMaterial( {
                color: 0x2379cf,
                emissive: 0x143542,
                shininess: 100,
                specular: 0xffffff,
            } )
        )
        crystalMesh.receiveShadow = true
        crystalMesh.castShadow = true
        scene.add( crystalMesh )
    }

    // Setup lights
    scene.add( new THREE.AmbientLight( 0x2d3645, 1.5 ) )

    {
        let directionalLight = new THREE.DirectionalLight( 0xfffc9c, .5 )
        directionalLight.position.set( 100, 100, 100 )
        directionalLight.castShadow = true
        directionalLight.shadow.mapSize.set( 2048, 2048 )
        scene.add( directionalLight )
    }

    {
        let spotLight = new THREE.SpotLight( 0xff8800, 1, 10, Math.PI / 16, .02, 2 )
        spotLight.position.set( 2, 2, 0 )
        let target = spotLight.target
        scene.add( target )
        target.position.set( 0, 0, 0 )
        spotLight.castShadow = true
        scene.add( spotLight )
    }
}

function animate() {
    requestAnimationFrame( animate )
    let t = performance.now() / 1000
    let material = ( crystalMesh.material as THREE.MeshPhongMaterial )
    material.emissiveIntensity = Math.sin( t * 3 ) * .5 + .5
    crystalMesh.position.y = .7 + Math.sin( t * 2 ) * .05
    crystalMesh.rotation.y = stopGoEased( t, 2, 4 ) * 2 * Math.PI
    composer.render()
}

function pixelTexture( tex: THREE.Texture ) {
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    tex.generateMipmaps = false
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    return tex
}

function easeInOutCubic( x ) {
    return x ** 2 * 3 - x ** 3 * 2
}

function clamp( x, min, max ) {
    return Math.min( max, Math.max( min, x ) )
}

function linearStep( x, edge0, edge1 ) {
    let w = edge1 - edge0
    let m = 1 / w
    let y0 = -m * edge0
    return clamp( y0 + m * x, 0, 1 )
}

function stopGoEased( x, downtime, period ) {
    let cycle = ( x / period ) | 0
    let tween = x - cycle * period
    let linStep = easeInOutCubic( linearStep( tween, downtime, period ) )
    return cycle + linStep
}