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
   el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',leave);
   document.removeEventListener('visibilitychange',pageVisibility);
   geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
   renderer?.dispose();renderer?.domElement.remove();
  };
  let target={x:0,y:0},pointer={x:0,y:0},earthGroup,clouds,move=()=>{},leave=()=>{},pageVisibility=()=>{};
  try{
   const scene=new THREE.Scene();
   const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.z=6.6;
   renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power',stencil:false,depth:true});
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1));
   renderer.setSize(Math.max(1,el.clientWidth),Math.max(1,el.clientHeight));
   renderer.outputColorSpace=THREE.SRGBColorSpace;
   el.appendChild(renderer.domElement);
   scene.add(new THREE.AmbientLight(0xffffff,1.5));
   const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(-3,2,5);scene.add(sun);
   earthGroup=new THREE.Group();scene.add(earthGroup);
   const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');
   const earthMap=loader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',t=>{if(!disposed){t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=1;}},undefined,()=>{if(!disposed)el.classList.add('earth-texture-fallback');});
   textures.push(earthMap);
   const sphere=new THREE.SphereGeometry(1.72,48,36);geometries.push(sphere);
   const earthMat=new THREE.MeshPhongMaterial({color:0x789fd5,map:earthMap,specular:0x23395d,shininess:8});
   materials.push(earthMat);earthGroup.add(new THREE.Mesh(sphere,earthMat));
   const cloudGeo=new THREE.SphereGeometry(1.745,32,24);geometries.push(cloudGeo);
   const cloudMat=new THREE.MeshBasicMaterial({color:0xdde8f7,transparent:true,opacity:.09,wireframe:true,depthWrite:false});materials.push(cloudMat);
   clouds=new THREE.Mesh(cloudGeo,cloudMat);earthGroup.add(clouds);
   const atmosphereGeo=new THREE.SphereGeometry(1.82,32,24);geometries.push(atmosphereGeo);
   const atmosphereMat=new THREE.MeshBasicMaterial({color:0x5c8fff,transparent:true,opacity:.16,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false});materials.push(atmosphereMat);
   earthGroup.add(new THREE.Mesh(atmosphereGeo,atmosphereMat));
   const orbitMat=new THREE.MeshBasicMaterial({color:0x7885ad,transparent:true,opacity:.34});
   const orbit=new THREE.Mesh(new THREE.TorusGeometry(2.08,.006,4,80),orbitMat);orbit.rotation.set(1.08,.25,.22);earthGroup.add(orbit);geometries.push(orbit.geometry);materials.push(orbitMat);
   move=e=>{const r=el.getBoundingClientRect();target.x=((e.clientX-r.left)/Math.max(1,r.width)-.5)*.22;target.y=((e.clientY-r.top)/Math.max(1,r.height)-.5)*.16;};
   leave=()=>{target.x=target.y=0;};
   el.addEventListener('pointermove',move,{passive:true});el.addEventListener('pointerleave',leave,{passive:true});
   const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.position.z=w<650?6.8:6.3;earthGroup.scale.setScalar(w<650?.82:.94);camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
   resizeObserver=new ResizeObserver(resize);resizeObserver.observe(el);resize();
   visibilityObserver=new IntersectionObserver(entries=>{visible=!!entries[0]?.isIntersecting;if(visible)raf=requestAnimationFrame(draw);else cancelAnimationFrame(raf);},{threshold:0.01});
   visibilityObserver.observe(el);
   pageVisibility=()=>{if(document.hidden)cancelAnimationFrame(raf);else if(visible)raf=requestAnimationFrame(draw);};
   document.addEventListener('visibilitychange',pageVisibility);
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   function draw(now=0){
    if(disposed||!visible||document.hidden)return;
    if(now-lastFrame<40){raf=requestAnimationFrame(draw);return;}
    lastFrame=now;
    pointer.x+=(target.x-pointer.x)*.045;pointer.y+=(target.y-pointer.y)*.045;
    earthGroup.rotation.y+=reduced?0:.0018;
    earthGroup.rotation.y+=pointer.x*.006;
    earthGroup.rotation.x=pointer.y;
    if(clouds)clouds.rotation.y=earthGroup.rotation.y*.99;
    renderer.render(scene,camera);
    if(!reduced)raf=requestAnimationFrame(draw);
   }
   el.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);el.classList.add('scene-fallback');});
   draw();
   return cleanup;
  }catch(e){console.error('Earth scene could not start:',e);el.classList.add('scene-fallback');cleanup();}
 },[]);
 return <div className="three-scene" ref={host} role="img" aria-label="Rotating Earth globe"/>;
}
