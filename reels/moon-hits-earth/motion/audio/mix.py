import numpy as np, wave
from scipy.signal import butter, sosfilt
SR=48000; DUR=97.0; N=int(SR*DUR)
rng=np.random.default_rng(3)
t=np.arange(N)/SR
def rd(p):
    w=wave.open(p); x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768; return x
voice=np.zeros(N); v=rd('audio/voice48.wav'); voice[:len(v)]=v[:N]
def lp(x,f,o=2): return sosfilt(butter(o,f,'low',fs=SR,output='sos'),x)
def hp(x,f,o=2): return sosfilt(butter(o,f,'high',fs=SR,output='sos'),x)
def bp(x,a,b,o=2): return sosfilt(butter(o,[a,b],'band',fs=SR,output='sos'),x)
def env(points):  # piecewise linear (time, value)
    ts,vs=zip(*points); return np.interp(t,ts,vs)
def db(x): return 10**(x/20)

# ---------- music bed: A minor drone ----------
def tone(f, amp_env, det=0.3, harm=(1,0.35,0.12)):
    out=np.zeros(N)
    for d in (-det,0,det):
        ph=2*np.pi*(f+d)*t + 0.3*np.sin(2*np.pi*0.07*t+f)
        for k,a in enumerate(harm): out+=a*np.sin((k+1)*ph)
    return out*amp_env/3
inten=env([(0,0.55),(2.4,0.9),(2.6,0.15),(5.3,0.25),(5.5,0.6),(11,0.55),(16,0.6),(24,0.65),(34,0.7),(41,0.85),(50.4,1.0),(51.5,0.55),(57,0.5),(61,0.45),(64,0.6),(70,0.85),(75,1.0),(78,0.6),(79.3,0.12),(83.6,0.3),(86.4,1.0),(88,0.7),(91,0.45),(95,0.35),(97,0.0)])
bed = tone(55,1.0)*0.9 + tone(82.41,0.8)*0.6 + tone(110,1.0)*0.45 + tone(130.81,0.7)*0.3 + tone(164.81,0.6)*0.22
# slow swell lfo
bed *= 0.75+0.25*np.sin(2*np.pi*t/7.0)
bed = lp(bed,900)*inten
# shimmer for ring / beauty and ending
shim_env=env([(0,0),(51,0),(55,0.6),(61,1.0),(63.5,0.7),(64.5,0),(91,0),(92.5,0.7),(96.5,0.5),(97,0)])
shim=(tone(440,1,0.6,(1,))+tone(659.25,1,0.8,(1,))*0.7+tone(987.77,1,1.1,(1,))*0.35)*shim_env
shim*=0.6+0.4*np.sin(2*np.pi*t*0.5)
bed+=lp(shim,4000)*0.18
# dark noise rumble during destruction
rum_env=env([(0,0),(34,0),(38.5,0.4),(41.5,0.5),(50.4,0.9),(52,0.2),(64,0.3),(70,0.8),(78,0.9),(79.3,0),(86.4,1.0),(89,0.3),(91,0)])
rum=lp(rng.standard_normal(N),120,4)*rum_env*3.0
music=bed*0.22+rum*0.25

# ---------- sfx ----------
sfx=np.zeros(N)
def place(sig,at,gain=1.0):
    i=int(at*SR); j=min(N,i+len(sig)); 
    if i<N: sfx[i:j]+=sig[:j-i]*gain
def boom(dur=3.0,f0=90,f1=28,noise=0.6,bright=1500):
    n=int(dur*SR); tt=np.arange(n)/SR
    f=f1+(f0-f1)*np.exp(-tt*3); ph=2*np.pi*np.cumsum(f)/SR
    sub=np.sin(ph)*np.exp(-tt*1.6)
    nz=lp(rng.standard_normal(n),bright,2)*np.exp(-tt*4)*noise
    tail=lp(rng.standard_normal(n),300,2)*np.exp(-tt*1.2)*noise*0.8
    att=np.minimum(1,tt/0.004)
    return (sub+nz+tail)*att
def riser(dur=2.0,f0=300,f1=5000):
    n=int(dur*SR); tt=np.arange(n)/SR; k=tt/dur
    x=rng.standard_normal(n); out=np.zeros(n); seg=2400
    for s in range(0,n,seg):
        fc=f0*(f1/f0)**(s/n); out[s:s+seg]=bp(x[max(0,s-4800):s+seg],fc*0.7,min(fc*1.4,SR/2-100))[-len(x[s:s+seg]):]
    return out*(k**2)*1.6
