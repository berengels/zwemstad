const basePath=require('./scripts/base-path.cjs');
module.exports=({config})=>({...config,experiments:{...config.experiments,baseUrl:basePath()}});
