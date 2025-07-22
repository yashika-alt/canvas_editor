declare module 'cytoscape-svg' {
  import { Core } from 'cytoscape';

  export default function svgPlugin(cytoscape: (options?: any) => Core): void;
}
