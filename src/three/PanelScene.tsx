/**
 * Procedural 3D control panel + operator station + motor. Generic, unbranded hardware.
 * Everything live (LEDs, contactor armature, overload flag, motor shaft, current flow)
 * is read from the SimRuntime inside useFrame, so the scan never triggers React renders.
 */
import { Billboard, Edges, Instances, Instance } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  CanvasTexture, CatmullRomCurve3, DoubleSide, MathUtils, Matrix4, SRGBColorSpace, Vector3,
  type Group, type InstancedMesh, type Mesh, type MeshStandardMaterial,
} from 'three';
import type { SimRuntime } from '../features/simulator/runtime';
import { addressMap, type Skin } from '../skins';
import { PARTS, type PartId } from './info';
import { brushedTexture, floorTexture } from './textures';
import { Box, Label, Led } from './kit';
import { HardwareModel, type HwLive } from './HardwareModel';
import type { HwModel } from '../content/hardware';

export interface SceneProps {
  rt: SimRuntime;
  /** Brand skin: labels the generic hardware in that platform's style. */
  skin: Skin;
  selected: PartId | null;
  onSelect: (p: PartId) => void;
  xray: boolean;
  explode: boolean;
  shadows: boolean;
  /** Hardware-library model to show instead of the generic PLC rack (null = generic rack). */
  hw?: HwModel | null;
}

const C = {
  steel: '#bcc4cc', plate: '#d9dde2', module: '#2b3240', moduleLight: '#3a4456', din: '#9aa3ad',
  duct: '#8e98a3', ductCover: '#a8b1bb', copper: '#c7804a', red: '#c0392b', blue: '#2563eb',
  black: '#15181d', white: '#e8ecf0', yellow: '#f5c400', green: '#16a34a', select: '#3d8bff',
};

// ---------- small building blocks ----------

/** Clickable wrapper with a selection outline. */
function Part({ id, onSelect, selected, outline, children }: { id: PartId; onSelect: (p: PartId) => void; selected: boolean; outline: { size: [number, number, number]; pos: [number, number, number] }; children: ReactNode }) {
  const [hover, setHover] = useState(false);
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(id);
  };
  const title = PARTS[id].title;
  return (
    <group
      onClick={click}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHover(true); }}
      onPointerOut={() => { document.body.style.cursor = ''; setHover(false); }}
    >
      {children}
      {(selected || hover) && (
        <mesh position={outline.pos} raycast={() => null}>
          <boxGeometry args={outline.size} />
          <meshBasicMaterial color={C.select} transparent opacity={selected ? 0.12 : 0.04} depthWrite={false} />
          <Edges color={C.select} lineWidth={selected ? 2 : 1} transparent opacity={selected ? 1 : 0.6} />
        </mesh>
      )}
      {(selected || hover) && (
        <Billboard position={[outline.pos[0], outline.pos[1] + outline.size[1] / 2 + 0.022, outline.pos[2] + outline.size[2] / 2]}>
          <Label text={title} pos={[0, 0, 0]} w={Math.max(0.06, title.length * 0.0065)} h={0.017} fg="#ffffff" bg={selected ? '#1b63eb' : '#1a2230'} />
        </Billboard>
      )}
    </group>
  );
}

/** Vents, hinged terminal covers and label strips for every PLC module, drawn as instances. */
const RACK: [number, number][] = [[-0.17, 0.058], [-0.105, 0.068], [-0.045, 0.048], [0.01, 0.048]];
function RackTrim() {
  return (
    <group raycast={() => null}>
      <Instances limit={20}>
        <boxGeometry args={[1, 0.002, 0.005]} />
        <meshStandardMaterial color="#0b0f14" roughness={0.9} />
        {RACK.flatMap(([x, w]) => Array.from({ length: 5 }, (_, i) => <Instance key={`${x}v${i}`} position={[x, 0.2055, 0.02 + i * 0.016]} scale={[w * 0.7, 1, 1]} />))}
      </Instances>
      <Instances limit={4} castShadow>
        <boxGeometry args={[1, 0.052, 0.006]} />
        <meshStandardMaterial color="#3a4456" roughness={0.5} />
        {RACK.map(([x, w]) => <Instance key={x} position={[x, 0.098, 0.103]} scale={[w - 0.008, 1, 1]} />)}
      </Instances>
      <Instances limit={12}>
        <boxGeometry args={[1, 0.0012, 0.0008]} />
        <meshStandardMaterial color="#4b5568" />
        {RACK.flatMap(([x, w]) => [0.084, 0.092, 0.1].map((y) => <Instance key={`${x}r${y}`} position={[x, y, 0.1065]} scale={[w - 0.016, 1, 1]} />))}
      </Instances>
      <Instances limit={4}>
        <boxGeometry args={[1, 0.008, 0.0008]} />
        <meshStandardMaterial color="#e8ecf0" roughness={0.8} />
        {RACK.map(([x, w]) => <Instance key={x} position={[x, 0.114, 0.1065]} scale={[w - 0.014, 1, 1]} />)}
      </Instances>
      <Instances limit={4}>
        <boxGeometry args={[1, 0.07, 0.001]} />
        <meshStandardMaterial color="#141a24" roughness={0.4} />
        {RACK.map(([x, w]) => <Instance key={x} position={[x, 0.144, 0.1015]} scale={[w - 0.012, 1, 1]} />)}
      </Instances>
    </group>
  );
}

// ---------- current flow (X-ray) ----------

