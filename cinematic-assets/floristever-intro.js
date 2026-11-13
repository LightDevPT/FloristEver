const c=document.getElementById('c'),x=c.getContext('2d'),O='#2f6b4f',PK='#e8527a',DUR=46;
const cl=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),lp=(a,b,u)=>a+(b-a)*u;
const ez=u=>1-Math.pow(1-cl(u),3);
const bk=u=>{u=cl(u);const s=1.70158;return 1+(s+1)*Math.pow(u-1,3)+s*Math.pow(u-1,2)};
let t=0,play=!matchMedia('(prefers-reduced-motion: reduce)').matches,last=performance.now();
document.fonts&&document.fonts.load('900 20px Nunito');
const F=s=>`900 ${s}px Nunito,'Trebuchet MS',sans-serif`;
function rr(X,Y,w,h,r,f,s,lw=4){x.beginPath();if(typeof x.roundRect==='function'){x.roundRect(X,Y,w,h,r)}else{const q=Math.max(0,Math.min(r,Math.abs(w)/2,Math.abs(h)/2));x.moveTo(X+q,Y);x.lineTo(X+w-q,Y);x.quadraticCurveTo(X+w,Y,X+w,Y+q);x.lineTo(X+w,Y+h-q);x.quadraticCurveTo(X+w,Y+h,X+w-q,Y+h);x.lineTo(X+q,Y+h);x.quadraticCurveTo(X,Y+h,X,Y+h-q);x.lineTo(X,Y+q);x.quadraticCurveTo(X,Y,X+q,Y);x.closePath()}if(f){x.fillStyle=f;x.fill()}if(s){x.lineWidth=lw;x.strokeStyle=s;x.stroke()}}
function circ(X,Y,r,f,s,lw=3){x.beginPath();x.arc(X,Y,r,0,7);if(f){x.fillStyle=f;x.fill()}if(s){x.lineWidth=lw;x.strokeStyle=s;x.stroke()}}
function txt(s,X,Y,z,col,al='center'){x.font=F(z);x.textAlign=al;x.textBaseline='middle';x.fillStyle=col;x.fillText(s,X,Y)}
function shadow(X,Y,w){x.fillStyle='rgba(40,90,60,.18)';x.beginPath();x.ellipse(X,Y,w,w*.35,0,0,7);x.fill()}
function tree(X,Y,s=1){shadow(X,Y+32*s,36*s);rr(X-7*s,Y+8*s,14*s,26*s,4,'#8a6240',O);circ(X,Y-6*s,38*s,'#4fae6c',O,4);circ(X-12*s,Y-18*s,11*s,'#7fd08e')}
function daisy(X,Y,s,col='#fff'){if(s<=0.01)return;const cen=col==='#f7c92b'?'#7a4a1e':'#f5c542';x.save();x.translate(X,Y);x.scale(s,s);for(let i=0;i<8;i++){x.save();x.rotate(i*Math.PI/4);x.beginPath();x.ellipse(0,-11,6,9,0,0,7);x.fillStyle=col;x.fill();x.lineWidth=2;x.strokeStyle=col==='#fff'?'#b9c9b0':O;x.stroke();x.restore()}circ(0,0,7,cen,'#a8760a',2);x.restore()}
function coin(X,Y,r=9){circ(X,Y,r,'#f5c542','#a8760a',3);circ(X,Y,r*.45,null,'#a8760a',2)}
function heart(X,Y,s){x.beginPath();x.moveTo(X,Y+s*.9);x.bezierCurveTo(X-s*1.6,Y-s*.2,X-s*.6,Y-s*1.3,X,Y-s*.4);x.bezierCurveTo(X+s*.6,Y-s*1.3,X+s*1.6,Y-s*.2,X,Y+s*.9);x.fillStyle='#ff5d8f';x.fill();x.lineWidth=3;x.strokeStyle=O;x.stroke()}
function star(X,Y,r,rot){x.save();x.translate(X,Y);x.rotate(rot);x.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,q=i%2?r*.3:r;x.lineTo(Math.cos(a)*q,Math.sin(a)*q)}x.closePath();x.fillStyle='#fff7c2';x.fill();x.restore()}
function girl(X,Y,o={}){const{f=1,w=0,body='#3f9a62',hat='#f7e8b8',hair='#5a3a2a',hold=0}=o;Y-=w?Math.abs(Math.sin(t*9))*3:0;shadow(X,Y+32,18);
rr(X-13,Y+6,26,26,8,body,O,3);circ(X,Y-6,13,'#ffe2c4',O,3);
if(hat){x.beginPath();x.ellipse(X,Y-14,22,7,0,0,7);x.fillStyle=hat;x.fill();x.lineWidth=3;x.strokeStyle=O;x.stroke();x.beginPath();x.arc(X,Y-16,12,Math.PI,0);x.fill();x.stroke();rr(X-12,Y-18,24,4,2,PK)}else{x.beginPath();x.arc(X,Y-8,13.5,Math.PI,0);x.fillStyle=hair;x.fill()}
circ(X-4*f,Y-5,1.8,'#222');circ(X+4*f,Y-5,1.8,'#222');if(hold)rr(X+9*f-8,Y+14,16,12,3,'#c99a6a',O,2)}
function bed(bx,by,w,h,label,cols,fn){rr(bx,by,w,h,14,'#8a5a3a','#4a3020',5);const sp=(w-70)/2;
 for(let i=0;i<6;i++){const px=bx+35+(i%3)*sp,py=by+40+(i/3|0)*58;circ(px,py,27,'#a56f4a','#fff',3);daisy(px,py,fn(i)*1.15,cols[i%cols.length])}
 rr(bx+w/2-48,by-12,96,22,9,'#fff',O,2);txt(label,bx+w/2,by-1,13,O)}
