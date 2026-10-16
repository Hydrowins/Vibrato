const {app,BrowserWindow,ipcMain,session}=require('electron');
const {execFile}=require('child_process');
const path=require('path'),fs=require('fs');
const bin=()=>{const n=process.platform==='win32'?'yt-dlp.exe':'yt-dlp';
  const p=app.isPackaged?path.join(process.resourcesPath,n):path.join(__dirname,'bin',n);
  return fs.existsSync(p)?p:'yt-dlp'};
const run=a=>new Promise((ok,no)=>execFile(bin(),a,{maxBuffer:1e8},(e,o,er)=>e?no(new Error(er||e.message)):ok(o)));
let win;
app.whenReady().then(()=>{
  // lets Web Audio (EQ + visualiser) read the stream
  session.defaultSession.webRequest.onHeadersReceived({urls:['*://*.googlevideo.com/*']},(d,cb)=>{
    const h=d.responseHeaders;h['access-control-allow-origin']=['*'];cb({responseHeaders:h})});
  win=new BrowserWindow({width:1100,height:700,minWidth:900,minHeight:600,frame:false,backgroundColor:'#14161c',
    webPreferences:{preload:path.join(__dirname,'preload.js')}});
  win.loadFile('index.html');
});
ipcMain.handle('search',async(_,q)=>{
  const t=/^https?:/.test(q)?q:`ytsearch10:${q}`;
  const o=await run(['--flat-playlist','-j','--no-warnings',t]);
  return o.trim().split('\n').filter(Boolean).map(l=>JSON.parse(l)).map(j=>({id:j.id,title:j.title,
    artist:(j.channel||j.uploader||'').replace(/ - Topic$/,''),dur:j.duration,art:`https://i.ytimg.com/vi/${j.id}/mqdefault.jpg`}));
});
ipcMain.handle('resolve',async(_,id)=>(await run(['-f','bestaudio','-g','--no-playlist','--no-warnings','https://music.youtube.com/watch?v='+id])).trim().split('\n')[0]);
ipcMain.on('win',(_,a)=>a==='min'?win.minimize():a==='max'?(win.isMaximized()?win.unmaximize():win.maximize()):win.close());
ipcMain.on('np',(_,t)=>fs.writeFile(path.join(app.getPath('userData'),'nowplaying.txt'),t,()=>{}));
app.on('window-all-closed',()=>app.quit());
