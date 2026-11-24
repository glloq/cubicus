import {DirectionalLight, PointLight, SpotLight} from 'three';

const CONSTRUCTORS = {directional:DirectionalLight,point:PointLight,spot:SpotLight};

export function createLight(type) {
  const Light = CONSTRUCTORS[type] ?? DirectionalLight;
  const light = new Light(0xffffff, 2);
  if (type !== 'directional') light.decay = 0;
  light.position.set(5,7.071,5);
  light.shadow.mapSize.set(1024,1024);
  light.shadow.bias = -.0003;
  return light;
}