function lowbed(X,Y,cols){rr(X,Y,150,64,12,'#8a5a3a','#4a3020',4);cols.forEach((k,i)=>daisy(X+35+i*40,Y+32,1,k))}
function shop(stock){const X=330,Y=170;rr(X,Y+30,220,160,10,'#c99a6a',O,5);rr(X+22,Y+84,72,46,8,'#bfe6f5',O,4);girl(X+150,Y+118,{hat:null,body:'#6bb4e8',f:-1});
 rr(X+20,Y+130,180,30,8,'#e4b886',O,4);rr(X+40,Y+168,140,12,6,'#f48fb1',O,3);
 for(let i=0;i<7;i++)rr(X+i*31.4,Y,31.4,44,6,i%2?'#fff':PK,O,3);
 rr(X+50,Y+50,120,26,9,'#fff',O,3);txt('FloristEver',X+110,Y+64,15,O);
 rr(185,250,110,62,6,'#fbf1dc',O,3);rr(236,310,8,40,2,'#8a6240',O,2);txt('STOCK',240,266,13,O);txt(stock+'/20 no total',240,288,12,O)}
const hv=i=>16+i*.45,rg=i=>20.5+i*.4;
const fs=(i,u)=>u<hv(i)?bk((u-5.2-i*.4)/.7):u<rg(i)?0:bk((u-rg(i))/.7);
const K=[[0,640,360,1],[4.5,640,360,1.05],[6,880,320,1.9],[11.5,880,320,1.9],[13.5,520,380,1.35],[15.5,780,380,1.5],[18.5,880,360,1.6],[20,560,330,1.4],[23,440,320,1.7],[26.5,440,320,1.7],[28,950,320,1.25],[33,950,320,1.25],[34.2,640,360,1],[40,640,360,1],[46,640,360,1.12]];
function cam(u){let i=0;while(i<K.length-2&&u>K[i+1][0])i++;const a=K[i],b=K[i+1],k=cl((u-a[0])/(b[0]-a[0])),e=k*k*(3-2*k);return[lp(a[1],b[1],e),lp(a[2],b[2],e),lp(a[3],b[3],e)]}
function world(){
 x.fillStyle='#a9d6a0';x.fillRect(-400,-300,2100,1300);
 for(let i=0;i<70;i++){x.fillStyle='rgba(255,255,255,.12)';x.beginPath();x.ellipse((i*137)%1500-100,(i*89)%900-80,40+i%5*8,16,0,0,7);x.fill();x.fillStyle='#8fc48a';x.fillRect((i*211)%1500-100,(i*173)%900-80,4,3)}
 x.lineCap='round';x.beginPath();x.moveTo(-100,445);x.bezierCurveTo(300,420,600,455,1400,430);x.lineWidth=58;x.strokeStyle='#8a6240';x.stroke();x.lineWidth=46;x.strokeStyle='#dcb980';x.stroke();
 [[160,310,1],[660,230,.9],[1250,240,1],[1190,540,1.1],[230,620,1],[720,640,1],[940,590,.9],[110,540,.8]].forEach(a=>tree(...a));
 const bees=t>5.2;lowbed(360,530,['#fff','#f58fb0','#fff']);lowbed(360,620,['#f7c92b','#fff','#f58fb0']);
 let ready=0;const cols=['#fff'];bed(770,250,210,135,'Margarida',cols,i=>{const s=fs(i,t);if(s>.95)ready++;return s});
 if(t<29.4){const k=1-cl((t-29)/.4);rr(1010,250,190,135,14,'#fff6e3','#e0a82e',4);txt('Novo terreno',1105,285,17,O);txt('Margarida',1105,308,17,O);coin(1075,336,9);txt('50',1105,336,20,O);txt('Nível exigido: 1',1105,362,11,'#6aa07f')}
 else{const k=bk((t-29)/.6);x.save();x.translate(1105,317);x.scale(k,k);x.translate(-1105,-317);bed(1010,250,190,135,'Rosa',['#f58fb0'],i=>bk((t-29.5-i*.3)/.7));x.restore()}
 shop(t<22.6?0:t<24.4?6:5);
 const ez2=cl((t-12)/3.4);let g=null;
 if(t>=12&&t<15.4)g=[-40+900*ez2,435,1,1,0];else if(t>=15.4&&t<18.8)g=[880,408,0,1,1];else if(t>=18.8&&t<22){const u=(t-18.8)/3.2;g=[880-380*u,435,1,-1,1]}else if(t>=22)g=[500,410,0,-1,0];
 if(g)girl(g[0],g[1],{w:g[2],f:g[3],hold:g[4]&&t<22.6?1:0});
 if(t>=20&&t<27.6){const u=cl((t-20)/2.2),lv=t>25.6?cl((t-25.6)/2):0;girl(t>25.6?lp(400,-60,lv):lp(-40,400,u),t>25.6?400:395,{body:'#6bb4e8',hat:null,w:(u<1||lv>0)?1:0,f:t>25.6?-1:1});
  if(t>22.8&&t<24.4){const k=bk((t-22.8)/.3);x.save();x.translate(400,338);x.scale(k,k);rr(-24,-26,48,38,10,'#fff',O,3);daisy(0,-8,.9);x.restore()}}
 for(let i=0;i<8;i++){const u=(t-24.4-i*.08)/1.2;if(u>0&&u<1){x.globalAlpha=1-u*u;coin(400+(i-3.5)*20,350-110*ez(u));x.globalAlpha=1}}
 if(t>24.4&&t<26.4){x.globalAlpha=1-cl((t-25.4)/1);txt('+50',420,300-30*ez((t-24.4)/1),26,'#a8760a');x.globalAlpha=1}
 for(let i=0;i<6;i++){const u=(t-hv(i))/.5;if(u>0&&u<1)daisy(lp(805+(i%3)*70,880,u),lp(290+(i/3|0)*58,395,u)-34*Math.sin(u*Math.PI),.7)}
 if(t>29.6){const k=bk((t-29.6)/.5);girl(1105+45*Math.sin((t-29.6)*1.1),425,{body:'#f08a3c',w:1,f:Math.cos((t-29.6)*1.1)>0?1:-1,hold:1});if(k<1)txt('Ajudante!',1105,380,18,PK)}
 if(bees)for(let k=0;k<2;k++){const bx=880+100*Math.cos(t*1.3+k*3),by=300+45*Math.sin(t*2+k*3);x.beginPath();x.ellipse(bx,by,6,4.5,0,0,7);x.fillStyle='#f7c92b';x.fill();x.lineWidth=2;x.strokeStyle=O;x.stroke()}
 return ready}
