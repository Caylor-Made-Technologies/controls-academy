/**
 * A brief arc: a blue-white flash plus a few sparks, fired each time `events()` goes up.
 * Used only where real hardware arcs in normal service: contacts opening under load (the arc chutes
 * contain it). Not used for faults, so it never gives away a Fault Hunt answer. Off with reduced motion. Drives its own frames while visible, so it works
 * inside a render-on-change Stage.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, type Points, type PointsMaterial, type Sprite } from 'three';
import { haloTexture } from './textures';

const N = 18;
const LIFE = 0.45; // s

export function Sparks({ pos, events, scale = 1, reduceMotion }: { pos: [number, number, number]; events: () => number; scale?: number; reduceMotion: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const pts = useRef<Points>(null);
  const mat = useRef<PointsMaterial>(null);
  const flash = useRef<Sprite>(null);
  const halo = useMemo(() => haloTexture(), []);
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(N * 3), 3));
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  const vel = useRef(new Float32Array(N * 3));
  const age = useRef(LIFE);
  const seen = useRef<number | null>(null);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const n = events();
    if (seen.current === null) seen.current = n; // no burst for what happened before we opened
    if (n > seen.current && !reduceMotion) {
      age.current = 0;
      const p = geo.getAttribute('position') as BufferAttribute;
      for (let i = 0; i < N; i++) {
        p.setXYZ(i, 0, 0, 0);
        const a = Math.random() * Math.PI * 2;
        const up = 0.4 + Math.random() * 0.8;
        vel.current.set([Math.cos(a) * 0.5 * scale, up * scale, (Math.sin(a) * 0.3 + 0.5) * scale], i * 3);
      }
      p.needsUpdate = true;
    }
    seen.current = n;
    const live = age.current < LIFE;
    if (pts.current) pts.current.visible = live;
    if (flash.current) flash.current.visible = live && age.current < 0.09;
    if (!live) return;
    age.current += dt;
    const p = geo.getAttribute('position') as BufferAttribute;
    const v = vel.current;
    for (let i = 0; i < N; i++) {
      v[i * 3 + 1] -= 3.5 * scale * dt; // gravity
      p.setXYZ(i, p.getX(i) + v[i * 3] * dt, p.getY(i) + v[i * 3 + 1] * dt, p.getZ(i) + v[i * 3 + 2] * dt);
    }
    p.needsUpdate = true;
    if (mat.current) mat.current.opacity = Math.max(0, 1 - age.current / LIFE);
    invalidate(); // keep drawing until the burst is over
  });

  return (
    <group position={pos}>
      <points ref={pts} geometry={geo} visible={false}>
        <pointsMaterial ref={mat} color="#ffd27a" size={0.012 * scale} sizeAttenuation transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </points>
      <sprite ref={flash} scale={[0.12 * scale, 0.12 * scale, 1]} visible={false}>
        <spriteMaterial map={halo} color="#cfe6ff" blending={AdditiveBlending} depthWrite={false} transparent toneMapped={false} />
      </sprite>
    </group>
  );
}
