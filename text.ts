// deno-lint-ignore-file adjacent-overload-signatures no-explicit-any
// cry about it
import { 
    Vec3, ColorType, copy, arrAdd, rotatePoint, lerp, Wall, OptimizeSettings, ModelObject,
    isSimple, RawKeyframesAny, EASE, SPLINE, KeyframeValues, complexifyArray, ComplexKeyframesVec3,
    optimizeAnimation, bakeAnimation, Animation, parseFilePath, cacheData, FILEPATH, RawKeyframesVec3
} from "https://deno.land/x/remapper@2.1.0/src/mod.ts";
import { three } from "https://deno.land/x/remapper@2.1.0/src/deps.ts";

// This is a very bad and probably inefficient "port" of the Text class from v3 remapper to v2.
// You have to set the Z position of the objects otherwise some will be far away (for some reason (?) idk remapper is weird)

type TextObject = {
    pos: Vec3,
    rot: Vec3,
    scale: Vec3,
    color?: ColorType,
    track?: string
}

type Transform = {
    pos?: Vec3,
    rot?: Vec3,
    scale?: Vec3
}
type Bounds = {
    lowBound: Vec3,
    highBound: Vec3,
    scale: Vec3,
    midPoint: Vec3
}
/** Array of keyframes which have any amount of values. */
type ComplexKeyframesAny = ComplexKeyframesAbstract<number[]>;
/** Helper type for complex keyframes. */
type ComplexKeyframesAbstract<T extends number[]> = SingleKeyframeAbstract<T>[]
/** Helper type for single keyframes. */
type SingleKeyframeAbstract<T extends number[]> = [...T, TimeValue, KeyframeFlag?, KeyframeFlag?, KeyframeFlag?];
/** Any flag that could be in a keyframe. E.g. easings, splines */
type KeyframeFlag = EASE | SPLINE;
/** Easings and splines. */
type Interpolation = EASE | SPLINE;
/** Time value in a keyframe. */
type TimeValue = number;

class Keyframe {
    /** The data stored in this keyframe. */
    data: KeyframeValues

    /**
     * Interface for keyframes in animations.
     * A keyframe looks something like [x,y,z,time,easing].
     * It is separated into values (x,y,z), time, and flags (easings, splines.. etc).
     * Anything that is a string is considered a flag.
     * A keyframe can have any amount of values.
     * @param data The data stored in this keyframe.
     */
    constructor(data: KeyframeValues) {
        this.data = data;
    }

    /** The index of the time value. */
    get timeIndex() {
        for (let i = this.data.length - 1; i >= 0; i--)
            if (typeof this.data[i] !== "string") return i;
        return -1;
    }

    /** The time value. */
    get time() { return this.data[this.timeIndex] as number }
    /** The values in the keyframes.
     * For example [x,y,z,time] would have [x,y,z] as values.
     */
    get values() { return this.data.slice(0, this.timeIndex) as number[] }
    /** The easing in the keyframe. Returns undefined if not found. */
    get easing() { return this.data[this.getFlagIndex("ease", false)] as EASE }
    /** The spline in the keyframe. Returns undefined if not found. */
    get spline() { return this.data[this.getFlagIndex("spline", false)] as SPLINE }
    /** Whether this keyframe has the "hsvLerp" flag. */
    get hsvLerp() { return this.getFlagIndex("hsvLerp") !== -1 }

    set time(value: number) { this.data[this.timeIndex] = value }
    set values(value: number[]) { for (let i = 0; i < this.timeIndex; i++) this.data[i] = value[i] }
    set easing(value: EASE) { this.setFlag(value, "ease") }
    set spline(value: SPLINE) { this.setFlag(value, "spline") }
    set hsvLerp(value: boolean) {
        if (value) this.setFlag("hsvLerp")
        else {
            const flagIndex = this.getFlagIndex("hsvLerp");
            if (flagIndex !== -1) arrRemove(this.data, flagIndex);
        }
    }

    /**
     * Set a flag in the keyframe.
     * @param value The flag to be set.
     * @param old An existing flag containing this will be replaced by the value.
     */
    setFlag(value: string, old?: string) {
        let index = this.getFlagIndex(old ? old : value, old === undefined);
        if (index === -1) index = this.data.length;
        this.data[index] = value as any;
    }

    /**
     * Gets the index of a flag.
     * @param flag The flag to look for.
     * @param exact Whether it should be an exact match, or just contain the flag argument.
     */
    getFlagIndex(flag: string, exact = true) {
        if (exact) return this.data.findIndex(x => typeof x === "string" && x === flag);
        return this.data.findIndex(x => typeof x === "string" && x.includes(flag));
    }
}

