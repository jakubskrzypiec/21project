// Renderuje rolkę klatka po klatce do MP4 (H.264, 1080×1920, 30 fps).
// Wymaga: serwer z katalogu głównego repo na :8765 (python3 -m http.server 8765), playwright, ffmpeg.
// Użycie: node render.js [wyjście.mp4] [--light → wersja na białym tle] [--frames 1.0,4.2,…  → zamiast filmu zapisuje pojedyncze klatki PNG]
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const path=require('path');
const FPS=30;
(async()=>{
  const args=process.argv.slice(2);
  const fi=args.indexOf('--frames');
  const frames=fi>=0?args[fi+1].split(',').map(Number):null;
  const light=args.includes('--light');
  const out=args.find(a=>!a.startsWith('--')&&a!==(frames&&args[fi+1]))||path.join(__dirname,light?'panele-reel-jasna.mp4':'panele-reel.mp4');
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:1080,height:1920}});
  await p.goto('http://localhost:8765/reklamy/panele-reel/?render'+(light?'&light':''));
  await p.evaluate(()=>document.fonts.ready);
  await p.waitForTimeout(800);
  const D=await p.evaluate(()=>window.DURATION);
  const draw=t=>p.evaluate(async t=>{window.render(t);await Promise.all([...document.images].filter(i=>i.style.visibility!=='hidden').map(i=>i.decode().catch(()=>{})));window.render(t)},t);
  if(frames){
    for(const t of frames){await draw(t);await p.screenshot({path:path.join(path.dirname(out),`klatka-${t}.png`)})}
    await b.close();return;
  }
  const ff=spawn('ffmpeg',['-y','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
  const n=Math.round(D*FPS);
  for(let f=0;f<n;f++){
    await draw(f/FPS);
    const buf=await p.screenshot({type:'jpeg',quality:95});
    if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));
    if(f%60===0)process.stdout.write(`klatka ${f}/${n}\n`);
  }
  ff.stdin.end();
  await new Promise(r=>ff.on('close',r));
  await b.close();
  console.log('gotowe:',out);
})();
