import { Vec3, KeyframesVec3 } from "https://deno.land/x/remapper@2.1.0/src/mod.ts";

/**
 * Get random floating point number between min and max
 * @param min Minimum value
 * @param max Maximum value
 * @param decimals decimal precision
 */
export function randomNumber(min: number, max: number, decimals = 3): number {
    return +(min + Math.random() * (max-min)).toFixed(decimals);
}

/**
 * Get random floating point number between -minmax and minmax
 * @param minmax boundary value
 * @param decimals decimal precision
 */
export function randomMirror(minmax: number, decimals = 3): number {
    return +(-minmax + Math.random() * 2 * minmax).toFixed(decimals);
}

/**
 * Get random integer (whole number) between min and max. Inclusive of max
 * @param min Minimum value
 * @param max Maximum value
 */
export function randomInt(min: number, max: number): number {
    return Math.floor(randomNumber(min, max+1));
}

/**
 * Get easing value of time using easeOutCirc.
 * @param time Input time
 */
export function easeOutCirc(time: number): number {
    return Math.sqrt(1 - Math.pow(time - 1, 2));
}

/**
 * Get easing value of time using easeOutExpo.
 * @param time Input time
 */
export function easeOutExpo(time: number): number {
    return time === 1 ? 1 : 1 - Math.pow(2, -10 * time);
}

/**
 * Get easing value of time using easeOutExpo.
 * @param time Input time
 * @returns 
 */
export function easeInExpo(time: number): number {
    return time === 0 ? 0 : Math.pow(2, 10 * time - 10);
}

/**
 * Get random number between -180 and 180. Used for rotation values (rr = random rotation)
 */
export function rr() {
    return randomNumber(-180, 180)
}

/**
 * range function from python. Returns array of all numbers between start and stop (excluding stop) with steps of step.
 * @param start Start value of range array
 * @param stop Stop value of range array. Not included in array.
 * @param step Steps between values in array
 */
export function range(start: number, stop?: number, step?: number): number[] {
    if (typeof stop == 'undefined') {
        // one param defined
        stop = start;
        start = 0;
    }

    if (typeof step == 'undefined') {
        step = 1;
    }

    if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
        return [];
    }

    const result: number[] = [];
    for (let i = start; step > 0 ? i < stop : i > stop; i += step) {
        result.push(i);
    }

    return result;
}

/** 
 * Stole this from stackoverflow
 * @param arr array to choose from
 * @returns random value from array
 */
export function randomChoice<T>(arr: Array<T>): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Sin function in degrees
 * @param t Angle in degrees
 * @returns {[number]} value of sin(t)
 */
export function sin(t: number): number {
    return Math.sin(t*Math.PI/180)
}

/**
 * Cos function in degrees
 * @param t Angle in degrees
 * @returns {[number]} value of cos(t)
 */
export function cos(t: number): number {
    return Math.cos(t*Math.PI/180)
}

/**
 * Mirror Vector3 in X-axis. (invert x value)
 * @param vec Input vector
 * @returns Output vector (Input vector with first value multiplied by -1)
 */
export function mirrorX(vec: Vec3) : Vec3 {
    return [-vec[0], vec[1], vec[2]] as Vec3;
}

/**
 * Create Vector3 with same values (for example [0, 0, 0], [1, 1, 1], [a, a, a])
 * @param value Value to fill vector with
 * @returns Filled vector: [value, value, value]
 */
export function eVec3(value: number) : Vec3 {
    return Array(3).fill(value) as Vec3;
}

/**
 * Create array with set length filled with value
 * @param value Value to fill array with
 * @param length Length of array
 * @returns Filled array: [value, value, value, ...]
 */
export function easyVec(value: number, length: number) : number[] {
    return Array(length).fill(value);
}

/**
 * Round number
 * @param x number to round
 * @param decimals decimals to round to
 * @returns rounded number
 */
export function rd(x: number, decimals = 3) {
    return +(x.toFixed(decimals))
}

/**
 * Super Spinner 2000 by nasafrasa I think
 * @param spins Number of spins
 * @param axis 0 = x, 1 = y, 2 = z
 * @returns spin animation as KeyframesVec3
 * @author nasafrasa
 */
export function generateSpins(spins: number, axis: number, startSpin: Vec3 = [0, 0, 0]) {
    const spinArray: KeyframesVec3 = [];
    const getTime = (value: number, index: number) => (value / spins) + (index / spins)
    let x = [0,0,0]
    let y = [0,0,0]
    let z = [0,0,0]
    if (axis == 0) { x = [0,180,360] }
    if (axis == 1) { y = [0,180,360] }
    if (axis == 2) { z = [0,180,360] }
    for (let i = 0; i < spins; i++) {
        spinArray.push([startSpin[0] + x[0], startSpin[1] + y[0], startSpin[2] + z[0], getTime(0,i)]);
        spinArray.push([startSpin[0] + x[1], startSpin[1] + y[1], startSpin[2] + z[1], getTime(0.5,i)]);
        spinArray.push([startSpin[0] + x[2], startSpin[1] + y[2], startSpin[2] + z[2], getTime(1,i)]);
    }
    return spinArray
}