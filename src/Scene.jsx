import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';

export default function Scene(){
 const host=useRef(null);
 useEffect(()=>{
  const el=host.current;if(!el)return;
  let renderer,raf,observer,disposed=false;
  const geometries=[],materials=[],textures=[];
  try{
   const scene=new THREE.Scene();
   const camera=new THREE.PerspectiveCamera(34,1,.1,100);
   camera.position.set(0,0,6.7);
   renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
   renderer.setSize(el.clientWidth,el.clientHeight);
   renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.toneMapping=THREE.ACESFilmicToneMapping;
   renderer.toneMappingExposure=1.15;
   el.appendChild(renderer.domElement);
   scene.add(new THREE.AmbientLight(0xffffff,1.05));
   const sun=new THREE.DirectionalLight(0xffffff,2.8);sun.position.set(-3,2,5);scene.add(sun);
   const rim=new THREE.DirectionalLight(0x6688ff,1.5);rim.position.set(4,-1,-3);scene.add(rim);
   const earthGroup=new THREE.Group();scene.add(earthGroup);
   const loader=new THREE.TextureLoader();
   loader.setCrossOrigin('anonymous');
   const load=(url)=>{const t=loader.load(url,()=>{if(!disposed){t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();}});textures.push(t);return t;};
   const earthMap=load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg');
   const earthBump=load('https://threejs.org/examples/textures/planets/earth_normal_2048.jpg');
   const earthSpec=load('https://threejs.org/examples/textures/planets/earth_specular_2048.jpg');
   const earthGeo=new THREE.SphereGeometry(1.72,96,96);geometries.push(earthGeo);
   const earthMat=new THREE.MeshPhongMaterial({map:earthMap,bumpMap:earthBump,bumpScale:.045,specularMap:earthSpec,specular:new THREE.Color(0x334466),shininess:18});
   materials.push(earthMat);
   const earth=new THREE.Mesh(earthGeo,earthMat);earthGroup.add(earth);
   const cloudMap=load('https://threejs.org/examples/textures/planets/earth_clouds_1024.png');
   const cloudGeo=new THREE.SphereGeometry(1.745,72,72);geometries.push(cloudGeo);
   const cloudMat=new THREE.MeshPhongMaterial({map:cloudMap,transparent:true,opacity:.24,depthWrite:false});materials.push(cloudMat);
   const clouds=new THREE.Mesh(cloudGeo,cloudMat);earthGroup.add(clouds);
   const atmosphereGeo=new THREE.SphereGeometry(1.82,72,72);geometries.push(atmosphereGeo);
   const atmosphereMat=new THREE.MeshBasicMaterial({color:0x5c8fff,transparent:true,opacity:.14,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false});materials.push(atmosphereMat);
   earthGroup.add(new THREE.Mesh(atmosphereGeo,atmosphereMat));
   const orbitMat=new THREE.MeshBasicMaterial({color:0x7885ad,transparent:true,opacity:.42});
   const orbit1=new THREE.Mesh(new THREE.TorusGeometry(2.08,.006,8,180),orbitMat);orbit1.rotation.set(1.08,.25,.22);earthGroup.add(orbit1);geometries.push(orbit1.geometry);materials.push(orbitMat);
   const orbit2=new THREE.Mesh(new THREE.TorusGeometry(2.22,.005,8,180),new THREE.MeshBasicMaterial({color:0x9ba5bd,transparent:true,opacity:.28}));orbit2.rotation.set(.3,1.05,-.3);earthGroup.add(orbit2);geometries.push(orbit2.geometry);materials.push(orbit2.material);
   const starGeo=new THREE.BufferGeometry(),positions=[];
   for(let i=0;i<420;i++){const r=2.45+Math.random()*1.65,a=Math.random()*Math.PI*2,b=Math.acos(2*Math.random()-1);positions.push(r*Math.sin(b)*Math.cos(a),r*Math.sin(b)*Math.sin(a),r*Math.cos(b));}
   starGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometries.push(starGeo);
   const starsMat=new THREE.PointsMaterial({color:0x647bd5,size:.012,transparent:true,opacity:.5});materials.push(starsMat);earthGroup.add(new THREE.Points(starGeo,starsMat));
   const pointer={x:0,y:0},target={x:0,y:0};
   const move=e=>{const r=el.getBoundingClientRect();target.x=((e.clientX-r.left)/r.width-.5)*.34;target.y=((e.clientY-r.top)/r.height-.5)*.24;};
   const leave=()=>{target.x=target.y=0;};
   el.addEventListener('pointermove',move);el.addEventListener('pointerleave',leave);
   const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.position.z=w<650?6.6:6.25;earthGroup.scale.setScalar(w<650?.96:1.08);camera.updateProjectionMatrix();renderer.setSize(w,h);};
   observer=new ResizeObserver(resize);observer.observe(el);resize();
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   const draw=()=>{if(disposed)return;const t=performance.now()*.001;pointer.x+=(target.x-pointer.x)*.035;pointer.y+=(target.y-pointer.y)*.035;earthGroup.rotation.y=pointer.x+(reduced?0:t*.075);earthGroup.rotation.x=pointer.y+Math.sin(t*.22)*.035;clouds.rotation.y=earthGroup.rotation.y+t*.012;orbit1.rotation.z=reduced?orbit1.rotation.z:Math.sin(t*.13)*.08;orbit2.rotation.x=reduced?orbit2.rotation.x:Math.cos(t*.11)*.06;renderer.render(scene,camera);if(!reduced)raf=requestAnimationFrame(draw);};
   draw();
   return()=>{disposed=true;cancelAnimationFrame(raf);observer?.disconnect();el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',leave);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer?.dispose();renderer?.domElement.remove();};
  }catch(e){el.classList.add('scene-fallback');el.textContent='WORLD / AUTOMATES';}
 },[]);
 return <div className="three-scene" ref={host} role="img" aria-label="Realistic rotating Earth with moving clouds and blue atmospheric glow"/>;
}
