/**
 * Shared 3D building blocks (rounded boxes, canvas labels, LEDs with fake bloom) used by the
 * control panel scene and the hardware library models.
 */
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import { AdditiveBlending, type Mesh, type MeshStandardMaterial, type Sprite } from 'three';
import { haloTexture, labelTexture } from './textures';

export function Box({ size, pos, color, rough = 0.6, metal = 0.1, children, mref, opacity, round }: { size: [number, number, number]; pos: [number, number, number]; color: string; rough?: number; metal?: number; children?: ReactNode; mref?: React.Ref<Mesh>; opacity?: number; round?: number }) {
  // Real hardware has softened edges; rounded corners catch the light and read as molded parts.
  const minDim = Math.min(...size);
  const r = round ?? (minDim >= 0.03 ? Math.min(0.0055, minDim * 0.12) : 0);
  if (r > 0) {
    return (
      <RoundedBox ref={mref} args={size} radius={r} smoothness={2} position={pos} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={rough} metalness={metal} transparent={opacity !== undefined} opacity={opacity ?? 1} />
        {children}
      </RoundedBox>
    );
  }
  return (
    <mesh ref={mref} position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} transparent={opacity !== undefined} opacity={opacity ?? 1} />
      {children}
    </mesh>
  );
}

export function Label({ text, pos, w = 0.06, h = 0.015, fg, bg, rot }: { text: string; pos: [number, number, number]; w?: number; h?: number; fg?: string; bg?: string; rot?: [number, number, number] }) {
  const tex = useMemo(() => labelTexture(text, { fg: fg ?? '#11161d', bg: bg ?? '#f2f4f7', w: Math.round(w * 4000), h: Math.round(h * 4000), size: Math.round(h * 4000 * 0.62) }), [text, fg, bg, w, h]);
  return (
    <mesh position={pos} rotation={rot}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

/** An LED with a fake-bloom halo. `read` is polled every frame. */
export function Led({ pos, color, read, size = 0.007, halo = 0.05 }: { pos: [number, number, number]; color: string; read: () => boolean; size?: number; halo?: number }) {
  const mat = useRef<MeshStandardMaterial>(null);
  const spr = useRef<Sprite>(null);
  const htex = useMemo(() => haloTexture(), []);
  useFrame(() => {
    const on = read();
    if (mat.current) {
      mat.current.emissiveIntensity = on ? 3 : 0;
      mat.current.color.set(on ? color : '#3a4250');
    }
    if (spr.current) spr.current.visible = on;
  });
  return (
    <group position={pos}>
      <mesh>
        <boxGeometry args={[size, size, 0.004]} />
        <meshStandardMaterial ref={mat} color="#3a4250" emissive={color} emissiveIntensity={0} toneMapped={false} />
      </mesh>
      <sprite ref={spr} scale={[halo, halo, 1]} position={[0, 0, 0.004]}>
        <spriteMaterial map={htex} color={color} blending={AdditiveBlending} depthWrite={false} transparent opacity={0.85} />
      </sprite>
    </group>
  );
}

