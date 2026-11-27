module.exports=function basePath(value=process.env.PAGES_BASE_PATH||''){
 const base=value.replace(/\/+$/,'');
 if(base!==''&&(!/^\/[a-zA-Z0-9_.-]+$/.test(base)||['/.','/..'].includes(base)))throw new Error('PAGES_BASE_PATH moet leeg zijn of één repositorypad, bijvoorbeeld /zwemstad');
 return base;
};
