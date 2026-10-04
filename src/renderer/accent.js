const ACCENT_VARIABLES = ["--action", "--action-2", "--action-soft", "--action-ink", "--shell-accent", "--shell-active", "--green", "--green2"];
function accentContrast(a, b) {
  const luminance = rgb => rgb.map(channel => { const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  const first = luminance(a), second = luminance(b); return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}
function accentPalette(color, dark = false) {
  if (!/^#[0-9a-f]{6}$/i.test(color ?? "")) return null;
  const rgb = [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16)), background = dark ? [17, 24, 22] : [255, 255, 255];
  const accessible = (source, backdrop, brighten) => { let value = [...source]; for (let step = 0; step < 100 && accentContrast(value, backdrop) < 4.5; step++) value = value.map(channel => brighten ? channel + (255 - channel) * .05 : channel * .95); return value.map(Math.round); };
  const action = accessible(rgb, background, dark), shell = accessible(rgb, [11, 21, 21], true);
  const css = channels => `rgb(${channels.map(Math.round).join(" ")})`;
  return { "--action": css(action), "--action-2": css(action.map(channel => dark ? channel * .88 : channel + (255 - channel) * .08)), "--action-soft": `color-mix(in srgb, ${css(action)} 14%, var(--surface))`, "--action-ink": accentContrast(action, [255, 255, 255]) >= 4.5 ? "#ffffff" : "#10171d", "--shell-accent": css(shell), "--shell-active": css(shell.map(channel => channel * .32)), "--green": css(action), "--green2": css(action) };
}
function applyAccentColor(settings) {
  const root = document.documentElement, palette = accentPalette(settings?.accentColor, root.dataset.theme === "dark");
  if (palette) root.dataset.customAccent = "true"; else delete root.dataset.customAccent;
  for (const name of ACCENT_VARIABLES) if (palette) root.style.setProperty(name, palette[name]); else root.style.removeProperty(name);
}
function bindAccentSettings() {
  const input = document.querySelector("#accent-color"), reset = document.querySelector("#accent-reset");
  if (!input || !reset) return;
  const save = async color => {
    const previous = state.bootstrap.settings;
    applyAccentColor({ ...previous, accentColor: color });
    try { state.bootstrap.settings = await window.cfbToolkit.updateAccent(color); document.querySelector("#accent-color-label").textContent = color ?? "Default green"; input.value = color ?? "#087a45"; toast(color ? "App color updated" : "Default green restored"); }
    catch (error) { applyAccentColor(previous); input.value = previous.accentColor ?? "#087a45"; toast(readableError(error).message); }
  };
  input.addEventListener("input", () => applyAccentColor({ ...state.bootstrap.settings, accentColor: input.value }));
  input.addEventListener("change", () => save(input.value)); reset.addEventListener("click", () => save(null));
}
