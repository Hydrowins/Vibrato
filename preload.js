const {contextBridge,ipcRenderer:r}=require('electron');
contextBridge.exposeInMainWorld('api',{search:q=>r.invoke('search',q),resolve:i=>r.invoke('resolve',i),win:a=>r.send('win',a),np:t=>r.send('np',t)});
