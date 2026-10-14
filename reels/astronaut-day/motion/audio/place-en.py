import numpy as np, wave, json
sr=48000
ws=json.load(open('aen/align.json'))
w=wave.open('aen/proc48.wav'); x=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(float)/32768
G=[(0,9,0.15),(10,13,3.6),(14,22,5.3),(23,30,8.6),(31,37,11.75),(38,43,14.3),(44,46,17.0),(47,50,18.2),(51,55,19.4),(56,56,21.85),(57,58,22.3),
(59,62,23.3),(63,70,25.2),(71,74,28.2),(75,75,30.3),(76,78,31.1),(79,83,31.95),(84,85,33.2),(86,88,34.4),(89,96,35.6),(97,100,38.55),(101,102,40.6),
(103,108,41.35),(109,109,43.0),(110,111,43.8),(112,116,45.9),(117,119,47.6),(120,122,49.3),(123,123,50.75),(124,128,51.5),(129,131,53.2),(132,135,54.3),
(136,141,56.3),(142,146,58.6),(147,156,60.6),(157,164,64.5),(165,168,67.3),(169,172,68.6),(173,176,69.8),(177,177,72.3),(178,182,73.6),(183,190,75.6),
(191,196,78.4),(197,200,80.4),(201,206,82.75),(207,210,85.0),(211,214,86.4),(215,217,88.1),(218,224,89.25),(225,229,92.2),(230,234,94.3),(235,239,96.0),(240,244,97.9)]
assert [g[0] for g in G][1:]==[g[1]+1 for g in G][:-1] and G[-1][1]==len(ws)-1
N=int(101.2*sr); out=np.zeros(N); prev=-1; late=[]
for a,b,target in G:
    s=ws[a][1]; e=ws[b][2]
    ps=ws[a-1][2] if a>0 else 0; ne=ws[b+1][1] if b+1<len(ws) else e+0.3
    s0=max(s-0.06,(ps+s)/2); e0=min(e+0.14,(e+ne)/2)
    at=max(target, prev+0.08)
    if at-target>0.25: late.append((target,round(at-target,2)))
    seg=x[int(s0*sr):int(e0*sr)].copy(); f=int(0.01*sr); seg[:f]*=np.linspace(0,1,f); seg[-f:]*=np.linspace(1,0,f)
    i=int((at-(s-s0))*sr); out[i:i+len(seg)]+=seg[:max(0,N-i)]
    prev=at+(e0-s)
print('late',late,'ends',round(prev,2))
w=wave.open('aen/voice48.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(out,-1,1)*32767).astype(np.int16).tobytes()); w.close()
