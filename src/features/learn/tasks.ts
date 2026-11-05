import { program } from '../../engine/text';
import type { Program } from '../../engine/types';
import { verifyProgram } from '../../engine/verify';
import { motorProgram } from '../../plant/motor';
import type { SimTask } from '../../content/types';
import type { SimRuntime } from '../simulator/runtime';

export function taskProgram(task: SimTask): Program {
  if (!task.rungs) return motorProgram();
  const base = motorProgram();
  return program('Lesson task', [...base.tags, ...(task.extraTags ?? [])], task.rungs);
}

/** Fault to inject when the task starts. */
export function taskSetup(task: SimTask, rt: SimRuntime) {
  if (task.check === 'latch-reset') rt.scene.setFault('coilopen');
}

/** Stateful checker: call every update; returns true once the goal is met. */
export function createChecker(task: SimTask): (rt: SimRuntime) => boolean {
  let sawAlarm = false;
  let sealed = false;
  let stopSeen = false;
  return (rt) => {
    const s = rt.scene.state;
    const plc = rt.plc;
    const read = (t: string) => {
      try { return plc.tags.readBool(t); } catch { return false; }
    };
    switch (task.check) {
      case 'motor-sealed':
        return s.contactor && !s.startPressed && s.rpm > 800 && read('Motor_Run');
      case 'scan-stepped':
        return rt.stepScans >= 1;
      case 'stop-fixed':
        return s.contactor && s.rpm > 300 && !s.startPressed;
      case 'timer-done':
        return Boolean(plc.fieldDO[1]) && read('Delay_Tmr.DN');
      case 'dup-fixed':
        return s.contactor && s.rpm > 300 && !verifyProgram(plc.program).some((i) => i.code === 'duplicate-coil');
      case 'counter-five':
        return read('Part_Ctr.DN') && Boolean(plc.fieldDO[1]);
      case 'build-start-stop':
        // Pass only after the learner's own rung seals in, then Stop drops it out.
        if (s.contactor && !s.startPressed && s.rpm > 500 && read('Motor_Run')) sealed = true;
        if (sealed && s.stopPressed) stopSeen = true;
        return sealed && stopSeen && !s.contactor && !read('Motor_Run');
      case 'latch-reset':
        if (read('Fail_Alarm')) sawAlarm = true;
        return sawAlarm && !read('Fail_Alarm');
    }
  };
}
