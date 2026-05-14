import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Sky, Text } from '@react-three/drei'
import { useMemo, useRef, useEffect, useState, useCallback } from 'react'

// -------------------------------------------------------
// PROJETS — à personnaliser
// -------------------------------------------------------
const PROJECTS = [
  {
    id: 0,
    title: 'Projet Alpha',
    description: 'Application web full-stack avec React & Node.js',
    tech: ['React', 'Node.js', 'PostgreSQL'],
    color: '#2d6a4f',
    link: '#',
    angle: 0,           // direction dans la scène (radians)
    distance: 14,       // distance depuis le centre du plateau
  },
  {
    id: 1,
    title: 'Projet Beta',
    description: 'Dashboard analytics temps réel avec visualisations D3',
    tech: ['D3.js', 'WebSocket', 'Python'],
    color: '#1b4332',
    link: '#',
    angle: Math.PI * 0.4,
    distance: 13,
  },
  {
    id: 2,
    title: 'Projet Gamma',
    description: 'API REST micro-services déployée sur AWS',
    tech: ['FastAPI', 'Docker', 'AWS'],
    color: '#081c15',
    link: '#',
    angle: Math.PI * 0.85,
    distance: 14,
  },
  {
    id: 3,
    title: 'Projet Delta',
    description: 'Application mobile cross-platform React Native',
    tech: ['React Native', 'Expo', 'Firebase'],
    color: '#1b4332',
    link: '#',
    angle: Math.PI * 1.3,
    distance: 13,
  },
  {
    id: 4,
    title: 'Projet Epsilon',
    description: 'Moteur de rendu 3D procédural en WebGL',
    tech: ['Three.js', 'GLSL', 'WebGL'],
    color: '#2d6a4f',
    link: '#',
    angle: Math.PI * 1.7,
    distance: 14,
  },
]

// -------------------------------------------------------
// SIMPLEX NOISE
// -------------------------------------------------------
function createSimplex(seed = 42) {
  const grad3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
  ]
  let s = seed
  const rnd = () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
  const p = Array.from({length:256}, (_, i) => i)
  for (let i=255; i>0; i--) { const j=Math.floor(rnd()*(i+1)); [p[i],p[j]]=[p[j],p[i]] }
  const perm = new Array(512), permMod12 = new Array(512)
  for (let i=0;i<512;i++) { perm[i]=p[i&255]; permMod12[i]=perm[i]%12 }
  const F2=0.5*(Math.sqrt(3)-1), G2=(3-Math.sqrt(3))/6
  const dot=(g,x,y)=>g[0]*x+g[1]*y
  function noise2(xin, yin) {
    const s2=(xin+yin)*F2
    const i=Math.floor(xin+s2), j=Math.floor(yin+s2)
    const t=(i+j)*G2, X0=i-t, Y0=j-t
    const x0=xin-X0, y0=yin-Y0
    const [i1,j1]=x0>y0?[1,0]:[0,1]
    const x1=x0-i1+G2, y1=y0-j1+G2, x2=x0-1+2*G2, y2=y0-1+2*G2
    const ii=i&255, jj=j&255
    const gi0=permMod12[ii+perm[jj]], gi1=permMod12[ii+i1+perm[jj+j1]], gi2=permMod12[ii+1+perm[jj+1]]
    let n0,n1,n2
    let t0=0.5-x0*x0-y0*y0; if(t0<0){n0=0}else{t0*=t0;n0=t0*t0*dot(grad3[gi0],x0,y0)}
    let t1=0.5-x1*x1-y1*y1; if(t1<0){n1=0}else{t1*=t1;n1=t1*t1*dot(grad3[gi1],x1,y1)}
    let t2=0.5-x2*x2-y2*y2; if(t2<0){n2=0}else{t2*=t2;n2=t2*t2*dot(grad3[gi2],x2,y2)}
    return 70*(n0+n1+n2)
  }
  function fbm(x, y, octaves=6, lac=2.1, gain=0.52) {
    let val=0, amp=0.5, freq=1, sum=0
    for (let o=0;o<octaves;o++) { val+=noise2(x*freq,y*freq)*amp; sum+=amp; amp*=gain; freq*=lac }
    return val/sum
  }
  return { noise: noise2, fbm }
}