function Flow({ curve, active, color, count = 14, speed = 0.35 }: { curve: CatmullRomCurve3; active: () => boolean; color: string; count?: number; speed?: number }) {
  const ref = useRef<InstancedMesh>(null);
  const tmp = useMemo(() => new Vector3(), []);
  const mat = useMemo(() => new Matrix4(), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const on = active();
    mesh.visible = on;
    if (!on) return;
    const t0 = clock.elapsedTime * speed;
    for (let i = 0; i < count; i++) {
      const u = (t0 + i / count) % 1;
      curve.getPointAt(u, tmp);
      mesh.setMatrixAt(i, mat.makeTranslation(tmp.x, tmp.y, tmp.z));
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} raycast={() => null}>
      <sphereGeometry args={[0.0075, 10, 10]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  );
}

function Wire({ curve, color, radius = 0.0032 }: { curve: CatmullRomCurve3; color: string; radius?: number }) {
  return (
    <mesh castShadow raycast={() => null}>
      <tubeGeometry args={[curve, 48, radius, 8, false]} />
      <meshStandardMaterial color={color} roughness={0.45} metalness={0.05} />
    </mesh>
  );
}

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);

// ---------- the scene ----------

export function PanelScene({ rt, skin, selected, onSelect, xray, explode, hw }: SceneProps) {
  const s = () => rt.scene.state;
  const io = () => rt.io;
  const plc = () => rt.plc;
  const ctrlPower = () => rt.scene.activeFault !== 'fuse';
  const brushed = useMemo(() => brushedTexture(), []);
  const floor = useMemo(() => floorTexture(), []);
  const sel = (id: PartId) => selected === id;
  const hwLive = useMemo<HwLive>(() => ({
    di: (i) => Boolean(rt.io.DI[i]),
    do: (i) => Boolean(rt.io.DO[i]),
    run: () => rt.plc.mode === 'RUN' && !rt.plc.fault,
    force: () => rt.plc.hasForces,
    fault: () => Boolean(rt.plc.fault) && Math.floor(performance.now() / 400) % 2 === 0,
    power: () => rt.scene.activeFault !== 'fuse',
  }), [rt]);
  const hwSel = useMemo(() => {
    if (!hw || !selected) return null;
    const kind = selected === 'plc-psu' ? 'psu' : selected === 'di-card' ? 'di' : selected === 'do-card' ? 'do' : selected === 'cpu' ? 'cpu' : null;
    if (!kind) return null;
    const i = hw.shape.units.findIndex((u) => u.kind === kind || (kind === 'cpu' && (u.kind === 'brick' || u.kind === 'logic' || u.kind === 'safety' || u.kind === 'pc' || u.kind === 'hmi')));
    return i >= 0 ? i : null;
  }, [hw, selected]);
  const enclosureOpacity = xray ? 0.18 : 1;

  // Curves for wiring (panel coordinates).
  const curves = useMemo(() => ({
    coil: new CatmullRomCurve3([v(0.01, 0.074, 0.06), v(0.01, 0.0, 0.06), v(-0.06, 0.0, 0.07), v(-0.19, 0.0, 0.07), v(-0.2, -0.085, 0.095)]),
    power: [0, 1, 2].map((k) => new CatmullRomCurve3([
      v(-0.32 + k * 0.02, 0.33, 0.06), v(-0.32 + k * 0.02, 0.29, 0.06), v(-0.36, 0.29, 0.06), v(-0.36, -0.06, 0.06),
      v(-0.225 + k * 0.022, -0.085, 0.07), v(-0.225 + k * 0.022, -0.2, 0.07), v(-0.225 + k * 0.022, -0.31, 0.06),
      v(-0.24 + k * 0.03, -0.34, 0.06), v(-0.26 + k * 0.033, -0.4, 0.055),
    ])),
    motor: new CatmullRomCurve3([v(-0.22, -0.46, 0.05), v(-0.2, -0.58, 0.08), v(0.2, -0.7, 0.2), v(0.62, -0.72, 0.32), v(0.82, -0.62, 0.3)]),
    input: new CatmullRomCurve3([v(0.82, -0.12, 0.05), v(0.6, -0.2, 0.02), v(0.42, -0.34, 0.03), v(0.38, -0.34, 0.06), v(0.12, -0.34, 0.06), v(0.12, -0.4, 0.06)]),
    di: new CatmullRomCurve3([v(-0.045, 0.074, 0.06), v(-0.045, 0.0, 0.06), v(0.1, 0.0, 0.06), v(0.38, 0.0, 0.06), v(0.38, -0.34, 0.06), v(0.12, -0.34, 0.06), v(0.12, -0.4, 0.06)]),
  }), []);

  // Contactor armature, overload flag, motor shaft refs.
  const armature = useRef<Mesh>(null);
  const flag = useRef<Mesh>(null);
  const shaft = useRef<Group>(null);
  const handle = useRef<Group>(null);
  const contactorGroup = useRef<Group>(null);
  const explodeParts = useRef<(Group | null)[]>([]);
  const btn = { start: useRef<Group>(null), stop: useRef<Group>(null), reset: useRef<Group>(null), estop: useRef<Group>(null) };
  const lampRun = useRef<MeshStandardMaterial>(null);
  const lampFault = useRef<MeshStandardMaterial>(null);

  useFrame((_, dt) => {
    const st = s();
    if (armature.current) armature.current.position.z = MathUtils.lerp(armature.current.position.z, st.contactor ? 0.088 : 0.1, Math.min(1, dt * 30));
    if (flag.current) flag.current.position.z = MathUtils.lerp(flag.current.position.z, st.olTripped ? 0.1 : 0.082, Math.min(1, dt * 20));
    if (shaft.current) shaft.current.rotation.x += (st.rpm / 60) * Math.PI * 2 * dt * 0.25; // slowed ×4 so you can see it turn
    if (btn.start.current) btn.start.current.position.z = st.startPressed ? 0.012 : 0.022;
    if (btn.stop.current) btn.stop.current.position.z = st.stopPressed ? 0.012 : 0.022;
    if (btn.reset.current) btn.reset.current.position.z = st.resetPressed ? 0.012 : 0.022;
    if (btn.estop.current) btn.estop.current.position.z = st.estopIn ? 0.13 : 0.146;
    const run = Boolean(io().DO[1]);
    const flt = Boolean(io().DO[2]);
    if (lampRun.current) { lampRun.current.emissiveIntensity = run ? 3 : 0; lampRun.current.color.set(run ? '#7dffbe' : '#1d3b2c'); }
    if (lampFault.current) { lampFault.current.emissiveIntensity = flt ? 3 : 0; lampFault.current.color.set(flt ? '#ffd28a' : '#3d2f17'); }
    // exploded view of the contactor
    explodeParts.current.forEach((g, i) => {
      if (!g) return;
      const target = explode ? i * 0.055 : 0;
      g.position.z = MathUtils.lerp(g.position.z, target, Math.min(1, dt * 6));
    });
    if (contactorGroup.current) {
      const tx = explode ? 0.12 : 0;
      contactorGroup.current.position.x = MathUtils.lerp(contactorGroup.current.position.x, tx, Math.min(1, dt * 6));
    }
  });

  const terminals = useMemo(() => Array.from({ length: 18 }, (_, i) => -0.29 + i * 0.033), []);
  const wireNums = ['L1', 'L2', 'L3', 'T1', 'T2', 'T3', '1', '2', '3', '4', '5', '6', '7', '8', '+24', '0V', 'X1', 'X2'];

  return (
    <group>
      {/* floor + wall */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.3, -0.75, 0.6]} receiveShadow>
        <planeGeometry args={[6, 4]} />
        <meshStandardMaterial map={floor} color="#8a94a3" roughness={0.92} />
      </mesh>
      <mesh position={[0.3, 0.3, -0.04]} receiveShadow>
        <planeGeometry args={[6, 3]} />
        <meshStandardMaterial color="#1b222c" roughness={1} />
      </mesh>
      {/* working-clearance box painted in front of the panel (example teaching marking) */}
      <group position={[0, -0.7485, 0]} raycast={() => null}>
        {[[0, 0.03, 0.92, 0.03], [0, 0.95, 0.92, 0.03], [-0.445, 0.49, 0.03, 0.95], [0.445, 0.49, 0.03, 0.95]].map(([x, z, w, d], i) => (
          <mesh key={i} position={[x, 0, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w, d]} /><meshStandardMaterial color="#f5c400" roughness={0.7} /></mesh>
        ))}
        <Label text="KEEP CLEAR — WORKING SPACE" pos={[0, 0.0005, 0.85]} rot={[-Math.PI / 2, 0, 0]} w={0.42} h={0.05} fg="#f5c400" bg="#00000000" />
      </group>
      {/* conduit from the top of the enclosure */}
      <group raycast={() => null}>
        <mesh position={[0.25, 1.1, 0.12]} castShadow><cylinderGeometry args={[0.018, 0.018, 1.0, 20]} /><meshStandardMaterial color="#9aa3ad" metalness={0.8} roughness={0.35} /></mesh>
        <mesh position={[0.25, 0.605, 0.12]}><cylinderGeometry args={[0.026, 0.026, 0.03, 20]} /><meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.35} /></mesh>
        <mesh position={[-0.2, 1.1, 0.12]} castShadow><cylinderGeometry args={[0.024, 0.024, 1.0, 20]} /><meshStandardMaterial color="#9aa3ad" metalness={0.8} roughness={0.35} /></mesh>
        <mesh position={[-0.2, 0.605, 0.12]}><cylinderGeometry args={[0.032, 0.032, 0.03, 20]} /><meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.35} /></mesh>
      </group>

      {/* ---------- enclosure ---------- */}
      <group>
        <Box size={[0.9, 1.18, 0.015]} pos={[0, 0, -0.025]} color={C.steel} metal={0.6} rough={0.45} opacity={xray ? enclosureOpacity : undefined} />
        {([[-0.445, 0], [0.445, 0]] as const).map(([x], i) => (
          <mesh key={i} position={[x, 0, 0.12]} castShadow receiveShadow>
            <boxGeometry args={[0.015, 1.18, 0.3]} />
            <meshStandardMaterial map={brushed} color={C.steel} metalness={0.65} roughness={0.42} transparent={xray} opacity={enclosureOpacity} />
          </mesh>
        ))}
        {([0.585, -0.585] as const).map((y, i) => (
          <mesh key={i} position={[0, y, 0.12]} castShadow receiveShadow>
            <boxGeometry args={[0.9, 0.015, 0.3]} />
            <meshStandardMaterial map={brushed} color={C.steel} metalness={0.65} roughness={0.42} transparent={xray} opacity={enclosureOpacity} />
          </mesh>
        ))}
        {/* nameplate on the top frame */}
        <Label text="CAYLOR MADE TECHNOLOGIES  ·  MCP-1  ·  480 VAC 3Ø" pos={[0, 0.5925, 0.272]} rot={[-Math.PI / 2, 0, 0]} w={0.42} h={0.03} fg="#e8f1ff" bg="#1a2230" />
        <Label text="MCP-1  MOTOR CONTROL PANEL" pos={[0, 0.535, -0.008]} w={0.3} h={0.026} fg="#e8f1ff" bg="#1e3a8a" />
        {/* back plate */}
        <Box size={[0.84, 1.1, 0.006]} pos={[0, 0, -0.012]} color={C.plate} metal={0.35} rough={0.6} />
        {/* door, hinged on the left and swung open */}
        <group position={[-0.45, 0, 0.275]} rotation={[0, -2.7, 0]}>
          <mesh position={[0.45, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.9, 1.18, 0.018]} />
            <meshStandardMaterial map={brushed} color={C.steel} metalness={0.6} roughness={0.42} transparent={xray} opacity={enclosureOpacity} side={DoubleSide} />
          </mesh>
          {/* door gasket and hinges */}
          {[[0.45, 0.565, 0.86, 0.012], [0.45, -0.565, 0.86, 0.012], [0.025, 0, 0.012, 1.12], [0.875, 0, 0.012, 1.12]].map(([x, y, w, h], i) => (
            <mesh key={i} position={[x, y, -0.011]}><boxGeometry args={[w, h, 0.006]} /><meshStandardMaterial color="#111418" roughness={0.95} /></mesh>
          ))}
          {[-0.42, 0, 0.42].map((y) => (
            <mesh key={y} position={[0, y, 0]} castShadow><cylinderGeometry args={[0.007, 0.007, 0.06, 16]} /><meshStandardMaterial color="#9aa3ad" metalness={0.85} roughness={0.3} /></mesh>
          ))}
          <Label text="DANGER — 480 V" pos={[0.45, 0.4, -0.011]} rot={[0, Math.PI, 0]} w={0.22} h={0.05} fg="#fff" bg="#c62828" />
          <Label text="ARC FLASH LABEL (example)" pos={[0.45, 0.3, -0.011]} rot={[0, Math.PI, 0]} w={0.22} h={0.03} fg="#111" bg="#ffb547" />
          <mesh position={[0.82, 0, -0.02]}>
            <boxGeometry args={[0.03, 0.12, 0.025]} />
            <meshStandardMaterial color="#2b3240" />
          </mesh>
        </group>
      </group>

      {/* ---------- top row: disconnect, fuses, transformer, 24 V supply ---------- */}
      <Part id="disconnect" onSelect={onSelect} selected={sel('disconnect')} outline={{ size: [0.14, 0.2, 0.16], pos: [-0.3, 0.4, 0.06] }}>
        <Box size={[0.12, 0.17, 0.09]} pos={[-0.3, 0.4, 0.045]} color={C.moduleLight} />
        <group ref={handle} position={[-0.3, 0.4, 0.1]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow><cylinderGeometry args={[0.03, 0.03, 0.02, 24]} /><meshStandardMaterial color={C.yellow} /></mesh>
          <mesh position={[0, 0.0, 0.0]} rotation={[0, 0, 0]} castShadow><boxGeometry args={[0.018, 0.08, 0.03]} /><meshStandardMaterial color={C.red} /></mesh>
        </group>
        <Label text="MAIN" pos={[-0.3, 0.32, 0.091]} w={0.05} h={0.014} />
      </Part>

      <Part id="fuses" onSelect={onSelect} selected={sel('fuses')} outline={{ size: [0.13, 0.12, 0.09], pos: [-0.135, 0.4, 0.04] }}>
        {[-0.17, -0.14, -0.11, -0.08].map((x, i) => (
          <group key={x}>
            <Box size={[0.024, 0.09, 0.05]} pos={[x, 0.4, 0.025]} color="#4b5563" />
            <mesh position={[x, 0.4, 0.055]} rotation={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[0.008, 0.008, 0.05, 16]} />
              <meshStandardMaterial color={i === 3 ? '#e5e7eb' : '#d6c7a1'} />
            </mesh>
            {i === 3 && <Led pos={[x, 0.37, 0.052]} color="#ff6b6b" read={() => !ctrlPower()} halo={0.04} />}
          </group>
        ))}
        <Label text="FU1-3   FU4" pos={[-0.125, 0.343, 0.052]} w={0.1} h={0.013} />
      </Part>

      <Part id="transformer" onSelect={onSelect} selected={sel('transformer')} outline={{ size: [0.14, 0.14, 0.12], pos: [0.04, 0.4, 0.05] }}>
        <Box size={[0.12, 0.03, 0.09]} pos={[0.04, 0.345, 0.045]} color="#374151" />
        <Box size={[0.08, 0.1, 0.06]} pos={[0.04, 0.41, 0.045]} color="#1f2937" metal={0.3} />
        {[0.015, 0.065].map((x) => (
          <mesh key={x} position={[x, 0.41, 0.045]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.028, 0.028, 0.035, 24]} />
            <meshStandardMaterial color={C.copper} metalness={0.7} roughness={0.35} />
          </mesh>
        ))}
        <Label text="CPT 480/120" pos={[0.04, 0.345, 0.091]} w={0.08} h={0.014} />
      </Part>

      <Part id="psu24" onSelect={onSelect} selected={sel('psu24')} outline={{ size: [0.12, 0.17, 0.12], pos: [0.27, 0.4, 0.05] }}>
        <Box size={[0.1, 0.15, 0.1]} pos={[0.27, 0.4, 0.05]} color="#9ca3af" metal={0.5} rough={0.4} />
        {Array.from({ length: 6 }, (_, i) => <Box key={i} size={[0.08, 0.004, 0.002]} pos={[0.27, 0.43 + i * 0.008, 0.101]} color="#4b5563" />)}
        <Label text="24 VDC" pos={[0.27, 0.37, 0.101]} w={0.06} h={0.016} />
        <Led pos={[0.3, 0.345, 0.102]} color="#3ddc97" read={ctrlPower} />
      </Part>

      {/* ducts */}
      <Part id="duct" onSelect={onSelect} selected={sel('duct')} outline={{ size: [0.8, 0.07, 0.08], pos: [0, 0.29, 0.035] }}>
        {[0.29, 0.0, -0.34].map((y) => (
          <group key={y}>
            <Box size={[0.78, 0.05, 0.06]} pos={[0, y, 0.03]} color={C.duct} rough={0.8} opacity={xray ? 0.25 : undefined} />
            <Box size={[0.78, 0.054, 0.004]} pos={[0, y, 0.062]} color={C.ductCover} rough={0.7} opacity={xray ? 0.2 : undefined} />
          </group>
        ))}
        {[-0.385, 0.385].map((x) => <Box key={x} size={[0.04, 1.0, 0.06]} pos={[x, -0.02, 0.03]} color={C.duct} rough={0.8} opacity={xray ? 0.25 : undefined} />)}
        {!xray && (
          <Instances limit={240} castShadow>
            <boxGeometry args={[0.008, 0.012, 0.058]} />
            <meshStandardMaterial color={C.ductCover} roughness={0.75} />
            {[0.29, 0.0, -0.34].flatMap((y) => Array.from({ length: 38 }, (_, i) => -0.37 + i * 0.02).flatMap((x) => [
              <Instance key={`${y}a${x}`} position={[x, y + 0.026, 0.03]} />,
              <Instance key={`${y}b${x}`} position={[x, y - 0.026, 0.03]} />,
            ]))}
          </Instances>
        )}
      </Part>

      {/* ---------- PLC rack on DIN rail ---------- */}
      <Box size={[0.66, 0.035, 0.008]} pos={[0.02, 0.14, 0.0]} color={C.din} metal={0.8} rough={0.3} />
      {!hw && <RackTrim />}
      {hw ? (
        <group position={[-0.08, 0.14, 0.0]}>
          <HardwareModel
            shape={hw.shape}
            fit={[0.27, 0.165]}
            maxScale={1.15}
            labelText={skin.hw.cpu}
            selected={hwSel}
            onSelect={(i) => {
              const k = hw.shape.units[i].kind;
              onSelect(k === 'psu' ? 'plc-psu' : k === 'di' ? 'di-card' : k === 'do' ? 'do-card' : 'cpu');
            }}
            live={hwLive}
          />
        </group>
      ) : (
        <>
        <Part id="plc-psu" onSelect={onSelect} selected={sel('plc-psu')} outline={{ size: [0.07, 0.15, 0.12], pos: [-0.17, 0.14, 0.05] }}>
          <Box size={[0.058, 0.13, 0.1]} pos={[-0.17, 0.14, 0.05]} color={C.module} />
          <Label text="PS" pos={[-0.17, 0.19, 0.101]} w={0.03} h={0.012} fg="#c9d3e0" bg="#1a2030" />
          <Label text="24 VDC" pos={[-0.17, 0.114, 0.1072]} w={0.05} h={0.011} fg="#11161d" bg="#f2f4f7" />
          <Led pos={[-0.17, 0.165, 0.102]} color="#3ddc97" read={ctrlPower} />
        </Part>
        <Part id="cpu" onSelect={onSelect} selected={sel('cpu')} outline={{ size: [0.08, 0.15, 0.12], pos: [-0.105, 0.14, 0.05] }}>
          <Box size={[0.068, 0.13, 0.1]} pos={[-0.105, 0.14, 0.05]} color={C.module} />
          <Label text={skin.maker.replace(/\s*\(.*\)$/, '')} pos={[-0.105, 0.194, 0.101]} w={0.062} h={0.01} fg="#ffffff" bg="#1b63eb" />
          <Label text={skin.hw.cpu} pos={[-0.105, 0.182, 0.101]} w={0.062} h={0.01} fg="#c9d3e0" bg="#1a2030" />
          <Led pos={[-0.12, 0.165, 0.102]} color="#3ddc97" read={() => plc().mode === 'RUN' && !plc().fault} />
          <Led pos={[-0.105, 0.165, 0.102]} color="#ffb547" read={() => plc().hasForces} />
          <Led pos={[-0.09, 0.165, 0.102]} color="#ff6b6b" read={() => Boolean(plc().fault) && Math.floor(performance.now() / 400) % 2 === 0} />
          <Label text="RUN FRC FLT" pos={[-0.105, 0.152, 0.101]} w={0.055} h={0.008} fg="#9aa7b8" bg="#2b3240" />
          <Box size={[0.026, 0.01, 0.004]} pos={[-0.105, 0.13, 0.103]} color="#0b0f14" />
          <mesh position={[-0.105, 0.13, 0.106]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.0035, 0.0035, 0.004, 12]} /><meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.25} /></mesh>
        </Part>
        <Part id="di-card" onSelect={onSelect} selected={sel('di-card')} outline={{ size: [0.06, 0.15, 0.12], pos: [-0.045, 0.14, 0.05] }}>
          <Box size={[0.048, 0.13, 0.1]} pos={[-0.045, 0.14, 0.05]} color={C.module} />
          <Label text="IN" pos={[-0.045, 0.19, 0.101]} w={0.03} h={0.012} fg="#c9d3e0" bg="#1a2030" />
          <Label text={skin.hw.din} pos={[-0.045, 0.114, 0.1072]} w={0.042} h={0.011} fg="#11161d" bg="#f2f4f7" />
          {Array.from({ length: 8 }, (_, i) => (
            <Led key={i} pos={[-0.055 + (i % 2) * 0.02, 0.168 - Math.floor(i / 2) * 0.016, 0.102]} color="#ffb547" read={() => Boolean(io().DI[i])} size={0.006} halo={0.035} />
          ))}
        </Part>
        <Part id="do-card" onSelect={onSelect} selected={sel('do-card')} outline={{ size: [0.06, 0.15, 0.12], pos: [0.01, 0.14, 0.05] }}>
          <Box size={[0.048, 0.13, 0.1]} pos={[0.01, 0.14, 0.05]} color={C.module} />
          <Label text="OUT" pos={[0.01, 0.19, 0.101]} w={0.03} h={0.012} fg="#c9d3e0" bg="#1a2030" />
          <Label text={skin.hw.dout} pos={[0.01, 0.114, 0.1072]} w={0.042} h={0.011} fg="#11161d" bg="#f2f4f7" />
          {Array.from({ length: 8 }, (_, i) => (
            <Led key={i} pos={[0.0 + (i % 2) * 0.02, 0.168 - Math.floor(i / 2) * 0.016, 0.102]} color="#3ddc97" read={() => Boolean(io().DO[i])} size={0.006} halo={0.035} />
          ))}
        </Part>
        </>
      )}
      <Part id="switch" onSelect={onSelect} selected={sel('switch')} outline={{ size: [0.12, 0.11, 0.1], pos: [0.26, 0.14, 0.04] }}>
        <Box size={[0.1, 0.09, 0.07]} pos={[0.26, 0.14, 0.035]} color="#334155" />
        {[0.225, 0.245, 0.265, 0.285].map((x, i) => (
          <group key={x}>
            <Box size={[0.014, 0.012, 0.004]} pos={[x, 0.13, 0.071]} color="#0b0f14" />
            <Led pos={[x, 0.145, 0.071]} color="#3ddc97" read={() => i === 0 && Math.floor(performance.now() / 180) % 3 !== 0} size={0.004} halo={0.02} />
          </group>
        ))}
        <mesh position={[0.225, 0.13, 0.08]} raycast={() => null}><boxGeometry args={[0.01, 0.01, 0.02]} /><meshStandardMaterial color="#1e6fff" /></mesh>
      </Part>

      {/* ---------- contactor + overload ---------- */}
      <group ref={contactorGroup}>
        <Part id="contactor" onSelect={onSelect} selected={sel('contactor')} outline={{ size: [0.1, 0.12, 0.14], pos: [-0.2, -0.13, 0.06] }}>
          <group ref={(g) => { explodeParts.current[0] = g; }}>
            <Box size={[0.075, 0.095, 0.07]} pos={[-0.2, -0.13, 0.035]} color="#6b7280" />
            <Label text="M1" pos={[-0.2, -0.165, 0.0705]} w={0.03} h={0.014} />
          </group>
          <group ref={(g) => { explodeParts.current[1] = g; }}>
            <mesh position={[-0.2, -0.13, 0.077]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.022, 0.022, 0.014, 24]} />
              <meshStandardMaterial color={C.copper} metalness={0.7} roughness={0.35} />
            </mesh>
            {explode && <Label text="Coil A1-A2" pos={[-0.2, -0.1, 0.09]} w={0.05} h={0.012} />}
          </group>
          <group ref={(g) => { explodeParts.current[2] = g; }}>
            <mesh ref={armature} position={[-0.2, -0.115, 0.1]} castShadow>
              <boxGeometry args={[0.068, 0.04, 0.016]} />
              <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.35} />
            </mesh>
            {[-0.222, -0.2, -0.178].map((x) => (
              <mesh key={x} position={[x, -0.095, 0.1]} castShadow raycast={() => null}><boxGeometry args={[0.012, 0.006, 0.02]} /><meshStandardMaterial color={C.copper} metalness={0.8} roughness={0.3} /></mesh>
            ))}
            {explode && <Label text="Armature + contacts" pos={[-0.2, -0.075, 0.12]} w={0.07} h={0.012} />}
          </group>
          <group ref={(g) => { explodeParts.current[3] = g; }}>
            <Box size={[0.077, 0.03, 0.03]} pos={[-0.2, -0.07, 0.07]} color="#4b5563" opacity={explode ? 0.85 : undefined} />
            {explode && <Label text="Arc chute / cover" pos={[-0.2, -0.045, 0.09]} w={0.07} h={0.012} />}
          </group>
        </Part>
        <Part id="overload" onSelect={onSelect} selected={sel('overload')} outline={{ size: [0.1, 0.08, 0.12], pos: [-0.2, -0.255, 0.05] }}>
          <Box size={[0.075, 0.06, 0.075]} pos={[-0.2, -0.255, 0.04]} color="#4b5563" />
          <mesh ref={flag} position={[-0.215, -0.24, 0.082]} castShadow><boxGeometry args={[0.014, 0.01, 0.012]} /><meshStandardMaterial color="#ef4444" /></mesh>
          <mesh position={[-0.185, -0.24, 0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.007, 0.007, 0.012, 16]} /><meshStandardMaterial color="#2563eb" /></mesh>
          <Label text="OL 95-96" pos={[-0.2, -0.272, 0.0785]} w={0.05} h={0.012} />
        </Part>
      </group>
      {/* control relays (decorative) */}
      {[-0.06, -0.02].map((x) => (
        <group key={x}>
          <Box size={[0.03, 0.06, 0.05]} pos={[x, -0.14, 0.025]} color="#475569" />
          <Box size={[0.026, 0.03, 0.02]} pos={[x, -0.13, 0.06]} color="#cbd5e1" opacity={0.75} />
        </group>
      ))}

      {/* ---------- terminal strip + ground bar ---------- */}
      <Part id="terminals" onSelect={onSelect} selected={sel('terminals')} outline={{ size: [0.64, 0.09, 0.08], pos: [0.0, -0.43, 0.03] }}>
        <Box size={[0.62, 0.03, 0.008]} pos={[0.0, -0.43, 0.0]} color={C.din} metal={0.8} rough={0.3} />
        <Instances limit={18} castShadow receiveShadow>
          <boxGeometry args={[0.028, 0.065, 0.045]} />
          <meshStandardMaterial color="#9aa3ad" roughness={0.7} />
          {terminals.map((x, i) => <Instance key={i} position={[x, -0.43, 0.024]} color={i < 6 ? '#64748b' : i === 14 ? '#ef4444' : i === 15 ? '#3b82f6' : '#9aa3ad'} />)}
        </Instances>
        <TerminalMarkers xs={terminals} labels={wireNums} />
        <Instances limit={36} castShadow>
          <cylinderGeometry args={[0.0048, 0.0048, 0.004, 14]} />
          <meshStandardMaterial color="#d6dbe1" metalness={0.9} roughness={0.25} />
          {terminals.flatMap((x, i) => [
            <Instance key={`a${i}`} position={[x, -0.407, 0.0475]} rotation={[Math.PI / 2, 0, 0]} />,
            <Instance key={`b${i}`} position={[x, -0.453, 0.0475]} rotation={[Math.PI / 2, 0, 0]} />,
          ])}
        </Instances>
        {terminals.slice(6, 16).map((x, i) => (
          <Wire key={x} curve={new CatmullRomCurve3([v(x, -0.399, 0.036), v(x, -0.38, 0.04), v(x + 0.004, -0.362, 0.036)])} color={i === 8 ? C.red : C.blue} radius={0.0022} />
        ))}
      </Part>
      <Part id="ground" onSelect={onSelect} selected={sel('ground')} outline={{ size: [0.07, 0.04, 0.04], pos: [0.34, -0.43, 0.01] }}>
        <Box size={[0.06, 0.016, 0.01]} pos={[0.34, -0.43, 0.006]} color={C.copper} metal={0.85} rough={0.3} />
        <Wire curve={new CatmullRomCurve3([v(0.32, -0.43, 0.012), v(0.33, -0.48, 0.03), v(0.35, -0.55, 0.02)])} color="#3a8f3a" radius={0.0028} />
      </Part>

      {/* ---------- wiring ---------- */}
      <Wire curve={curves.coil} color={C.red} />
      {curves.power.map((c, i) => <Wire key={i} curve={c} color={C.black} radius={0.0045} />)}
      <Wire curve={curves.di} color={C.blue} />
      <Wire curve={curves.input} color={C.blue} />
      <Wire curve={curves.motor} color="#1f2328" radius={0.008} />

      {/* X-ray current flow */}
      {xray && (
        <>
          <Flow curve={curves.coil} color="#3ddc97" active={() => Boolean(io().DO[0]) && ctrlPower() && !s().estopIn && !s().olTripped} />
          {curves.power.map((c, i) => <Flow key={i} curve={c} color="#22d3ee" count={18} speed={0.5} active={() => s().contactor} />)}
          <Flow curve={curves.motor} color="#22d3ee" count={16} speed={0.4} active={() => s().contactor} />
          <Flow curve={curves.input} color="#ffb547" active={() => Boolean(io().DI[0])} />
          <Flow curve={curves.di} color="#ffb547" count={10} active={() => Boolean(io().DI[1])} />
        </>
      )}

      {/* ---------- operator station on a pedestal ---------- */}
      <Part id="station" onSelect={onSelect} selected={sel('station')} outline={{ size: [0.2, 0.42, 0.12], pos: [0.82, -0.02, 0.12] }}>
        <mesh position={[0.82, -0.47, 0.08]} castShadow><cylinderGeometry args={[0.018, 0.018, 0.56, 16]} /><meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.4} /></mesh>
        <mesh position={[0.82, -0.745, 0.08]} receiveShadow><cylinderGeometry args={[0.09, 0.09, 0.012, 32]} /><meshStandardMaterial color="#374151" /></mesh>
        <Box size={[0.17, 0.4, 0.08]} pos={[0.82, -0.02, 0.08]} color="#d1d5db" metal={0.2} rough={0.5} />
        <Label text="MOTOR 1" pos={[0.82, 0.162, 0.121]} w={0.1} h={0.018} />
        <Label text={`START = ${addressMap(rt.plc.program, skin).get('Start_PB')?.address ?? skin.hw.din}`} pos={[0.82, 0.142, 0.121]} w={0.12} h={0.012} fg="#334155" bg="#e2e8f0" />
        {/* pilot lights */}
        <mesh position={[0.79, 0.11, 0.125]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.015, 0.015, 0.012, 24]} /><meshStandardMaterial ref={lampRun} color="#1d3b2c" emissive="#3ddc97" emissiveIntensity={0} toneMapped={false} /></mesh>
        <mesh position={[0.85, 0.11, 0.125]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.015, 0.015, 0.012, 24]} /><meshStandardMaterial ref={lampFault} color="#3d2f17" emissive="#ffb547" emissiveIntensity={0} toneMapped={false} /></mesh>
        <Led pos={[0.79, 0.11, 0.133]} color="#3ddc97" read={() => Boolean(io().DO[1])} size={0.001} halo={0.09} />
        <Led pos={[0.85, 0.11, 0.133]} color="#ffb547" read={() => Boolean(io().DO[2])} size={0.001} halo={0.09} />
        <Label text="RUN" pos={[0.79, 0.085, 0.121]} w={0.03} h={0.01} />
        <Label text="FAULT" pos={[0.85, 0.085, 0.121]} w={0.03} h={0.01} />
      </Part>
      <PushButton3D id="start" r={btn.start} pos={[0.79, 0.03, 0.12]} color="#22c55e" label="START" rt={rt} field="startPressed" />
      <PushButton3D id="stop" r={btn.stop} pos={[0.85, 0.03, 0.12]} color="#ef4444" label="STOP" rt={rt} field="stopPressed" />
      <PushButton3D id="reset" r={btn.reset} pos={[0.79, -0.04, 0.12]} color="#e5e7eb" label="RESET" rt={rt} field="resetPressed" />
      <group onClick={(e) => { e.stopPropagation(); rt.scene.state.estopIn = !rt.scene.state.estopIn; rt.notify(); }}
        onContextMenu={(e) => { e.stopPropagation(); onSelect('estop'); }}>
        <mesh position={[0.83, -0.12, 0.122]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.042, 0.042, 0.004, 40]} /><meshStandardMaterial color={C.yellow} roughness={0.5} /></mesh>
        <mesh position={[0.83, -0.12, 0.1245]}><torusGeometry args={[0.022, 0.004, 12, 36]} /><meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.2} /></mesh>
        <group ref={btn.estop} position={[0.83, -0.12, 0.146]}>
          <mesh position={[0, 0, -0.01]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.012, 0.012, 0.02, 20]} /><meshStandardMaterial color="#7f1d1d" /></mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.031, 0.031, 0.008, 40]} /><meshStandardMaterial color="#dc2626" roughness={0.3} /></mesh>
          <mesh position={[0, 0, 0.004]} scale={[1, 1, 0.42]} castShadow><sphereGeometry args={[0.031, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#ef4444" roughness={0.22} /></mesh>
        </group>
        <Label text="E-STOP" pos={[0.83, -0.175, 0.121]} w={0.05} h={0.012} />
      </group>

      {/* ---------- motor on the floor ---------- */}
      <Part id="motor" onSelect={onSelect} selected={sel('motor')} outline={{ size: [0.42, 0.24, 0.24], pos: [0.95, -0.62, 0.45] }}>
        <group position={[0.92, -0.62, 0.45]}>
          {/* frame with cooling fins */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[0.088, 0.088, 0.24, 48]} />
            <meshStandardMaterial color="#2f4a6b" metalness={0.45} roughness={0.45} />
          </mesh>
          <Instances limit={30} castShadow>
            <boxGeometry args={[0.2, 0.016, 0.0035]} />
            <meshStandardMaterial color="#35557a" metalness={0.45} roughness={0.45} />
            {Array.from({ length: 30 }, (_, i) => (i / 30) * Math.PI * 2)
              .filter((a) => Math.sin(a) > -0.55)
              .map((a) => <Instance key={a} position={[0, Math.sin(a) * 0.094, Math.cos(a) * 0.094]} rotation={[-a, 0, 0]} />)}
          </Instances>
          {/* drive-end bell, fan cover with grille */}
          <mesh position={[0.128, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.08, 0.088, 0.02, 40]} /><meshStandardMaterial color="#2f4a6b" metalness={0.45} roughness={0.45} /></mesh>
          <mesh position={[-0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.094, 0.094, 0.065, 40]} /><meshStandardMaterial color="#26394f" metalness={0.5} roughness={0.5} /></mesh>
          {[0.03, 0.055, 0.078].map((r) => (
            <mesh key={r} position={[-0.184, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[r, 0.003, 8, 40]} /><meshStandardMaterial color="#111827" metalness={0.6} roughness={0.4} /></mesh>
          ))}
          {/* terminal box + conduit, nameplate */}
          <Box size={[0.07, 0.05, 0.07]} pos={[-0.01, 0.108, 0.0]} color="#35557a" metal={0.45} rough={0.45} />
          <mesh position={[-0.01, 0.108, 0.036]} raycast={() => null}><cylinderGeometry args={[0.012, 0.012, 0.02, 16]} /><meshStandardMaterial color="#9aa3ad" metalness={0.8} roughness={0.3} /></mesh>
          <Label text="3Ø  1770 RPM  14 A  (example)" pos={[0.01, 0.0, 0.0985]} w={0.12} h={0.028} fg="#111" bg="#d6dbe1" />
          {/* feet on a base */}
          {[-0.08, 0.08].map((x) => <Box key={x} size={[0.04, 0.03, 0.17]} pos={[x, -0.098, 0]} color="#26394f" />)}
          <Box size={[0.3, 0.012, 0.2]} pos={[0, -0.12, 0]} color="#1f2937" metal={0.5} rough={0.5} />
          {/* shaft, key and coupling (turns with speed; slowed so you can see it) */}
          <group ref={shaft} position={[0.15, 0, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.014, 0.014, 0.07, 20]} /><meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} /></mesh>
            <mesh position={[0.02, 0.0145, 0]} castShadow><boxGeometry args={[0.03, 0.005, 0.007]} /><meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} /></mesh>
            <mesh position={[0.045, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.038, 0.038, 0.024, 8]} /><meshStandardMaterial color="#f59e0b" metalness={0.3} roughness={0.45} /></mesh>
            <mesh position={[0.045, 0.026, 0]} castShadow><boxGeometry args={[0.026, 0.012, 0.012]} /><meshStandardMaterial color="#111827" /></mesh>
          </group>
        </group>
      </Part>
    </group>
  );
}

