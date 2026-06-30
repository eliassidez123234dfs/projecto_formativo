import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF, OrbitControls, Center, ContactShadows, Environment } from '@react-three/drei'

function Model({ url }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} scale={1} />
}

function LoadingSpinner() {
  return (
    <mesh>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color="#DC2626" />
    </mesh>
  )
}

// React Three Fiber canvas rendering a 3D product model with orbit controls, shadows, and studio lighting
export default function Product3DViewer({ modelUrl = '/shirt_baked.glb', height = 400 }) {
  return (
    <div style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden', background: '#f5f5f5' }}>
      <Canvas camera={{ position: [0, 0, 2.5], fov: 30 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} />
        <Suspense fallback={<LoadingSpinner />}>
          <Center>
            <Model url={modelUrl} />
          </Center>
          <ContactShadows position={[0, -0.8, 0]} opacity={0.4} blur={3} />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={1.5} maxDistance={5} />
      </Canvas>
    </div>
  )
}
