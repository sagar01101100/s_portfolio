import * as T from './vendor/three.module.js';
const $=s=>document.querySelector(s),scene=new T.Scene();scene.background=new T.Color('#111921');scene.fog=new T.FogExp2('#111921',.008);
let renderer;try{renderer=new T.WebGLRenderer({antialias:true,alpha:false})}catch(e){$('#loadstatus').textContent='This workspace needs WebGL. Please enable hardware acceleration and reload.';throw e}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;$('#scene').append(renderer.domElement);
const camera=new T.PerspectiveCamera(innerWidth<760?75:58,innerWidth/innerHeight,.08,100),base=new T.Vector3(0,1.72,3.05),look=new T.Vector3(innerWidth<760?2.1:0,1.9,-2.7);camera.position.copy(base);camera.lookAt(look);
scene.add(new T.HemisphereLight('#b7d0e1','#604228',2));const sun=new T.DirectionalLight('#ffcf96',4);sun.position.set(5,7,1);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8});sun.shadow.bias=-.001;scene.add(sun);const blue=new T.PointLight('#75c9ff',15,9);blue.position.set(-1,2.7,-2);scene.add(blue);const warm=new T.PointLight('#ffb565',20,8);warm.position.set(3.8,3,-2);scene.add(warm);
const mats={wood:new T.MeshStandardMaterial({color:'#77553b',roughness:.6}),dark:new T.MeshStandardMaterial({color:'#222a2e',roughness:.5,metalness:.3}),metal:new T.MeshStandardMaterial({color:'#a5aca9',roughness:.32,metalness:.75}),ivory:new T.MeshStandardMaterial({color:'#cbc9bb',roughness:.35,metalness:.4}),black:new T.MeshStandardMaterial({color:'#0e171c',roughness:.4}),glow:new T.MeshStandardMaterial({color:'#a7dbf0',emissive:'#56b5dc',emissiveIntensity:2}),gold:new T.MeshStandardMaterial({color:'#ca9b60',metalness:.65,roughness:.4})};
function box(w,h,d,x,y,z,mat=mats.dark,parent=scene){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function ball(r,x,y,z,mat,parent=scene){const m=new T.Mesh(new T.SphereGeometry(r,16,12),mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m}
function cyl(r1,r2,h,x,y,z,mat,parent=scene){const m=new T.Mesh(new T.CylinderGeometry(r1,r2,h,24),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function line(a,b,r,mat,parent=scene){const va=new T.Vector3(...a),vb=new T.Vector3(...b),v=vb.clone().sub(va),m=cyl(r,r,v.length(),0,0,0,mat,parent);m.position.copy(va.add(vb).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m}
function texture(draw,w=1024,h=640){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');draw(ctx,w,h);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return {tex,ctx,c}}
function panel(w,h,x,y,z,tex,rotation=0){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=rotation;scene.add(g);box(w+.08,h+.08,.09,0,0,0,mats.dark,g);const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex}));m.position.z=.052;g.add(m);return g}
const floor=box(10,.2,7,0,-.1,0,new T.MeshStandardMaterial({color:'#434c53',roughness:.6}));
for(let x=-5;x<5;x+=.65)box(.012,.007,7,x,.004,0,new T.MeshStandardMaterial({color:'#29333c'}));
const wall=new T.MeshStandardMaterial({color:'#263440',roughness:.83});
box(10,4.8,.16,0,2.3,-3.5,wall);box(.16,4.8,7,-5,2.3,0,wall);
box(10,.12,7,0,4.72,0,wall);
const roomLight=new T.PointLight('#dde9ed',32,12);roomLight.position.set(-1,4.2,.5);scene.add(roomLight);box(2.6,.035,.5,-1,4.62,.1,mats.glow);
// The only window is on the right. The side wall is built around its opening.
box(.16,1.45,6.2,5,.625,-.4,wall);box(.16,.65,6.2,5,4.375,-.4,wall);
box(.16,2.8,.75,5,2.7,-3.125,wall);box(.16,2.8,2.1,5,2.7,1.65,wall);
box(10,.06,.06,0,.12,-3.36,mats.glow);box(.06,.06,6.2,4.89,.12,-.4,mats.glow);
// Acoustic wall slats behind the workstation, with clean recessed light strips.
for(let x=-4.6;x<-.5;x+=.14)box(.065,3.35,.06,x,2.45,-3.36,mats.dark);
box(4.1,.025,.08,-2.5,4.15,-3.25,mats.glow);
// Window and evening city, rendered in the room rather than an external image.
const city=texture((c,w,h)=>{const gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#334c65');gr.addColorStop(.65,'#bd9180');gr.addColorStop(1,'#454e5e');c.fillStyle=gr;c.fillRect(0,0,w,h);let seed=9;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};for(let i=0;i<35;i++){const x=i*33,hh=90+rnd()*220;c.fillStyle=i%2?'#30404c':'#3e4d59';c.fillRect(x,h-hh,32,hh);for(let y=h-hh+15;y<h;y+=17)for(let xx=x+6;xx<x+30;xx+=10)if(rnd()>.48){c.fillStyle='#d3ac78';c.fillRect(xx,y,3,5)}} });panel(3.4,2.65,5.05,2.72,-1.05,city.tex,-Math.PI/2);
for(let z of [-2.8,.7])box(.17,2.82,.065,4.96,2.72,z,mats.metal);
for(let y of [1.34,4.1])box(.17,.065,3.6,4.96,y,-1.05,mats.metal);
box(.38,.08,3.7,4.82,1.32,-1.05,mats.black);
// Open casement, hinged into the room, on the right wall only.
const casement=new T.Group();casement.position.set(4.9,2.72,.65);casement.rotation.y=-.42;scene.add(casement);
for(let y of [-1.3,1.3])box(.07,.05,1.65,0,y,-.82,mats.metal,casement);
for(let z of [0,-1.65])box(.07,2.65,.05,0,0,z,mats.metal,casement);
box(.014,2.54,1.56,0,0,-.82,new T.MeshPhysicalMaterial({color:'#a4c5d8',transparent:true,opacity:.12,metalness:.1,roughness:.05,side:T.DoubleSide}),casement);
// Desk, feet, monitor stands and equipment.
box(3.65,.12,1.25,-1.65,1.35,-2,mats.black);box(3.63,.018,1.23,-1.65,1.29,-2,mats.glow);for(let x of [-3.25,-.05]){box(.1,1.35,.1,x,.67,-2.4);box(.1,1.35,.1,x,.67,-1.55);box(.45,.07,1,x,.04,-2)}
const snippets=[['// a little curiosity. a lot of building.','type Idea = { curiosity: number };','','export async function build(idea: Idea) {','  const solution = await explore(idea);','  return ship({ ...solution, care: true });','}','','const developer = {','  name: "Sagar",','  focus: ["APIs", "Full stack", "Agentic AI"]','};'],['// Research submission · Semantic Kernel','public async Task<string> Summarize(string paper)','{','    var result = await kernel.InvokePromptAsync(','        "Summarize the research: {{$paper}}",','        new() { ["paper"] = paper });','','    return result.ToString();','}'],['// Booking service · Spring Boot','@RestController','@RequestMapping("/api/rooms")','public class RoomController {','  private final RoomService service;','','  @GetMapping','  public List<Room> available() {','    return service.findAvailable();','  }','}']];
const code=texture(()=>{});
const codingMonitor=panel(2.05,1.16,-1.6,2.14,-2.38,code.tex);
box(.08,.35,.08,-1.6,1.58,-2.37);box(.55,.035,.28,-1.6,1.445,-2.3);

box(.87,.045,.29,-1.6,1.45,-1.62,mats.black);const keys=[];for(let i=0;i<12;i++)for(let j=0;j<4;j++)keys.push(box(.053,.012,.044,-2+i*.068,1.478,-1.72+j*.062,i%3?mats.metal:mats.gold));const mouse=ball(.075,-.84,1.48,-1.6,mats.ivory);mouse.scale.set(.7,.35,1);cyl(.09,.075,.2,-2.9,1.52,-2.05,mats.ivory);cyl(.075,.075,.005,-2.9,1.625,-2.05,mats.black);box(.46,.84,.67,.03,.45,-2.08,mats.black);box(.008,.69,.54,-.21,.47,-2.08,new T.MeshPhysicalMaterial({color:'#68bdda',transparent:true,opacity:.23,roughness:.1}));box(.32,.025,.02,.03,.85,-1.735,mats.glow);const fans=[];for(let y of [.25,.55]){const f=new T.Group();f.position.set(.03,y,-1.735);scene.add(f);for(let j=0;j<5;j++){const b=box(.018,.2,.015,0,0,0,mats.metal,f);b.rotation.z=j*Math.PI/5}fans.push(f)}
// Reference chair: white ergonomic frame, grey woven mesh, separate headrest,
// curved lumbar support, padded seat, adjustable black arm pads and five casters.
const chair=new T.Group();chair.position.set(-1.6,0,-.86);scene.add(chair);
const chairWhite=new T.MeshStandardMaterial({color:'#ebeff0',roughness:.38,metalness:.15});
const meshGrey=new T.MeshStandardMaterial({color:'#929b9e',roughness:.82,transparent:true,opacity:.72,side:T.DoubleSide});
const seatGrey=new T.MeshStandardMaterial({color:'#4b565b',roughness:.92});
cyl(.048,.055,.49,0,.4,0,mats.black,chair);cyl(.068,.075,.12,0,.18,0,mats.black,chair);
for(let i=0;i<5;i++){const a=i*Math.PI*2/5;line([0,.18,0],[Math.sin(a)*.43,.09,Math.cos(a)*.43],.032,chairWhite,chair);const wheel=cyl(.07,.07,.067,Math.sin(a)*.43,.073,Math.cos(a)*.43,mats.black,chair);wheel.rotation.z=Math.PI/2}
const seat=ball(.32,0,.725,-.035,seatGrey,chair);seat.scale.set(1.08,.28,1.05);
const back=new T.Group();back.position.set(0,1.12,.275);back.rotation.x=.08;chair.add(back);
// Mesh has actual gaps so the character and back support depth-test correctly.
function meshBack(width,height,parent){const curve=y=>.052*Math.cos(y/height*Math.PI*2);for(let y=-height/2;y<=height/2;y+=.012){line([-width/2,y,curve(y)],[width/2,y,curve(y)],.0025,meshGrey,parent)}for(let x=-width/2;x<=width/2;x+=.016){const points=[];for(let y=-height/2;y<=height/2+.001;y+=height/16)points.push(new T.Vector3(x,y,curve(y)));const m=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),16,.0015,3,false),meshGrey);parent.add(m)}for(let side of [-1,1]){const pts=[];for(let i=0;i<=12;i++){const y=-height/2+i*height/12;pts.push(new T.Vector3(side*width/2,y,curve(y)))}parent.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),16,.017,7,false),chairWhite))}for(let y of [-height/2,height/2])line([-width/2,y,curve(y)],[width/2,y,curve(y)],.017,chairWhite,parent)}
meshBack(.58,.7,back);
line([0,-.34,.09],[0,.31,.11],.023,chairWhite,back);for(let side of [-1,1]){line([0,-.22,.1],[side*.24,.18,.09],.024,chairWhite,back);line([0,-.2,.11],[side*.25,-.3,.08],.02,chairWhite,back)}
line([0,.76,.24],[0,1.1,.35],.029,chairWhite,chair);line([0,1.45,.32],[0,1.59,.34],.027,chairWhite,chair);
const headrest=new T.Group();headrest.position.set(0,1.62,.3);headrest.rotation.x=.13;chair.add(headrest);meshBack(.39,.2,headrest);
for(let x of [-.36,.36]){line([x,.76,.13],[x,1.045,-.03],.027,chairWhite,chair);const pad=ball(.11,x,1.06,-.04,mats.black,chair);pad.scale.set(.53,.22,1.6)}
line([.13,.65,0],[.34,.63,.05],.015,mats.black,chair);box(.09,.025,.08,.34,.63,.05,mats.black,chair);cyl(.048,.048,.065,0,.63,-.15,mats.black,chair);
const boardtex=texture((c,w,h)=>{c.fillStyle='#d1d0bd';c.fillRect(0,0,w,h);c.fillStyle='#344549';c.font='34px sans-serif';c.fillText('What if we made it simpler?',55,70);c.strokeStyle='#526263';c.lineWidth=4;for(let [x,y,s] of [[65,180,'CLIENT'],[385,180,'API'],[690,180,'DATA'],[385,400,'AGENT']]){c.strokeRect(x,y,230,100);c.font='27px monospace';c.fillText(s,x+35,y+60)}c.beginPath();c.moveTo(295,230);c.lineTo(385,230);c.moveTo(615,230);c.lineTo(690,230);c.moveTo(500,280);c.lineTo(500,400);c.stroke();c.fillStyle='#9a7658';c.font='22px monospace';c.fillText('build → learn → iterate',55,585)});panel(1.55,.9,-1.55,3.38,-3.22,boardtex.tex);
// A single floor-to-ceiling link shelf on the right, all navigation lives here.
const shelfMat=new T.MeshStandardMaterial({color:'#685140',roughness:.48});
box(3.35,3.85,.12,2.2,2.04,-3.19,mats.dark);
for(let x of [.48,3.92])box(.12,4.08,.66,x,2.05,-2.89,shelfMat);
for(let y of [.15,1.37,2.6,3.83]){box(3.55,.1,.72,2.2,y,-2.86,shelfMat);box(3.29,.018,.025,2.2,y-.053,-2.5,mats.glow)}
// Shelf fronts remain flush: no projecting landing boxes.
for(let x of [1.34,2.2,3.06])box(.065,3.68,.59,x,1.98,-2.9,shelfMat);
const shelfHeader=texture((c,w,h)=>{c.fillStyle='#1c2832';c.fillRect(0,0,w,h);c.fillStyle='#c9d9dc';c.font='36px monospace';c.textAlign='center';c.fillText('THE COLLECTION',w/2,90)},768,150);
panel(2.3,.42,2.2,4.17,-3.13,shelfHeader.tex);
const destinations={
About:{x:.91,y:3.22,label:'About me',n:'01',glyph:'S'},
Projects:{x:.91,y:1.99,label:'Projects',n:'02',glyph:'</>'},
Contact:{x:.91,y:.76,label:'Contact',n:'03',glyph:'@'},
Skills:{x:1.77,y:3.22,label:'Skills',n:'04',glyph:'{ }'},
Experience:{x:1.77,y:1.99,label:'Experience',n:'05',glyph:'↗'},
Resume:{x:1.77,y:.76,label:'Resume',n:'06',glyph:'CV'},
Education:{x:2.63,y:3.22,label:'Education',n:'07',glyph:'IIT'},
GitHub:{x:2.63,y:1.99,label:'GitHub',n:'08',glyph:'git'},
LinkedIn:{x:2.63,y:.76,label:'LinkedIn',n:'09',glyph:'in'}
};
// Fill down each column before moving right; the fourth column stays empty.
const shelfObjects=[];
for(const [key,d] of Object.entries(destinations)){
 d.high=d.y>1.8;d.rise=d.high?Math.ceil((d.y-1.35)/.25)*.25:0;
 d.target=[d.x,-1.83];d.point=[d.x,d.y,-2.507];
 const tex=texture((c,w,h)=>{c.fillStyle='#152631';c.fillRect(0,0,w,h);c.strokeStyle='#63aabe';c.lineWidth=3;c.strokeRect(12,12,w-24,h-24);c.textAlign='center';c.fillStyle='#a8dce5';c.font='76px sans-serif';c.fillText(d.glyph,w/2,128);c.fillStyle='#d0bb9c';c.font='42px sans-serif';c.fillText(d.label,w/2,213)},512,280);
 const object=panel(.65,.64,d.x,d.y,-2.57,tex.tex);d.object=object;shelfObjects.push(object);
 box(.68,.035,.29,d.x,d.y-.335,-2.75,mats.gold);
}
// Plant, lamp, analog clock and scattered desk objects.
const leaves=[];for(let [x,z,size] of [[4.25,1.6,1],[-4.1,-.25,.8]]){cyl(.22*size,.15*size,.4*size,x,.2*size,z,mats.ivory);for(let i=0;i<10;i++){const a=i*2.4;line([x,.3*size,z],[x+Math.sin(a)*.24*size,(.65+i*.05)*size,z+Math.cos(a)*.23*size],.012,mats.wood);const leaf=ball(.16,x+Math.sin(a)*.3*size,(.75+i*.05)*size,z+Math.cos(a)*.28*size,new T.MeshStandardMaterial({color:i%2?'#53674b':'#344b3b'}));leaf.scale.set(.45,1.6,.7);leaf.rotation.z=Math.sin(a)*.7;leaves.push(leaf)}}cyl(.23,.28,.05,-4.35,.04,-2.8,mats.black);cyl(.027,.027,2.8,-4.35,1.4,-2.8,mats.gold);cyl(.3,.45,.4,-4.35,2.92,-2.8,new T.MeshStandardMaterial({color:'#e4c399',emissive:'#9e642c',emissiveIntensity:.5}));
const clock=new T.Group();clock.position.set(-3.65,3.48,-3.23);scene.add(clock);const face=cyl(.24,.24,.045,0,0,0,mats.ivory,clock);face.rotation.x=Math.PI/2;const hour=box(.018,.13,.015,0,.055,.04,mats.black,clock),minute=box(.012,.19,.015,0,.075,.05,mats.black,clock);
box(.3,.018,.41,-2.48,1.438,-2.15,mats.ivory);for(let i=0;i<5;i++)box(.2,.002,.005,-2.48,1.45,-2.25+i*.04,mats.dark);box(.14,.018,.26,-.34,1.44,-1.58,mats.black);box(.11,.004,.21,-.34,1.452,-1.58,mats.glow);
// Humanoid: articulated segments driven by planted-foot two-bone IK.
const robot=new T.Group();scene.add(robot);let pos=new T.Vector3(-1.6,0,-.83),heading=Math.PI,hipHeight=.91;
// A human-inspired android: face, hair, rounded jacket, articulated hands and sneakers.
// Stylized likeness based on the supplied portrait: swept black hair, moustache,
// short beard, open black hoodie, pale football shirt with red trim, and blue jeans.
const skin=new T.MeshStandardMaterial({color:'#b98665',roughness:.62});
const hair=new T.MeshStandardMaterial({color:'#191c20',roughness:.86});
const fabric=new T.MeshStandardMaterial({color:'#13191f',roughness:.87});
const pants=new T.MeshStandardMaterial({color:'#244a70',roughness:.92});
const torso=new T.Group();robot.add(torso);
const chest=ball(.25,0,.23,0,fabric,torso);chest.scale.set(.94,1.28,.59);
const waist=ball(.19,0,-.005,0,pants,torso);waist.scale.set(1.04,.75,.7);
const shirt=new T.MeshStandardMaterial({color:'#dce3e6',roughness:.9});const red=new T.MeshStandardMaterial({color:'#da2640',roughness:.78});
const shirtPanel=ball(.2,0,.24,.093,shirt,torso);shirtPanel.scale.set(.78,1.43,.36);
for(let side of [-1,1]){const openJacket=ball(.12,side*.165,.235,.07,fabric,torso);openJacket.scale.set(.65,2.55,.7);line([side*.075,.48,.15],[side*.155,.05,.145],.008,mats.ivory,torso)}
const neckTrim=new T.Mesh(new T.TorusGeometry(.071,.009,8,24,Math.PI),red);neckTrim.position.set(0,.46,.15);neckTrim.rotation.z=Math.PI;torso.add(neckTrim);
box(.107,.015,.008,0,.28,.167,red,torso);box(.022,.13,.008,0,.22,.17,red,torso);for(let side of [-1,1])box(.015,.018,.008,side*.069,.192,.162,red,torso);
const crest=cyl(.024,.024,.008,-.071,.374,.155,red,torso);crest.rotation.x=Math.PI/2;
const hood=ball(.145,0,.43,-.08,fabric,torso);hood.scale.set(1.35,.65,.67);

