import { Environment, Vec3, LOOKUP } from "https://deno.land/x/remapper@2.1.0/src/mod.ts";
import { mirrorX } from "./math.ts"
const yeet = <Vec3>[0, -69420, 0];

/**
 * Remove array of ids with desired lookup method
 * @param ids Environment ids to filter out
 * @param lookup Lookup method to use
 */
export function removeIds(ids: string[], lookup: LOOKUP = "Contains"): void {
    let removePiece;
    for (const id of ids) {
        removePiece = new Environment(id, lookup);
        removePiece.position = yeet
        removePiece.push()
    }
}

/**
 * Mirrors environment object around X axis
 * @param env env object to mirror
 * @param lookupReplace 
 * @param mirrorRotation 
 * @returns 
 */
export function mirrorEnv(env: Environment, lookupReplace: [string, string], mirrorRotation = false) : Environment {
    env.id = env.id.replace(lookupReplace[0], lookupReplace[1])
    if (env.position) {
        env.position = mirrorX(env.position);
    }
    if (mirrorRotation && env.rotation) {
        env.rotation = mirrorX(env.rotation).map(x => x *= -1) as Vec3;
    }
    return env;
}