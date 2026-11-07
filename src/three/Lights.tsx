/**
 * Shared studio lighting + reflections for every 3D scene. One key light (the only shadow caster),
 * a sky/ground hemisphere, a brand-blue rim and a warm bounce, plus a tiny procedural environment map
 * for subtle reflections on metal. Everything scales with the quality tier.
 */
import { Environment, Lightformer } from '@react-three/drei';
import type { Look } from './look';
import type { TierSettings } from './support';

export interface ShadowBox { left: number; right: number; top: number; bottom: number }

export function StudioLights({ look, q, keyPos, shadowBox, mapSize = 1024 }: { look: Look; q: TierSettings; keyPos: [number, number, number]; shadowBox?: ShadowBox; mapSize?: number }) {
  const b = shadowBox ?? { left: -1, right: 1, top: 1, bottom: -1 };
  return (
    <>
      <color attach="background" args={[look.bg]} />
      <fog attach="fog" args={[look.bg, look.fog[0], look.fog[1]]} />
      <ambientLight intensity={look.ambient} />
      <hemisphereLight args={look.hemi} />
      <directionalLight
        position={keyPos}
        intensity={look.key[1]}
        color={look.key[0]}
        castShadow={q.shadows}
        shadow-mapSize={[mapSize, mapSize]}
        shadow-camera-left={b.left}
        shadow-camera-right={b.right}
        shadow-camera-top={b.top}
        shadow-camera-bottom={b.bottom}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />
      <directionalLight position={[-keyPos[0] * 1.4, keyPos[1] * 0.6, -keyPos[2] * 0.25]} intensity={look.rim[1]} color={look.rim[0]} />
      <directionalLight position={[keyPos[0], -keyPos[1] * 0.3, keyPos[2] * 0.75]} intensity={look.fill[1]} color={look.fill[0]} />
      {q.envRes > 0 && (
        <Environment resolution={q.envRes} frames={1} environmentIntensity={look.theme === 'light' ? 0.9 : 1}>
          <Lightformer form="rect" intensity={look.env.main} color="#dbe8ff" position={[0, 2, 2]} scale={[3, 1, 1]} />
          <Lightformer form="rect" intensity={look.env.rimA} color="#3d8bff" position={[-3, 0.5, 1]} rotation-y={Math.PI / 2} scale={[2, 1, 1]} />
          <Lightformer form="rect" intensity={look.env.rimB} color="#22d3ee" position={[3, 0.2, 1]} rotation-y={-Math.PI / 2} scale={[2, 1, 1]} />
          {/* a soft floor bounce so undersides aren't black */}
          <Lightformer form="rect" intensity={0.35} color="#ffe9cf" position={[0, -2, 1]} rotation-x={Math.PI / 2} scale={[4, 4, 1]} />
        </Environment>
      )}
    </>
  );
}
