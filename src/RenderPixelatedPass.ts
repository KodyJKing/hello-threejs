import * as THREE from "three"
import { WebGLRenderer, WebGLRenderTarget } from "three"
import { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass"

export default class RenderPixelatedPass extends Pass {

    fsQuad: FullScreenQuad
    resolution: THREE.Vector2
    scene: THREE.Scene
    camera: THREE.Camera
    rgbRenderTarget: WebGLRenderTarget
    normalRenderTarget: WebGLRenderTarget
    normalMaterial: THREE.Material

    constructor( resolution: THREE.Vector2, scene: THREE.Scene, camera: THREE.Camera ) {
        super()
        this.resolution = resolution
        this.fsQuad = new FullScreenQuad( this.material() )
        this.scene = scene
        this.camera = camera

        this.rgbRenderTarget = pixelRenderTarget( resolution, THREE.RGBAFormat, true )
        this.normalRenderTarget = pixelRenderTarget( resolution, THREE.RGBFormat, false )

        this.normalMaterial = new THREE.MeshNormalMaterial()
    }

    render(
        renderer: WebGLRenderer,
        writeBuffer: WebGLRenderTarget,
        readBuffer: WebGLRenderTarget
    ) {
        renderer.setRenderTarget( this.rgbRenderTarget )
        renderer.render( this.scene, this.camera )

        const overrideMaterial_old = this.scene.overrideMaterial
        renderer.setRenderTarget( this.normalRenderTarget )
        this.scene.overrideMaterial = this.normalMaterial
        renderer.render( this.scene, this.camera )
        this.scene.overrideMaterial = overrideMaterial_old


        // @ts-ignore
        const uniforms = this.fsQuad.material.uniforms
        uniforms.tDiffuse.value = this.rgbRenderTarget.texture
        uniforms.tDepth.value = this.rgbRenderTarget.depthTexture
        uniforms.tNormal.value = this.normalRenderTarget.texture
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
                tNormal: { value: null },
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
                uniform sampler2D tNormal;
                uniform vec4 resolution;
                varying vec2 vUv;

                float getDepth(int x, int y) {
                    return texture2D( tDepth, vUv + vec2(x, y) * resolution.zw ).r;
                }

                vec3 getNormal(int x, int y) {
                    return texture2D( tNormal, vUv + vec2(x, y) * resolution.zw ).rgb * 2.0 - 1.0;
                }

                // Only the shallower pixel should detect the normal edge.
                float getNormalDistance(int x, int y, float depth, vec3 normal) {
                    float depthDiff = getDepth(x, y) - depth;
                    float adjust = clamp(sign(depthDiff * .25 + .0025), 0.0, 1.0);
                    // return (1. - abs(dot(normal, getNormal(x, y)))) * adjust;
                    return distance(normal, getNormal(x, y)) * adjust;
                }

                float depthEdgeIndicator() {
                    float depth = getDepth(0, 0);
                    vec3 normal = getNormal(0, 0);
                    float diff = 0.0;
                    diff += clamp(getDepth(1, 0) - depth, 0.0, 1.0);
                    diff += clamp(getDepth(-1, 0) - depth, 0.0, 1.0);
                    diff += clamp(getDepth(0, 1) - depth, 0.0, 1.0);
                    diff += clamp(getDepth(0, -1) - depth, 0.0, 1.0);
                    return floor(smoothstep(0.01, 0.03, diff) * 2.) / 2.;
                }

                float normalEdgeIndicator() {
                    float depth = getDepth(0, 0);
                    vec3 normal = getNormal(0, 0);
                    int dx = int(clamp(sign(normal.x), 0.0, 1.0));
                    float edgeAbove = getNormalDistance(-1, 1, depth, normal);
                    dx = edgeAbove >= 1. ? dx : 1;
                    float sideEdge = getNormalDistance(dx, 0, depth, normal);
                    float diff = 0.0;
                    diff += sideEdge;
                    diff += getNormalDistance(0, -1, depth, normal);
                    return step(0.1, diff);
                }

                void main() {
                    vec4 texel = texture2D( tDiffuse, vUv );
                    float dei = depthEdgeIndicator();
                    float nei = normalEdgeIndicator();
                    // float coefficient = dei > 0.0 ? (1.0 - dei * .25) : (1.0 + nei * .25);
                    float coefficient = dei > 0.0 ? (1.0 - dei * .5) : (1.0 + nei * .5);
                    // float dCol = dei > 0.0 ? -dei * .2 : nei * .05;
                    // float dCol = -dei * .2 + nei * .05;
                    gl_FragColor = texel * coefficient;
                    // gl_FragColor = texel + dCol;

                    // vec3 normal = getNormal(0, 0);
                    // gl_FragColor = vec4(abs(dot(normal, vec3(0., 0., 1.))));
                }
                `
        } )
    }
}

function pixelRenderTarget( resolution: THREE.Vector2, pixelFormat: THREE.PixelFormat, depthTexture: boolean ) {
    const renderTarget = new WebGLRenderTarget(
        resolution.x, resolution.y,
        !depthTexture ?
            undefined
            : {
                depthTexture: new THREE.DepthTexture(
                    resolution.x,
                    resolution.y
                ),
                depthBuffer: true
            }
    )
    renderTarget.texture.format = pixelFormat
    renderTarget.texture.minFilter = THREE.NearestFilter
    renderTarget.texture.magFilter = THREE.NearestFilter
    renderTarget.texture.generateMipmaps = false
    renderTarget.stencilBuffer = false
    return renderTarget
}
