/* Global display preference. Exact source values remain available to tool logic. */
function currentRatingsDisplay() {
  return ToolkitRatingsDisplay.normalize(typeof state === 'undefined' ? 'numeric' : state.bootstrap?.settings?.ratingsDisplay);
}
function displayRating(value, options) { return ToolkitRatingsDisplay.format(value, currentRatingsDisplay(), options); }
function displayRatingText(value) { return ToolkitRatingsDisplay.text(value, currentRatingsDisplay()); }
function displayRatingField(field, value) { return ToolkitRatingsDisplay.isRatingField(field) ? displayRating(value) : value; }
function displayRatingSummary(item) { return /\b(?:avg|average|overall|OVR)\b/i.test(item.label) ? displayRating(item.value) : item.value; }
function displayRatingDelta(value) {
  if (currentRatingsDisplay() === 'numeric') return `${value > 0 ? '+' : ''}${value}`;
  return value > 0 ? '↑' : value < 0 ? '↓' : 'Unchanged';
}
function displayRatingDifference(value) { return currentRatingsDisplay() === 'numeric' ? forceSigned(value) : 'Hidden'; }
function ratingsDisplaySettings() {
  const mode = currentRatingsDisplay();
  return `<section class="card ratings-display-settings"><h2>Ratings Display</h2><p class="muted">Match Beyond the Field so the toolkit does not reveal exact player or team ratings.</p><label for="ratings-display">Show Ratings As</label><select id="ratings-display" data-order="preserve">${ToolkitRatingsDisplay.choices.map(choice => `<option value="${choice.value}"${choice.value === mode ? ' selected' : ''}>${escapeHtml(choice.label)}</option>`).join('')}</select><p class="muted" data-ratings-example>${ratingsDisplayExample(mode)}</p><p class="muted">Applies throughout the app, including previews and saved reviews. Changes how ratings look, not how tools work. Numeric inputs, player sorting, filters and CSV exports keep their real values.</p></section>`;
}
function ratingsDisplayExample(mode) {
  return mode === 'numeric' ? 'Shows exact ratings, such as 85.' : mode === 'hidden' ? 'Player and team ratings appear as a dash (–).' : `Example: a rating of 85 appears as ${ToolkitRatingsDisplay.format(85, mode)}.`;
}
function bindRatingsDisplay() {
  const control = document.getElementById('ratings-display');
  if (!control || control.dataset.bound) return;
  control.dataset.bound = 'true';
  control.addEventListener('change', async () => {
    const previous = currentRatingsDisplay(); control.disabled = true;
    try {
      const saved = await window.cfbToolkit.updateRatingsDisplay(control.value);
      state.bootstrap.settings = saved;
      const example = document.querySelector('[data-ratings-example]');
      if (example) example.textContent = ratingsDisplayExample(currentRatingsDisplay());
      toast('Ratings display saved.');
    } catch (error) { control.value = previous; toast(readableError(error).message); }
    finally { control.disabled = false; }
  });
}