/** All terminal wire-number markers in one texture and one draw call. */
function TerminalMarkers({ xs, labels }: { xs: number[]; labels: string[] }) {
  const tex = useMemo(() => {
    const step = 0.033;
    const pxPerM = 4000;
    const w = Math.round((xs.length * step) * pxPerM);
    const h = 48;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d')!;
    g.font = '800 30px Inter, system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    labels.forEach((t, i) => {
      const cx = (i + 0.5) * step * pxPerM;
      g.fillStyle = '#f2f4f7';
      g.beginPath();
      g.roundRect(cx - 50, 2, 100, h - 4, 8);
      g.fill();
      g.fillStyle = '#11161d';
      g.fillText(t, cx, h / 2 + 2);
    });
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [xs, labels]);
  useEffect(() => () => tex.dispose(), [tex]);
  const width = xs.length * 0.033;
  return (
    <mesh position={[xs[0] - 0.0165 + width / 2, -0.43, 0.0475]} raycast={() => null}>
      <planeGeometry args={[width, 0.012]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

function PushButton3D({ id, r, pos, color, label, rt, field }: { id: string; r: React.RefObject<Mesh | Group | null>; pos: [number, number, number]; color: string; label: string; rt: SimRuntime; field: 'startPressed' | 'stopPressed' | 'resetPressed' }) {
  const set = (v: boolean) => {
    rt.scene.state[field] = v;
    rt.notify();
  };
  return (
    <group
      name={`pb-${id}`}
      position={pos}
      onPointerDown={(e) => { e.stopPropagation(); set(true); }}
      onPointerUp={(e) => { e.stopPropagation(); set(false); }}
      onPointerLeave={() => { if (rt.scene.state[field]) set(false); }}
    >
      <mesh position={[0, 0, 0.004]}><torusGeometry args={[0.0195, 0.0038, 14, 40]} /><meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.18} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.021, 0.021, 0.004, 32]} /><meshStandardMaterial color="#1f2937" metalness={0.3} roughness={0.5} /></mesh>
      <group ref={r as React.Ref<Group>} position={[0, 0, 0.022]}>
        <mesh position={[0, 0, -0.01]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.0158, 0.0158, 0.012, 32]} />
          <meshStandardMaterial color={color} roughness={0.32} />
        </mesh>
        <mesh position={[0, 0, -0.004]} scale={[1, 1, 0.28]} castShadow>
          <sphereGeometry args={[0.0158, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={color} roughness={0.25} />
        </mesh>
      </group>
      <Label text={label} pos={[0, -0.03, 0.002]} w={0.04} h={0.01} />
    </group>
  );
}