const simplex = createSimplex(7331)

// -------------------------------------------------------
// COULEURS
// -------------------------------------------------------
const C = {
  snow:      new THREE.Color('#e8eef2'),
  snowRock:  new THREE.Color('#b8c8d0'),
  rockLight: new THREE.Color('#8d9ea7'),
  rockDark:  new THREE.Color('#4a5568'),
  scree:     new THREE.Color('#6b7a82'),
  grassHigh: new THREE.Color('#7eb14e'),
  grassMid:  new THREE.Color('#5d913b'),
  grassLow:  new THREE.Color('#44702d'),
  trunk:     new THREE.Color('#5d4037'),
}

const HEIGHT_MODIFIER = 0.5
const PLATEAU_HEIGHT  = 45 * HEIGHT_MODIFIER
const CAMERA_EYE_HEIGHT = 1.8
const PLATEAU_RADIUS    = 19

// -------------------------------------------------------
// TERRAIN
// -------------------------------------------------------
function getTerrainY(x, z) {
  const dist = Math.sqrt(x*x + z*z)
  if (dist < 20) return PLATEAU_HEIGHT
  const ox = x - 18, oz = z + 6
  const base   = simplex.fbm(ox*0.009, oz*0.009, 7, 2.1, 0.52)
  const detail = simplex.fbm(x*0.022+100, z*0.022+200, 4, 2.0, 0.45)
  const micro  = simplex.fbm(x*0.055+50, z*0.055-50, 3, 2.0, 0.4)
  let y = base*60 + detail*20 + micro*7
  y = (y + 62) * 0.56
  const env = Math.max(0, (dist - 40) * 0.32)
  y = y * (dist / 105) + env
  if (dist < 30) {
    const blend = Math.max(0, Math.min(1, (dist - 20) / 10))
    const t = blend*blend*(3-2*blend)
    y = PLATEAU_HEIGHT*(1-t) + y*t
  }
  return y * HEIGHT_MODIFIER
}

const ss = (e0, e1, v) => { const t=Math.max(0,Math.min(1,(v-e0)/(e1-e0))); return t*t*(3-2*t) }

function getTerrainColor(y, dist) {
  const c = new THREE.Color()
  if (dist < 22) return c.copy(C.grassHigh)
  if      (y > 38) c.copy(C.snow)
  else if (y > 32) c.lerpColors(C.snowRock, C.snow,      ss(32,38,y))
  else if (y > 26) c.lerpColors(C.rockLight, C.snowRock, ss(26,32,y))
  else if (y > 20) c.lerpColors(C.scree,    C.rockLight, ss(20,26,y))
  else if (y > 14) c.lerpColors(C.grassHigh, C.scree,   ss(14,20,y))
  else if (y > 7)  c.lerpColors(C.grassMid,  C.grassHigh,ss(7,14,y))
  else             c.lerpColors(C.grassLow,  C.grassMid, ss(0,7,y))
  return c
}

// -------------------------------------------------------
// TERRAIN MESH
// -------------------------------------------------------
function EpicProceduralMountains() {
  const geometry = useMemo(() => {
    const geom = new THREE.PlaneGeometry(800, 800, 220, 220)
    geom.rotateX(-Math.PI / 2)
    const pos = geom.attributes.position.array
    const cols = []
    for (let i=0; i<pos.length; i+=3) {
      const x=pos[i], z=pos[i+2]
      const y = getTerrainY(x, z)
      pos[i+1] = y
      const dist = Math.sqrt(x*x + z*z)
      const c = getTerrainColor(y, dist)
      cols.push(c.r, c.g, c.b)
    }
    geom.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
    geom.computeVertexNormals()
    return geom
  }, [])

  return (
    <mesh receiveShadow castShadow>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial vertexColors flatShading roughness={0.85} metalness={0.05} />
    </mesh>
  )
}

