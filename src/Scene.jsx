import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
export default function Scene(){
 const host=useRef(null);
 useEffect(()=>{
  const el=host.current;if(!el)return;
  let renderer,frame,observer,disposed=false;
  try{
   const scene=new THREE.Scene();
   const camera=new THREE.PerspectiveCamera(36,1,.1,100);camera.position.set(0,0,8);
   renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));renderer.setSize(el.clientWidth,el.clientHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;el.appendChild(renderer.domElement);
   scene.add(new THREE.AmbientLight(0xffffff,1.8));
   const key=new THREE.PointLight(0xd7ff58,42,18);key.position.set(3,3,5);scene.add(key);
   const fill=new THREE.PointLight(0x9bbd71,24,15);fill.position.set(-4,-2,2);scene.add(fill);
   const group=new THREE.Group();scene.add(group);
   const coreGeo=new THREE.IcosahedronGeometry(1.45,2);
   const coreMat=new THREE.MeshPhysicalMaterial({color:0x9ebc55,metalness:.72,roughness:.22,clearcoat:1,clearcoatRoughness:.15,flatShading:false});
   const core=new THREE.Mesh(coreGeo,coreMat);group.add(core);
   const wire=new THREE.Mesh(new THREE.IcosahedronGeometry(1.62,1),new THREE.MeshBasicMaterial({color:0xd7ff48,wireframe:true,transparent:true,opacity:.22}));group.add(wire);
   const ringMat=new THREE.MeshStandardMaterial({color:0xe3f0b0,metalness:.85,roughness:.22});
   for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(2.05+i*.17,.012,8,160),ringMat);ring.rotation.set(.7+i*.48,.4+i*.25,.2);group.add(ring)}
   const particles=new THREE.BufferGeometry(),positions=[];
   for(let i=0;i<260;i++){const r=2.7+Math.random()*2.3,a=Math.random()*Math.PI*2,b=Math.acos(2*Math.random()-1);positions.push(r*Math.sin(b)*Math.cos(a),r*Math.sin(b)*Math.sin(a),r*Math.cos(b))}
   particles.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
   group.add(new THREE.Points(particles,new THREE.PointsMaterial({color:0xd7ff8a,size:.025,transparent:true,opacity:.7})));
   const pointer={x:0,y:0},target={x:0,y:0};
   const move=e=>{const r=el.getBoundingClientRect();target.x=((e.clientX-r.left)/r.width-.5)*.55;target.y=((e.clientY-r.top)/r.height-.5)*.4};
   const leave=()=>{target.x=0;target.y=0};
   el.addEventListener('pointermove',move);el.addEventListener('pointerleave',leave);
   const resize=()=>{if(!renderer)return;const w=el.clientWidth,h=el.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h)};
   observer=new ResizeObserver(resize);observer.observe(el);
   const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   const render=()=>{if(disposed)return;pointer.x+=(target.x-pointer.x)*.035;pointer.y+=(target.y-pointer.y)*.035;group.rotation.y=pointer.x+(reduce?0:performance.now()*.00011);group.rotation.x=pointer.y+(reduce?0:Math.sin(performance.now()*.00022)*.08);core.rotation.y=-(reduce?0:performance.now()*.00008);renderer.render(scene,camera);if(!reduce)frame=requestAnimationFrame(render)};
   render();
   return()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',leave);renderer?.dispose();coreGeo.dispose();coreMat.dispose();ringMat.dispose();particles.dispose();scene.traverse(o=>{if(o.geometry&&o.geometry!==coreGeo&&o.geometry!==particles)o.geometry.dispose();if(o.material&&o.material!==coreMat&&o.material!==ringMat){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose()}});renderer?.domElement.remove()};
  }catch(e){el.classList.add('scene-fallback');el.textContent='WORLD / AUTOMATES';}
 },[]);
 return <div className="three-scene" ref={host} aria-label="Interactive 3D metallic kinetic sculpture" role="img"/>;
}