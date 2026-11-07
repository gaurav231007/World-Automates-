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
   // Central cobalt core: a physical anchor for the connected business system.
   const bodyGeo=new THREE.BoxGeometry(1.45,1.75,.95,4,4,4);
   const bodyMat=new THREE.MeshPhysicalMaterial({color:0x3558d4,metalness:.48,roughness:.24,clearcoat:1,clearcoatRoughness:.12});
   const body=new THREE.Mesh(bodyGeo,bodyMat);body.rotation.set(.24,.42,.12);sculpture.add(body);
   const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.53,2),new THREE.MeshPhysicalMaterial({color:0xff704d,metalness:.32,roughness:.2,emissive:0x5a170c,emissiveIntensity:.35,clearcoat:1}));
   core.position.set(.05,0,.72);sculpture.add(core);
   const ringMat=new THREE.MeshStandardMaterial({color:0x6579d8,metalness:.7,roughness:.28,transparent:true,opacity:.72});
   const rings=[];
   for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.75+i*.2,.009,8,180),ringMat);ring.rotation.set(.7+i*.52,.25+i*.32,.15);sculpture.add(ring);rings.push(ring);}
   // Three floating interface panels orbit the core: dashboard, brand and workflow.
   const panels=[];
   function makePanel(kind){
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=420;const x=canvas.getContext('2d');
    x.fillStyle='#f4f1e9';x.fillRect(0,0,640,420);x.strokeStyle='#d8d5cc';x.lineWidth=3;x.strokeRect(12,12,616,396);
    x.fillStyle='#202431';x.font='bold 22px monospace';x.fillText(kind==='finance'?'BUSINESS / OVERVIEW':kind==='brand'?'BRAND / IDENTITY':'FLOW / AUTOMATION',38,58);
    x.fillStyle='#858994';x.font='16px monospace';x.fillText(kind==='finance'?'LIVE PERFORMANCE':kind==='brand'?'DESIGN SYSTEM  /  01':'LEAD ROUTING  /  01',38,91);
    if(kind==='finance'){
      x.fillStyle='#3558d4';x.font='bold 52px Arial';x.fillText('₹ 8.42L',38,172);
      x.fillStyle='#ff704d';x.font='18px monospace';x.fillText('+12.8% THIS MONTH',40,204);
      x.fillStyle='#3558d4';[70,110,88,145,125,180,154,210,188,235].forEach((h,i)=>x.fillRect(40+i*54,355-h,28,h));
      x.strokeStyle='#d8d5cc';x.beginPath();x.moveTo(36,356);x.lineTo(590,356);x.stroke();
    }else if(kind==='brand'){
      x.fillStyle='#3558d4';x.fillRect(40,125,180,220);x.fillStyle='#ff704d';x.beginPath();x.arc(130,235,48,0,Math.PI*2);x.fill();
      x.fillStyle='#202431';x.font='bold 36px Arial';x.fillText('FORM',270,190);x.fillText('FOLLOWS',270,235);x.fillText('FUNCTION.',270,280);
      x.fillStyle='#858994';x.font='15px monospace';x.fillText('IDENTITY / DIGITAL / PRINT',270,325);
    }else{
      const boxes=[['CAPTURE',40],['DECIDE',235],['DELIVER',430]];
      boxes.forEach(([t,left],i)=>{x.fillStyle=i===1?'#3558d4':'#e4e1d8';x.fillRect(left,155,160,112);x.fillStyle=i===1?'#fff':'#202431';x.font='bold 18px monospace';x.fillText(t,left+18,194);x.fillStyle=i===1?'#d9e0ff':'#858994';x.font='14px Arial';x.fillText(i===0?'New enquiry':i===1?'Smart route':'Next action',left+18,229);});
      x.strokeStyle='#ff704d';x.lineWidth=5;x.beginPath();x.moveTo(200,211);x.lineTo(232,211);x.moveTo(395,211);x.lineTo(427,211);x.stroke();
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const mat=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:true});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.62,1.06),mat);
    mesh.userData.texture=texture;return mesh;
   }
   const panelData=[{kind:'finance',angle:-.35,radius:2.35,y:1.22},{kind:'brand',angle:2.7,radius:2.45,y:-1.0},{kind:'flow',angle:4.7,radius:2.5,y:.75}];
   panelData.forEach((p,i)=>{const mesh=makePanel(p.kind);mesh.position.set(Math.cos(p.angle)*p.radius,p.y,Math.sin(p.angle)*.65-.15);mesh.rotation.y=-.18+i*.18;mesh.rotation.z=(i-1)*-.08;mesh.scale.setScalar(.82);sculpture.add(mesh);panels.push({mesh,...p,phase:i*2.1});});
   // Fine network lines and linked nodes around the orbit.
   const nodeMat=new THREE.MeshBasicMaterial({color:0xff7655});
   const nodes=[];
   for(let i=0;i<18;i++){const a=i/18*Math.PI*2;const node=new THREE.Mesh(new THREE.SphereGeometry(.035,12,12),nodeMat);node.position.set(Math.cos(a)*2.05,Math.sin(a*2)*.5,Math.sin(a)*.75);sculpture.add(node);nodes.push(node);}
   const dotsGeo=new THREE.BufferGeometry(),coords=[];for(let i=0;i<240;i++){const rr=2.8+Math.random()*1.35,a=Math.random()*Math.PI*2,b=Math.acos(2*Math.random()-1);coords.push(rr*Math.sin(b)*Math.cos(a),rr*Math.sin(b)*Math.sin(a),rr*Math.cos(b));}dotsGeo.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));sculpture.add(new THREE.Points(dotsGeo,new THREE.PointsMaterial({color:0x526ff0,size:.018,transparent:true,opacity:.58})));
   const pointer={x:0,y:0},target={x:0,y:0};const move=e=>{const r=el.getBoundingClientRect();target.x=((e.clientX-r.left)/r.width-.5)*.5;target.y=((e.clientY-r.top)/r.height-.5)*.35};const leave=()=>{target.x=target.y=0};el.addEventListener('pointermove',move);el.addEventListener('pointerleave',leave);
   const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;const mobile=w<650;camera.aspect=w/h;camera.position.z=mobile?9.5:8.8;sculpture.scale.setScalar(mobile?.68:.66);sculpture.position.y=mobile?0:0;camera.updateProjectionMatrix();renderer.setSize(w,h)};observer=new ResizeObserver(resize);observer.observe(el);resize();
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;const draw=()=>{if(disposed)return;pointer.x+=(target.x-pointer.x)*.04;pointer.y+=(target.y-pointer.y)*.04;sculpture.rotation.y=pointer.x+(reduced?0:performance.now()*.0001);sculpture.rotation.x=pointer.y+(reduced?0:Math.sin(performance.now()*.0002)*.07);const t=performance.now()*.001;panels.forEach((p,i)=>{p.mesh.position.y=p.y+(reduced?0:Math.sin(t*1.15+p.phase)*.12);p.mesh.rotation.y=-.18+i*.18+(reduced?0:Math.sin(t*.7+p.phase)*.07);p.mesh.lookAt(camera.position);});rings.forEach((r,i)=>{if(!reduced){r.rotation.z+=.0015*(i+1);}});nodes.forEach((n,i)=>{const pulse=1+(reduced?0:.28*Math.sin(t*2+i));n.scale.setScalar(pulse);});core.scale.setScalar(1+(reduced?0:.035*Math.sin(t*2.4)));renderer.render(scene,camera);if(!reduced)raf=requestAnimationFrame(draw)};draw();
   return()=>{disposed=true;cancelAnimationFrame(raf);observer?.disconnect();el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',leave);scene.traverse(o=>{o.geometry?.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}o.userData?.texture?.dispose?.();});renderer?.dispose();renderer?.domElement.remove();};
  }catch(e){el.classList.add('scene-fallback');el.textContent='WORLD / AUTOMATES';}
 },[]);
 return <div className="three-scene" ref={host} role="img" aria-label="Interactive cobalt and orange 3D abstract sculpture"/>;
}
