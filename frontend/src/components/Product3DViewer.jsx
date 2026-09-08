import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls, Center, ContactShadows, Environment, Html, useProgress } from '@react-three/drei'

function Model({ url }) {
  const { scene } = useGLTF(url)
  const ref = useRef()
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.15
  })
  return <primitive ref={ref} object={scene} scale={1} />
}

function Loader() {
  const { progress, active } = useProgress()
  if (!active) return null
  return (
    <Html center>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        background: 'rgba(255,255,255,0.9)', padding: '24px 32px',
        borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}>
        <div style={{
          width: 180, height: 6, background: '#E5E7EB', borderRadius: 3,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            background: 'linear-gradient(90deg, #DC2626, #F59E0B)',
            borderRadius: 3, transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
          {Math.round(progress)}% — Cargando modelo 3D
        </span>
      </div>
    </Html>
  )
}

function Scene({ modelUrl, autoRotate }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      <Suspense fallback={<Loader />}>
        <Center>
          <Model url={modelUrl} />
        </Center>
        <ContactShadows position={[0, -0.8, 0]} opacity={0.4} blur={3} />
        <Environment preset="studio" />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={1.5} maxDistance={5}
        enableZoom={true} autoRotate={autoRotate} autoRotateSpeed={2} />
    </>
  )
}

export default function Product3DViewer({ modelUrl = '/shirt_baked.glb', height = 400, autoRotate = true }) {
  return (
    <div style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden', background: '#f5f5f5' }}>
      <Canvas camera={{ position: [0, 0, 2.5], fov: 30 }} gl={{ antialias: true }}>
        <Scene modelUrl={modelUrl} autoRotate={autoRotate} />
      </Canvas>
    </div>
  )
}
