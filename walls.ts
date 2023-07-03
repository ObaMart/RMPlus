import { activeDiffGet, Wall } from "https://deno.land/x/remapper@2.1.0/src/mod.ts";

/**
 * Run callback on all walls. Basically wallsBetween but without time value stuff
 * @param callbackFn Callback to run on all notes
 */
export function onAllWalls(callbackFn: (wall: Wall) => void): void {
    activeDiffGet().walls.forEach(x => callbackFn(x));
}
