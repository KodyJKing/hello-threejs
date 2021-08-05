import * as THREE from "three"
import { WebGLRenderer, WebGLRenderTarget } from "three"
import { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass"

function pixelRenderTarget() {
}

export default class HellRenderPass extends Pass {

    fsQuad: FullScreenQuad
    resolution: THREE.Vector2
    scene: THREE.Scene
    camera: THREE.Camera
    rgbRenderTarget: WebGLRenderTarget
    // normalRenderTarget: WebGLRenderTarget

    constructor( resolution: THREE.Vector2, scene: THREE.Scene, camera: THREE.Camera ) {
        super()
        this.resolution = resolution
        this.fsQuad = new FullScreenQuad( this.material() )
        this.scene = scene
        this.camera = camera

        const rgbRenderTarget = this.rgbRenderTarget = new WebGLRenderTarget(
            resolution.x, resolution.y,
            {
                depthTexture: new THREE.DepthTexture(
                    resolution.x,
                    resolution.y
                ),
                depthBuffer: true
            }
        )
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

        // @ts-ignore
        this.fsQuad.material.uniforms.tDiffuse.value = this.rgbRenderTarget.texture
        // @ts-ignore
        this.fsQuad.material.uniforms.tDepth.value = this.rgbRenderTarget.depthTexture
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
                tDiffuse: { value: null },
                tDepth: { value: null },
                resolution: {
                    value: new THREE.Vector4(
                        this.resolution.x,
                        this.resolution.y,
                        1 / this.resolution.x,
                        1 / this.resolution.y,
                    )
                }
            },
            vertexShader:
                `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }
                `,
            fragmentShader:
                `
                uniform sampler2D tDiffuse;
                uniform sampler2D tDepth;
                uniform vec4 resolution;
                varying vec2 vUv;

                float getDepth(int x, int y) {
                    return texture2D( tDepth, vUv + vec2(x, y) * resolution.zw ).r;
                }

                float saturate(float x) {
                    return clamp(x, 0.0, 1.0);
                }

                float depthEdgeIndicator() {
                    float depth = getDepth(0, 0);
                    float diff = 0.0;
                    diff += abs(depth - getDepth(1, 0));
                    diff += abs(depth - getDepth(-1, 0));
                    diff += abs(depth - getDepth(0, 1));
                    diff += abs(depth - getDepth(0, -1));
                    return saturate(diff);
                }

                void main() {
                    vec4 texel = texture2D( tDiffuse, vUv );
                    float edgeIndicator = depthEdgeIndicator();
                    gl_FragColor = texel * (1.0 + edgeIndicator);
                }
                `
        } )
    }
}