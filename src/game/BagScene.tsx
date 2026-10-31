import { useMemo, useRef } from "react";
import { OrbitControls, RoundedBox, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, DoubleSide, Group, RepeatWrapping, SRGBColorSpace } from "three";
import { BAG_ZONES, TARGETS, isRevealed, type BagZone, type TargetId } from "./rules";
import { useGame } from "./store";

function makeFabricTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#b3bbc0";
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? "#a5adb3" : "#c9cdd0";
    ctx.fillRect(0, y, 256, 1);
  }
  for (let x = 0; x < 256; x += 4) {
    ctx.fillStyle = x % 8 === 0 ? "rgba(40,48,56,0.18)" : "rgba(255,255,255,0.16)";
    ctx.fillRect(x, 0, 1, 256);
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(6, 4);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function Bolt({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[0.035, 0.035, 0.013, 16]} />
      <meshStandardMaterial color="#bac6cb" metalness={0.75} roughness={0.25} />
    </mesh>
  );
}

function Handle() {
  return (
    <group position={[0, 0.35, 1.82]}>
      <RoundedBox args={[0.69, 0.12, 0.14]} radius={0.055} smoothness={3} castShadow>
        <meshStandardMaterial color="#141a21" metalness={0.3} roughness={0.45} />
      </RoundedBox>
      {[-0.27, 0.27].map((x) => (
        <mesh key={x} position={[x, -0.13, -0.025]} castShadow>
          <boxGeometry args={[0.08, 0.24, 0.09]} />
          <meshStandardMaterial color="#9aa5b4" metalness={0.8} roughness={0.22} />
        </mesh>
      ))}
    </group>
  );
}

