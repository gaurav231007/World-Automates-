import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';

export default function Scene(){
 const host=useRef(null);
 useEffect(()=>{
  const el=host.current;if(!el)return;
  let renderer,raf,resizeObserver,visibilityObserver,disposed=false,visible=true,lastFrame=0;
  const geometries=[],materials=[],textures=[];
  const cleanup=()=>{
   disposed=true;cancelAnimationFrame(raf);resizeObserver?.disconnect();visibilityObserver?.disconnect();
   document.removeEventListener('visibilitychange',onVisibility);
   geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
   renderer?.dispose();renderer?.domElement.remove();
  };
  const onVisibility=()=>{visible=!document.hidden;if(visible)draw(performance.now());};
  try{
   const scene=new THREE.Scene();
   const camera=new THREE.PerspectiveCamera(36,1,.1,100);
   camera.position.z=6.7;
   renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power',failIfMajorPerformanceCaveat:false});
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1));
   renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.setClearColor(0x000000,0);
   el.appendChild(renderer.domElement);
   scene.add(new THREE.AmbientLight(0xffffff,1.35));
   const sun=new THREE.DirectionalLight(0xffffff,2.0);sun.position.set(-3,2,5);scene.add(sun);
   const group=new THREE.Group();scene.add(group);
   const geo=new THREE.SphereGeometry(1.72,48,32);geometries.push(geo);
   const mat=new THREE.MeshPhongMaterial({color:0x4d83c9,specular:0x263d60,shininess:10});
   materials.push(mat);
   const earth=new THREE.Mesh(geo,mat);group.add(earth);
   const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');
   const tex=loader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',t=>{
    if(disposed)return;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=1;mat.map=t;mat.color.set(0xffffff);mat.needsUpdate=true;
   },undefined,()=>{if(!disposed)console.warn('Earth map unavailable; showing shaded globe.');});
   textures.push(tex);
   const glowGeo=new THREE.SphereGeometry(1.79,32,24);geometries.push(glowGeo);
   const glowMat=new THREE.MeshBasicMaterial({color:0x5c8fff,transparent:true,opacity:.13,side:THREE.BackSide,depthWrite:false});materials.push(glowMat);
   group.add(new THREE.Mesh(glowGeo,glowMat));
   const ringGeo=new THREE.TorusGeometry(2.02,.006,5,96);geometries.push(ringGeo);
   const ringMat=new THREE.MeshBasicMaterial({color:0x8797c2,transparent:true,opacity:.4});materials.push(ringMat);
   const ring=new THREE.Mesh(ringGeo,ringMat);ring.rotation.set(1.08,.25,.22);group.add(ring);
   const resize=()=>{
    const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;
    camera.aspect=w/h;camera.position.z=w<650?6.9:6.35;group.scale.setScalar(w<650?.78:.92);
    camera.updateProjectionMatrix();renderer.setSize(w,h,false);draw(performance.now());
   };
   resizeObserver=new ResizeObserver(resize);resizeObserver.observe(el);
   visibilityObserver=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;if(visible)draw(performance.now());},{threshold:0});
   visibilityObserver.observe(el);document.addEventListener('visibilitychange',onVisibility);
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   const mobile=window.matchMedia('(max-width: 900px)').matches;
   const draw=now=>{
    if(disposed||!visible||document.hidden)return;
    if(now-lastFrame< (mobile?100:50)){raf=requestAnimationFrame(draw);return;}
    lastFrame=now;
    if(!reduced){group.rotation.y+=mobile?.0018:.003;ring.rotation.z+=.0007;}
    renderer.render(scene,camera);
    if(!reduced)raf=requestAnimationFrame(draw);
   };
   resize();
   draw(performance.now());
   return cleanup;
  }catch(e){
   console.error('Earth scene could not start:',e);
   el.classList.add('scene-fallback');
   return cleanup;
  }
 },[]);
 return <div className="three-scene" ref={host} role="img" aria-label="Rotating Earth globe"/>;
}
