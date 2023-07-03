import { Difficulty, KeyframesAny } from "https://deno.land/x/remapper@2.1.0/src/mod.ts";

/**
 * Push point definition to _pointDefinitions array
 * @param diff difficulty to push to
 * @param name name of point definition
 * @param points points of point definition
 */
export function pushPointDef(diff: Difficulty, name: string, points: KeyframesAny): void {
    diff.pointDefinitions.push({
        _name: name,
        _points: points
    })
}