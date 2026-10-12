(()=>{
const box=document.querySelector('.interlude'),c=box&&box.querySelector('canvas');if(!c)return;
const ctx=c.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
const N=44;let W=0,H=0,t=0,last=0,vis=true,mx=-9999,my=-9999,tx=-9999,ty=-9999,raf=0;
function size(){const r=box.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;c.width=W*d;c.height=H*d;ctx.setTransform(d,0,0,d,0,0);draw();}
function draw(){
  ctx.clearRect(0,0,W,H);
  const cy=H/2,A=H*.27,step=Math.max(5,W/220);
  mx+= (tx-mx)*.12;my+=(ty-my)*.12;
  for(let i=0;i<N;i++){
    const k=i/(N-1),off=(k-.5)*2,b=1-Math.abs(off);
    ctx.beginPath();
    for(let x=0;x<=W+step;x+=step){
      const nx=x/W,lens=.22+.78*Math.pow(Math.sin(Math.PI*Math.min(1,nx)),.9);
      let y=cy+off*H*.36*lens
        +A*lens*(Math.sin(nx*5.4+t*.55+i*.11)*.6+Math.sin(nx*11.5-t*.4+i*.23)*.26)*(0.35+.65*b);
      const dx=x-mx,dy=y-my,g=Math.exp(-(dx*dx+dy*dy)/(2*150*150));
      y+=(my-y)*.42*g;
      if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.strokeStyle=`rgba(226,234,248,${.12+.78*Math.pow(b,1.35)})`;
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
