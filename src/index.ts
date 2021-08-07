import * as THREE from "three"
import { GreaterEqualDepth, Vector2 } from "three"

import { MapControls, OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass'
import { BokehPass } from 'three/examples//jsm/postprocessing/BokehPass'


import HelloWorldPass from "./HelloWorldPass"
import RenderPixelatedPass from "./RenderPixelatedPass"
import PixelatePass from "./PixelatePass"

import { stopGoEased } from "./math"

// @ts-ignore
import warningStipesURL from "./assets/warningStripes.png"
// @ts-ignore
import mechURL from "./assets/mech.fbx"

let camera: THREE.Camera, scene: THREE.Scene, renderer: THREE.WebGLRenderer, composer: EffectComposer
let controls: OrbitControls
let crystalMesh: THREE.Mesh, mech: THREE.Object3D

init()
function init() {

    let screenResolution = new Vector2( window.innerWidth, window.innerHeight )
    let renderResolution = screenResolution.clone().divideScalar( 4 )
    renderResolution.x |= 0
    renderResolution.y |= 0
    let aspectRatio = screenResolution.x / screenResolution.y

    camera = new THREE.OrthographicCamera( -aspectRatio, aspectRatio, 1, -1, .01, 10 )
    camera.position.z = 1
    camera.position.y = Math.tan( Math.PI / 6 )
    scene = new THREE.Scene()
    scene.background = new THREE.Color( 0x151729 )
    // scene.background = new THREE.Color( 0xffffff )

    const texLoader = new THREE.TextureLoader()
    const tex_warningStripes = pixelTex( texLoader.load( warningStipesURL ) )
    const tex_checker = pixelTex( texLoader.load( "https://threejsfundamentals.org/threejs/resources/images/checker.png" ) )
    const tex_checker2 = pixelTex( texLoader.load( "https://threejsfundamentals.org/threejs/resources/images/checker.png" ) )
    tex_checker.repeat.set( 5, 5 )
    tex_checker2.repeat.set( 1.5, 1.5 )

    // Geometry
    // {
    //     const fbxLoader = new FBXLoader()
    //     let mechMaterial = new THREE.MeshPhongMaterial( {
    //         // map: tex_checker2,
    //         specular: 0xffffff,
    //         shininess: 100
    //     } )
    //     fbxLoader.load( mechURL, obj => {
    //         // obj.scale.set( .005, .005, .005 )
    //         obj.scale.set( .001, .001, .001 )
    //         obj.traverse( child => {
    //             // @ts-ignore
    //             if ( child instanceof THREE.Mesh ) {
    //                 child.castShadow = true
    //                 child.receiveShadow = true
    //                 child.material = mechMaterial
    //             }
    //         } )
    //         console.log( obj )
    //         mech = obj
    //         scene.add( obj )
    //     } )
    // }
    {
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
        // addBox( .2, -.4, -.15, Math.PI / 4 )
    }
    {
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
    }
    {
        const radius = .2
        // const geometry = new THREE.DodecahedronGeometry( radius )
        const geometry = new THREE.IcosahedronGeometry( radius )
        crystalMesh = new THREE.Mesh(
            geometry,
            new THREE.MeshPhongMaterial( {
                color: 0x2379cf,
                emissive: 0x143542,
                shininess: 100,
                specular: 0xffffff,
                // opacity: 0.5
            } )
        )
        crystalMesh.receiveShadow = true
        crystalMesh.castShadow = true
        scene.add( crystalMesh )
    }

    // Lights
    scene.add( new THREE.AmbientLight( 0x2d3645, 1.5 ) )
    {
        let directionalLight = new THREE.DirectionalLight( 0xfffc9c, .5 )
        directionalLight.position.set( 100, 100, 100 )
        directionalLight.castShadow = true
        // directionalLight.shadow.radius = 0
        directionalLight.shadow.mapSize.set( 2048, 2048 )
        scene.add( directionalLight )
    }
    {
        let spotLight = new THREE.SpotLight( 0xff8800, 1, 10, Math.PI / 12, .02, 2 )
        spotLight.position.set( 1.6, 3, 0 )
        let target = spotLight.target //= new THREE.Object3D()
        scene.add( target )
        target.position.set( 0, .25, 0 )
        spotLight.castShadow = true
        scene.add( spotLight )
    }

    // Renderer
    renderer = new THREE.WebGLRenderer( { antialias: false } )
    // renderer.toneMapping = THREE.LinearToneMapping
    // renderer.toneMappingExposure = .75
    renderer.shadowMap.enabled = true
    renderer.setSize( screenResolution.x, screenResolution.y )
    document.body.appendChild( renderer.domElement )

    composer = new EffectComposer( renderer )
    // composer.addPass( new RenderPass( scene, camera ) )
    composer.addPass( new RenderPixelatedPass( renderResolution, scene, camera ) )
    let bloomPass = new UnrealBloomPass( screenResolution, .4, .1, .9 )
    composer.addPass( bloomPass )
    composer.addPass( new PixelatePass( renderResolution ) )

    controls = new OrbitControls( camera, renderer.domElement )
    controls.target.set( 0, .25, 0 )
    controls.update()
    controls.minPolarAngle = controls.maxPolarAngle = controls.getPolarAngle()
}

animate()
function animate() {
    requestAnimationFrame( animate )
    let t = performance.now() / 1000

    let mat = ( crystalMesh.material as THREE.MeshPhongMaterial )
    mat.emissiveIntensity = Math.sin( t * 3 ) * .5 + .5
    crystalMesh.position.y = .7 + Math.sin( t * 2 ) * .05
    // crystalMesh.rotation.y = stopGoEased( t, 3, 4 ) * Math.PI / 2
    crystalMesh.rotation.y = stopGoEased( t, 2, 4 ) * 2 * Math.PI

    // if ( mech )
    //     mech.rotation.y = Math.floor( t * 8 ) * Math.PI / 32
    composer.render()
}

function pixelTex( tex: THREE.Texture ) {
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    tex.generateMipmaps = false
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    return tex
}