export class Text {
    /** How the text will be anchored horizontally. */
    horizontalAnchor: "Left" | "Center" | "Right" = "Center";
    /** How the text will be anchored vertically. */
    verticalAnchor: "Top" | "Center" | "Bottom" = "Bottom";
    /** The position of the text box. */
    position: Vec3 | undefined = undefined;
    /** The rotation of the text box. */
    rotation: Vec3 | undefined = undefined;
    /** The scale of the text box. */
    scale: Vec3 | undefined = undefined;
    /** The height of the text box. */
    height = 2;
    /** The height of the text model. Generated from input. */
    modelHeight = 0;
    /** A scalar of the model height which is used to space letters. */
    letterSpacing = 0.8;
    /** A scalar of the letter spacing which is used as the width of a space. */
    wordSpacing = 0.8;
    /** The model data of the text. */
    model: TextObject[] = [];

    /**
     * An interface to generate objects from text.
     * Each object forming a letter in your model should have a track for the letter it's assigned to.
     * @param input The model data of the text. Can be either a path to a model or a collection of objects.
     */
    constructor(input: string | TextObject[]) {
        this.import(input);
    }

    /**
     * Import a model for the text.
     * @param input The model data of the text. Can be either a path to a model or a collection of objects.
     */
    import(input: string | TextObject[]) {
        if (typeof input === "string") this.model = getModel(input) as TextObject[];
        else this.model = input;
        const bounds = getBoxBounds(this.model);
        this.modelHeight = bounds.highBound[1];
    }

    /**
     * Generate an array of objects containing model data for a string of text.
     * @param text The string of text to generate.
     */
    toObjects(text: string) {
        const letters: Record<string, {
            model: TextObject[],
            bounds: Bounds
        }> = {};
        const model: TextObject[] = [];

        function getLetter(char: string, self: Text) {
            if (letters[char]) return letters[char];
            const letterModel: TextObject[] = self.model.filter(x => x.track === char);
            if (letterModel.length === 0) return undefined;

            letters[char] = {
                model: letterModel, 
                bounds: getBoxBounds(letterModel)
            }
            return letters[char];
        }

        let length = 0;
        const letterWidth = this.modelHeight * this.letterSpacing;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (char === " ") {
                length += letterWidth * this.wordSpacing;
                continue;
            }

            const letter = getLetter(char, this);
            if (letter === undefined) continue;

            letter.model.forEach(x => {
                const letterModel = {
                    pos: copy(x.pos),
                    rot: copy(x.rot),
                    scale: copy(x.scale)
                }
                letterModel.pos[0] -= letter.bounds.lowBound[0];
                letterModel.pos[2] -= letter.bounds.lowBound[2];
                letterModel.pos[0] += length;
                letterModel.pos[0] += (letterWidth - letter.bounds.scale[0]) / 2;
                model.push(letterModel);
            })
            length += letterWidth;
        }

        const scalar = this.height / this.modelHeight;
        let transform: undefined | Transform = undefined;
        if (this.position || this.rotation || this.scale) {
            transform = {
                pos: this.position,
                rot: this.rotation,
                scale: this.scale
            }
        }

        model.forEach(x => {
            if (this.horizontalAnchor === "Center") x.pos[0] -= length / 2;
            if (this.horizontalAnchor === "Right") x.pos[0] -= length;

            x.pos = x.pos.map(y => y * scalar) as Vec3;
            x.scale = x.scale.map(y => y * scalar) as Vec3;

            if (transform) {
                const combined = combineTransforms(x, transform);
                x.pos = combined.pos;
                x.rot = combined.rot;
                x.scale = combined.scale;
            }

            if (this.verticalAnchor === "Center") x.pos[1] -= this.height / 2;
            if (this.verticalAnchor === "Top") x.pos[1] -= this.height;
        })

        return model;
    }

    /**
     * Generate walls from a string of text.
     * @param text The string of text to generate.
     * @param start Wall's lifespan start.
     * @param end Wall's lifespan end.
     * @param wall A callback for each wall being spawned.
     * @param distribution Beats to spread spawning of walls out. 
     * Animations are adjusted, but keep in mind path animation events for these walls might be messed up.
     * @param animFreq The frequency for the animation baking (if using array of objects).
     * @param animOptimizer The optimizer for the animation baking (if using array of objects).
     */
    toWalls(
        text: string,
        start: number,
        end: number,
        wall?: (wall: Wall) => void,
        distribution = 1,
        animFreq?: number,
        animOptimizer = new OptimizeSettings()
    ) {
        const model = this.toObjects(text);
        modelToWall(model, start, end, wall, distribution, animFreq, animOptimizer);
    }
}