function TargetMesh({ target, x, z, preview = false }: { target: TargetId; x: number; z: number; preview?: boolean }) {
  const color = TARGETS[target].color;
  return (
    <group position={[x, preview ? 1.03 : 0.69, z]} scale={preview ? 0.8 : 0.93}>
      {target === "duck" && (
        <>
          <mesh position={[0, 0.05, 0]} castShadow>
            <sphereGeometry args={[0.235, 32, 24]} />
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.25} transparent={preview} opacity={preview ? 0.68 : 1} />
          </mesh>
          <mesh position={[0.13, 0.24, -0.07]} castShadow>
            <sphereGeometry args={[0.132, 24, 16]} />
            <meshStandardMaterial color={color} metalness={0.65} roughness={0.28} transparent={preview} opacity={preview ? 0.68 : 1} />
          </mesh>
          <mesh position={[0.25, 0.205, -0.04]} rotation={[0, 0, -Math.PI / 2]} castShadow>
            <coneGeometry args={[0.06, 0.16, 4]} />
            <meshStandardMaterial color="#ed7d40" roughness={0.45} />
          </mesh>
          <mesh position={[0.18, 0.28, 0.01]}>
            <sphereGeometry args={[0.016, 8, 8]} />
            <meshBasicMaterial color="#141821" />
          </mesh>
        </>
      )}
      {target === "core" && (
        <group rotation={[0.15, 0.5, 0.12]}>
          <mesh castShadow>
            <icosahedronGeometry args={[0.24, 1]} />
            <meshStandardMaterial color="#1b6665" metalness={0.6} roughness={0.28} emissive={color} emissiveIntensity={0.38} />
          </mesh>
          <mesh>
            <icosahedronGeometry args={[0.19, 1]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.65} />
          </mesh>
          <pointLight color={color} intensity={preview ? 0.1 : 0.4} distance={1.2} />
        </group>
      )}
      {target === "drive" && (
        <group rotation={[0, 0, Math.PI / 2]}>
          <RoundedBox args={[0.29, 0.14, 0.83]} radius={0.05} smoothness={4} castShadow>
            <meshStandardMaterial color="#25212f" metalness={0.65} roughness={0.28} />
          </RoundedBox>
          {[-0.24, 0, 0.24].map((z) => (
            <mesh key={z} position={[0, 0.073, z]}>
              <boxGeometry args={[0.19, 0.01, 0.04]} />
              <meshBasicMaterial color={color} />
            </mesh>
          ))}
        </group>
      )}
      {target === "relic" && (
        <>
          <mesh castShadow rotation={[0, 0.3, 0]}>
            <dodecahedronGeometry args={[0.28, 0]} />
            <meshStandardMaterial color="#aa7852" metalness={0.34} roughness={0.7} flatShading />
          </mesh>
          <mesh rotation={[0, 0.3, 0]}>
            <torusGeometry args={[0.21, 0.025, 8, 24]} />
            <meshStandardMaterial color="#e8b95f" metalness={0.8} roughness={0.25} />
          </mesh>
        </>
      )}
      {preview && (
        <mesh position={[0, -0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.27, 0.35, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.65} side={DoubleSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function PocketFlap({
  zone, layer, opened, selected, texture, onSelect,
}: {
  zone: BagZone;
  layer: number;
  opened: boolean;
  selected: boolean;
  texture: CanvasTexture;
  onSelect: () => void;
}) {
  const pivot = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!pivot.current) return;
    const target = opened ? -1.5 : 0;
    pivot.current.rotation.x += (target - pivot.current.rotation.x) * Math.min(1, delta * 9);
  });
  const w = zone.width - 0.055 - layer * 0.16;
  const d = zone.depth - 0.045 - layer * 0.12;
  const height = 0.84 - layer * 0.056;
  return (
    <group position={[zone.x, height, zone.z - d / 2]}>
      <group ref={pivot}>
        <group position={[0, 0, d / 2]} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
          <RoundedBox args={[w, 0.043, d]} radius={0.045} smoothness={3} receiveShadow castShadow>
            <meshStandardMaterial map={texture} color={layer === 0 ? "#73808b" : layer === 1 ? "#596673" : "#495764"} roughness={0.93} metalness={0.02} side={DoubleSide} />
          </RoundedBox>
          <Line
            points={[[-w / 2 + 0.09, 0.028, -d / 2 + 0.10], [w / 2 - 0.09, 0.028, -d / 2 + 0.10], [w / 2 - 0.09, 0.028, d / 2 - 0.08], [-w / 2 + 0.09, 0.028, d / 2 - 0.08], [-w / 2 + 0.09, 0.028, -d / 2 + 0.10]]}
            color={selected && layer === 0 ? "#ffcf68" : "#ced2d6"} lineWidth={0.9} dashed dashSize={0.025} gapSize={0.023}
          />
          <mesh position={[w / 2 - 0.20, 0.043, d / 2 - 0.16]} rotation={[0, 0, 0.25]} castShadow>
            <boxGeometry args={[0.085, 0.023, 0.18]} />
            <meshStandardMaterial color="#d8dfe3" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.036, d / 2 - 0.025]}>
            <boxGeometry args={[w - 0.17, 0.02, 0.016]} />
            <meshStandardMaterial color="#232b35" roughness={0.78} />
          </mesh>
          {selected && layer === 0 && (
            <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[w - 0.08, d - 0.08]} />
              <meshBasicMaterial color="#ffc663" transparent opacity={0.1} side={DoubleSide} depthWrite={false} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
}

function Pocket({ zone, texture }: { zone: BagZone; texture: CanvasTexture }) {
  const s = useGame();
  const selected = s.selectedZone === zone.id;
  const extra = s.extraZips[zone.id] ?? 0;
  const opened = s.mode === "result" ? extra + 1 : s.mode === "search" ? (s.opened[zone.id] ?? 0) : 0;
  const visibleTarget = s.targetZone === zone.id &&
    (s.mode === "prep" || (s.mode === "search" && isRevealed(opened, extra)) || s.mode === "result");
  return (
    <group>
      <RoundedBox args={[zone.width + 0.04, 0.10, zone.depth + 0.04]} radius={0.065} smoothness={3}
        position={[zone.x, 0.54, zone.z]} castShadow receiveShadow
        onClick={(event) => { event.stopPropagation(); s.select(zone.id); }}>
        <meshStandardMaterial color={selected ? "#53697a" : "#303c49"} roughness={0.86} />
      </RoundedBox>
      <RoundedBox args={[zone.width - 0.10, 0.017, zone.depth - 0.10]} radius={0.025} smoothness={3}
        position={[zone.x, 0.60, zone.z]} receiveShadow
        onClick={(event) => { event.stopPropagation(); s.select(zone.id); }}>
        <meshStandardMaterial map={texture} color="#2a3946" roughness={1} />
      </RoundedBox>
      {Array.from({ length: extra + 1 }, (_, layer) => (
        <PocketFlap key={layer} zone={zone} layer={layer} opened={opened > layer} selected={selected} texture={texture} onSelect={() => s.select(zone.id)} />
      ))}
      {visibleTarget && <TargetMesh target={s.targetId} x={zone.x} z={zone.z} preview={s.mode === "prep"} />}
      {s.mode === "search" && isRevealed(opened, extra) && s.targetZone !== zone.id && (
        <group position={[zone.x, 0.68, zone.z]}>
          <mesh rotation={[Math.PI / 2, 0, 0.25]}>
            <torusGeometry args={[0.19, 0.038, 8, 30]} />
            <meshStandardMaterial color="#363f45" metalness={0.15} roughness={0.8} />
          </mesh>
          <mesh position={[0.15, -0.04, 0.1]} rotation={[0, 0.4, 0]}>
            <boxGeometry args={[0.22, 0.045, 0.33]} />
            <meshStandardMaterial color="#9da6a7" roughness={0.88} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function Suitcase() {
  const texture = useMemo(makeFabricTexture, []);
  const mode = useGame((s) => s.mode);
  const selected = useGame((s) => s.selectedZone);
  const torch = useGame((s) => s.torchOn);
  const zone = BAG_ZONES.find((z) => z.id === selected);
  return (
    <group position={[0, 0.18, 0]}>
      {/* Rear lid with padded frame and inset woven liner */}
      <RoundedBox args={[3.93, 0.26, 2.69]} radius={0.22} smoothness={5} position={[0, 0.05, -2.63]} castShadow receiveShadow>
        <meshStandardMaterial color="#111a25" roughness={0.46} metalness={0.25} />
      </RoundedBox>
      <RoundedBox args={[3.70, 0.065, 2.42]} radius={0.16} smoothness={4} position={[0, 0.22, -2.63]} castShadow>
        <meshStandardMaterial color="#465465" roughness={0.98} map={texture} />
      </RoundedBox>
      <RoundedBox args={[3.35, 0.055, 2.12]} radius={0.09} smoothness={3} position={[0, 0.27, -2.63]}>
        <meshStandardMaterial color="#607181" map={texture} roughness={0.98} />
      </RoundedBox>
      <RoundedBox args={[3.13, 0.046, 0.75]} radius={0.05} smoothness={3} position={[0, 0.32, -2.85]} castShadow>
        <meshStandardMaterial color="#333f4c" map={texture} roughness={0.96} />
      </RoundedBox>
      <mesh position={[0, 0.36, -2.50]}>
        <boxGeometry args={[2.93, 0.018, 0.025]} />
        <meshStandardMaterial color="#bec7cb" metalness={0.72} roughness={0.34} />
      </mesh>
      {[-1.74, 1.74].map((x) => <Bolt key={x} position={[x, 0.30, -3.69]} />)}
      {/* Base shell, inner gasket and fabric */}
      <RoundedBox args={[3.98, 0.34, 2.78]} radius={0.21} smoothness={6} position={[0, 0.10, 0.28]} castShadow receiveShadow>
        <meshStandardMaterial color="#151f2d" metalness={0.26} roughness={0.48} />
      </RoundedBox>
      <RoundedBox args={[3.78, 0.14, 2.59]} radius={0.19} smoothness={5} position={[0, 0.31, 0.28]} castShadow receiveShadow>
        <meshStandardMaterial color="#7b8792" metalness={0.54} roughness={0.28} />
      </RoundedBox>
      <RoundedBox args={[3.64, 0.13, 2.48]} radius={0.16} smoothness={4} position={[0, 0.41, 0.28]} receiveShadow>
        <meshStandardMaterial color="#3d4a57" map={texture} roughness={0.95} />
      </RoundedBox>
      {[-1.82, 1.82].map((x) => <mesh key={x} position={[x, 0.49, 0.28]}><boxGeometry args={[0.024, 0.024, 2.43]} /><meshStandardMaterial color="#bba56e" metalness={0.8} roughness={0.33} /></mesh>)}
      {[-0.92, 1.49].map((z) => <mesh key={z} position={[0, 0.49, z]}><boxGeometry args={[3.58, 0.024, 0.024]} /><meshStandardMaterial color="#bba56e" metalness={0.8} roughness={0.33} /></mesh>)}
      {BAG_ZONES.map((item) => <Pocket key={item.id} zone={item} texture={texture} />)}
      {[-1.55, 1.55].map((x) => <Bolt key={x} position={[x, 0.53, 1.52]} />)}
      <Handle />
      {[-1.52, 1.52].map((x) => (
        <group key={x} position={[x, -0.10, 1.56]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.16, 0.16, 0.17, 20]} />
            <meshStandardMaterial color="#0d1016" roughness={0.83} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.09, 0.09, 0.178, 20]} />
            <meshStandardMaterial color="#5d6c78" metalness={0.45} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {mode === "search" && torch && zone && <spotLight position={[zone.x + 0.3, 3.5, zone.z + 1]} color="#ccecff" angle={0.30} penumbra={0.75} intensity={28} distance={8} castShadow />}
    </group>
  );
}

function InspectionTable() {
  return (
    <group>
      <RoundedBox args={[5.38, 0.30, 7.68]} radius={0.13} smoothness={5} position={[0, -0.24, -0.95]} receiveShadow castShadow>
        <meshStandardMaterial color="#222f3c" metalness={0.56} roughness={0.38} />
      </RoundedBox>
      <RoundedBox args={[5.11, 0.035, 7.39]} radius={0.07} smoothness={4} position={[0, -0.075, -0.95]} receiveShadow>
        <meshStandardMaterial color="#303d48" metalness={0.32} roughness={0.62} />
      </RoundedBox>
      {[-2.33, 2.33].map((x) => [-4.23, 2.33].map((z) => <mesh key={String(x) + String(z)} position={[x, -1.20, z]} castShadow><boxGeometry args={[0.17, 2.03, 0.17]} /><meshStandardMaterial color="#52616c" metalness={0.66} roughness={0.29} /></mesh>))}
      {[-2.47, 2.47].map((x) => <mesh key={x} position={[x, 0.02, -0.95]}><boxGeometry args={[0.05, 0.06, 7.35]} /><meshStandardMaterial color="#9babb5" metalness={0.78} roughness={0.23} /></mesh>)}
      {Array.from({ length: 14 }, (_, i) => <mesh key={i} position={[0, -0.048, 2.40 - i * 0.50]}><boxGeometry args={[4.74, 0.008, 0.013]} /><meshStandardMaterial color="#84929c" metalness={0.48} roughness={0.4} /></mesh>)}
    </group>
  );
}

function AirportBackground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.28, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#0b131c" roughness={0.87} metalness={0.08} />
      </mesh>
      <mesh position={[0, 3.8, -9]}><boxGeometry args={[22, 8, 0.15]} /><meshStandardMaterial color="#192535" roughness={0.95} /></mesh>
      {[-6, -3, 3, 6].map((x) => <mesh key={x} position={[x, 2.5, -8.85]}><boxGeometry args={[0.085, 9, 0.18]} /><meshStandardMaterial color="#637485" metalness={0.62} roughness={0.36} /></mesh>)}
      <mesh position={[0, 5.15, -8.78]}><boxGeometry args={[5.6, 0.9, 0.09]} /><meshStandardMaterial color="#0a111b" emissive="#12354b" emissiveIntensity={0.3} /></mesh>
      {[-5.8, 5.8].map((x) => (
        <group key={x} position={[x, 0, -1.5]}>
          <mesh position={[0, 2.0, 0]}><boxGeometry args={[0.16, 7.2, 0.16]} /><meshStandardMaterial color="#708193" metalness={0.78} roughness={0.27} /></mesh>
          <mesh position={[0, 5.2, 0]}><boxGeometry args={[1.2, 0.15, 0.8]} /><meshStandardMaterial color="#dee8ea" emissive="#b0d7ea" emissiveIntensity={1.6} /></mesh>
        </group>
      ))}
    </group>
  );
}

export function BagScene() {
  const handoff = useGame((s) => s.mode === "handoff");
  return (
    <>
      <color attach="background" args={["#121e29"]} />
      <fog attach="fog" args={["#121e29", 13, 34]} />
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#bbd9f0", "#2c2520", 2.5]} />
      <directionalLight position={[2, 9, 5]} intensity={3.4} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.00018} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} />
      <pointLight position={[-4, 4, 3]} color="#9ad1ff" intensity={30} distance={10} />
      <pointLight position={[4, 4, -5]} color="#f7be7d" intensity={26} distance={10} />
      <AirportBackground />
      <InspectionTable />
      {!handoff && <Suitcase />}
      <OrbitControls target={[0, 0.30, -0.8]} enablePan={false} minDistance={4.8} maxDistance={13} minPolarAngle={0.18} maxPolarAngle={1.40} enableDamping dampingFactor={0.085} />
    </>
  );
}