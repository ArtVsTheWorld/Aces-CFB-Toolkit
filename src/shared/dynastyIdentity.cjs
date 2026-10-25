(function(root){
  const validDynastyId=id=>Number.isInteger(id)&&id!==0&&id>=-2147483648&&id<=2147483647;
  const dynastyKey=id=>{if(!validDynastyId(id))throw Error('A valid dynasty identifier is required.');return 'cfb27-dynasty:'+id;};
  const historyForSave=(entries,save)=>{
    if(!save?.path)return [];
    if(validDynastyId(save.dynastyId))return entries.filter(entry=>entry.dynastyId===save.dynastyId);
    if(save.schema?.kind!=='roster')return [];
    // Non-dynasty roster files can still have local activity; never borrow a known
    // dynasty's runs just because its old filename has been reused.
    return entries.filter(entry=>!validDynastyId(entry.dynastyId)&&String(entry.inputPath??'').toLowerCase()===save.path.toLowerCase());
  };
  const api=Object.freeze({validDynastyId,dynastyKey,historyForSave});
  if(typeof module==='object'&&module.exports)module.exports=api;else root.ToolkitDynastyIdentity=api;
})(typeof globalThis==='object'?globalThis:this);