cyl(.065,.075,.12,0,.51,0,skin,torso);
const head=new T.Group();head.position.y=.665;torso.add(head);
const skull=ball(.163,0,0,0,skin,head);skull.scale.set(.84,1.24,.91);
const jaw=ball(.104,0,-.087,.029,skin,head);jaw.scale.set(1,.8,.9);
const hairCap=new T.Mesh(new T.SphereGeometry(.169,24,16,0,Math.PI*2,0,Math.PI*.56),hair);hairCap.position.y=.044;hairCap.scale.set(.91,1.08,1);head.add(hairCap);
for(let i=0;i<10;i++){const tuft=ball(.047,-.115+i*.024,.16+Math.sin(i*.43)*.035,.065,hair,head);tuft.scale.set(.65,1.35,1);tuft.rotation.z=-.45}
// Moustache and close-cropped beard follow the lower face, with the lips exposed.
for(let side of [-1,1]){const stache=ball(.037,side*.026,-.052,.143,hair,head);stache.scale.set(1,.33,.28);stache.rotation.z=side*.16;const cheek=ball(.058,side*.075,-.095,.085,hair,head);cheek.scale.set(.43,1.05,.48)}
const beard=ball(.079,0,-.143,.057,hair,head);beard.scale.set(1,.65,.9);
for(let x of [-.058,.058]){const eye=ball(.022,x,.018,.134,mats.ivory,head);eye.scale.set(1,.57,.43);ball(.009,x,.018,.146,mats.black,head);const brow=box(.047,.009,.012,x,.05,.14,hair,head);brow.rotation.z=x>0?-.07:.07;ball(.025,Math.sign(x)*.146,-.005,0,skin,head)}
const nose=ball(.027,0,-.015,.146,skin,head);nose.scale.set(.55,1.2,1.05);
box(.046,.007,.006,0,-.076,.129,new T.MeshStandardMaterial({color:'#624636'}),head);
// Subtle android temple details retain the original character concept.
box(.024,.04,.017,-.137,.036,.025,mats.metal,head);box(.005,.023,.019,-.151,.036,.025,mats.glow,head);
const limbs=[];for(let side of [-1,1]){const hip=ball(.075,0,0,0,pants,robot),knee=ball(.065,0,0,0,pants,robot),thigh=cyl(.089,.073,.4,0,0,0,pants,robot),shin=cyl(.07,.048,.4,0,0,0,pants,robot),foot=box(.145,.09,.27,0,0,0,mats.ivory,robot);box(.146,.027,.28,0,-.04,0,mats.dark,foot);box(.1,.012,.075,0,.048,.022,mats.dark,foot);limbs.push({side,hip,knee,thigh,shin,foot})}
const arms=[];for(let side of [-1,1]){const shoulder=new T.Group();shoulder.position.set(side*.235,.38,0);torso.add(shoulder);ball(.082,0,0,0,fabric,shoulder);cyl(.073,.054,.28,0,-.16,0,fabric,shoulder);const elbow=new T.Group();elbow.position.y=-.31;shoulder.add(elbow);ball(.055,0,0,0,fabric,elbow);cyl(.051,.034,.26,0,-.14,0,fabric,elbow);const hand=ball(.05,0,-.3,0,skin,elbow);hand.scale.set(.8,1.3,.5);for(let j=0;j<4;j++){const finger=cyl(.009,.007,.062,-.026+j*.018,-.357,.007,skin,elbow);finger.rotation.x=-.15}ball(.015,side*.04,-.301,.013,skin,elbow);if(side===1)cyl(.039,.039,.025,0,-.267,0,red,elbow);arms.push({side,shoulder,elbow,hand})}
function segment(mesh,a,b){mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=a.distanceTo(b)/.4;mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize())}
function solveLeg(l,foot,hipY){const a=new T.Vector3(l.side*.13,hipY,0),b=new T.Vector3(l.side*.14,foot.y,foot.z),d=b.clone().sub(a),len=Math.min(d.length(),.815),mid=a.clone().add(b).multiplyScalar(.5),bend=new T.Vector3(0,-d.z,d.y).normalize().negate();const k=mid.add(bend.multiplyScalar(Math.sqrt(Math.max(0,.415*.415-len*len/4))));l.hip.position.copy(a);l.knee.position.copy(k);segment(l.thigh,a,k);segment(l.shin,k,b);l.foot.position.copy(b);l.foot.position.z+=.065}
// The cat is the room's navigation character. Its paws and body share one
// locomotion clock, while its face, ears and tail move on separate cycles.
const fur=new T.MeshStandardMaterial({color:'#ecebe5',roughness:.96}),furLight=new T.MeshStandardMaterial({color:'#fffdf4',roughness:1}),furStripe=new T.MeshStandardMaterial({color:'#c9cbc7',roughness:.96});
const CAT_SCALE=.62;const cat=new T.Group();cat.scale.setScalar(CAT_SCALE);scene.add(cat);
const catBody=new T.Group();cat.add(catBody);
const catTorso=ball(.27,0,.33,0,fur,catBody);catTorso.scale.set(.64,.56,1.26);
const bib=ball(.16,0,.28,.22,furLight,catBody);bib.scale.set(.65,.78,.55);
for(const side of [-1,1]){const haunch=ball(.105,side*.12,.285,-.205,fur,catBody);haunch.scale.set(.83,1.25,1.06);const shoulder=ball(.08,side*.13,.32,.17,fur,catBody);shoulder.scale.set(.85,1.25,.85)}
const catNeck=ball(.12,0,.355,.23,fur,catBody);catNeck.scale.set(.8,.9,1);
const catHead=new T.Group();catHead.position.set(0,.42,.36);catBody.add(catHead);
const catSkull=ball(.145,0,0,0,fur,catHead);catSkull.scale.set(1.02,.9,1.02);
for(const side of [-1,1]){const cheek=ball(.072,side*.072,-.06,.07,furLight,catHead);cheek.scale.set(1.05,.78,.65)}
const catNose=new T.Mesh(new T.ConeGeometry(.028,.03,3),new T.MeshStandardMaterial({color:'#df9ea7',roughness:.7}));catNose.rotation.x=Math.PI;catNose.position.set(0,-.045,.153);catHead.add(catNose);
line([0,-.061,.155],[0,-.079,.155],.003,furStripe,catHead);
for(const side of [-1,1]){line([0,-.079,.155],[side*.035,-.086,.146],.0027,furStripe,catHead);for(let i=0;i<3;i++)line([side*.085,-.05+i*.018,.123],[side*.23,-.085+i*.047,.17],.0009,mats.ivory,catHead)}
const catEyes=[],catPupils=[],catEars=[];
for(const side of [-1,1]){
 const ear=new T.Group();ear.position.set(side*.112,.103,-.018);catHead.add(ear);const outer=new T.Mesh(new T.ConeGeometry(.072,.15,5),fur);outer.position.y=.064;outer.rotation.z=-side*.16;ear.add(outer);const inner=new T.Mesh(new T.ConeGeometry(.041,.09,5),new T.MeshStandardMaterial({color:'#e5b1b7',roughness:1}));inner.position.set(0,.06,.035);inner.rotation.z=-side*.16;ear.add(inner);catEars.push(ear);
 const eye=ball(.039,side*.065,.014,.122,new T.MeshStandardMaterial({color:'#92beb0',roughness:.24}),catHead);eye.scale.set(1,.74,.38);catEyes.push(eye);
 const pupil=ball(.014,side*.065,.014,.137,mats.black,catHead);pupil.scale.set(.45,1.6,.42);catPupils.push(pupil);const glint=ball(.007,side*.065-.012,.026,.139,mats.ivory,catHead);glint.scale.z=.35;
}
const catTail=[],tailTip=ball(.048,0,.44,-.53,fur,catBody);tailTip.scale.set(.7,1.3,.7);
for(let i=0;i<6;i++)catTail.push(cyl(.043-i*.004,.047-i*.004,.4,0,0,0,fur,catBody));
const catLegs=[];
for(const front of [true,false])for(const side of [-1,1]){
 const upper=cyl(.041,.034,.4,0,0,0,fur,catBody),lower=cyl(.03,.025,.4,0,0,0,front?fur:furLight,catBody);
 const paw=ball(.058,side*.14,.06,front?.22:-.21,furLight,catBody);paw.scale.set(.85,.55,1.15);
 catLegs.push({front,side,upper,lower,paw});
}
// Dense tapered fibres follow the body surface; instancing keeps the fur inexpensive.
function addFur(parent,radius,count,length){const hairGeo=new T.ConeGeometry(.0012,1,3,1),hairMat=new T.MeshStandardMaterial({color:'#faf9f3',roughness:1});const strands=new T.InstancedMesh(hairGeo,hairMat,count);const dummy=new T.Object3D(),up=new T.Vector3(0,1,0),normal=new T.Vector3();let seed=173;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};for(let i=0;i<count;i++){const y=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-y*y);normal.set(r*Math.cos(a),y,r*Math.sin(a));const h=length*(.45+random()*.65);dummy.position.copy(normal).multiplyScalar(radius+h*.37);dummy.quaternion.setFromUnitVectors(up,normal);dummy.scale.set(.55+random()*.5,h,.55+random()*.5);dummy.updateMatrix();strands.setMatrixAt(i,dummy.matrix);const tint=.88+random()*.1;strands.setColorAt(i,new T.Color().setRGB(tint,tint,tint*.98))}strands.instanceMatrix.needsUpdate=true;strands.frustumCulled=false;parent.add(strands);return strands}
const bodyFur=addFur(catTorso,.27,6500,.052),faceFur=addFur(catSkull,.145,1800,.018),chestFur=addFur(bib,.16,900,.043);
const cheekFur=[];for(const side of [-1,1]){const ruff=ball(.085,side*.106,-.032,.006,fur,catHead);ruff.scale.set(.62,.95,.85);cheekFur.push(addFur(ruff,.085,420,.027))}
// Tear-line rims, layered irises and small catchlights give the eyes depth.
const lids=[],catIrides=[];for(let i=0;i<2;i++){const side=i?1:-1;const rim=new T.Mesh(new T.TorusGeometry(.037,.0022,6,32),new T.MeshStandardMaterial({color:'#777d73',roughness:.65}));rim.position.set(side*.065,.014,.132);rim.scale.y=.74;catHead.add(rim);const lid=ball(.041,side*.065,.014,.15,fur,catHead);lid.scale.set(1,.05,.4);lids.push(lid);const iris=new T.Mesh(new T.RingGeometry(.012,.029,32),new T.MeshStandardMaterial({color:'#aac780',roughness:.38}));iris.position.set(side*.065,.014,.138);iris.scale.y=.84;catHead.add(iris);catIrides.push(iris)}
// A stitched football with twelve dark pentagonal panels on a leather shell.
const football=new T.Group();scene.add(football);const ballRadius=.17;
ball(ballRadius,0,0,0,new T.MeshStandardMaterial({color:'#e8e8df',roughness:.78}),football);
const pentagon=new T.CircleGeometry(.066,5);const pentPos=pentagon.attributes.position;for(let i=0;i<pentPos.count;i++)pentPos.setZ(i,Math.sqrt(.171*.171-pentPos.getX(i)**2-pentPos.getY(i)**2));pentagon.computeVertexNormals();const patchMat=new T.MeshStandardMaterial({color:'#202a2c',roughness:.82});
const phi=(1+Math.sqrt(5))/2;for(const v of [[0,1,phi],[0,-1,phi],[0,1,-phi],[0,-1,-phi],[1,phi,0],[-1,phi,0],[1,-phi,0],[-1,-phi,0],[phi,0,1],[-phi,0,1],[phi,0,-1],[-phi,0,-1]]){const n=new T.Vector3(...v).normalize();const patch=new T.Mesh(pentagon,patchMat);patch.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),n);football.add(patch)}
football.position.set(-1.6,ballRadius,-.19);
let developerYaw=Math.PI,footballClock=0,footballActive=false;
const passHome=new T.Vector3(-1.6,ballRadius,-.19),passAway=new T.Vector3(-.55,ballRadius,.61);
function startFootball(){footballClock=0;footballActive=true;catExpression='playful';catSetState('FOOTBALL');$('#status').textContent='A quick football break · Sagar ↔ cat'}
function updateFootball(dt){if(!footballActive)return;footballClock+=dt;const cycle=footballClock%5.2;let t=0;if(cycle>=.8&&cycle<2.4)t=T.MathUtils.smoothstep((cycle-.8)/1.6,0,1);else if(cycle>=2.4&&cycle<3)t=1;else if(cycle>=3&&cycle<4.7)t=1-T.MathUtils.smoothstep((cycle-3)/1.7,0,1);const before=football.position.clone();football.position.lerpVectors(passHome,passAway,t);const travel=football.position.clone().sub(before);if(travel.lengthSq()>0){const axis=new T.Vector3(travel.z,0,-travel.x).normalize();football.rotateOnWorldAxis(axis,travel.length()/ballRadius)}catHeading=Math.atan2(football.position.x-catPos.x,football.position.z-catPos.z);if(footballClock>10.4||catQueued&&cycle>4.8){football.position.copy(passHome);footballActive=false;catFinishVisit()}}

