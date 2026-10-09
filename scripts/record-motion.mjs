// Patch the archived renderer at build time, preserving its verified source bytes.
function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) {
    throw new Error(`Record renderer patch no longer matches: ${before.slice(0, 70)}`);
  }
  return source.replace(before, after);
}

export function applyRecordMotion(source) {
  source = replaceOnce(source, 'uniform float uFlowTime;', 'uniform float uFlowTime;\nuniform mediump float uPointMode;\nvarying mediump float vGold;');
  source = replaceOnce(source, 'uniform float uPointMode;', 'uniform float uPointMode;\nvarying mediump float vGold;');
  source = replaceOnce(source,
    '  vAlpha=aAlpha*(.48+focus*1.48)*hubFade*rimFade*(.96+.04*sin(uTime*1.256637));',
    `  // Each grain has its own phase and height; the field never spins with the disc.
  float floatPhase=aT*37.7+aPhase*3.1+aNormal*83.+aMicro*5.;
  float twinkle=pow(.5+.5*sin(uTime*(.85+aMicro*.30)+floatPhase),4.);
  float glint=step(1.38,aBrightness)*uPointMode;
  // Give a stable quarter of the fine grains a warm yellow tint.
  vGold=step(.75,fract(sin(aT*127.1+aNormal*311.7+aPhase*74.7)*43758.5453))*uPointMode;
  vAlpha=aAlpha*(.48+focus*1.48)*hubFade*rimFade
    *mix(.22,.34+twinkle*.58,uPointMode);`);
  source = replaceOnce(source,
    '  vBrightness=aBrightness*(1.35+focus*1.18)*(1.0+live*uLevel*0.28);',
    '  vBrightness=aBrightness*(1.10+focus*.60)*(1.0+live*uLevel*.15);');
  source = replaceOnce(source,
    '  gl_PointSize=(aSize*1.35+live*uLevel*0.45)*uPixelRatio;',
    '  gl_PointSize=clamp(aSize*.95+live*uLevel*.15+glint*twinkle*.35,.65,1.50)*uPixelRatio;');
  source = replaceOnce(source,
    'colorFor(vPart)*vBrightness*fieldGain',
    'mix(colorFor(vPart),vec3(1.0,.78,.30),vGold)*vBrightness*fieldGain');
  source = replaceOnce(source,
    '  float rotationCos=cos(uRotation),rotationSin=sin(uRotation);',
    `  // Lift the glow above the vinyl and let individual points gently wander.
  position.x+=.012*sin(uTime*.32+aPart*1.7)
    +uPointMode*.014*sin(uTime*(.40+aSpeed*8.)+floatPhase);
  position.y+=.085+.015*sin(uTime*.38+aPart*1.3)
    +uPointMode*.022*sin(uTime*(.48+aSpeed*6.)+floatPhase*1.2);
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