/**
 * Converts a three number array to three Vector3.
 * @param v Array to convert.
 */
const toVec3 = (v: Vec3) => new three.Vector3(...v);

/**
 * Gets information about the bounding box of a box or a bunch of boxes.
 * @param boxes Can be one box or an array of boxes.
 */
function getBoxBounds(boxes: Transform | Transform[]): Bounds {
    let lowBound: Vec3 | undefined;
    let highBound: Vec3 | undefined;

    const boxArr = Array.isArray(boxes) ? boxes : [boxes];

    boxArr.forEach(b => {
        const pos = b.pos ?? [0, 0, 0];
        const rot = b.rot ?? [0, 0, 0];
        const scale = b.scale ?? [1, 1, 1];

        const corners: Vec3[] = [
            [-1, 1, 1],
            [1, 1, 1],
            [-1, -1, 1],
            [1, -1, 1],
            [-1, 1, -1],
            [1, 1, -1],
            [-1, -1, -1],
            [1, -1, -1]
        ]

        corners.forEach(c => {
            c = c.map((x, i) => (x / 2) * scale[i]) as Vec3;
            c = rotatePoint(c, rot);
            c = arrAdd(c, pos) as Vec3

            if (lowBound === undefined) {
                lowBound = copy(c);
                highBound = copy(c);
                return;
            }

            c.forEach((x, i) => {
                if ((lowBound as Vec3)[i] > x) (lowBound as Vec3)[i] = x;
                if ((highBound as Vec3)[i] < x) (highBound as Vec3)[i] = x;
            })
        })
    })

    const scale = (lowBound as Vec3).map((x, i) => Math.abs(x - (highBound as Vec3)[i])) as Vec3;
    const midPoint = (lowBound as Vec3).map((x, i) => lerp(x, (highBound as Vec3)[i], 0.5)) as Vec3;

    return {
        lowBound: lowBound as Vec3,
        highBound: highBound as Vec3,
        scale: scale,
        midPoint: midPoint
    }
}

/**
 * Applies 2 transformations to each other.
 * @param target Input transformation.
 * @param transform Transformation to apply.
 * @param anchor 
 * @returns 
 */
function combineTransforms(target: Transform, transform: Transform, anchor: Vec3 = [0, 0, 0]) {
    target = copy(target);
    transform = copy(transform);

    target.pos ??= [0, 0, 0];
    target.pos = arrSubtract(target.pos, anchor);

    const targetM = getMatrixFromTransform(target);
    const transformM = getMatrixFromTransform(transform);
    targetM.premultiply(transformM);
    target = getTransformFromMatrix(targetM);

    return {
        pos: target.pos as Vec3,
        rot: target.rot as Vec3,
        scale: target.scale as Vec3
    };
}

/**
 * Takes a transformation and converts it to matrix.
 * @param transform Transform to convert.
 */
function getMatrixFromTransform(transform: Transform) {
    const m = new three.Matrix4();
    const pos = transform.pos ?? [0, 0, 0];
    const rot = transform.rot ?? [0, 0, 0];
    const scale = transform.scale ?? [1, 1, 1];
    m.compose(toVec3(pos), toQuaternion(rot), toVec3(scale));
    return m;
}

/**
 * Takes matrix and converts it to a transformation.
 * @param matrix Matrix to convert.
 */
function getTransformFromMatrix(matrix: three.Matrix4) {
    const pos = new three.Vector3();
    const q = new three.Quaternion();
    const scale = new three.Vector3();
    matrix.decompose(pos, q, scale);
    const rot = rotFromQuaternion(q);
    return {
        pos: toArr(pos),
        rot: rot,
        scale: toArr(scale)
    }
}

/**
 * Subtract either a number or another array from an array.
 * @param arr Input array.
 * @param value Can be a number or an array.
 */
function arrSubtract<T extends readonly [] | readonly number[]>
    (arr: T, value: { [K in keyof T]: number } | number) {
    if (typeof value === "number") return arr.map(x => x - value) as unknown as T;
    else return arr.map((x, i) => x - value[i]) as unknown as T;
}

/**
 * Converts a three number array to three Quaternion.
 * @param v Array to convert.
 */
const toQuaternion = (v: Vec3) => new three.Quaternion().setFromEuler(toEuler(v));

