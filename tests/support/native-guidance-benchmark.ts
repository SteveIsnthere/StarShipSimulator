import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
// Dedicated timing-lane bridge: direct native function references, no wrappers.
// @ts-expect-error -- reviewed plain-JS manifest/native-loader helper
import {loadNativeGuidance} from '../../scripts/bench/native-loader.mjs';
const path=process.env.STARSHIP_NATIVE_BENCH_MANIFEST;
const digest=process.env.STARSHIP_NATIVE_BENCH_DIGEST;
const invocation=process.env.STARSHIP_NATIVE_BENCH_INVOCATION;
const receipt=process.env.STARSHIP_NATIVE_BENCH_RECEIPT;
const stage=process.env.STARSHIP_NATIVE_BENCH_STAGE;
if(!path||!digest||!invocation||!receipt||!stage)throw new Error('Fresh native benchmark qualification required; no SSR fallback');
const api=await loadNativeGuidance(path,digest,invocation) as typeof import('../../src/core/control/guidance-physics');
export const createBurnScratch=api.createBurnScratch;
export const createFallResult=api.createFallResult;
export const landingBurnStartAltitude=api.landingBurnStartAltitude;
export const unpoweredFallInto=api.unpoweredFallInto;
writeFileSync(resolve(receipt,`bridge-${stage}-${process.pid}.json`),JSON.stringify({invocation,stage,pid:process.pid,
 manifest:path,digest,provenance:'Verified native graph; all four public values are direct function references',
 referenceIdentity: {createBurnScratch:createBurnScratch===api.createBurnScratch,createFallResult:createFallResult===api.createFallResult,
 landingBurnStartAltitude:landingBurnStartAltitude===api.landingBurnStartAltitude,unpoweredFallInto:unpoweredFallInto===api.unpoweredFallInto}},null,2)+'\n');