// A vacant chair gives the cat a safe resting place without interrupting the developer.
const guestChair=chair.clone(true);guestChair.position.set(-3.55,0,1.12);guestChair.rotation.y=.12;scene.add(guestChair);
function catBone(mesh,a,b){mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=a.distanceTo(b)/.4;mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize())}
let catPos=new T.Vector3(-2.6,0,.65),catHeading=.55,catState='IDLE',catClock=0,catDistance=0,catSpeed=0,catRoute=[],catWaypoint=0,catGoal=null,catQueued=null,catRoamIndex=0,catWait=0;
let catRoutePurpose='ROAM',catSequence='LINK',jumpPlan=[],jumpFrom=new T.Vector3(),jumpTo=new T.Vector3(),jumpDuration=.8,jumpVelocity=0,jumpArc=0,flightClock=0,landContinuation='',catExpression='relaxed';
const gravity=9.81,axisY=new T.Vector3(0,1,0),roamSpots=[[-2.7,.35],[-1.7,1.6],[-.7,.5],[-2.5,1.9],[-3.65,.05]];
catLegs.forEach(l=>{l.planted=new T.Vector3();l.swingFrom=new T.Vector3();l.swingTo=new T.Vector3();l.swinging=false;l.anchored=false});
function catSetState(next){catState=next;catClock=0;catLegs.forEach(l=>l.anchored=false)}
function catWalkTo(x,z,stateName='WALK',purpose='LINK'){const raw=pathTo(x,z,catPos);if(!raw)return false;catRoute=raw.filter((p,i,a)=>i===a.length-1||i===0||!p.clone().sub(a[i-1]).normalize().equals(a[i+1].clone().sub(p).normalize()));catWaypoint=0;catRoutePurpose=purpose;catSetState(stateName);return true}
function catNavigate(key){catGoal=key;catExpression='curious';if(!catWalkTo(destinations[key].x,-2.07)){$('#status').textContent='The cat cannot reach that shelf item';catGoal=null;catSetState('IDLE');return}$('#status').textContent='The cat is going to '+destinations[key].label}
function catRequest(key){if(catState==='READING'){catQueued=key;if(panelEl.open)panelEl.close();return}if(['IDLE','ROAM','SNIFF','STRETCH','SIT','LOOK','AFFECTION'].includes(catState)&&catPos.y===0||catState==='WALK'&&catPos.y===0){catQueued=null;catNavigate(key);return}catQueued=key;$('#status').textContent='The cat will visit '+destinations[key].label+' next'}
function beginJumpSequence(points,purpose){jumpPlan=points.map(p=>new T.Vector3(...p));catSequence=purpose;prepareNextJump()}
function prepareNextJump(){jumpFrom.copy(catPos);jumpTo.copy(jumpPlan.shift());const rise=jumpTo.y-jumpFrom.y;const clearance=['LINK','RETURN'].includes(catSequence)?.32:rise>1?.23:rise>.2?.2:.12;jumpVelocity=Math.sqrt(2*gravity*(Math.max(rise,0)+clearance));jumpDuration=(jumpVelocity+Math.sqrt(jumpVelocity*jumpVelocity-2*gravity*rise))/gravity;flightClock=0;catExpression=rise<0?'cautious':'excited';catSetState('NOTICE')}
// Stand on the supporting board at the box's base, beside its front face.
const shelfTops=[.2,1.42,2.65],shelfLandingZ=-2.66,shelfClearZ=-2.14;
function catStartClimb(){const d=destinations[catGoal],row=Math.round((d.y-.76)/1.23);beginJumpSequence(shelfTops.slice(0,row+1).map(y=>[d.x,y,shelfLandingZ]),'LINK')}
function catStartDown(){if(catPos.y>.05){const points=shelfTops.filter(y=>y<catPos.y-.1).reverse().map(y=>[catPos.x,y,shelfLandingZ]);points.push([catPos.x,0,-1.65]);beginJumpSequence(points,'RETURN')}else catFinishVisit()}
// Depart outward before rising past the next board; approach its top only after
// every paw is above it. The vertical flight remains gravity-driven.
function shelfFlightZ(u,y){
 const out=T.MathUtils.smoothstep(u,0,.22),entry=T.MathUtils.smoothstep(u,.72,1);
 if(jumpTo.y===0)return T.MathUtils.lerp(jumpFrom.z,jumpTo.z,T.MathUtils.smoothstep(u,0,.62));
 if(u<.4)return T.MathUtils.lerp(jumpFrom.z,shelfClearZ,out);
 const clear=y>=jumpTo.y+.025||u>.98;
 return T.MathUtils.lerp(shelfClearZ,jumpTo.z,clear?entry:0);
}
// A contact ripple appears exactly where the paw touches the box.
const tapFeedback=new T.Group();scene.add(tapFeedback);tapFeedback.visible=false;
const tapRings=[0,1].map(()=>{const mesh=new T.Mesh(new T.RingGeometry(.031,.039,40),new T.MeshBasicMaterial({color:'#b9f4ee',transparent:true,opacity:0,depthWrite:false}));tapFeedback.add(mesh);return mesh});
function updateTapFeedback(){const active=catState==='TOUCH'&&catClock>=.78&&catClock<1.45&&catGoal;tapFeedback.visible=!!active;if(!active)return;const d=destinations[catGoal];tapFeedback.position.set(d.x+.136,d.y-.28,-2.493);tapRings.forEach((ring,i)=>{const t=T.MathUtils.clamp((catClock-.78-i*.13)/.54,0,1);ring.scale.setScalar(1+t*3.5);ring.material.opacity=t>0?(1-t)*.95:0})}
function catFinishVisit(){catGoal=null;catSetState('IDLE');catWait=0;catExpression='relaxed';if(catQueued){const next=catQueued;catQueued=null;catNavigate(next)}else $('#status').textContent='Sagar is coding · the cat is exploring'}
function finishJumpSequence(){if(catQueued){if(catPos.y>.05)catStartDown();else catFinishVisit();return}if(catSequence==='LINK')catSetState('TOUCH');else catFinishVisit()}
function idleCatAction(){catWait=0;const n=catRoamIndex++%12;catGoal=null;if(n===0){catExpression='curious';catWalkTo(-3.95,-1.05,'ROAM','DESK')}else if(n===2){catExpression='playful';catSetState('STRETCH')}else if(n===4){catWalkTo(-.39,.75,'ROAM','FOOTBALL')}else if(n===6){catWalkTo(-1.6,.35,'ROAM','LAP')}else if(n===8){catWalkTo(-2.6,1.05,'ROAM','CHAIR')}else if(n===10){catExpression='relaxed';catSetState('SIT')}else{catExpression='curious';const [x,z]=roamSpots[n%roamSpots.length];catWalkTo(x,z,'ROAM','ROAM')}}
function updateCat(dt,time){
 catClock+=dt;catWait+=dt;updateFootball(dt);
 if(catState==='IDLE'&&catWait>4.5&&!reduced)idleCatAction();
 const walking=catState==='WALK'||catState==='ROAM';
 if(walking){const target=catRoute[catWaypoint];if(target){const delta=target.clone().sub(catPos),distance=delta.length(),toward=Math.atan2(delta.x,delta.z),turn=Math.atan2(Math.sin(toward-catHeading),Math.cos(toward-catHeading));catHeading+=T.MathUtils.clamp(turn,-dt*3.3,dt*3.3);const final=catWaypoint===catRoute.length-1;let desired=Math.min(catGoal?.65:.4,final?distance*2.5:.75);if(Math.abs(turn)>.55)desired*=Math.max(0,1-Math.abs(turn)/1.35);catSpeed=T.MathUtils.lerp(catSpeed,desired,Math.min(1,dt*5));const moved=Math.min(distance,catSpeed*dt);catPos.addScaledVector(delta.normalize(),moved);catDistance+=moved/CAT_SCALE;if(distance<.025)catWaypoint++}else{catSpeed=0;if(catRoutePurpose==='LINK'){catStartClimb()}else if(catRoutePurpose==='CHAIR'){beginJumpSequence([[-3.55,.81,1.06],[-2.6,0,1.05]],'CHAIR')}else if(catRoutePurpose==='GAP'){beginJumpSequence([[catPos.x+.55,0,catPos.z]],'GAP')}else if(catRoutePurpose==='DESK'){beginJumpSequence([[-3.12,1.41,-1.59],[-3.04,1.41,-1.59],[-3.95,0,-1.05]],'DESK')}else if(catRoutePurpose==='LAP'){beginJumpSequence([[-1.6,.9,-.48],[-1.6,0,.35]],'LAP')}else if(catRoutePurpose==='FOOTBALL'){startFootball()}else if(catRoutePurpose==='CALL'){catExpression='affectionate';catSetState('AFFECTION')}else{catExpression='curious';catSetState('SNIFF')}}}
 if(catState==='NOTICE'){const delta=jumpTo.clone().sub(catPos);if(Math.hypot(delta.x,delta.z)>.07){const goal=Math.atan2(delta.x,delta.z);catHeading+=Math.atan2(Math.sin(goal-catHeading),Math.cos(goal-catHeading))*Math.min(1,dt*6)}if(catClock>.28)catSetState('CROUCH')}
 if(catState==='CROUCH'&&catClock>.38)catSetState('PUSH_OFF');
 if(catState==='PUSH_OFF'&&catClock>.09){flightClock=0;catSetState('JUMP')}
 if(catState==='JUMP'){
 flightClock=Math.min(jumpDuration,flightClock+dt);const u=flightClock/jumpDuration;
 catPos.x=T.MathUtils.lerp(jumpFrom.x,jumpTo.x,u);catPos.z=T.MathUtils.lerp(jumpFrom.z,jumpTo.z,u);
 catPos.y=jumpFrom.y+jumpVelocity*flightClock-.5*gravity*flightClock*flightClock;
 if(['LINK','RETURN'].includes(catSequence))catPos.z=shelfFlightZ(u,catPos.y);
 if(jumpTo.y>0&&['LINK','RETURN'].includes(catSequence)&&u>.4)catHeading+=Math.atan2(Math.sin(Math.PI/2-catHeading),Math.cos(Math.PI/2-catHeading))*Math.min(1,dt*12);
 if(flightClock>=jumpDuration){catPos.copy(jumpTo);catExpression='relaxed';catSetState('LANDING')}
 }
 if(catState==='LANDING'&&catClock>.3){if(jumpPlan.length)catSetState('PERCH');else finishJumpSequence()}
 if(catState==='PERCH'&&catClock>(catSequence==='LAP'?7:catSequence==='DESK'?3.5:catSequence==='CHAIR'?2.8:.6))prepareNextJump();
 if(catState==='TOUCH'){catHeading+=Math.atan2(Math.sin(Math.PI/2-catHeading),Math.cos(Math.PI/2-catHeading))*Math.min(1,dt*8);catExpression='curious';if(catClock>1.45){if(catQueued)catStartDown();else{$('#content').innerHTML=content[catGoal];if(!panelEl.open)panelEl.show();catSetState('READING');$('#status').textContent='The cat tapped '+destinations[catGoal].label}}}
 updateTapFeedback();
 if(catState==='LOOK'&&catClock>.65)catExpression='curious';
 if(['SNIFF','STRETCH','SIT','LOOK','AFFECTION'].includes(catState)&&catClock>(catState==='SIT'?4:2.4)){
 if(catState==='STRETCH'&&catPos.y===0&&!reduced){const forward=new T.Vector3(Math.sin(catHeading)*.58,0,Math.cos(catHeading)*.58).add(catPos);const safe=pathTo(forward.x,forward.z,catPos);if(safe&&safe.length<6){beginJumpSequence([[forward.x,0,forward.z]],'POUNCE')}else{catSetState('IDLE');catWait=0}}
 else{catSetState('IDLE');catWait=0}
 }
 if(catState==='PERCH'){catExpression=catSequence==='LAP'?'affectionate':catSequence==='DESK'?'playful':'relaxed';const wanted=catSequence==='LAP'?0:catSequence==='LINK'?Math.PI/2:catHeading;catHeading+=Math.atan2(Math.sin(wanted-catHeading),Math.cos(wanted-catHeading))*Math.min(1,dt*4)}
 cat.position.copy(catPos);cat.rotation.y=catHeading;
 const jump=catState==='JUMP',flight=jump?flightClock/jumpDuration:0,pre=catState==='CROUCH'?T.MathUtils.smoothstep(catClock,0,.38):catState==='PUSH_OFF'?1-T.MathUtils.smoothstep(catClock,0,.09):0;
 const landing=catState==='LANDING'?Math.sin(Math.min(1,catClock/.3)*Math.PI):0;
 const sitting=catState==='SIT'||catState==='PERCH'&&['CHAIR','LAP'].includes(catSequence);
 const stretch=catState==='STRETCH'?Math.sin(Math.min(1,catClock/2.4)*Math.PI):0;
 catBody.position.y=-pre*.105-landing*.08-stretch*.025+(walking?Math.sin(catDistance/.54*Math.PI*4)*.006:Math.sin(time*1.9)*.003);
 catBody.rotation.x=jump?T.MathUtils.lerp(-.18,.22,flight):pre*.09+landing*.06+stretch*.13;
 catBody.rotation.z=pre?Math.sin(catClock*20)*.015:walking?Math.sin(catDistance/.54*Math.PI*2)*.014:0;
 catTorso.rotation.x=T.MathUtils.lerp(catTorso.rotation.x,sitting?-.43:0,dt*5);
 catTorso.position.y=T.MathUtils.lerp(catTorso.position.y,sitting?.29:.33,dt*5);
 catHead.position.y=T.MathUtils.lerp(catHead.position.y,sitting?.49:catState==='SNIFF'?.32:.42,dt*5);
 catHead.rotation.x=catState==='SNIFF'?.23:catState==='NOTICE'?-.17:jump?-.08:0;
 catHead.rotation.y=['SNIFF','IDLE','LOOK','PERCH'].includes(catState)?Math.sin(time*.7)*.17:0; if(catState==='TOUCH'&&catPos.y>.1){catHead.rotation.y=-.55;catHead.rotation.x=-.08;}if(catState==='PERCH'&&catSequence==='LAP')catHead.rotation.x=-.18; if(catState==='PERCH'&&catSequence==='DESK')catHead.rotation.x=.15+Math.sin(catClock*2)*.1;
 catHead.rotation.z=catState==='AFFECTION'?Math.sin(catClock*2.5)*.15:catState==='READING'?Math.sin(time*.6)*.045:0;
 const blink=reduced?1:Math.sin(time*1.09)>.996?.09:1;
 lids.forEach(l=>{l.visible=blink<.5;l.scale.y=.85});catIrides.forEach(iris=>iris.scale.y=.84*blink);catEyes.forEach((eye,i)=>{eye.scale.y=(catExpression==='relaxed'?.57:.74)*blink;catPupils[i].scale.y=1.6*blink;catPupils[i].scale.x=(catExpression==='excited'||catExpression==='surprised')?.72:.4;catEars[i].rotation.z=(i?1:-1)*(catExpression==='cautious'?.2:.025)+(Math.sin(time*1.7+i)> .94?Math.sin(time*11)*.045:0)});
 // Four-beat gait. A planted paw stays at a world-space contact point until lift-off.
 for(let i=0;i<catLegs.length;i++){
 const leg=catLegs[i],baseZ=leg.front?.22:-.2,cycle=(catDistance/.54+[0,.5,.75,.25][i])%1;
 const groundPoint=(forward=0)=>new T.Vector3(leg.side*.13,.032,baseZ+forward).multiplyScalar(CAT_SCALE).applyAxisAngle(axisY,catHeading).add(catPos);
 if(!leg.anchored){leg.planted.copy(groundPoint());leg.swinging=false;leg.anchored=true}
 let foot=new T.Vector3(leg.side*.13,.032,baseZ);
 if(walking&&catSpeed>.05){if(cycle>=.68){if(!leg.swinging){leg.swingFrom.copy(leg.planted);leg.swingTo.copy(groundPoint(.15));leg.swinging=true}const u=(cycle-.68)/.32;leg.planted.lerpVectors(leg.swingFrom,leg.swingTo,T.MathUtils.smoothstep(u,0,1));leg.planted.y=catPos.y+CAT_SCALE*(.032+Math.sin(u*Math.PI)*.055)}else leg.swinging=false;foot.copy(leg.planted).sub(catPos).divideScalar(CAT_SCALE).applyAxisAngle(axisY,-catHeading);if(Math.abs(foot.z-baseZ)>.25){leg.planted.copy(groundPoint());foot.set(leg.side*.13,.032,baseZ)}}
 if(jump){const tuck=Math.sin(flight*Math.PI);foot.y+=tuck*(leg.front?.13:.16);foot.z+=leg.front?(flight>.65?.13:-.06*tuck):-.04*tuck}
 if(catState==='LANDING'&&!leg.front&&catClock<.08)foot.y+=(1-catClock/.08)*.07;
 if(stretch&&leg.front)foot.z+=stretch*.11;
 if(catState==='FOOTBALL'&&leg.front&&leg.side===1){const phase=footballClock%5.2;const tap=Math.max(0,1-Math.abs(phase-3)/.32);foot.z+=tap*.15;foot.y+=tap*.08}
 if(catState==='PERCH'&&catSequence==='DESK'&&leg.front&&leg.side===1){const tap=Math.max(0,Math.sin(catClock*3));foot.z+=tap*.07;foot.y+=tap*.06}
 if(catState==='PERCH'&&catSequence==='LAP'&&leg.front){foot.y+=Math.max(0,Math.sin(catClock*3+leg.side*Math.PI/2))*.012}
 if(sitting&&!leg.front){foot.z-=.06;foot.x*=1.12}
 if(catState==='TOUCH'&&leg.front&&leg.side===-1){
 const d=destinations[catGoal],reach=T.MathUtils.smoothstep(catClock,.25,.78)*(1-T.MathUtils.smoothstep(catClock,1.02,1.36));
 const target=new T.Vector3(d.x+.136,d.y-.28,-2.50).sub(catPos).divideScalar(CAT_SCALE).applyAxisAngle(axisY,-catHeading);
 foot.lerp(target,reach);
 }

 // Convert contact points to the subtly moving torso frame before solving the limbs.
 foot.sub(catBody.position).applyQuaternion(catBody.quaternion.clone().invert());leg.paw.position.copy(foot);leg.paw.quaternion.copy(catBody.quaternion).invert();
 const hip=new T.Vector3(leg.side*.14,.3,baseZ),difference=foot.clone().sub(hip),dist=Math.min(.345,difference.length()),mid=hip.clone().add(foot).multiplyScalar(.5),bend=Math.sqrt(Math.max(0,.18*.18-dist*dist/4));mid.z+=leg.front?-bend:bend;catBone(leg.upper,hip,mid);catBone(leg.lower,mid,foot);
 }
 let previous=new T.Vector3(0,.36,-.35);for(let i=0;i<catTail.length;i++){const t=(i+1)/catTail.length,calm=catState==='SIT'||catState==='READING',wave=reduced?0:Math.sin(time*(calm?.65:1.4)+i*.45);const next=new T.Vector3(wave*(.035+t*(calm?.06:.12)),.36+t*(catState==='AFFECTION'?.42:.28)+(jump?Math.sin(flight*Math.PI)*t*.1:0),-.35-t*(catPos.y>0&&['LINK','RETURN'].includes(catSequence)?.15:.37));catBone(catTail[i],previous,next);previous=next}tailTip.position.copy(previous);
}
for(const [key,d]of Object.entries(destinations)){const b=document.createElement('button');b.className='hotspot';b.innerHTML=`<span class=full-label>${d.label}</span><span class=short-label>${({About:'About',Experience:'Work',Education:'Study'})[key]||d.label}</span>`;b.setAttribute('aria-label','Explore '+d.label);b.onclick=e=>{if(e.detail===0||hitShelf(e.clientX,e.clientY)===key)catRequest(key)};b.onpointerenter=()=>hovered=key;b.onpointerleave=()=>hovered=null;$('#hotspots').append(b);d.button=b}
let hovered=null;const picker=new T.Raycaster(),pointer=new T.Vector2();
function hitShelf(x,y){pointer.set(x/innerWidth*2-1,1-y/innerHeight*2);picker.setFromCamera(pointer,camera);const hits=picker.intersectObjects(scene.children,true);for(const hit of hits){if(hit.object.material?.transparent&&hit.object.material.opacity<.3)continue;let parent=hit.object;while(parent){for(const [key,d]of Object.entries(destinations))if(parent===d.object)return key;parent=parent.parent}return null}return null}
const content={Projects:`<div class="kicker">01 / SELECTED WORK</div><h2>Ideas, shipped.</h2><div class="project"><h3>Faculty Recruitment Portal</h3><p>A complete application and review workflow built at IIT Patna. Multi-section forms, autosave, secure access and PDF previews.</p><div class="tags">NEXT.JS · TYPESCRIPT · POSTGRESQL · PRISMA</div></div><div class="project"><h3>CodeFossil</h3><p>A marketplace connecting developers and clients, with separate dashboards, project discovery and order management.</p><div class="tags">REACT · NODE.JS · MONGODB</div></div><div class="project"><h3>Multimodal Local Chat</h3><p>A local AI assistant that works with text, voice, images and documents, using retrieval to ground its answers.</p><div class="tags">PYTHON · LANGCHAIN · WHISPER · CHROMADB</div></div>`,About:`<div class="kicker">02 / THE PERSON BEHIND THE CODE</div><h2>Hi, I’m Sagar.</h2><p>A software engineer from Raiganj, now based in Bangalore. I studied Computer Science and Engineering at IIT Patna.</p><p>I enjoy turning complex problems into useful software — from backend systems and full-stack applications to agentic AI.</p><div class="project"><h3>Beyond the keyboard</h3><p>You’ll find me playing football, badminton, or thinking a few moves ahead over a chessboard.</p></div><div class="project"><h3>Experience</h3><p>Digital Specialist Engineer · Infosys<br>Previously Graduate Engineer Trainee · Larsen & Toubro</p></div>`,Education:`<div class="kicker">03 / FOUNDATIONS</div><h2>IIT Patna</h2><p>Bachelor of Technology<br>Computer Science and Engineering<br>Graduated May 2025</p><div class="project"><h3>Learning by building</h3><p>Faculty Recruitment Portal — final-year project supervised by Prof. Samrat Mondal. Frontend development with Next.js, React and TypeScript.</p></div>`,Skills:`<div class="kicker">04 / MY TOOLKIT</div><h2>Tools for the idea.</h2><div class="project"><h3>Backend & systems</h3><p>Java · Spring Boot · C# · ASP.NET Core · Node.js · REST APIs · SQL Server · PostgreSQL</p></div><div class="project"><h3>Frontend</h3><p>React · Next.js · Angular · TypeScript · Tailwind CSS</p></div><div class="project"><h3>AI & engineering</h3><p>Semantic Kernel · LangChain · Python · Retrieval-augmented generation · System design · Git</p></div>`,Contact:`<div class="kicker">05 / LET’S CONNECT</div><h2>Good things start<br>with a conversation.</h2><p>I’m interested in backend and full-stack engineering opportunities, thoughtful products, and useful applications of AI.</p><div class="project"><h3>Bangalore, India</h3><p>Contact links will appear here once Sagar adds his preferred email, GitHub and LinkedIn addresses.</p></div>`};
content.Experience=`<div class="kicker">05 / EXPERIENCE</div><h2>Learning. Building. Growing.</h2><div class="project"><h3>Infosys · Digital Specialist Engineer</h3><p>April 2026 – present<br>Microsoft full stack development with C#, ASP.NET Core, Angular and SQL Server. Agentic AI with Semantic Kernel.</p></div><div class="project"><h3>Larsen & Toubro · Graduate Engineer Trainee</h3><p>September 2025 – March 2026<br>Java, Spring Boot, Hibernate and SQL Server. Worked on a conference room booking system with role-based access and calendar integration.</p></div>`;
content.Resume=`<div class="kicker">06 / PROFILE AT A GLANCE</div><h2>Sagar</h2><p>Software Engineer · Bangalore<br>B.Tech, Computer Science & Engineering · IIT Patna, 2025</p><div class="project"><h3>Focus</h3><p>Backend and full-stack engineering, REST APIs, system design and agentic AI.</p></div><div class="project"><h3>Selected work</h3><p>Faculty Recruitment Portal · CodeFossil · Multimodal Local Chat</p></div><p class="note">A downloadable résumé has not been added yet.</p>`;
content.GitHub=`<div class="kicker">08 / SOURCE & EXPERIMENTS</div><h2>GitHub</h2><p>Code, side projects, and experiments.</p><p class="note">Sagar’s verified GitHub profile link has not been added yet.</p>`;
content.LinkedIn=`<div class="kicker">09 / PROFESSIONAL CONNECTIONS</div><h2>LinkedIn</h2><p>Experience, engineering interests, and professional connections.</p><p class="note">Sagar’s verified LinkedIn profile link has not been added yet.</p>`;
const panelEl=$('#panel');const state='CODING';let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,camYaw=0,camPitch=0;
// Furniture-aware paths for the cat, including both chairs.
function pathTo(tx,tz,origin=pos){const step=.25,min=-4.5,max=4.5,zmin=-2.75,zmax=2.75;const snap=(x,z)=>[Math.round((x-min)/step),Math.round((z-zmin)/step)];const world=([x,z])=>new T.Vector3(min+x*step,0,zmin+z*step);const blocked=(x,z)=>(x>-3.8&&x<.55&&z>-2.95&&z<-1.23)||(x>.2&&x<4.2&&z<-2.15)||Math.hypot(x+1.6,z+.83)<.57||Math.hypot(x+3.55,z-1.12)<.59||(x<-3.65&&z>-.75&&z<.25)||(x>3.85&&z>1.1&&z<2.1);const start=snap(origin.x,origin.z),end=snap(tx,tz),key=a=>a.join(','),open=[start],came=new Map(),g=new Map([[key(start),0]]);let found=false;while(open.length){open.sort((a,b)=>(g.get(key(a))+Math.hypot(a[0]-end[0],a[1]-end[1]))-(g.get(key(b))+Math.hypot(b[0]-end[0],b[1]-end[1])));const a=open.shift();if(key(a)===key(end)){found=true;break}for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const b=[a[0]+dx,a[1]+dz],w=world(b);if(w.x<min||w.x>max||w.z<zmin||w.z>zmax||blocked(w.x,w.z))continue;const cost=g.get(key(a))+1;if(cost<(g.get(key(b))??Infinity)){came.set(key(b),a);g.set(key(b),cost);if(!open.some(q=>key(q)===key(b)))open.push(b)}}}if(!found)return null;const out=[];let node=end;while(key(node)!==key(start)){out.unshift(world(node));node=came.get(key(node))}out.push(new T.Vector3(tx,0,tz));return out}
panelEl.querySelector('.close').onclick=()=>panelEl.close();panelEl.addEventListener('close',()=>{if(catState==='READING')catStartDown()});
$('#think').textContent='◌  Call the cat';$('#think').onclick=()=>{if(catState==='IDLE'||catState==='ROAM')catWalkTo(-1.6,.35,'ROAM','LAP')};
function updateMotion(){ $('#motion').setAttribute('aria-pressed',String(reduced));$('#motion').textContent=reduced?'Motion: reduced':'Reduce motion'}updateMotion();$('#motion').onclick=()=>{reduced=!reduced;updateMotion()};$('#quality').onclick=()=>{const low=$('#quality').textContent.includes('high');renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=!low;bodyFur.count=low?2200:6500;faceFur.count=low?600:1800;chestFur.count=low?300:900;$('#quality').textContent='Quality: '+(low?'low':'high')};$('#reset').onclick=()=>{camYaw=camPitch=0};
let dragging=false,lastX=0,lastY=0;renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(dragging){camYaw=T.MathUtils.clamp(camYaw-(e.clientX-lastX)*.003,-.9,.9);camPitch=T.MathUtils.clamp(camPitch+(e.clientY-lastY)*.002,-.2,.2);lastX=e.clientX;lastY=e.clientY}});renderer.domElement.addEventListener('pointerup',()=>dragging=false);renderer.domElement.addEventListener('pointercancel',()=>dragging=false);
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<760?75:58;camera.updateProjectionMatrix()}addEventListener('resize',resize);
let last=performance.now(),time=0,lastCode=-1;
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;time+=dt;
updateCat(dt,time);
// Turn the chair toward the room for lap visits and a short passing game.
const social=footballActive||catRoutePurpose==='LAP'&&['ROAM','NOTICE','CROUCH','PUSH_OFF','JUMP','LANDING','PERCH'].includes(catState);
developerYaw=T.MathUtils.damp(developerYaw,social?0:Math.PI,3,dt);chair.rotation.y=developerYaw-Math.PI;
robot.position.copy(pos);robot.rotation.y=developerYaw;torso.position.y=.8+Math.sin(time*1.8)*.003;torso.rotation.x=.11;head.rotation.y=Math.sin(time*.35)*.1;head.rotation.x=.1;
for(const leg of limbs){const phase=footballClock%5.2,kick=footballActive&&leg.side===1?Math.max(0,1-Math.abs(phase-.8)/.3):0;solveLeg(leg,{z:.4+kick*.18,y:.075+kick*.085},.8)}
for(const arm of arms){arm.shoulder.rotation.x=-1;arm.shoulder.rotation.z=arm.side*.1;arm.elbow.rotation.x=-1.1;arm.hand.rotation.x=reduced?0:Math.sin(time*15+arm.side)*.13;if(social){arm.shoulder.rotation.x=-.25;arm.elbow.rotation.x=-.85;arm.hand.rotation.x=Math.sin(time*2)*.08}}
if(!reduced){fans.forEach(f=>f.rotation.z+=dt*5);leaves.forEach((l,i)=>l.rotation.x=Math.sin(time*.7+i)*.035);keys.forEach((k,i)=>k.position.y=1.478-(state==='CODING'&&Math.sin(time*12+i*1.3)>.93?.009:0));blue.intensity=14+Math.sin(time*.7)}
const sec=Math.floor(time*2);if(sec!==lastCode){lastCode=sec;const c=code.ctx;c.fillStyle='#101d28';c.fillRect(0,0,1024,640);c.fillStyle='#263943';c.fillRect(0,0,1024,58);c.font='23px monospace';c.fillStyle='#bececc';c.fillText('●  ●  ●      workspace / developer.ts',30,37);const snippet=snippets[Math.floor(time/20)%snippets.length],lines=Math.min(snippet.length,4+Math.floor(time%20));c.font='24px monospace';snippet.slice(0,lines).forEach((s,i)=>{c.fillStyle='#617779';c.fillText(String(i+1).padStart(2),20,105+i*39);c.fillStyle=s.startsWith('//')?'#77998c':s.includes('return')?'#dcb88c':'#a9c7d6';c.fillText(s,80,105+i*39)});if(sec%2)c.fillRect(82,120+(lines-1)*39,12,3);code.tex.needsUpdate=true}
const date=new Date();hour.rotation.z=-(date.getHours()%12+date.getMinutes()/60)*Math.PI/6;minute.rotation.z=-date.getMinutes()*Math.PI/30;
const mobile=innerWidth<760;
// Eye-height camera physically inside the room. Dragging turns the head, not the room.
const targetCam=new T.Vector3(0,1.72,3.05);
const focusX=mobile&&panelEl.open?-1.2:mobile?2.1:0;
const targetLook=new T.Vector3(focusX+Math.sin(camYaw)*6,1.9+camPitch*4,-2.7);

