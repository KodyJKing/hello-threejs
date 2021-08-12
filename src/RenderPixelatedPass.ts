import * as THREE from "three"
import { Vector2, Vector3, Vector4, WebGLRenderer, WebGLRenderTarget } from "three"
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
        writeBuffer: WebGLRenderTarget
    ) {
        let projMat = this.camera.projectionMatrix.clone()
        let viewMat = this.camera.matrixWorldInverse
        let vpMat = projMat.multiply(viewMat)
        let vpInvMat = vpMat.clone().invert()
        let positionResets: [Vector3, Vector3][] = []
        // this.scene.traverse(child => {
        //     if (child instanceof THREE.Mesh) {
        //         let pos = child.position 

        //         let pos4 = new Vector4(pos.x, pos.y, pos.z, 1)
        //         let imagePos = pos4.applyMatrix4(vpMat)
        //         let {x, y, z, w} = imagePos
        //         x /= w, y /= w, z /= w

        //         // console.log(x.toFixed(2) + ", " + y.toFixed(2))

        //         // let initialOffset = child.userData.initialOffset
        //         // if (initialOffset) {
        //         //     x += initialOffset.x / w
        //         //     y += initialOffset.y / w
        //         // }

        //         let resx = this.resolution.x, resy = this.resolution.y
        //         let x2 = Math.floor(x * resx * .5) / resx * 2
        //         let y2 = Math.floor(y * resy * .5) / resy * 2
        //         let dx = x2 - x, dy = y2 - y
        //         let imageOffset = new Vector4(dx * w, dy * w, 0, 0)

        //         // if (initialOffset)
        //         //     imageOffset.add(initialOffset)
        //         // else
        //         //     child.userData.initialOffset = imageOffset.clone()
                
        //         positionResets.push([child.position, child.position.clone()])
                
        //         let worldOffset = imageOffset.applyMatrix4(vpInvMat)
        //         let worldOffset3 = new Vector3(worldOffset.x, worldOffset.y, worldOffset.z)

        //         child.position.add(worldOffset3)
        //     }
        // })

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

        for (let [pos, oldPos] of positionResets)
            pos.copy(oldPos)
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
                uniform vec4 resolution;
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
                    return floor(smoothstep(0.01, 0.02, diff) * 2.) / 2.;
                }

                float normalEdgeIndicator() {
                    float depth = getDepth(0, 0);
                    vec3 normal = getNormal(0, 0);
                    
                    float diff = 0.0;

                    int dx = int(clamp(sign(normal.x), 0.0, 1.0));
                    float edgeAbove = getNormalDistance(-1, 1, depth, normal);
                    dx = edgeAbove >= 1. ? dx : 1;
                    float sideEdge = getNormalDistance(dx, 0, depth, normal);
                    diff += sideEdge;

                    diff += getNormalDistance(0, -1, depth, normal);

                    // diff += getNormalDistance(0, 1, depth, normal);
                    // diff += getNormalDistance(-1, 0, depth, normal);
                    // diff += getNormalDistance(1, 0, depth, normal);

                    return step(0.1, diff);
                }

                float lum(vec4 color) {
                    vec4 weights = vec4(.2126, .7152, .0722, .0);
                    return dot(color, weights);
                }

                float smoothSign(float x, float radius) {
                    return smoothstep(-radius, radius, x) * 2.0 - 1.0;
                }

                void main() {
                    vec4 texel = texture2D( tDiffuse, vUv );

                    float tLum = lum(texel);
                    float sNei = smoothSign(tLum - .3, .1) + .7;
                    float sDei = smoothSign(tLum - .3, .1) + .5;
                    // float sNei = 1.0;
                    // float sDei = 1.0;

                    float dei = depthEdgeIndicator();
                    float nei = normalEdgeIndicator();

                    float coefficient = dei > 0.0 ? (1.0 - sDei * dei * .3) : (1.0 + sNei * nei * .25);

                    gl_FragColor = texel * coefficient;
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
