import { Event, activeDiffGet, filterObjects, activeDiff, EventInternals } from "https://deno.land/x/remapper@2.1.0/src/mod.ts";

/**
 * Run callback on certain "trigger events". 
 * @param time_min The minimum time of the events
 * @param time_max The maximum time of the events
 * @param value The value of the event to filter out
 * @param callbackFn Callback to run on filtered events
 * @param removeTriggers Remove trigger events on function call
 * @param type The type of the event to filter out, by default 12 (left laser speed)
 */
export function onTrigger(time_min: number, time_max: number, value: number | null, callbackFn: (event: Event) => void, removeTriggers = false, removeOffEvents = false, type = 12): void {
    if (value == null) {
        filterObjects(activeDiffGet().events, time_min, time_max, "time").filter(event => event.type == type).forEach(x => {callbackFn(x)});
    } else {
        filterObjects(activeDiffGet().events, time_min, time_max, "time").filter(event => event.value == value && event.type == type).forEach(x => {callbackFn(x)});
    }
    if (removeTriggers) {
        activeDiff.events = activeDiff.events.filter(event => event.time < time_min || event.time > time_max || ((event.value != value || (event.value != 0 && removeOffEvents)) && !(value === null)) || event.type != type);
    }
}

/**
 * Run callback on all events between any time pair. Inclusive of time
 * @param times Array of time pairs, time pair is [time_start: number, time_end: number]
 * @param callbackFn Callback to run on all notes 
 */
export function multipleEventsBetweens(times: [time_start: number, time_end: number][], callbackFn: (event: EventInternals.AbstractEvent) => void): void {
    activeDiffGet().events.filter(event => times.some(timePair => event.time >= timePair[0] && event.time <= timePair[1])).forEach(x => callbackFn(x));
}

/**
 * Multiply color of event
 * @param event event to affect
 * @param rgbMult value to multiply event RGB with
 * @param alphaMult value to multiply event alpha with
 * @returns modified event
 */
export function multiplyEventColor(event: EventInternals.AbstractEvent, rgbMult: number, alphaMult: number) : EventInternals.AbstractEvent {
    if (!event.color) return event;
    if (event.color[3] == undefined) event.color[3] = 1;
    event.color = [event.color[0] * rgbMult, event.color[1] * rgbMult, event.color[2] * rgbMult, event.color[3] * alphaMult];
    return event;
}