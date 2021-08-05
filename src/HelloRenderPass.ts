import * as THREE from "three"
import { WebGLRenderer, WebGLRenderTarget } from "three"
import { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass"

export default class HellRenderPass extends Pass {

    fsQuad: FullScreenQuad
    resolution: { x: number, y: number }
    scene: THREE.Scene
    camera: THREE.Camera
    rgbRenderTarget: WebGLRenderTarget

    constructor( resolution: { x: number, y: number }, scene: THREE.Scene, camera: THREE.Camera ) {
        super()
        this.resolution = resolution
        this.fsQuad = new FullScreenQuad( this.material() )
        this.scene = scene
        this.camera = camera

        const rgbRenderTarget = this.rgbRenderTarget = new WebGLRenderTarget( resolution.x, resolution.y )
        rgbRenderTarget.texture.format = THREE.RGBAFormat
        rgbRenderTarget.texture.minFilter = THREE.NearestFilter
        rgbRenderTarget.texture.magFilter = THREE.NearestFilter
        rgbRenderTarget.texture.generateMipmaps = false
        rgbRenderTarget.stencilBuffer = false
    }

    render(
        renderer: WebGLRenderer,
        writeBuffer: WebGLRenderTarget,
        readBuffer: WebGLRenderTarget
    ) {
        renderer.setRenderTarget( this.rgbRenderTarget )
        renderer.render( this.scene, this.camera )

        // The declarations for Three.js don't include Material.uniforms
        // @ts-ignore
        this.fsQuad.material.uniforms.tDiffuse.value = this.rgbRenderTarget.texture
        if ( this.renderToScreen ) {
            renderer.setRenderTarget( null )
        } else {
            renderer.setRenderTarget( writeBuffer )
            if ( this.clear ) renderer.clear()
        }
        this.fsQuad.render( renderer )
    }

    material() {
        return new THREE.ShaderMaterial( {
            uniforms: {
                tDiffuse: { value: null }
            },
            vertexShader:
                `varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }`,
            fragmentShader:
                `uniform sampler2D tDiffuse;
                varying vec2 vUv;
                void main() {
                    vec4 texel = texture2D( tDiffuse, vUv );
                    gl_FragColor = texel;
                }`
        } )
    }
}