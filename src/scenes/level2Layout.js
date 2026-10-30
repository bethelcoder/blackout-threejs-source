import * as THREE from 'three';

// Shared level-2 anchors. The terminal station, its chair, the TX-CORE service
// bay, the sticky note and the mains socket all have to agree on where the
// workstation ended up after it moved off the back wall, so the numbers live
// here once instead of being hard-coded in five builders.
//
// Room: 14 x 16 x 4.2, x = left(-)/right(+), z = back(-8)/front(+8).

export const ROOM = { wallX: 6.98, wallZ: 7.98, height: 4.2 };

// Server racks removed from the right wall to make room for the workstation.
export const RACK_GAPS = [-5.3, -6.6];

// The imported L-desk puts its usable wing 0.7828 m along local -x from the
// station origin, at desktop height (see arrangeTerminalStation).
export const DESK_WING = { x: -0.7828, y: 1.0437, z: 0 };

// rotationY = PI turns the station through 180 deg from its original pose:
// the L-desk now runs with its keyboard wing against the right wall, so the
// chair in front of it faces the wall (+x) and the player looks at the screen.
export const TERMINAL = { x: 5.676, z: -5.6, rotationY: Math.PI };

export function terminalComputerPosition(placement = TERMINAL) {
  const point = new THREE.Vector3(DESK_WING.x, DESK_WING.y, DESK_WING.z);
  point.applyAxisAngle(new THREE.Vector3(0, 1, 0), placement.rotationY);
  return point.add(new THREE.Vector3(placement.x, 0, placement.z));
}

// World position of the retro computer's base centre: (6.459, 1.044, -5.6).
export const COMPUTER = terminalComputerPosition();

// Chair sits in the L-void, directly in front of the computer, facing +x
// (the wall). The supplied chair faces +X at rotationY = 0.
export const CHAIR = {
  x: 5.40,
  z: -5.60,
  rotationY: 0,
  seatPosition: new THREE.Vector3(5.40, 1.32, -5.60),
  seatTarget: new THREE.Vector3(COMPUTER.x, 1.26, COMPUTER.z),
};

// TX-CORE service bay on the wall above the terminal (yaw -PI/2 makes its
// local +z, the direction the bay is built in, point into the room).
// Dropped from y = 3.05 to y = 2.65 — the old height read as "up on the
// ceiling" from a seated eye level and it was a stretch to click.
export const SERVICE_BAY = { position: new THREE.Vector3(6.90, 2.65, COMPUTER.z), yaw: -Math.PI / 2 };

// Where the maintenance tag sits if the imported computer fails to load.
export const STICKY_FALLBACK = {
  position: new THREE.Vector3(6.90, 1.80, COMPUTER.z + 0.88),
  yaw: -Math.PI / 2,
};

// Mains socket strip on the right wall, behind the desk in the freed rack bay.
// Backplate is 0.026 deep, so 6.965 puts it flush on the wall face at 6.98.
export const SOCKET_STRIP = { position: new THREE.Vector3(6.965, 0.55, -6.95), yaw: -Math.PI / 2 };

// Open supply crate — sits in the front-right corner where the old orange
// toolbox used to be. Holds the extension lead the terminal needs.
export const SUPPLY_CRATE = { x: 5.7, z: 7.35, ry: 0.35 };

// TX-03: same outer footprint as the other left-wall lockers, but a hollow
// carcass so the door opens onto a real cavity instead of a painted face.
export const TX03 = {
  z: -4.1,
  carcass: { x: -6.5, w: 1.4, h: 3.5, d: 1.0 },
  faceX: -6.00,
  cavity: { backX: -6.94, bottomY: 0.06, topY: 3.44, z0: -4.76, z1: -3.44 },
  door: { w: 1.30, h: 3.38, y0: 0.06, t: 0.022 },
};

// Document rack beside the workbench; the equipment register lives on it.
export const PAPER_RACK = { x: -6.83, z: 3.05, yaw: Math.PI / 2 };

// Workbench on the west wall (design.js): top surface at y = 0.94.
export const BENCH = { x: -6.45, z: 1.1, topY: 0.94, x0: -6.85, x1: -6.05, z0: -0.2, z1: 2.4 };

// Where the three shadow-board tools are lying at level start, in slot order.
export const BENCH_TOOLS = [
  { x: -6.44, z: 0.05, ry: 0.12 },
  { x: -6.46, z: 0.42, ry: -0.26 },
  { x: -6.43, z: 0.79, ry: 0.40 },
];