// -------------------------------------------------------
// HERBE
// -------------------------------------------------------
function buildBladeGeometry() {
  const verts=[], cols=[], indices=[], segs=4
  for (let s=0;s<=segs;s++) {
    const t=s/segs, w=0.05*(1-t*0.85)
    verts.push(-w, t*0.45, 0, w, t*0.45, 0)
    const base=new THREE.Color().setHSL(0.28,0.72,0.22)
    const tip =new THREE.Color().setHSL(0.31,0.65,0.42)
    const c=base.clone().lerp(tip,t)
    cols.push(c.r,c.g,c.b,c.r,c.g,c.b)
  }
  verts.push(0,0.45,0); cols.push(0.55,0.82,0.25)
  for (let s=0;s<segs;s++) { const a=s*2,b=a+1,c2=a+2,d=a+3; indices.push(a,b,c2,b,d,c2) }
  indices.push(segs*2, segs*2+1, segs*2+2)
  const geo=new THREE.BufferGeometry()
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3))
  geo.setAttribute('color',   new THREE.Float32BufferAttribute(cols,3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

const GRASS_COUNT = 80000

function DenseGrass() {
  const meshRef = useRef()
  const bladeData = useMemo(() => {
    const data = new Float32Array(GRASS_COUNT*6)
    const rng={v:12345}
    const rand=()=>{rng.v=(rng.v*16807+1)%2147483647;return rng.v/2147483647}
    let idx=0
    while (idx<GRASS_COUNT) {
      const angle=rand()*Math.PI*2, r=Math.sqrt(rand())*PLATEAU_RADIUS
      const bx=Math.cos(angle)*r, bz=Math.sin(angle)*r, by=getTerrainY(bx,bz)
      if (Math.abs(by-PLATEAU_HEIGHT)<0.6) {
        data[idx*6+0]=bx; data[idx*6+1]=by; data[idx*6+2]=bz
        data[idx*6+3]=rand()*Math.PI*2; data[idx*6+4]=rand()*Math.PI*2; data[idx*6+5]=0.8+rand()*0.6
        idx++
      }
    }
    return data
  }, [])

  const bladeGeo = useMemo(()=>buildBladeGeometry(),[])
  useEffect(()=>{
    if (!meshRef.current) return
    const dummy=new THREE.Object3D()
    for (let i=0;i<GRASS_COUNT;i++) {
      dummy.position.set(bladeData[i*6],bladeData[i*6+1],bladeData[i*6+2])
      dummy.rotation.set(0,bladeData[i*6+4],0)
      dummy.scale.setScalar(bladeData[i*6+5])
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i,dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate=true
  },[bladeData])

  const dummy=useMemo(()=>new THREE.Object3D(),[])
  useFrame(({clock})=>{
    if (!meshRef.current) return
    const t=clock.getElapsedTime()
    for (let i=0;i<GRASS_COUNT;i++) {
      const bx=bladeData[i*6],by=bladeData[i*6+1],bz=bladeData[i*6+2]
      const phase=bladeData[i*6+3],rotY=bladeData[i*6+4],sc=bladeData[i*6+5]
      const wind=Math.sin(t*1.4+phase+bx*0.1)*0.12+Math.sin(t*0.7+phase*1.3+bz*0.08)*0.06
      dummy.position.set(bx,by,bz); dummy.rotation.set(wind,rotY,wind*0.3); dummy.scale.setScalar(sc)
      dummy.updateMatrix(); meshRef.current.setMatrixAt(i,dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate=true
  })

  return (
    <instancedMesh ref={meshRef} args={[bladeGeo,null,GRASS_COUNT]}>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.9}/>
    </instancedMesh>
  )
}

// -------------------------------------------------------
// ARBRES
// -------------------------------------------------------
function Tree({ position, scaleMult=1 }) {
  const seed=useMemo(()=>({
    scale:(0.7+Math.random()*0.4)*scaleMult,
    rotation:Math.random()*Math.PI*2,
  }),[scaleMult])
  return (
    <group position={position} scale={seed.scale} rotation-y={seed.rotation}>
      <mesh position={[0,0.5,0]} castShadow>
        <cylinderGeometry args={[0.2,0.3,2.5,6]}/>
        <meshStandardMaterial color={C.trunk} flatShading/>
      </mesh>
      {[0,1,2,3,4].map(i=>(
        <mesh key={i} position={[0,1.5+i*0.8,0]} castShadow>
          <coneGeometry args={[1.8-i*0.35,1.5,7]}/>
          <meshStandardMaterial color={new THREE.Color(C.grassLow).multiplyScalar(1+i*0.15)} flatShading/>
        </mesh>
      ))}
    </group>
  )
}

function useTreePositions(count=600) {
  return useMemo(()=>{
    const trees=[], rng={v:42}
    const rand=()=>{rng.v=(rng.v*16807)%2147483647;return rng.v/2147483647}
    let attempts=0
    while (trees.length<count && attempts<20000) {
      attempts++
      const angle=rand()*Math.PI*2, dist=25+rand()*140
      const x=Math.cos(angle)*dist, z=Math.sin(angle)*dist, y=getTerrainY(x,z)
      if (y>2&&y<80) { const hr=(y-2)/78; if(rand()<Math.pow(1-hr,2)) trees.push([x,y-0.5,z]) }
    }
    return trees
  },[count])
}

function PlateauTrees() {
  const positions = [
    [-6,  PLATEAU_HEIGHT, -8],
    [ 7,  PLATEAU_HEIGHT, -10],
    [-10, PLATEAU_HEIGHT,  9],
    [ 9,  PLATEAU_HEIGHT,  11],
    [-14, PLATEAU_HEIGHT,  1],
    [ 13, PLATEAU_HEIGHT, -2],
  ]
  return (
    <>
      {positions.map((pos,i)=>(
        <Tree key={i} position={pos} scaleMult={0.9+(i%3)*0.15}/>
      ))}
    </>
  )
}

// -------------------------------------------------------
// PANNEAU PROJET 3D — panneau en bois dans la scène
// -------------------------------------------------------
function ProjectSign({ project, onSelect, isSelected }) {
  const groupRef = useRef()
  const [hovered, setHovered] = useState(false)

  // Position dans la scène autour du plateau
  const px = Math.cos(project.angle) * project.distance
  const pz = Math.sin(project.angle) * project.distance
  const py = PLATEAU_HEIGHT

  // Orientation du panneau vers le centre
  const signAngle = project.angle + Math.PI

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    // légère oscillation
    groupRef.current.position.y = py + Math.sin(t * 0.8 + project.id) * 0.05
    // scale au hover
    const target = hovered || isSelected ? 1.08 : 1.0
    groupRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1)
  })

  const bgColor = new THREE.Color(project.color)
  const lightColor = new THREE.Color(project.color).multiplyScalar(2.5)

  return (
    <group
      ref={groupRef}
      position={[px, py, pz]}
      rotation={[0, signAngle, 0]}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onClick={() => onSelect(project)}
    >
      {/* Poteau */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 3, 6]} />
        <meshStandardMaterial color="#5d4037" flatShading />
      </mesh>

      {/* Fond du panneau */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[3.2, 1.9, 0.12]} />
        <meshStandardMaterial color={bgColor} roughness={0.6} />
      </mesh>

      {/* Bordure lumineuse (hovered) */}
      <mesh position={[0, 0.6, -0.07]}>
        <boxGeometry args={[3.3, 2.0, 0.04]} />
        <meshStandardMaterial
          color={hovered || isSelected ? lightColor : bgColor}
          emissive={hovered || isSelected ? lightColor : new THREE.Color('#000')}
          emissiveIntensity={hovered || isSelected ? 0.6 : 0}
          roughness={0.4}
        />
      </mesh>

      {/* Titre */}
      <Text
        position={[0, 1.05, 0.08]}
        fontSize={0.28}
        color="#e8f5e9"
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
        font="https://fonts.gstatic.com/s/spacegrotesk/v15/V8mDoQDjQSkFtoMM3T6r8E7mF71Q-gowFXNuXmmLsQ.woff2"
      >
        {project.title}
      </Text>

      {/* Description */}
      <Text
        position={[0, 0.58, 0.08]}
        fontSize={0.155}
        color="#a5d6a7"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.8}
        font="https://fonts.gstatic.com/s/spacegrotesk/v15/V8mDoQDjQSkFtoMM3T6r8E7mF71Q-gowFXNuXmmLsQ.woff2"
      >
        {project.description}
      </Text>

      {/* Tech tags */}
      <Text
        position={[0, 0.18, 0.08]}
        fontSize={0.13}
        color="#4caf50"
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
        font="https://fonts.gstatic.com/s/spacegrotesk/v15/V8mDoQDjQSkFtoMM3T6r8E7mF71Q-gowFXNuXmmLsQ.woff2"
      >
        {project.tech.join('  ·  ')}
      </Text>

      {/* Indicateur "cliquez" */}
      {hovered && (
        <Text
          position={[0, -0.3, 0.08]}
          fontSize={0.13}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          [ voir le projet ]
        </Text>
      )}
    </group>
  )
}

