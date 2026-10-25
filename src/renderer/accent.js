const ACCENT_VARIABLES = ["--action", "--action-2", "--action-soft", "--action-ink", "--shell-accent", "--shell-active", "--green", "--green2"];
function accentContrast(a, b) {
  const luminance = rgb => rgb.map(channel => { const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  const first = luminance(a), second = luminance(b); return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}
function mainPalette(color,dark=false){
  const rgb=/^#[0-9a-f]{6}$/i.test(color??'')?[1,3,5].map(index=>parseInt(color.slice(index,index+2),16)):[128,128,128];
  const mix=(base,weight)=>base.map((channel,index)=>Math.round(channel*(1-weight)+rgb[index]*weight)),css=value=>`rgb(${value.join(' ')})`;
  const surface=mix(dark?[20,20,23]:[255,255,255],color&&dark ? .16 : 0),second=mix(dark?[27,27,31]:[245,245,248],color&&dark ? .17 : 0),third=mix(dark?[34,34,39]:[234,234,239],color&&dark ? .20 : 0),sidebar=mix([14,14,19],color ? .20 : 0),sidebar2=mix([23,23,29],color ? .22 : 0);
  return {'--surface':css(surface),'--surface-2':css(second),'--surface-3':css(third),'--ink':dark?'#f4f4f7':'#17171d','--subtle-ink':dark?'#c5c5cf':'#494954','--line':css(mix(dark?[65,65,73]:[206,206,215],color&&dark ? .12 : 0)),'--sidebar':css(sidebar),'--sidebar-2':css(sidebar2),'--sidebar-border':css(mix([58,58,67],color ? .20 : 0))};
}
function accentPalette(color, dark = false, baseColor=null) {
  if (!/^#[0-9a-f]{6}$/i.test(color ?? "")) return null;
  const base=mainPalette(baseColor,dark),rgb = [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16)), background = base['--surface-3'].match(/\d+/g).map(Number);
  const accessible = (source, backdrop, brighten) => { let value = [...source]; for (let step = 0; step < 100 && accentContrast(value, backdrop) < 4.5; step++) value = value.map(channel => brighten ? channel + (255 - channel) * .05 : channel * .95); return value.map(Math.round); };
  const action = accessible(rgb, background, dark), shell = accessible(rgb, base['--sidebar-2'].match(/\d+/g).map(Number), true);
  const css = channels => `rgb(${channels.map(Math.round).join(" ")})`;
  return { "--action": css(action), "--action-2": css(action.map(channel => dark ? channel + (255 - channel) * .08 : channel * .90)), "--action-soft": `color-mix(in srgb, ${css(action)} 14%, var(--surface))`, "--action-ink": accentContrast(action, [255, 255, 255]) >= 4.5 ? "#ffffff" : "#10171d", "--shell-accent": css(shell), "--shell-active": css(shell.map(channel => channel * .32)), "--green": css(action), "--green2": css(action) };
}
function applyAccentColor(settings) {
  const root = document.documentElement, dark=root.dataset.theme==='dark';
  for(const [name,value]of Object.entries(mainPalette(settings?.baseColor,dark)))root.style.setProperty(name,value);
  const palette = accentPalette(settings?.accentColor??(dark?'#31c878':'#087a45'),dark,settings?.baseColor);
  if (palette) root.dataset.customAccent = "true"; else delete root.dataset.customAccent;
  for (const name of ACCENT_VARIABLES) if (palette) root.style.setProperty(name, palette[name]); else root.style.removeProperty(name);
}
function bindAccentSettings() {
  for(const [id,key,method,fallback,label]of [['accent','accentColor','updateAccent','#087a45','Default green'],['base','baseColor','updateBaseColor','#808080','Neutral']]){
    const input=document.querySelector('#'+id+'-color'),reset=document.querySelector('#'+id+'-reset');if(!input||!reset)continue;
    let revision=0;
    const save=async color=>{const request=++revision,previous=state.bootstrap.settings[key];state.bootstrap.settings[key]=color;applyAccentColor(state.bootstrap.settings);
      const paint=()=>{if(!input.isConnected)return;input.value=state.bootstrap.settings[key]??fallback;document.querySelector('#'+id+'-color-label').textContent=state.bootstrap.settings[key]??label;};paint();
      try{await window.cfbToolkit[method](color);if(request===revision)toast(id==='base'?'Main color updated':'Accent color updated');}
      catch(error){if(request===revision){state.bootstrap.settings[key]=previous;applyAccentColor(state.bootstrap.settings);paint();toast(readableError(error).message);}}
    };
    input.addEventListener('input',()=>applyAccentColor({...state.bootstrap.settings,[key]:input.value}));input.addEventListener('change',()=>save(input.value));reset.addEventListener('click',()=>save(null));
  }
}
