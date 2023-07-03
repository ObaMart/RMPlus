import { activeDiffGet, Note } from "https://deno.land/x/remapper@2.1.0/src/mod.ts";

/**
 * Run callback on all notes. Basically notesBetween but without time value stuff
 * @param callbackFn Callback to run on all notes
 */
export function onAllNotes(callbackFn: (note: Note) => void): void {
    activeDiffGet().notes.forEach(x => callbackFn(x));
}

/**
 * Run callback on all notes between any time pair. Inclusive of time
 * @param times Array of time pairs, time pair is [time_start: number, time_end: number]
 * @param callbackFn Callback to run on all notes
 */
export function multipleNotesBetweens(times: [time_start: number, time_end: number][], callbackFn: (note: Note) => void): void {
    activeDiffGet().notes.filter(note => times.some(timePair => note.time >= timePair[0] && note.time <= timePair[1])).forEach(x => callbackFn(x));
}