// Patch the archived renderer at build time, preserving its verified source bytes.
function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) {
    throw new Error(`Record renderer patch no longer matches: ${before.slice(0, 70)}`);
  }
  return source.replace(before, after);
}

export function applyRecordMotion(source) {
  source = replaceOnce(source, 'uniform float uFlowTime;', 'uniform float uFlowTime;\nuniform mediump float uPointMode;');
  source = replaceOnce(source,
    '  vAlpha=aAlpha*(.48+focus*1.48)*hubFade*rimFade*(.96+.04*sin(uTime*1.256637));',
    `  // Each grain has its own phase and height; the field never spins with the disc.
  float floatPhase=aT*37.7+aPhase*3.1+aNormal*83.+aMicro*5.;
  float twinkle=pow(.5+.5*sin(uTime*(1.35+aMicro*.55)+floatPhase),4.);
  float glint=step(1.38,aBrightness)*uPointMode;
  vAlpha=aAlpha*(.48+focus*1.48)*hubFade*rimFade
    *mix(.42,.40+twinkle*1.65,uPointMode);`);
  source = replaceOnce(source,
    '  gl_PointSize=(aSize*1.35+live*uLevel*0.45)*uPixelRatio;',
    '  gl_PointSize=(aSize*1.35+live*uLevel*0.45+glint*twinkle*2.8)*uPixelRatio;');
  source = replaceOnce(source,
    '  float rotationCos=cos(uRotation),rotationSin=sin(uRotation);',
    `  // Lift the glow above the vinyl and let individual points gently wander.
  position.x+=.018*sin(uTime*.42+aPart*1.7)
    +uPointMode*.025*sin(uTime*(.58+aSpeed*8.)+floatPhase);
  position.y+=.085+.023*sin(uTime*.53+aPart*1.3)
    +uPointMode*.040*sin(uTime*(.72+aSpeed*6.)+floatPhase*1.2);
  float rotationCos=cos(uRotation),rotationSin=sin(uRotation);`);
  source = replaceOnce(source, 'u.uniform1f(v,N)', 'u.uniform1f(v,0)');
  source = replaceOnce(source, 'e.dataset.rotation=String(N)',
    'e.dataset.rotation=`0`,e.dataset.motion=`floating-twinkle`,e.dataset.motionTime=String(s?0:A)');
  return source;
}

export function applyRecordLayout(source) {
  // Keep both existing responsive rules at 90% of their previous size.
  source = replaceOnce(source, '.demo-record{width:82%;', '.demo-record{width:73.8%;');
  source = replaceOnce(source, '.demo-record{width:88%;', '.demo-record{width:79.2%;');
  // A larger transparent canvas lets the floating glow extend beyond the rim.
  return replaceOnce(source, '.record-particles{z-index:1}',
    '.record .record-particles{z-index:1;border-radius:0;width:118%;height:118%;inset:-9%;pointer-events:none}');
}
