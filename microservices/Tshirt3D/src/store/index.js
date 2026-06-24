import {proxy} from 'valtio';

const state = proxy({
  intro: false,
  captureTransparent: false,
  color: '#353934',
  isLogoTexture: true,
  isFullTexture: false,
  logoDecal: './superman_logo1.png',
  fullDecal: './circuit.png',
  logoPosition: [0, 0.04, 0.15],
  logoScale: 0.15,
  lightIntensity: 50,
});

export default state;