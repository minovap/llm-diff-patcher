declare module 'unidiff' {
  export function diffLines(a: string | string[], b: string | string[], callback?: any): any[];
  export function formatLines(changes: any[], options?: {
    aname?: string;
    bname?: string;
    context?: number;
    pre_context?: number;
    post_context?: number;
  }): string;
  export function diffAsText(a: string | string[], b: string | string[], options?: any): string;
  export function assertEqual(actual: string | string[], expected: string | string[], okFn: any, label: string, logFn?: any): void;
  
  // Add other exports from the module as needed
}
