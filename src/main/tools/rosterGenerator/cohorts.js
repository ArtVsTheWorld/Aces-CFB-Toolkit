// Source zero is the hand-authored EA baseline. Later sources are independently
// audited, game-generated cohorts; never limit variety to one particular year.
export const isGeneratedProfile=profile=>Number.isInteger(profile?.source)&&profile.source>0;
export function developmentReferenceProfiles(model){
  const sources=model.catalog?.sources??[],marked=sources.findIndex(source=>source.developmentReference===true),year=sources.findIndex(source=>source.year===2032),index=marked>0?marked:year>0?year:1;
  const baseline=model.profiles.filter(profile=>profile.source===index);
  return baseline.length?baseline:model.profiles.filter(isGeneratedProfile);
}