/**
 * Converts a quaternion to a euler rotation.
 * @param q Input quaternion.
 */
function rotFromQuaternion(q: three.Quaternion) {
    let euler = new three.Euler(0, 0, 0, "YXZ").setFromQuaternion(q).toArray() as number[];
    euler.pop();
    euler = toDegrees(euler);
    return euler as Vec3;
}

/**
 * Converts a three number array to three Euler.
 * @param v Array to convert.
 */
const toEuler = (v: Vec3) => new three.Euler(...toRadians(v), "YXZ");

/**
 * Convert an array of numbers from degrees to radians.
 * @param values Input array of numbers.
 */
function toRadians<T extends number[] | []>(values: T) {
    return values.map(x => x * (Math.PI / 180)) as T;
}

/**
 * Convert three Vector3 and Euler classes to a three number array.
 * @param v Vector or Euler to convert.
 */
const toArr = (v: three.Vector3 | three.Euler) => [v.x, v.y, v.z] as Vec3;

/**
 * Convert an array of numbers from radians to degrees.
 * @param values Input array of numbers.
 */
function toDegrees<T extends number[] | []>(values: T) {
    return values.map(x => x * (180 / Math.PI)) as T;
}

let modelToWallCount = 0;

/**
 * Function to represent objects as walls.
 * @param input Can be a path to a model or an array of objects.
 * @param start Wall's lifespan start.
 * @param end Wall's lifespan end.
 * @param wall A callback for each wall being spawned.
 * @param distribution Beats to spread spawning of walls out. 
 * Animations are adjusted, but keep in mind path animation events for these walls might be messed up.
 * @param animFreq The frequency for the animation baking (if using array of objects).
 * @param animOptimizer The optimizer for the animation baking (if using array of objects).
 */
export function modelToWall(
    input: string | ModelObject[],
    start: number,
    end: number,
    wall?: (wall: Wall) => void,
    distribution?: number,
    animFreq?: number,
    animOptimizer = new OptimizeSettings()
) {
    animFreq ??= 1 / 64;
    distribution ??= 1;

    const dur = end - start;

    let objects: ModelObject[] = [];
    modelToWallCount++;

    function isAnimated(obj: ModelObject) {
        return (
            !isSimple(obj.pos) ||
            !isSimple(obj.rot) ||
            !isSimple(obj.scale)
        )
    }

    function getDistributeNums(index: number, length: number) {
        const fraction = (length - index) / (length - 1);
        const backwardOffset = (distribution as number) * fraction;
        const newLife = dur + backwardOffset;
        const animMul = dur / newLife;
        const animAdd = 1 - animMul;

        return {
            backwardOffset: backwardOffset,
            newLife: newLife,
            animMul: animMul,
            animAdd: animAdd
        }
    }

    function distributeWall(o: Wall, index: number, length: number) {
        if (distribution === undefined || length < 1) return;
        const nums = getDistributeNums(index, length);

        o.life = nums.newLife;
        o.lifeStart = start - nums.backwardOffset;
        distributeAnim(o.animate.dissolve as RawKeyframesAny, index, length);
    }

    function distributeAnim(anim: RawKeyframesAny, index: number, length: number) {
        if (distribution === undefined || length < 1) return;
        const nums = getDistributeNums(index, length);

        if (isSimple(anim)) return anim;
        (anim as ComplexKeyframesAny).forEach(k => {
            const keyframe = new Keyframe(k);
            const newTime = (keyframe.time * nums.animMul) + nums.animAdd;
            k[keyframe.timeIndex] = newTime;
        })
    }

    const w = new Wall();
    w.life = end - start;
    w.lifeStart = start;
    w.animate.dissolve = [[0, 0], [1, 0]];
    w.position = [0, 0];
    w.interactable = false;

    if (typeof input === "string") {
        objects = getModel(input, `modelToWall_${modelToWallCount}`, o => {
            o.forEach((x, i) => {
                const animated = isAnimated(x);

                const pos = complexifyArray(x.pos);
                const rot = complexifyArray(x.rot);
                const scale = complexifyArray(x.scale);

                const getVec3 = (keyframes: ComplexKeyframesVec3, index: number) =>
                    [keyframes[index][0], keyframes[index][1], keyframes[index][2]] as Vec3

                for (let i = 0; i < pos.length; i++) {
                    const wtw = worldToWall(getVec3(pos as ComplexKeyframesVec3, i), getVec3(rot as ComplexKeyframesVec3, i), getVec3(scale as ComplexKeyframesVec3, i), animated);
                    pos[i] = [...wtw.pos, pos[i][3]];
                    scale[i] = [...wtw.scale, scale[i][3]];
                }

                x.pos = optimizeAnimation(pos, animOptimizer) as RawKeyframesVec3;
                x.rot = optimizeAnimation(rot, animOptimizer) as RawKeyframesVec3;
                x.scale = optimizeAnimation(scale, animOptimizer) as RawKeyframesVec3;

                distributeAnim(x.pos, i, o.length);
                distributeAnim(x.rot, i, o.length);
                distributeAnim(x.scale, i, o.length);
            })
        }, [animOptimizer, distribution]);
    }
    else {
        objects = input.map((x, i) => {
            x = copy(x);
            const animated = isAnimated(x);

            const anim = bakeAnimation({
                pos: x.pos,
                rot: x.rot,
                scale: x.scale
            }, k => {
                const wtw = worldToWall(k.pos, k.rot, k.scale, animated);
                k.pos = wtw.pos;
                k.scale = wtw.scale;
            }, animFreq, animOptimizer)

            x.pos = anim.pos;
            x.rot = anim.rot;
            x.scale = anim.scale;

            distributeAnim(x.pos, i, input.length);
            distributeAnim(x.rot, i, input.length);
            distributeAnim(x.scale, i, input.length);

            return x;
        })
    }

    objects.forEach((x, i) => {
        const o = copy(w);
        o.animate = new Animation().wallAnimation(o.animation);

        o.animate.definitePosition = x.pos;
        if (x.color) o.color = x.color;

        if (isSimple(x.rot)) o.localRotation = x.rot as Vec3;
        else o.animate.localRotation = x.rot;

        if (isSimple(x.scale)) o.scale = x.scale as Vec3;
        else {
            o.scale = [1, 1, 1];
            o.animate.scale = x.scale;
        }
        o.interactable = false;
        o.fake = true;

        distributeWall(o, i, objects.length);

        if (wall) wall(o);
        o.push();
    })
}

