// Type definitions for uuid package
declare module 'uuid' {
  export function v4(): string;
  export function v1(): string;
  export function v3(namespace: string, name: string): string;
  export function v5(namespace: string, name: string): string;
  export function validate(uuid: string): boolean;
  export function version(uuid: string): number;
  export const NIL: string;
  export const MAX: string;
}
