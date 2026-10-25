import React from 'react';
import {Image} from 'react-native';

export default function CachedImage({uri,...props}){
 return <Image {...props} source={{uri,cache:'force-cache'}}/>;
}