/**
 * Remove a single element of an array, mutating it.
 * @param arr Array to mutate.
 * @param index Element to remove. Can be -1 to remove last element.
 */
function arrRemove(arr: any[], index: number) {
    if (index === -1) index = arr.length - 1;
    if (index > arr.length - 1 || index < 0) return;

    for (let i = index; i < arr.length - 1; i++) {
        arr[i] = arr[i + 1];
    }

    arr.length -= 1;
}

/**
 * Get the objects from a .rmmodel, caches data if model hasn't changed.
 * @param filePath Path to the .rmmodel.
 * @param name Name to cache the data as. Defaults to file name.
 * @param process Function to run for each object on the cached data.
 * @param processing Parameters that will re-process the data if changed.
 */
function getModel(filePath: FILEPATH, name?: string, process?: (objects: ModelObject[]) => void, processing?: any[]) {
    const parsedPath = parseFilePath(filePath, ".rmmodel");
    const inputPath = parsedPath.path;
    const mTime = Deno.statSync(inputPath).mtime?.toString();
    processing ??= [];
    processing.push.apply(processing, [mTime, process?.toString()]);

    name ??= parsedPath.name;

    return cacheData(name, () => {
        const data = JSON.parse(Deno.readTextFileSync(parseFilePath(filePath, ".rmmodel").path));
        if (process) process(data.objects);
        return data.objects as ModelObject[];
    }, processing);
}

/**
 * Calculate the correct position for a wall to line up with a position in the world.
 * Assumes that position is set to [0,0].
 * @param pos Position of the wall in world space.
 * @param rot Rotation of the wall in world space.
 * @param scale Scale of the wall in world space.
 * @param animated Corrects for animated scale. If you are using this, plug [1,1,1] into static scale.
 */
function worldToWall(pos: Vec3 = [0, 0, 0], rot: Vec3 = [0, 0, 0], scale: Vec3 = [1, 1, 1], animated = false) {
    scale = scale.map(x => x / 0.6 * 2) as Vec3;

    pos = [
        pos[0] /= 0.6,
        pos[1] /= 0.6,
        pos[2] /= 0.6
    ]

    let offset = [0, -0.5, -0.5] as Vec3;
    offset = rotatePoint(rot, offset.map((x, i) => x * scale[i]) as Vec3);
    pos = arrAdd(pos, offset) as Vec3;

    pos[1] += 0.2;
    pos[0] -= animated ? 0.5 : scale[0] / 2;

    return {
        pos: pos,
        scale: scale
    };
}