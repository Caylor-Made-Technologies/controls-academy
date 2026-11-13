/**
 * Shared studio lighting + reflections for every 3D scene: a soft key light, a sky/ground hemisphere, a
 * brand-blue rim and a warm bounce, plus room reflections for metal and paint. Shadows are a baked contact
 * shadow on the ground (drawn once), not real-time shadow maps: same grounding, a fraction of the cost.
 */
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Look } from './look';
import type { TierSettings } from './support';

/**
 * Image-based lighting from a small procedural room (soft ceiling panels, neutral walls), pre-filtered once
 * per canvas. This is what makes metal look like metal: it has something to reflect. No downloaded assets.
 */
function RoomReflections({ intensity }: { intensity: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    scene.environment = target.texture;
    room.traverse((o) => { const m = o as { geometry?: { dispose(): void }; material?: { dispose(): void } }; m.geometry?.dispose(); m.material?.dispose(); });
    pmrem.dispose();
    invalidate();
    return () => { scene.environment = null; target.dispose(); };
  }, [gl, scene, invalidate]);
  useEffect(() => { scene.environmentIntensity = intensity; invalidate(); }, [scene, intensity, invalidate]);
  return null;
}

export interface ShadowBox { left: number; right: number; top: number; bottom: number }

/** `fog` overrides the theme's fog distances for scenes much bigger than the motor panel. */
export function StudioLights({ look, q, keyPos, shadowBox, mapSize = 1024, fog }: { look: Look; q: TierSettings; keyPos: [number, number, number]; shadowBox?: ShadowBox; mapSize?: number; fog?: [number, number] }) {
  const b = shadowBox ?? { left: -1, right: 1, top: 1, bottom: -1 };
  return (
    <>
      <color attach="background" args={[look.bg]} />
      <fog attach="fog" args={[look.bg, (fog ?? look.fog)[0], (fog ?? look.fog)[1]]} />
      {/* Most fill light now comes from the room reflections; ambient and sky are only a floor under them. */}
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
      <RoomReflections intensity={look.envIntensity} />
    </>
  );
}
