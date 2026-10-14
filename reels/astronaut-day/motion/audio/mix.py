import numpy as np, wave
from scipy.signal import butter, sosfilt
SR=48000; DUR=101.2; N=int(SR*DUR); t=np.arange(N)/SR
rng=np.random.default_rng(11)
def rd(p):
    w=wave.open(p); return np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
voice=np.zeros(N); v=rd('astro/voice48.wav'); voice[:min(N,len(v))]=v[:N]
def lp(x,f,o=2): return sosfilt(butter(o,f,'low',fs=SR,output='sos'),x)
def hp(x,f,o=2): return sosfilt(butter(o,f,'high',fs=SR,output='sos'),x)
def bp(x,a,b,o=2): return sosfilt(butter(o,[a,b],'band',fs=SR,output='sos'),x)
def env(pts): ts,vs=zip(*pts); return np.interp(t,ts,vs)
def tone(f, det=0.25, harm=(1,0.3,0.1)):
    out=np.zeros(N)
    for d in (-det,0,det):
        ph=2*np.pi*(f+d)*t+0.3*np.sin(2*np.pi*0.05*t+f)
        for k,a in enumerate(harm): out+=a*np.sin((k+1)*ph)
    return out/3
# exterior: warm D-major pad; interior: fan hum; hologram: soft pulse
ext=env([(0,0.9),(16.6,0.9),(17.0,0.15),(75.4,0.15),(76.0,0.8),(92.0,0.9),(92.3,0.2),(95.8,0.25),(96.2,1.0),(100.4,0.8),(101.2,0)])
pad=(tone(73.42)*0.8+tone(110)*0.55+tone(146.83)*0.4+tone(185.0)*0.25+tone(220)*0.22)*(0.8+0.2*np.sin(2*np.pi*t/9))
pad=lp(pad,1200)*ext
shim=(tone(587.33,0.6,(1,))+tone(880,0.9,(1,))*0.6+tone(1174.7,1.2,(1,))*0.3)*env([(0,0.6),(4.9,0.3),(5.2,0.1),(75.6,0.1),(77,0.5),(88,0.8),(92,0.3),(96,0.4),(97.5,1),(101.2,0)])
pad+=lp(shim,5000)*0.15
inside=env([(0,0),(16.8,0),(17.2,0.7),(52.9,0.7),(56.2,0.7),(56.4,0.15),(58.4,0.15),(75.4,0.12),(75.8,0.2),(84.5,0.2),(84.7,0),(92.1,0),(92.4,0.7),(95.6,0.25),(96.0,0)])
fan=bp(rng.standard_normal(N),120,1800,2)*0.5+lp(rng.standard_normal(N),180,2)*0.6
fan+=0.05*np.sin(2*np.pi*60*t)+0.03*np.sin(2*np.pi*120*t)
fan*=inside
holo=env([(0,0),(56.2,0),(56.4,0.6),(75.3,0.6),(75.6,0)])
pulse=(tone(146.83,0.1,(1,0.5))*0.5+tone(220,0.1,(1,))*0.3)*(0.6+0.4*(np.sin(2*np.pi*t*2.0)>0.6))
pulse=lp(pulse,900)*holo
music=pad*0.11+fan*0.2+pulse*0.12
# sfx
sfx=np.zeros(N)
def place(sig,at,g=1.0):
    i=int(at*SR); j=min(N,i+len(sig))
    if 0<=i<N: sfx[i:j]+=sig[:j-i]*g
def boom(dur=3.0,f0=90,f1=28,noise=0.5,bright=1500):
    n=int(dur*SR); tt=np.arange(n)/SR; f=f1+(f0-f1)*np.exp(-tt*3)
    sub=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*1.6); nz=lp(rng.standard_normal(n),bright)*np.exp(-tt*4)*noise
    return (sub+nz)*np.minimum(1,tt/0.004)
def sweep(dur,f0,f1,amp_shape='rise',q=0.5):
    n=int(dur*SR); tt=np.arange(n)/SR; k=tt/dur; x=rng.standard_normal(n); out=np.zeros(n); seg=1200
    for s in range(0,n,seg):
        u=s/n; fc=f0*(f1/f0)**u; lo=max(30,fc*(1-q)); hi=min(SR/2-200,fc*(1+q))
        out[s:s+seg]=bp(x[max(0,s-2400):s+seg],lo,hi)[-len(x[s:s+seg]):]
    shp={'rise':k**2,'fall':(1-k)**2,'arc':np.sin(np.pi*k)**2}[amp_shape]
    return out*shp*1.5
