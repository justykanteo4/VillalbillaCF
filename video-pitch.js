import { Asset } from 'expo-asset';

// Expo resolves bundled images on both web and native. React Native Web does
// not expose Image.resolveAssetSource.
export async function pitchBase64ForWeb(source) {
  const uri = Asset.fromModule(source).uri;
  if (!uri) throw Error('No se pudo cargar el campo.');
  const image = new window.Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(Error('No se pudo leer el césped.'));
    image.src = uri;
  });
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1080;
  const context = canvas.getContext('2d');
  if (!context) throw Error('Este navegador no permite preparar el vídeo.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.78).split(',')[1];
}