function bouquet(){const k=bk((t-34.3)/.9);x.save();x.translate(640,350);x.scale(1.75*k,1.75*k);
 const fl=[['#fff',-52],['#f7c92b',-35],['#f58fb0',-17],['#b58cf0',0],['#fff',17],['#f58fb0',35],['#f7c92b',52]];
 fl.forEach(([col,a],i)=>{const r=a*Math.PI/180,fx=Math.sin(r)*88,fy=-Math.cos(r)*88-8;x.beginPath();x.moveTo(0,20);x.lineTo(fx,fy);x.lineWidth=5;x.strokeStyle='#3f9a62';x.stroke()});
 x.beginPath();x.moveTo(-72,-14);x.lineTo(72,-14);x.lineTo(0,150);x.closePath();x.fillStyle='#ffd1dc';x.fill();x.lineWidth=4;x.strokeStyle=O;x.stroke();
 x.beginPath();x.moveTo(-30,-14);x.lineTo(0,150);x.lineTo(30,-14);x.strokeStyle='#fff';x.lineWidth=3;x.stroke();
 fl.forEach(([col,a],i)=>{const r=a*Math.PI/180;daisy(Math.sin(r)*88,-Math.cos(r)*88-8,1.7*bk((t-34.9-i*.15)/.5),col)});
 heart(0,-132*bk((t-36.2)/.5)+0*1,18*bk((t-36.2)/.5));
 circ(0,38,10,PK,O,3);x.beginPath();x.ellipse(-24,34,20,10,.4,0,7);x.ellipse(24,34,20,10,-.4,0,7);x.fillStyle=PK;x.fill();x.stroke();circ(0,38,9,PK,O,3);x.restore();
 for(let i=0;i<9;i++){const a=i*.7+t*.5,r=270+(i%3)*30;star(640+Math.cos(a)*r*1.3,340+Math.sin(a)*r*.8,10+(i%3)*5,t*(i%2?1:-1))}}
