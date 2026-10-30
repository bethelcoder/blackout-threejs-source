// Keep this static outline identical in the shader and contact calculation.
// Surface ripples move independently, so the puddle edge does not pulse.
export const puddleShapeGLSL = `
  float puddleDistance(vec2 q) {
    return length(q) + 0.055 * sin(7.0 * q.x + 3.0 * q.y)
                     + 0.04 * sin(11.0 * q.y - 4.0 * q.x);
  }
`;

function isWet(x, z) {
  const qx = (x + 5.775) / 1.225;
  // The water plane is rotated -90 degrees around X.
  const qy = -(z - 1.4) / 2.4;
  const distance = Math.hypot(qx, qy) + 0.055 * Math.sin(7 * qx + 3 * qy)
    + 0.04 * Math.sin(11 * qy - 4 * qx);
  return distance < 0.86;
}

export function touchesPuddle(x, z) {
  // Sample the player's foot area instead of the old rectangular bounding box.
  return isWet(x, z) || isWet(x - 0.3, z) || isWet(x + 0.3, z)
    || isWet(x, z - 0.3) || isWet(x, z + 0.3)
    || isWet(x - 0.21, z - 0.21) || isWet(x + 0.21, z - 0.21)
    || isWet(x - 0.21, z + 0.21) || isWet(x + 0.21, z + 0.21);
}