// -------------------------------------------------------
// COMPASS HUD — indique les directions des projets
// -------------------------------------------------------
function CompassHUD({ yaw }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 100,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: 8,
      pointerEvents: 'none',
      zIndex: 20,
    }}>
      {PROJECTS.map(p => {
        // angle relatif entre la caméra et le projet
        let delta = p.angle - yaw
        // normaliser entre -PI et PI
        while (delta > Math.PI) delta -= Math.PI * 2
        while (delta < -Math.PI) delta += Math.PI * 2
        const inView = Math.abs(delta) < 0.7
        const opacity = Math.max(0.25, 1 - Math.abs(delta) / Math.PI)
        return (
          <div key={p.id} style={{
            padding: '4px 10px',
            background: inView ? p.color : 'rgba(0,0,0,0.35)',
            border: `1px solid ${p.color}`,
            borderRadius: 4,
            color: '#e8f5e9',
            fontSize: 11,
            fontFamily: 'monospace',
            opacity,
            transition: 'all 0.3s',
            letterSpacing: '0.05em',
          }}>
            {inView ? '▶ ' : ''}{p.title}
          </div>
        )
      })}
    </div>
  )
}

// -------------------------------------------------------
// CONTRÔLE CAMÉRA (drag) — expose le yaw pour le HUD
// -------------------------------------------------------
function CameraController({ onYawChange, onProjectSelect }) {
  const drag = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const yawRef = useRef(0)
  const pitchRef = useRef(0)
  const touch = useRef(null)

  useEffect(() => {
    const onDown = e => {
      drag.current = true
      last.current = { x: e.clientX, y: e.clientY }
    }
    const onUp = () => { drag.current = false }
    const onMove = e => {
      if (!drag.current) return
      yawRef.current   -= (e.clientX - last.current.x) * 0.003
      pitchRef.current -= (e.clientY - last.current.y) * 0.003
      pitchRef.current  = Math.max(-0.8, Math.min(0.8, pitchRef.current))
      last.current = { x: e.clientX, y: e.clientY }
      onYawChange(yawRef.current)
    }
    // Touch support
    const onTouchStart = e => {
      touch.current = e.touches[0]
      last.current = { x: touch.current.clientX, y: touch.current.clientY }
    }
    const onTouchMove = e => {
      const t = e.touches[0]
      yawRef.current   -= (t.clientX - last.current.x) * 0.003
      pitchRef.current -= (t.clientY - last.current.y) * 0.003
      pitchRef.current  = Math.max(-0.8, Math.min(0.8, pitchRef.current))
      last.current = { x: t.clientX, y: t.clientY }
      onYawChange(yawRef.current)
    }

    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [onYawChange])

  useFrame(({ camera }) => {
    const dir = new THREE.Vector3(
      Math.sin(yawRef.current) * Math.cos(pitchRef.current),
      Math.sin(pitchRef.current),
      Math.cos(yawRef.current) * Math.cos(pitchRef.current)
    )
    camera.lookAt(camera.position.clone().add(dir))
  })

  return null
}

// -------------------------------------------------------
// MODAL PROJET (overlay 2D)
// -------------------------------------------------------
function ProjectModal({ project, onClose }) {
  if (!project) return null
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      animation: 'fadeIn 0.2s ease',
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(135deg, #1a2e1a 0%, #0d1f0d 100%)',
        border: `1px solid ${project.color}`,
        borderRadius: 12,
        padding: '40px 48px',
        maxWidth: 520,
        width: '90%',
        color: '#e8f5e9',
        fontFamily: 'monospace',
        boxShadow: `0 0 60px ${project.color}44`,
        position: 'relative',
      }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{
          position: 'absolute',
          top: 16,
          right: 20,
          background: 'none',
          border: 'none',
          color: '#4caf50',
          fontSize: 22,
          cursor: 'pointer',
          lineHeight: 1,
        }}>✕</button>

        <div style={{ fontSize: 11, color: '#4caf50', marginBottom: 8, letterSpacing: '0.15em' }}>
          PROJET_{String(project.id + 1).padStart(2, '0')}
        </div>
        <h2 style={{ margin: '0 0 16px', fontSize: 28, fontWeight: 700, color: '#fff' }}>
          {project.title}
        </h2>
        <p style={{ margin: '0 0 24px', color: '#a5d6a7', lineHeight: 1.7, fontSize: 15 }}>
          {project.description}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
          {project.tech.map(t => (
            <span key={t} style={{
              padding: '4px 12px',
              background: project.color + '55',
              border: `1px solid ${project.color}`,
              borderRadius: 20,
              fontSize: 12,
              color: '#c8e6c9',
            }}>{t}</span>
          ))}
        </div>
        <a href={project.link} style={{
          display: 'inline-block',
          padding: '12px 28px',
          background: project.color,
          color: '#fff',
          borderRadius: 6,
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: 14,
          letterSpacing: '0.05em',
        }}>
          Voir le projet →
        </a>
      </div>
    </div>
  )
}

