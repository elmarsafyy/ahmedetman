// GLSL shaders for the reel. Everything is lit in linear HDR; the final pass grades and tonemaps.

export const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){float a=0.5,s=0.0;for(int i=0;i<5;i++){s+=a*snoise(p);p*=2.03;a*=0.5;}return s;}
float ridged(vec3 p){float a=0.5,s=0.0;for(int i=0;i<4;i++){float n=1.0-abs(snoise(p));s+=a*n*n;p*=2.1;a*=0.5;}return s;}
vec3 hash33(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.xxy+p.yxx)*p.zyx);}
// distance to the nearest voronoi cell border (crack lines)
float voronoiEdge(vec3 x){
  vec3 p=floor(x),f=fract(x); float md=8.0; vec3 mr,mg;
  for(int k=-1;k<=1;k++)for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
    vec3 g=vec3(i,j,k); vec3 r=g+hash33(p+g)-f; float d=dot(r,r); if(d<md){md=d;mr=r;mg=g;}}
  md=8.0;
  for(int k=-1;k<=1;k++)for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
    vec3 g=mg+vec3(i,j,k); vec3 r=g+hash33(p+g)-f;
    if(dot(mr-r,mr-r)>0.00001) md=min(md,dot(0.5*(mr+r),normalize(r-mr)));}
  return md;
}
`;

const BUMP = /* glsl */`
vec3 perturb(vec3 surfPos, vec3 n, float h){
  vec2 dHdxy=vec2(dFdx(h),dFdy(h));
  vec3 sx=dFdx(surfPos), sy=dFdy(surfPos);
  vec3 R1=cross(sy,n), R2=cross(n,sx);
  float det=dot(sx,R1);
  vec3 grad=sign(det)*(dHdxy.x*R1+dHdxy.y*R2);
  return normalize(abs(det)*n-grad);
}
`;

export const planetVert = /* glsl */`
varying vec2 vUv; varying vec3 vN; varying vec3 vP; varying vec3 vL;
void main(){
  vUv=uv; vL=position; vN=normalize(mat3(modelMatrix)*normal);
  vec4 wp=modelMatrix*vec4(position,1.0); vP=wp.xyz;
  gl_Position=projectionMatrix*viewMatrix*wp;
}`;

export const earthFrag = /* glsl */`
uniform sampler2D dayMap, nightMap, brcMap, floodMap, lavaMap;
uniform vec3 sunDir, camPos, atmoColor;
uniform float uTime, cloudOffset, uFlood, uFloodPulse, uQuake, uRedSky, uDry, uFire, uNight, uExposure;
uniform vec3 hot[16];
uniform vec4 imp[12];
uniform float impSize[12];
uniform float uNow;
varying vec2 vUv; varying vec3 vN; varying vec3 vP; varying vec3 vL;
${NOISE}
${BUMP}
void main(){
  vec3 N0=normalize(vN);
  vec3 V=normalize(camPos-vP);
  vec4 brc=texture2D(brcMap,vUv);
  float land=smoothstep(0.3,0.7,brc.g);
  vec3 N=perturb(vP,N0,brc.r*0.012);
  float ndl0=dot(N0,sunDir);
  float dif=max(dot(N,sunDir),0.0);
  float dayMix=smoothstep(-0.08,0.22,ndl0);
  vec3 day=texture2D(dayMap,vUv).rgb;
  vec3 night=texture2D(nightMap,vUv).rgb;

  // oceans boiling away -> exposed dark seabed
  vec3 seabed=mix(vec3(0.05,0.04,0.035),vec3(0.12,0.08,0.06),brc.r);
  day=mix(day,seabed,(1.0-land)*uDry);

  // coastal flooding
  float fz=texture2D(floodMap,vUv).r;
  float fl=fz*uFlood;
  day=mix(day,vec3(0.02,0.07,0.12),fl*0.85);

  vec3 col=day*dif*1.25*dayMix + day*0.012;
  // clouds (drift slowly)
  float cl=texture2D(brcMap,vUv+vec2(cloudOffset,0.0)).b;
  cl=smoothstep(0.15,0.9,cl)*(1.0-uDry*0.4);
  vec3 cloudLit=vec3(1.0)*(dif*0.95+0.004);
  col=mix(col,cloudLit,cl*0.92*smoothstep(-0.25,0.15,ndl0+0.1));
  // ocean glint
  vec3 H=normalize(sunDir+V);
  float spec=pow(max(dot(N0,H),0.0),160.0)*0.35;
  col+=vec3(1.0,0.92,0.8)*spec*(1.0-land)*(1.0-uDry)*(1.0-cl)*dayMix;
  // city lights on the night side
  float nightMask=(1.0-dayMix)*(1.0-cl*0.7);
  col+=pow(night,vec3(1.6))*vec3(1.0,0.78,0.5)*1.6*uNight*nightMask*(1.0-uFire);

  vec3 emis=vec3(0.0);
  // flood zones highlighted
  emis+=vec3(0.1,0.55,1.0)*fz*uFloodPulse*1.3;

  // red-hot sky: smoke-laden clouds glowing from below
  float lum=dot(col,vec3(0.3,0.5,0.2));
  col=mix(col,vec3(lum)*vec3(1.1,0.42,0.2),uRedSky*0.75);
  emis+=vec3(1.0,0.25,0.05)*cl*uRedSky*0.25;

  // volcanoes
  if(uQuake>0.001){
    for(int i=0;i<16;i++){
      float d=distance(normalize(vL),hot[i]);
      float pulse=0.65+0.35*sin(uTime*7.0+float(i)*2.3);
      emis+=vec3(1.0,0.33,0.06)*(exp(-d*d/0.00035)*5.0+exp(-d*d/0.004)*0.7)*uQuake*pulse;
    }
  }
  // magma world
  if(uFire>0.001){
    vec3 p=normalize(vL);
    float n=fbm(p*2.2)*0.5+0.5;
    float m=smoothstep(n-0.08,n+0.08,uFire*1.25-0.12);
    float cr=ridged(p*5.0+vec3(0.0,uTime*0.01,0.0));
    float cr2=1.0-abs(snoise(p*18.0));
    vec3 lava=texture2D(lavaMap,vUv*vec2(6.0,3.0)).rgb;
    float glow=pow(cr/0.95,9.0)*1.3+pow(cr2,24.0)*0.35;
    vec3 crust=vec3(0.03,0.022,0.02)*(dif*1.3+0.04)+lava*vec3(0.25,0.06,0.02)*0.25;
    vec3 hotc=mix(vec3(1.0,0.12,0.01),vec3(1.0,0.45,0.08),clamp(glow-0.5,0.0,1.0));
    vec3 magma=crust+hotc*glow*1.8;
    col=mix(col,magma,m);
    emis*=1.0-m*0.5;
  }
  // impacts
  for(int i=0;i<12;i++){
    if(imp[i].w<0.0) continue;
    float age=uNow-imp[i].w;
    if(age<0.0) continue;
    float s=impSize[i];
    float d=acos(clamp(dot(normalize(vL),imp[i].xyz),-1.0,1.0));
    float flash=exp(-age*4.0)*exp(-d*d/((0.0004+age*0.0012)*s*s))*5.0;
    float ring=exp(-pow((d-age*0.05*s)/(0.006*s),2.0))*exp(-age*1.6)*0.9;
    float crater=exp(-d*d/(0.00025*s*s))*exp(-age*0.3)*1.6;
    emis+=vec3(1.0,0.6,0.3)*(flash+ring)+vec3(1.0,0.28,0.04)*crater;
  }
  // atmosphere rim on the disc
  float fres=pow(1.0-max(dot(N0,V),0.0),2.6);
  vec3 atm=atmoColor*fres*smoothstep(-0.35,0.45,ndl0)*1.5;
  col+=atm;
  gl_FragColor=vec4((col+emis)*uExposure,1.0);
}`;

export const atmoVert = /* glsl */`
varying vec3 vP;
void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vP=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`;

export const atmoFrag = /* glsl */`
uniform vec3 camPos, center, sunDir, atmoColor; uniform float radius, thick, strength;
varying vec3 vP;
void main(){
  vec3 rd=normalize(vP-camPos);
  vec3 oc=center-camPos;
  float tc=dot(oc,rd);
  vec3 closest=camPos+rd*tc;
  float b=length(closest-center);
  float h=max(b-radius,0.0)/thick;
  float dens=exp(-h*4.0)*smoothstep(1.0,0.6,h);
  vec3 dir=normalize(closest-center);
  float lit=smoothstep(-0.45,0.35,dot(dir,sunDir));
  // forward scattering when looking towards the sun
  float fw=pow(max(dot(rd,sunDir),0.0),8.0);
  vec3 c=atmoColor*dens*lit*strength*(1.0+fw*3.0);
  // warm band at the terminator
  float term=exp(-pow(dot(dir,sunDir)/0.25,2.0));
  c+=vec3(1.0,0.45,0.15)*dens*term*0.15*strength;
  gl_FragColor=vec4(c,1.0);
}`;

export const moonFrag = /* glsl */`
uniform sampler2D map; uniform vec3 sunDir, camPos, tint; uniform float uCrack, uHot, uExposure, uAmb, uTime, texScale, uTri;
varying vec2 vUv; varying vec3 vN; varying vec3 vP; varying vec3 vL;
${NOISE}
${BUMP}
void main(){
  vec3 N0=normalize(vN);
  vec2 uv=vUv*texScale;
  vec3 a=texture2D(map,uv).rgb;
  if(uTri>0.5){
    vec3 q=vL*2.5; vec3 w=abs(normalize(vL)); w=pow(w,vec3(4.0)); w/=w.x+w.y+w.z;
    a=texture2D(map,q.yz).rgb*w.x+texture2D(map,q.xz).rgb*w.y+texture2D(map,q.xy).rgb*w.z;
  }
  float h=dot(a,vec3(0.333));
  vec3 N=perturb(vP,N0,h*0.0025);
  float dif=max(dot(N,sunDir),0.0);
  vec3 col=a*tint*(dif*1.5+uAmb);
  vec3 emis=vec3(0.0);
  if(uCrack>0.001){
    vec3 p=normalize(vL)*3.2;
    float e=voronoiEdge(p);
    float e2=voronoiEdge(p*2.7+3.1);
    float w=0.012+uCrack*0.035;
    float c=smoothstep(w,0.0,e)+smoothstep(w*0.6,0.0,e2)*smoothstep(0.35,1.0,uCrack);
    c*=smoothstep(0.0,0.25,uCrack);
    emis+=vec3(1.0,0.32,0.05)*c*(1.0+uCrack*1.6)*(0.85+0.15*sin(uTime*30.0+e*40.0));
    col*=1.0-c*0.6;
  }
  if(uHot>0.001){
    vec3 p=normalize(vL);
    float g=pow(ridged(p*4.0),2.0);
    emis+=mix(vec3(1.0,0.2,0.03),vec3(1.0,0.55,0.2),g)*(0.4+g*2.5)*uHot;
    col*=1.0-uHot*0.7;
  }
  gl_FragColor=vec4((col+emis)*uExposure,1.0);
}`;

export const pointsVert = /* glsl */`
attribute float aSize; attribute vec3 aColor; attribute float aAlpha;
varying vec3 vC; varying float vA;
uniform float uScale, uMaxPx;
void main(){
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  gl_Position=projectionMatrix*mv;
  float s=aSize*uScale/max(-mv.z,0.001);
  gl_PointSize=clamp(s,1.0,uMaxPx);
  vC=aColor; vA=aAlpha*clamp(s,0.0,1.0)*smoothstep(0.05,0.25,-mv.z);
}`;

export const pointsFrag = /* glsl */`
varying vec3 vC; varying float vA; uniform float uSoft;
void main(){
  vec2 q=gl_PointCoord*2.0-1.0; float r=dot(q,q);
  if(r>1.0) discard;
  float f=mix(1.0-smoothstep(0.55,1.0,r),exp(-r*4.0),uSoft);
  gl_FragColor=vec4(vC*f*vA,1.0);
}`;

export const starsVert = /* glsl */`
attribute float aSize; attribute vec3 aColor; varying vec3 vC; uniform float uBright;
void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=aSize; vC=aColor*uBright; }`;
export const starsFrag = /* glsl */`
varying vec3 vC;
void main(){ vec2 q=gl_PointCoord*2.0-1.0; float r=dot(q,q); if(r>1.0) discard; gl_FragColor=vec4(vC*exp(-r*3.5),1.0); }`;

export const shellFrag = /* glsl */`
uniform vec3 camPos, color; uniform float strength;
varying vec2 vUv; varying vec3 vN; varying vec3 vP; varying vec3 vL;
void main(){
  vec3 N=normalize(vN); vec3 V=normalize(camPos-vP);
  float f=pow(1.0-abs(dot(N,V)),3.0);
  float lines=smoothstep(0.92,1.0,abs(sin(vL.y*40.0)))*0.25;
  gl_FragColor=vec4(color*(f*1.2+lines*f+0.04)*strength,1.0);
}`;

export const skyFrag = /* glsl */`
uniform float uAmt; varying vec2 vUv;
void main(){
  float y=vUv.y;
  vec3 top=vec3(0.004,0.008,0.02);
  vec3 mid=vec3(0.02,0.035,0.07);
  vec3 hor=vec3(0.22,0.12,0.07);
  vec3 c=mix(hor,mid,smoothstep(0.30,0.55,y));
  c=mix(c,top,smoothstep(0.55,1.0,y));
  gl_FragColor=vec4(c*uAmt,1.0);
}`;

export const finalFrag = /* glsl */`
uniform sampler2D tDiffuse; uniform float uTime, uFlash, uFade, uGrain, uVig, uCA, uSat;
uniform vec3 uFlashColor, uLift, uGain;
varying vec2 vUv;
float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
vec3 aces(vec3 x){const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0);}
void main(){
  vec2 uv=vUv; vec2 cc=uv-0.5;
  float ca=uCA*dot(cc,cc);
  vec3 col;
  col.r=texture2D(tDiffuse,uv-cc*ca).r;
  col.g=texture2D(tDiffuse,uv).g;
  col.b=texture2D(tDiffuse,uv+cc*ca).b;
  col=col*uGain+uLift;
  col+=uFlashColor*uFlash;
  col=aces(col*1.05);
  float l=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(l),col,uSat);
  // subtle teal shadows / warm highlights
  col=mix(col,col*vec3(0.92,1.0,1.06),(1.0-l)*0.35);
  col=pow(col,vec3(1.0/2.2));
  float v=smoothstep(0.95,0.25,length(cc*vec2(1.0,0.75)));
  col*=mix(1.0,v,uVig);
  float g=h12(gl_FragCoord.xy+fract(uTime*7.31)*vec2(913.1,371.7))-0.5;
  col+=g*uGrain;
  col*=uFade;
  gl_FragColor=vec4(col,1.0);
}`;
