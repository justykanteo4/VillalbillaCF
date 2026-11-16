import {useEffect,useState} from 'react';
const listeners=new Set();let visible=false;
export function setFantasyOfferVisible(value){visible=value;for(const fn of listeners)fn(value)}
export function useFantasyOfferVisible(){const [value,setValue]=useState(visible);useEffect(()=>{listeners.add(setValue);setValue(visible);return()=>listeners.delete(setValue)},[]);return value}
