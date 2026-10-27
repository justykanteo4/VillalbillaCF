import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import {createDeviceCache} from './device-cache.cjs';
const cache=createDeviceCache({storage:AsyncStorage,files:FileSystem,folder:FileSystem.documentDirectory+'datos-guardados/'});
export const saveCopy=cache.saveCopy,readCopy=cache.readCopy,listCopies=cache.listCopies;