camera.position.lerp(targetCam,dt*3);look.lerp(targetLook,dt*3);camera.lookAt(look);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);
for(const [key,d] of Object.entries(destinations)){
 const center=new T.Vector3(...d.point).project(camera);
 const corners=[[-.325,-.32],[.325,-.32],[-.325,.32],[.325,.32]].map(([x,y])=>new T.Vector3(d.x+x,d.y+y,d.point[2]).project(camera));
 const xs=corners.map(v=>(v.x*.5+.5)*innerWidth),ys=corners.map(v=>(-v.y*.5+.5)*innerHeight);
 d.button.style.left=(Math.min(...xs)+Math.max(...xs))/2+'px';d.button.style.top=(Math.min(...ys)+Math.max(...ys))/2+'px';d.button.style.width=Math.max(...xs)-Math.min(...xs)+'px';d.button.style.height=Math.max(...ys)-Math.min(...ys)+'px';
 d.button.classList.toggle('active',catGoal===key&&catState!=='IDLE');d.button.style.visibility=center.z>1||center.z< -1?'hidden':'visible';
 d.object.children[1].material.color.set((catGoal===key&&catState!=='IDLE')||hovered===key?'#fff0bf':'#ffffff');
}
renderer.render(scene,camera);
}
requestAnimationFrame(animate);setTimeout(()=>{$('#loadstatus').textContent='Portfolio compiled successfully.';setTimeout(()=>{$('#loader').style.opacity=0;setTimeout(()=>$('#loader').remove(),650)},450)},600);