def whoosh(dur=0.9,f0=400,f1=2500):
    n=int(dur*SR); tt=np.arange(n)/SR; k=tt/dur
    x=rng.standard_normal(n); out=np.zeros(n); seg=1200
    for s in range(0,n,seg):
        u=s/n; fc=f0+(f1-f0)*np.sin(np.pi*u); out[s:s+seg]=bp(x[max(0,s-2400):s+seg],fc*0.6,fc*1.5)[-len(x[s:s+seg]):]
    return out*np.sin(np.pi*k)**2*1.4
def tick(f=2400,dur=0.03):
    n=int(dur*SR); tt=np.arange(n)/SR; return np.sin(2*np.pi*f*tt)*np.exp(-tt*180)

place(riser(2.3,200,6000),0.05,0.25)
place(boom(3.5,110,30,0.8,2500),2.4,0.9)
place(whoosh(0.8),2.65,0.18)              # meteor pass
place(whoosh(0.6,250,900),4.15,0.15)
place(boom(4.0,70,25,0.3,600),5.42,0.55)   # the moon
for i,tt_ in enumerate(np.arange(6.72,8.6,0.075)): place(tick(1800+300*(i%3)),tt_,0.06)
place(riser(1.5,150,2500),9.4,0.18); place(whoosh(1.2,150,800),9.6,0.2)
place(whoosh(1.2,200,1200),15.6,0.16)
place(boom(2.5,80,35,0.25,500),19.5,0.25)
place(boom(2.5,80,35,0.25,500),23.7,0.35)
place(whoosh(0.5,300,3000),30.85,0.2)
place(boom(2.5,70,30,0.3,700),32.2,0.3)
q=lp(rng.standard_normal(int(3.2*SR)),90,4)*np.minimum(1,np.arange(int(3.2*SR))/SR/0.2)*np.exp(-np.arange(int(3.2*SR))/SR*0.5)*6
place(q,38.55,0.45)
place(boom(3,60,30,0.4,400),39.6,0.35)
place(riser(3.2,120,4000),47.2,0.28)
place(boom(4.5,120,25,1.0,3000),50.42,1.0)
place(whoosh(1.5,200,1500),51.2,0.18)
place(whoosh(2.0,150,900),54.4,0.2)
place(boom(3,60,30,0.2,400),58.0,0.18)
# meteor impacts in the bombardment
rr=np.random.default_rng(77)
for k in range(26):
    at=64.9+k*0.4+rr.random()*0.3
    place(boom(1.6,70,30,0.6,900), at, 0.12+0.1*rr.random())
place(boom(3.5,90,28,0.7,1500),66.65,0.5)
place(boom(4,80,25,0.6,1200),75.7,0.55)
place(riser(2.3,4000,300),81.3,0.15)   # rewind (falling sweep)
place(riser(2.6,150,5000),83.8,0.3)
place(boom(5.0,130,22,1.0,3500),86.4,1.0)
place(whoosh(2.0,120,700),88.0,0.18)
place(boom(3,60,30,0.2,500),90.0,0.25)
place(boom(4,55,28,0.15,300),94.8,0.25)
sfx=lp(sfx,9000)

# ---------- ducking ----------
ve=np.abs(voice); ve=lp(ve,6,1); ve=ve/ve.max()
duck=1-np.clip(ve*4,0,1)*0.45
mix=voice*1.0 + music*duck*0.28 + sfx*0.2
# fade out
mix*=np.clip((DUR-t)/0.8,0,1)
peak=np.abs(mix).max(); mix=mix/peak*0.89
w=wave.open('audio/mix.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((mix*32767).astype(np.int16).tobytes()); w.close()
print('peak',peak)
def rms(x,a,b): s=x[int(a*SR):int(b*SR)]; return 20*np.log10(np.sqrt((s**2).mean())+1e-9)
for a,b in [(11,16),(25,30),(38,42),(50,52),(58,61),(66,70),(86,88),(92,95)]:
    print(f"{a}-{b}: voice {rms(voice,a,b):.1f}  music {rms(music*duck*0.28,a,b):.1f}  sfx {rms(sfx*0.2,a,b):.1f}")
