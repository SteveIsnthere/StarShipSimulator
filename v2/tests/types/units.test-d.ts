/**
 * Type-level assertions for core/units.ts.
 *
 * There is no runtime here. Each @ts-expect-error IS the assertion: if the line
 * below it ever starts compiling, TypeScript reports the unused directive as an
 * error and `npm run build` fails. That makes "passing degrees where radians are
 * expected must not compile" a checked claim rather than a comment.
 */
import { deg, rad, toDeg, toRad, type Deg, type Rad } from '$core/units';
import { gimbalAngleLimit, flipGoalAngle } from '$core/constants';

declare function needsRad(a: Rad): void;
declare function needsDeg(a: Deg): void;

// --- what must compile -----------------------------------------------------

needsRad(rad(0.5));
needsDeg(deg(30));
needsRad(toRad(deg(15)));
needsDeg(toDeg(rad(Math.PI)));
needsRad(gimbalAngleLimit);
needsRad(flipGoalAngle);

// A Rad is still a number, so arithmetic and Math calls work unchanged.
const _sin: number = Math.sin(rad(0.5));
const _sum: number = rad(0.5) + 1;
void _sin;
void _sum;

// --- what must not compile -------------------------------------------------

// @ts-expect-error a bare number is not a Rad — this is the mistake the brand exists to stop
needsRad(0.5);

// @ts-expect-error degrees where radians are expected
needsRad(deg(30));

// @ts-expect-error radians where degrees are expected
needsDeg(rad(0.5));

// @ts-expect-error toRad takes degrees, not radians
toRad(rad(0.5));

// @ts-expect-error toDeg takes radians, not degrees
toDeg(deg(30));

// @ts-expect-error gimbalAngleLimit is radians, not degrees
needsDeg(gimbalAngleLimit);

// @ts-expect-error arithmetic on a Rad yields a plain number, which is no longer a Rad
needsRad(rad(0.5) + 1);
