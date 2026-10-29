const {getDefaultConfig}=require('expo/metro-config');
const config=getDefaultConfig(__dirname);
config.resolver.assetExts.push('clubdata');
module.exports=config;
