(()=>{
// Hero: ta sama wstęga linii co w przerywniku, reaguje na kursor.
const box=document.querySelector('.stage'),c=box&&box.querySelector('.hero-waves');if(!c)return;
const ctx=c.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
const N=46;let W=0,H=0,t=0,last=0,vis=true,mx=-9999,my=-9999,tx=-9999,ty=-9999,raf=0;
function size(){const r=box.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;c.width=Math.round(W*d);c.height=Math.round(H*d);ctx.setTransform(d,0,0,d,0,0);draw();}
function draw(){
  ctx.clearRect(0,0,W,H);
  const cy=H*.46,A=H*.2,spread=H*.3,step=Math.max(5,W/240);
  mx+=(tx-mx)*.12;my+=(ty-my)*.12;
  for(let i=0;i<N;i++){
    const k=i/(N-1),off=(k-.5)*2,b=1-Math.abs(off);
    ctx.beginPath();
    for(let x=0;x<=W+step;x+=step){
      const nx=x/W,lens=.3+.7*Math.pow(Math.sin(Math.PI*Math.min(1,nx)),.8);
      let y=cy+off*spread*lens+A*lens*(Math.sin(nx*5.2+t*.5+i*.11)*.6+Math.sin(nx*11-t*.38+i*.23)*.26)*(.35+.65*b);
      const dx=x-mx,dy=y-my,g=Math.exp(-(dx*dx+dy*dy)/(2*170*170));
      y+=(my-y)*.4*g;
      if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.strokeStyle=`rgba(226,234,248,${.06+.5*Math.pow(b,1.4)})`;
    ctx.lineWidth=b>.8?1.2:1;
    ctx.stroke();
  }
}
function loop(now){raf=0;if(!vis||document.hidden)return;const dt=Math.min(50,now-last||16);last=now;t+=dt*.001;draw();raf=requestAnimationFrame(loop);}
function start(){if(!raf&&!reduce.matches){last=0;raf=requestAnimationFrame(loop);}}
new ResizeObserver(size).observe(box);
new IntersectionObserver(es=>{vis=es[0].isIntersecting;if(vis)start();},{threshold:0}).observe(box);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)start();});
box.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const r=box.getBoundingClientRect();tx=e.clientX-r.left;ty=e.clientY-r.top;if(mx<-5000){mx=tx;my=ty;}});
box.addEventListener('pointerleave',()=>{tx=ty=-9999;mx=my=-9999;});
size();start();
})();