function petals(){for(let i=0;i<16;i++){const px=(i*97+t*30*(.5+i%3*.3))%1400-60,py=(i*53+t*55*(.6+i%4*.2))%820-40;x.save();x.translate(px,py);x.rotate(t+i);x.beginPath();x.ellipse(0,0,9,5,0,0,7);x.fillStyle=i%2?'#ffc2d4':'#fff';x.fill();x.lineWidth=2;x.strokeStyle=O;x.stroke();x.restore()}}
function title(s,cx,cy,sz,t0,a){x.save();x.globalAlpha=a;x.font=F(sz);x.lineJoin='round';const ws=[...s].map(ch=>x.measureText(ch).width);let X=cx-ws.reduce((p,q)=>p+q)/2;
 [...s].forEach((ch,i)=>{const k=bk((t-t0-i*.07)/.5);x.save();x.translate(X+ws[i]/2,cy);x.scale(k,k);x.textAlign='center';x.textBaseline='middle';x.lineWidth=sz*.16;x.strokeStyle=O;x.strokeText(ch,0,7);x.fillStyle=PK;x.fillText(ch,0,7);x.strokeText(ch,0,0);x.fillStyle='#fff';x.fillText(ch,0,0);x.restore();X+=ws[i]});x.restore()}
function hud(ready){const a=cl((t-5.2)/.5)*(1-cl((t-33.6)/.4));if(a<=0)return;x.save();x.globalAlpha=a;
 const m=20+50*ez((t-24.4)/1.5)-50*ez((t-29)/.5)+40*ez((t-32)/1.5),lv=t>30.5?2:1,xp=cl(.05+.9*ez((t-24.4)/6));
 rr(24,18,120,52,26,'#fff8e8',O,4);coin(56,44,14);txt(Math.round(m),100,45,24,O);
 rr(156,18,270,52,26,'#fff8e8',O,4);rr(168,30,58,28,14,PK,null);txt('NÍV. '+lv,197,44,14,'#fff');rr(236,38,110,12,6,'#fff',O,2);rr(237,39,108*xp,10,5,'#f5c542');txt(Math.round(xp*100)+' / 100 XP',386,45,12,PK);
 rr(24,82,236,36,18,'#fff1c9','#e0a82e',3);daisy(46,100,.6);txt(ready+' flores prontas',150,100,15,O);x.restore()}
