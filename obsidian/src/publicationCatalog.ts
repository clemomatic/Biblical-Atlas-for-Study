/**
 * Official mnemonic codes transcribed from the French WOL publication index,
 * https://wol.jw.org/fr/wol/d/r30/lp-f/1200270068 (dx86-23).
 * This list identifies a publication family, NOT a verified document URL.
 * Only match a code when accompanied by a chapter/lesson/page/paragraph locator
 * to avoid accidental links in ordinary prose (e.g. "be", "cl", "la").
 *
 * S-38 is separately handled as a user-supplied document code: it is not
 * part of the public WOL abbreviation table.
 */
export const PUBLICATION_ABBREVIATION_SOURCE='https://wol.jw.org/fr/wol/d/r30/lp-f/1200270068';
export const PUBLICATION_CODES=Object.freeze((
 'ba be bh bhs bi12 bm br78 bt cf cl ct dg dp dx ed fg foa fy g gf gl gm gt gu hb hdu hf hl ia ie '+
 'ijwbq ijwbv ijwcl ijwex ijwfq ijwhf ijwia ijwwd ijwyp ip-1 ip-2 it-1 it-2 jd je jl jr jt jv jy '+
 'kl km kp kr la lc ld lf lfb lff lffi lfs ll lmd Lmn lr lv lvs mb mrt mwb my nwt nwtstg nwtsty '+
 'od ol om op pc pe ph pr re rj rk rq rr rs rsg scl sg sh si sp syr th ti tp vi w we wfg wi wj wp '+
 'ws wt yb yc yp yp1 yp2 ypq'
).split(/\s+/).map(code=>code.toLowerCase()));
export const PUBLICATION_CODE_SET:ReadonlySet<string>=new Set(PUBLICATION_CODES);