// -------------------------------------------------------
// VUE 2D PORTFOLIO (classique)
// -------------------------------------------------------
function PortfolioView({ onSwitch3D }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0a1a0a 0%, #0d2010 50%, #071410 100%)',
      color: '#e8f5e9',
      fontFamily: 'monospace',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <header style={{
        padding: '60px 60px 40px',
        borderBottom: '1px solid #1a3a1a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#4caf50', letterSpacing: '0.2em', marginBottom: 10 }}>
            PORTFOLIO — 2026
          </div>
          <h1 style={{
            margin: 0,
            fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 900,
            lineHeight: 1.05,
            color: '#fff',
            letterSpacing: '-0.02em',
          }}>
            Mon<br />
            <span style={{ color: '#4caf50' }}>Portfolio</span>
          </h1>
          <p style={{ margin: '16px 0 0', color: '#81c784', maxWidth: 480, lineHeight: 1.7, fontSize: 15 }}>
            Développeur passionné par les interfaces immersives et les expériences web uniques.
          </p>
        </div>
        <button onClick={onSwitch3D} style={{
          padding: '14px 24px',
          background: 'transparent',
          border: '1px solid #4caf50',
          color: '#4caf50',
          borderRadius: 8,
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: 13,
          letterSpacing: '0.05em',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#4caf5022' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          ⛰ Vue 3D
        </button>
      </header>

      {/* Projets */}
      <main style={{ padding: '60px', maxWidth: 1200 }}>
        <div style={{ fontSize: 11, color: '#4caf50', letterSpacing: '0.2em', marginBottom: 32 }}>
          PROJETS ({PROJECTS.length})
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 24,
        }}>
          {PROJECTS.map((p, i) => (
            <div key={p.id}
              style={{
                background: 'linear-gradient(135deg, #111f11 0%, #0a150a 100%)',
                border: '1px solid #1e3a1e',
                borderRadius: 10,
                padding: '32px',
                cursor: 'pointer',
                transition: 'all 0.25s',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = p.color
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = `0 16px 40px ${p.color}33`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#1e3a1e'
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0, right: 0,
                width: 100, height: 100,
                background: `radial-gradient(circle at top right, ${p.color}22, transparent 70%)`,
              }} />
              <div style={{ fontSize: 10, color: '#4caf50', letterSpacing: '0.15em', marginBottom: 14 }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <h3 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: '#fff' }}>
                {p.title}
              </h3>
              <p style={{ margin: '0 0 20px', color: '#81c784', lineHeight: 1.6, fontSize: 14 }}>
                {p.description}
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
                {p.tech.map(t => (
                  <span key={t} style={{
                    padding: '3px 9px',
                    background: p.color + '33',
                    border: `1px solid ${p.color}66`,
                    borderRadius: 20,
                    fontSize: 11,
                    color: '#a5d6a7',
                  }}>{t}</span>
                ))}
              </div>
              <a href={p.link} style={{
                color: '#4caf50',
                textDecoration: 'none',
                fontSize: 13,
                letterSpacing: '0.05em',
              }}>
                Voir le projet →
              </a>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

// -------------------------------------------------------
// VUE 3D (scène montagne)
// -------------------------------------------------------
function Scene3D({ onProjectSelect }) {
  const treePositions = useTreePositions(600)
  const cameraY = PLATEAU_HEIGHT + CAMERA_EYE_HEIGHT
  const [yaw, setYaw] = useState(0)
  const [selected, setSelected] = useState(null)

  const handleProjectSelect = useCallback(p => {
    setSelected(p)
    onProjectSelect(p)
  }, [onProjectSelect])

  return (
    <>
      <Canvas shadows camera={{ position: [0, cameraY, 0], fov: 75 }}
        style={{ cursor: 'grab' }}>
        <color attach="background" args={['#c8dff0']} />
        <fog attach="fog" args={['#c8dff0', 80, 420]} />
        <Sky sunPosition={[100, 50, 100]} turbidity={0.1} rayleigh={0.2} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[80, 120, 60]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} />

        <EpicProceduralMountains />
        <DenseGrass />
        {treePositions.map((pos, i) => <Tree key={i} position={pos} />)}
        <PlateauTrees />

        {/* Panneaux projets */}
        {PROJECTS.map(p => (
          <ProjectSign
            key={p.id}
            project={p}
            onSelect={handleProjectSelect}
            isSelected={selected?.id === p.id}
          />
        ))}

        <CameraController
          onYawChange={setYaw}
          onProjectSelect={handleProjectSelect}
        />
      </Canvas>

      {/* HUD boussole */}
      <CompassHUD yaw={yaw} />

      {/* Instructions */}
      <div style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.55)',
        fontSize: 12,
        fontFamily: 'monospace',
        letterSpacing: '0.08em',
        pointerEvents: 'none',
        zIndex: 10,
      }}>
        GLISSER pour regarder autour · CLIQUER sur un panneau pour voir le projet
      </div>
    </>
  )
}

// -------------------------------------------------------
// APP PRINCIPALE
// -------------------------------------------------------
export default function App() {
  const [view, setView] = useState('2d') // '2d' | '3d'
  const [selectedProject, setSelectedProject] = useState(null)

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow: hidden; }
      `}</style>

      {/* Bouton toggle toujours visible en vue 3D */}
      {view === '3d' && (
        <button
          onClick={() => setView('2d')}
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 50,
            padding: '12px 20px',
            background: 'rgba(10,30,10,0.85)',
            border: '1px solid #4caf50',
            color: '#4caf50',
            borderRadius: 8,
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: 13,
            letterSpacing: '0.05em',
            backdropFilter: 'blur(10px)',
          }}
        >
          ← Vue 2D
        </button>
      )}

      {/* Vues */}
      {view === '2d' ? (
        <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
          <PortfolioView onSwitch3D={() => setView('3d')} />
        </div>
      ) : (
        <Scene3D onProjectSelect={setSelectedProject} />
      )}

      {/* Modal projet */}
      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </div>
  )
}