// Delta-driven startup avoids timers surviving retries and pauses.
export function createRoomPower({ lights, onBrightness, onSwitch, onSecurityOnline, canActivate = () => true, onBlocked = () => {} }) {
  let activated = false;
  let elapsed = 0;
  let securityOnline = false;
  function apply(brightness) {
    for (const { light, off, on } of lights) light.intensity = off + (on - off) * brightness;
    onBrightness(brightness);
  }
  apply(0);
  return {
    get activated() { return activated; },
    get securityOnline() { return securityOnline; },
    activate() {
      if (activated) return;
      if (!canActivate()) { onBlocked(); return; }
      activated = true;
      onSwitch();
    },
    update(delta) {
      if (!activated || securityOnline) return;
      elapsed += delta;
      const brightness = elapsed < 0.14 ? 0.65 : elapsed < 0.3 ? 0.05 : elapsed < 0.46 ? 0.9 : elapsed < 0.6 ? 0.15 : Math.min(1, 0.3 + (elapsed - 0.6) * 1.4);
      apply(brightness);
      if (elapsed >= 3) {
        securityOnline = true;
        apply(1);
        onSecurityOnline();
      }
    },
  };
}
