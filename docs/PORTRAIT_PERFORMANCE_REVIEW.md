# Portrait performance investigation

Status: research prototype only. No portrait files, display UI or image-loading code were added to the app. The approved tone changes are separate.

## Method

Used Electron37.10.3 with the actual application scripts/styles and Roster Generator review-card renderer. The fixture was a real read-only170-player preview; each trial displayed100rows with48px portraits. Compared no portraits,96pxJPEG,180pxJPEG and original512pxWEBP, eager vs native per-image lazy loading, explicit four-worker decode batching, and ASAR asset packs. Three runs per main candidate, order reversed between repeats; fresh renderer partitions. A180-frame fast scroll traversed each full page. No save writes in the benchmark. Three independent copied-save tone tests validate actual Preview/Apply separately.

This is a software-rendered hidden/offscreen Windows test. OS file caches were not flushed, and archive metadata warms between windows. Measurements are local renderer results, not end-to-end tool/first-install timing or a guarantee for every GPU. No hardware-accelerated interactive or long-session all-tool portrait integration has been completed.

## Candidate result

Fresh-window medians for the generic-only pack:

| Case | First visible preview ready | Scroll frame p95 | Frames over33.4ms |
| --- | ---: | ---: | ---: |
| No portraits | 133.9ms | 16.7ms | 0 |
|96px thumbnails,100-row page,48px display | 162.2ms | 16.8ms | 0 |

Median first-visible overhead was about28.3ms. All benchmark windows made zero portrait requests before the preview was rendered. A future implementation can defer the portrait pack until review; its final packaged startup still needs measurement.

The generic-pack steady combined main+renderer private-memory medians were193.0MiB baseline and196.5MiB with portraits. The first pack opening had a larger transient difference (about34MiB against the first baseline), including metadata/heap activity. Do not treat the steady3.5MiB difference as a peak limit. A separate first-use probe of the full27042-file pack retained about56MiB more combined private memory than its baseline. Prefer the small generic pack initially.

In the original-image sweep,512px eager portraits reached about310.3MiB renderer working set after scrolling versus about205MiB for that sweep's baseline. Small page-bounded thumbnails were around209–212MiB. The large originals add roughly100MiB in this case, consistent with their decoded size. Working-set values are noisy and include shared process pages; they are not the image bytes alone.

## Approaches to avoid

Native per-image loading=lazy was poor in this stress test:96px thumbnails produced about66.8ms p95 scroll frames and roughly1082.8MiB renderer working set. Larger images showed the same pattern. This may include software/offscreen compositor behavior; it is a strong reason not to ship that approach untested on the actual app.

Predecoding all100thumbs in four workers before attaching URLs avoided scroll stalls but delayed faces to about1014.4ms. Straightforward current-page thumbnail loading was faster and smoother here.

One early deferred-only helper failed during Electron shutdown after recording its trials. Final packed/generic/memory runs used graceful shutdown and completed with empty error logs. Use those final runs as the candidate evidence; the earlier deferred-only file is diagnostic.

## Disk footprint

| Portrait set | Original512px files |180px JPEG |96px JPEG |
| --- | ---: | ---: | ---: |
| Currently observed generic heads (4,211) | 112.4MB | 21.2MB | 8.7MB |
| All generic heads (5,040) | 134.1MB | 25.4MB | 10.4MB |
| Unique/NIL portraits (22,001) | 562.1MB | 106.2MB | 44.4MB |
| Entire archive (27,042) | 696.2MB | 131.6MB | 54.8MB |

These are file bytes, not installer/update compressed sizes. A generic96px ASAR prototype is11.7MB including its index. The full archive's96px ASAR is61.7MB. No research assets are inside src or the review build.

## Recommendation

Start with optional portraits in Roster Generator Cards only, using96px thumbnails displayed at48px. Load only the current100-row page once the review is shown, with async decoding and fixed dimensions; avoid native per-image lazy loading in this app until verified otherwise. Use the generic-only pack, a fallback silhouette for missing references and a Show Portraits option. Keep tables compact; full-size faces belong in an individual-player detail view.

Keep save parsing/generation/Apply independent of image loading. Use existing generic-head IDs already present in RG results. Other tools' original-player/Unique-NIL mapping, lean preview DTO changes, rapid page/search cancellation, long-session cache limits, real GPU scrolling, cold-install startup and updater/package impact still need implementation-specific checks before extending it app-wide. Existing Unique/NIL filenames do not alone establish safe generated-head mappings.

Evidence and private prototypes: outputs/tone-portrait-benchmark/. Authoritative candidate logs are renderer-generic.log/.err,renderer-packaged.log/.err,renderer-memory.log/.err and their JSON files. Raw initial sweep is renderer-benchmark.json; source tests/native tests are separate. No images have been enabled in production source.
