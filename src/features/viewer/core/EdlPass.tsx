/**
 * WS-B. Takes over final rendering (useFrame priority 1): renders the scene into a float render
 * target with a depth texture, then composites EDL + sun shading + background to the screen.
 * Must stay the last child of <ViewerCanvas>.
 */
import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {edlFragmentShader, edlVertexShader} from '../shaders/edl';
import {useViewerStore} from '../store';
import {BACKGROUNDS, hexToRgb, srgbToLinear} from './colors';

const linear = (hex: string) => new THREE.Vector3(...srgbToLinear(hexToRgb(hex)));

export function sunDirectionWorld(azimuthDeg: number, elevationDeg: number): THREE.Vector3 {
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const el = THREE.MathUtils.degToRad(elevationDeg);
  // Azimuth measured clockwise from north (+Y), Z-up.
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)).normalize();
}

export function EdlPass() {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const target = useMemo(() => {
    const t = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
    });
    t.depthTexture = new THREE.DepthTexture(1, 1, THREE.FloatType);
    t.depthTexture.format = THREE.DepthFormat;
    return t;
  }, []);

  const {quadScene, quadCamera, material} = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader: edlVertexShader,
      fragmentShader: edlFragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tColor: {value: target.texture},
        tDepth: {value: target.depthTexture},
        uResolution: {value: new THREE.Vector2(1, 1)},
        uNear: {value: 0.1},
        uFar: {value: 1000},
        uProj00: {value: 1},
        uProj11: {value: 1},
        uEdl: {value: 1},
        uEdlStrength: {value: 1},
        uEdlRadius: {value: 1.4},
        uSunDirView: {value: new THREE.Vector3(0, 0, 1)},
        uSunStrength: {value: 0.35},
        uBgTop: {value: new THREE.Vector3()},
        uBgBottom: {value: new THREE.Vector3()},
      },
    });
    const quadScene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    quadScene.add(quad);
    return {quadScene, quadCamera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), material};
  }, [target]);

  useEffect(() => {
    const w = Math.max(1, Math.floor(size.width * dpr));
    const h = Math.max(1, Math.floor(size.height * dpr));
    target.setSize(w, h);
    material.uniforms.uResolution.value.set(w, h);
  }, [size, dpr, target, material]);

  useEffect(
    () => () => {
      target.dispose();
      material.dispose();
    },
    [target, material],
  );

  const sunView = useMemo(() => new THREE.Vector3(), []);

  useFrame(({scene, camera}) => {
    const {render} = useViewerStore.getState();
    const cam = camera as THREE.PerspectiveCamera;
    const u = material.uniforms;
    u.uNear.value = cam.near;
    u.uFar.value = cam.far;
    u.uProj00.value = cam.projectionMatrix.elements[0];
    u.uProj11.value = cam.projectionMatrix.elements[5];
    u.uEdl.value = render.edl ? 1 : 0;
    u.uEdlStrength.value = render.edlStrength;
    u.uEdlRadius.value = render.edlRadius * dpr;
    sunView.copy(sunDirectionWorld(render.sunAzimuth, render.sunElevation)).transformDirection(cam.matrixWorldInverse);
    u.uSunDirView.value.copy(sunView);
    const bg = BACKGROUNDS[render.background];
    u.uBgTop.value.copy(linear(bg.top));
    u.uBgBottom.value.copy(linear(bg.bottom));

    gl.setRenderTarget(target);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(quadScene, quadCamera);
  }, 1);

  return null;
}