def beep(f=1760,dur=0.09):
    n=int(dur*SR); tt=np.arange(n)/SR; return np.sin(2*np.pi*f*tt)*np.minimum(1,tt/0.003)*np.minimum(1,(dur-tt)/0.01)
def tick(f=2600,dur=0.025):
    n=int(dur*SR); tt=np.arange(n)/SR; return np.sin(2*np.pi*f*tt)*np.exp(-tt*200)
def chime(f=1174.7,dur=2.5):
    n=int(dur*SR); tt=np.arange(n)/SR; return (np.sin(2*np.pi*f*tt)+0.4*np.sin(2*np.pi*f*2.01*tt))*np.exp(-tt*2.2)*np.minimum(1,tt/0.005)
# hook: a sunrise swell each time the sun clears the horizon, ticks for the counter
def eio(x): return np.where(x<0.5,4*x**3,1-(-2*x+2)**3/2)
tt=np.linspace(0.1,3.3,4000); cyc=3.75*eio((tt-0.1)/3.2)
for n_ in range(4):
    idx=np.argmin(np.abs(cyc-(0.25+n_)))
    at=tt[idx]; place(sweep(0.7,300,4000,'arc',0.6),at-0.45,0.12); place(chime(880*(1+n_*0.12),1.5),at,0.05)
for i in range(16): place(tick(2200+i*40),0.4+2.7*i/15,0.05)
place(boom(4,70,28,0.3,800),4.95,0.22)
place(sweep(3.0,120,1600,'arc',0.5),11.6,0.35)          # flyby
place(boom(2.5,60,30,0.2,500),12.6,0.25)
place(tick(1800),14.6,0.08); place(tick(1500),15.2,0.06)
place(tick(2000),16.9,0.08)
for k in range(4): place(beep(1760),18.3+k*0.22,0.07); place(beep(1760),18.4+k*0.22,0.07)
place(boom(0.6,120,60,0.6,2500),18.32,0.15)              # lights clunk on
place(sweep(1.6,200,1200,'arc',0.5),19.5,0.12)
for at in (31.2,33.26): place(tick(1600),at,0.06)
for i in range(14): place(tick(1400+i*90),35.9+i*0.14,0.04)
place(hp(rng.standard_normal(int(1.5*SR)),5000)*np.exp(-np.arange(int(1.5*SR))/SR*2)*(rng.random(int(1.5*SR))>0.97),45.9,0.2)
place(sweep(1.8,300,5000,'rise',0.4),56.2,0.12); place(chime(1567.98,1.5),56.3,0.04)
for i in range(6): place(tick(1200),60.7+i*0.55,0.06)
for i in range(3):
    place(boom(0.35,70,45,0.1,200),65.0+i*0.8,0.3); place(boom(0.3,65,40,0.1,200),65.22+i*0.8,0.22)
place(sweep(2.6,150,900,'rise',0.4),68.7,0.1); place(boom(1.5,70,35,0.2,300),73.75,0.22)
place(sweep(2.2,200,2500,'arc',0.5),75.4,0.15)
place(sweep(3.3,100,3000,'rise',0.6),84.8,0.18); place(sweep(3.6,3000,200,'fall',0.6),88.1,0.12)
place(chime(1174.7,3.0),90.4,0.06)
place(tick(2000),92.4,0.08); place(boom(0.5,110,60,0.5,2000),94.5,0.1)
place(sweep(1.8,300,4000,'arc',0.6),96.3,0.12); place(chime(880,3.5),97.0,0.06); place(chime(1318.5,3.5),99.0,0.04)
sfx=lp(sfx,10000)
ve=lp(np.abs(voice),6,1); ve/=ve.max(); duck=1-np.clip(ve*4,0,1)*0.45
mix=voice+music*duck*0.5+sfx*0.6
mix*=np.clip((DUR-t)/0.9,0,1)
mix=mix/np.abs(mix).max()*0.89
w=wave.open('astro/mix.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype(np.int16).tobytes()); w.close()
def rms(x,a,b): s=x[int(a*SR):int(b*SR)]; return 20*np.log10(np.sqrt((s**2).mean())+1e-9)
for a,b in [(0,4),(5,8),(11,15),(18,22),(30,34),(57,63),(78,84),(96,100)]:
    print(f"{a}-{b}: voice {rms(voice,a,b):.1f} music {rms(music*duck*0.5,a,b):.1f} sfx {rms(sfx*0.6,a,b):.1f}")
