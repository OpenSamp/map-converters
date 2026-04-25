// Quaternion conversions for the GTA:SA IPL format.
//
// The reference (mta-map-to-ipl/server.lua) uses a Shepperd-style algorithm with
// *full-angle* sines/cosines. That formula recovers magnitudes correctly but its
// sign-recovery step drops the sign of `rotZ` for plane rotations, so round-tripping
// `(0,0,-108)` gives back `(0,0,+108)` — a different rotation in 3D. We use the
// standard ZYX half-angle formula instead, which is mathematically correct and
// round-trips exactly. The X/Y negation kept from the reference matches MTA Editor's
// rotation convention (the editor flips rotX/rotY relative to GTA's coordinate basis).

export function eulerDegToQuaternion(
  rxDeg: number,
  ryDeg: number,
  rzDeg: number,
): [number, number, number, number] {
  const rx = (-rxDeg * Math.PI) / 360; // half-angle, with X negated to match MTA
  const ry = (-ryDeg * Math.PI) / 360; // half-angle, with Y negated
  const rz = (rzDeg * Math.PI) / 360;  // half-angle, Z preserved
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  const w = cx * cy * cz + sx * sy * sz;
  const x = sx * cy * cz - cx * sy * sz;
  const y = cx * sy * cz + sx * cy * sz;
  const z = cx * cy * sz - sx * sy * cz;
  return [x, y, z, w];
}

export function quaternionToEulerDeg(
  qx: number,
  qy: number,
  qz: number,
  qw: number,
): [number, number, number] {
  const sinp = 2 * (qw * qy - qz * qx);
  const ry =
    Math.abs(sinp) >= 1
      ? Math.sign(sinp) * (Math.PI / 2)
      : Math.asin(sinp);
  const rx = Math.atan2(2 * (qw * qx + qy * qz), 1 - 2 * (qx * qx + qy * qy));
  const rz = Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz));
  // Undo the X/Y negation that `eulerDegToQuaternion` applied.
  return [(-rx * 180) / Math.PI, (-ry * 180) / Math.PI, (rz * 180) / Math.PI];
}
