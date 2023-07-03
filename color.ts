import { Vec3, EventInternals } from "https://deno.land/x/remapper@2.1.0/src/mod.ts";
import { randomNumber } from "./math.ts"
import { arrAdd } from "https://deno.land/x/remapper@2.1.0/src/general.ts";

/**
 * Hex2Rgb function I stole from stackoverflow. Converts hex string to rgb array
 * @param hex Hex string to convert to rgb
 * @returns {[number, number, number]} RGB array with values from 0-1
 */
export function hex2rgb(hex: string): [number, number, number] {
    if (hex.startsWith("#")) {
        hex = hex.slice(1)
    }
    if (hex.length != 6) {
        throw "Only six-digit hex colors are allowed.";
    }

    const aRgbHex = hex.match(/.{1,2}/g);
    return [
        //@ts-ignore h
        +(parseInt(aRgbHex[0], 16)/255).toFixed(4),
        //@ts-ignore h
        +(parseInt(aRgbHex[1], 16)/255).toFixed(4),
        //@ts-ignore h
        +(parseInt(aRgbHex[2], 16)/255).toFixed(4)
    ];
}

/**
 * Hexa2Rgba function I stole from stackoverflow. Converts hex string to rgb array
 * @param hex Hex string to convert to rgb
 * @param alpha value
 * @returns {[number, number, number number]} RGBA array with values from 0-1
 */
export function hexa2rgba(hex: string, alpha: number): [number, number, number, number] {
    if (hex.startsWith("#")) {
        hex = hex.slice(1)
    }
    if (hex.length != 6) {
        throw "Only six-digit hex colors are allowed.";
    }

    const aRgbHex = hex.match(/.{1,2}/g);
    return [
        //@ts-ignore h
        +(parseInt(aRgbHex[0], 16)/255).toFixed(4),
        //@ts-ignore h
        +(parseInt(aRgbHex[1], 16)/255).toFixed(4),
        //@ts-ignore h
        +(parseInt(aRgbHex[2], 16)/255).toFixed(4),
        alpha
    ];
}

/**
 * HSVtoRGB function I stole from stackoverflow. Modified to take and return alpha value.
 * Converts HSVA to RGBA. Useful for randomized colors in specific hue range.
 * @param h Hue of color
 * @param s Saturation of color
 * @param v Value of color
 * @param alpha alpha value for RGB
 * @returns {[number, number, number, number]} RGBA array with rgb values from 0-1 and alpha input value.
 */
export function HSVAtoRGBA(hsva: [h: number, s: number, v: number, alpha: number]): [number, number, number, number] {
    const [h, s, v, alpha] = hsva;
    let r: number, g: number, b: number;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
        default: r = 0, g = 0, b = 0; break;
    }
    return [r, g, b, alpha];
}

// input: r,g,b in [0,1], out: h in [0,1) and s,v in [0,1]
export function RGBAtoHSVA(rgba: [r: number, g: number, b: number, alpha: number]) : [number, number, number, number] {
    const [r, g, b, a] = rgba;
    const v = Math.max(r,g,b), c=v-Math.min(r,g,b);
    const h = c && ((v==r) ? (g-b)/c : ((v==g) ? 2+(b-r)/c : 4+(r-g)/c)); 
    return [(h<0?h+6:h)/6, v&&c/v, v, a];
}

export function flicker(event: EventInternals.AbstractEvent, intensity: number, preserveZeroes=true) : EventInternals.AbstractEvent {
    if (!event.color || preserveZeroes && event.color[3] != undefined && event.color[3] == 0) return event;
    if (event.color[3] == undefined) event.color[3] = 1;
    event.color = [event.color[0], event.color[1], event.color[2], Math.abs(event.color[3] + randomNumber(-intensity, intensity))];
    return event;
}

export function multiplyColor(color: [number, number, number, number], rgbMult: number, alphaMult: number) : [number, number, number, number] {
    return [color[0] * rgbMult, color[1] * rgbMult, color[2] * rgbMult, color[3] * alphaMult];
}

/**
 * Extrapolates Vec3 values for animations. 
 * @param startPos 
 * @param endPos 
 * @param startTime 
 * @param endTime 
 * @param desiredTime 
 * @returns 
 */
export function extrapolateVec3(startPos: Vec3, endPos: Vec3, startTime: number, endTime: number, desiredTime: number): Vec3 {
    const differenceArr: Vec3 = arrSubtract(endPos, startPos)
    const differenceTime = endTime - startTime;
    return (desiredTime > endTime)
        ? endPos.map((v, i) => v += ((desiredTime - endTime) / differenceTime) * differenceArr[i]) as Vec3
        : startPos.map((v, i) => v -= ((startTime - desiredTime) / differenceTime) * differenceArr[i]) as Vec3;
}

/**
 * Interpolates Vec3 values for animations
 * @param startPos 
 * @param endPos 
 * @param desiredTime 
 * @returns 
 */
export function interpolateVec3(startPos: Vec3, endPos: Vec3, desiredTime: number): Vec3 {
    const differencePos: Vec3 = arrSubtract(endPos, startPos)
    return arrAdd(startPos, differencePos.map(v => v * desiredTime)) as Vec3;
}

/**
 * Subtract either a number or another array from an array. (Stolen from RMv3)
 * @param arr Input array.
 * @param value Can be a number or an array.
 */
function arrSubtract<T extends readonly [] | readonly number[]>
    (arr: T, value: { [K in keyof T]: number } | number) {
    if (typeof value === "number") return arr.map(x => x - value) as unknown as T;
    else return arr.map((x, i) => x - value[i]) as unknown as T;
}