const CAP=[[5.5,11.5,'Os campos de flores nascem sem parar…'],[12.3,18.5,'Colhe as flores quando estiverem maduras.'],[19.3,26.5,'Os clientes entram. Tu vendes. As moedas chegam!'],[27.5,33.5,'Melhora a loja, abre novos campos e contrata ajudantes.'],[34.6,39.5,'Cria ramos únicos com flores raras e acessórios.']];
function draw(){x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,1280,720);x.lineJoin='round';let ready=0;
 if(t>=34.2&&t<40){const g=x.createLinearGradient(0,0,0,720);g.addColorStop(0,'#ffe3ec');g.addColorStop(1,'#fff3d6');x.fillStyle=g;x.fillRect(0,0,1280,720);bouquet();petals();txt('Ramos',640,70,0,O)}
 else{const[cx,cy,z]=cam(t);x.save();x.translate(640,360);x.scale(z,z);x.translate(-cx,-cy);ready=world();x.restore()}
 if(t<5)petals();
 if(t<5){title('FloristEver',640,300,130,.5,1-cl((t-4.2)/.7));x.globalAlpha=cl((t-2)/.6)*(1-cl((t-4.2)/.7));txt('Cultiva, colhe e vende flores.',640,395,36,'#fff');x.globalAlpha=1}
 if(t>=40){x.fillStyle='rgba(255,248,232,.55)';x.fillRect(0,0,1280,720);petals();title('FloristEver',640,250,120,40.3,1);x.globalAlpha=cl((t-41.8)/.6);txt('O teu jardim está à espera.',640,350,36,O);
  rr(450,400,380,66,33,PK,O,5);txt('floristever.netlify.app',640,433,27,'#fff');txt('© Light Group 2026',640,690,16,O);x.globalAlpha=1}
 hud(ready);
 CAP.forEach(([a,b,s])=>{const al=cl((t-a)/.4)*cl((b-t)/.4);if(al>0){x.save();x.globalAlpha=al;x.font=F(30);const w=x.measureText(s).width+60;rr(640-w/2,622,w,56,28,'#fff8e8',O,4);txt(s,640,651,30,O);x.restore()}});
 const f=Math.max(...[5,12,19,27,34,40].map(b=>cl(1-Math.abs(t-b)/.35)));if(f>0){x.fillStyle=`rgba(255,248,232,${f*.95})`;x.fillRect(0,0,1280,720)}}
const pp=document.getElementById('pp'),pr=document.getElementById('pr');
const sync=()=>pp.textContent=play?'Pausa':'Ver';
pp.onclick=()=>{if(t>=DUR-.05)t=0;play=!play;sync()};
document.getElementById('rp').onclick=()=>{t=0;play=true;sync()};
pr.oninput=()=>{t=pr.value/1000*DUR;draw()};
function loop(n){const dt=Math.min(.1,(n-last)/1000);last=n;if(play){t+=dt;if(t>=DUR){t=DUR-.001;play=false;sync()}}draw();pr.value=t/DUR*1000;requestAnimationFrame(loop)}
sync();requestAnimationFrame(loop);
