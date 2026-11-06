import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';
export default function Scene(){
 const host=useRef(null);
 useEffect(()=>{
  const el=host.current;if(!el)return;let renderer,raf,observer,disposed=false;
  try{
   const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(0,0,8);
   renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(el.clientWidth,el.clientHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;el.appendChild(renderer.domElement);
   scene.add(new THREE.AmbientLight(0xffffff,1.3));const key=new THREE.PointLight(0x4169ff,55,18);key.position.set(3,4,5);scene.add(key);const warm=new THREE.PointLight(0xff6a3d,38,15);warm.position.set(-4,-2,3);scene.add(warm);
   const sculpture=new THREE.Group();scene.add(sculpture);
   const bodyGeo=new THREE.BoxGeometry(1.9,2.25,1.25,5,5,5);const bodyMat=new THREE.MeshPhysicalMaterial({color:0x4565d8,metalness:.62,roughness:.19,clearcoat:1,clearcoatRoughness:.08});const body=new THREE.Mesh(bodyGeo,bodyMat);body.rotation.set(.28,.38,.16);sculpture.add(body);
   const inner=new THREE.Mesh(new THREE.OctahedronGeometry(.82,1),new THREE.MeshPhysicalMaterial({color:0xff754b,metalness:.52,roughness:.2,transmission:.12,clearcoat:1}));inner.position.set(.1,0,.78);sculpture.add(inner);
   const ringMat=new THREE.MeshStandardMaterial({color:0xf0eee7,metalness:.88,roughness:.2});
   for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(2.05+i*.16,.012,8,150),ringMat);ring.rotation.set(.7+i*.52,.25+i*.32,.15);sculpture.add(ring);}
   const dotsGeo=new THREE.BufferGeometry(),coords=[];for(let i=0;i<160;i++){const r=2.65+Math.random()*1.8,a=Math.random()*Math.PI*2,b=Math.acos(2*Math.random()-1);coords.push(r*Math.sin(b)*Math.cos(a),r*Math.sin(b)*Math.sin(a),r*Math.cos(b));}dotsGeo.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));sculpture.add(new THREE.Points(dotsGeo,new THREE.PointsMaterial({color:0x526ff0,size:.025,transparent:true,opacity:.8})));
   const pointer={x:0,y:0},target={x:0,y:0};const move=e=>{const r=el.getBoundingClientRect();target.x=((e.clientX-r.left)/r.width-.5)*.5;target.y=((e.clientY-r.top)/r.height-.5)*.35};const leave=()=>{target.x=target.y=0};el.addEventListener('pointermove',move);el.addEventListener('pointerleave',leave);
   const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h)};observer=new ResizeObserver(resize);observer.observe(el);
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;const draw=()=>{if(disposed)return;pointer.x+=(target.x-pointer.x)*.04;pointer.y+=(target.y-pointer.y)*.04;sculpture.rotation.y=pointer.x+(reduced?0:performance.now()*.0001);sculpture.rotation.x=pointer.y+(reduced?0:Math.sin(performance.now()*.0002)*.07);renderer.render(scene,camera);if(!reduced)raf=requestAnimationFrame(draw)};draw();
   return()=>{disposed=true;cancelAnimationFrame(raf);observer?.disconnect();el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',leave);scene.traverse(o=>{o.geometry?.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});renderer?.dispose();renderer?.domElement.remove();};
  }catch(e){el.classList.add('scene-fallback');el.textContent='WORLD / AUTOMATES';}
 },[]);
 return <div className="three-scene" ref={host} role="img" aria-label="Interactive cobalt and orange 3D abstract sculpture"/>;
}
