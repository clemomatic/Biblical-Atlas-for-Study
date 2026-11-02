/**
 * Publication mnemonic symbols transcribed from the OFFICIAL French WOL index:
 * https://wol.jw.org/fr/wol/d/r30/lp-f/1200270068
 * Index covers titles through 2023. This is a vocabulary (not a document-ID
 * mapping): an abbreviation identifies a series, never an arbitrary article.
 * New publications may use additional mnemonics. Keep unknown citations
 * on the official search fallback rather than guessing document IDs.
 */
export const OFFICIAL_PUBLICATION_CODES = Object.freeze(
 `ba be bh bhs bi12 bm br78 bt cf cl ct dg dp dx ed fg foa fy
 g gf gl gm gt gu hb hdu hf hl ia ie ijwbq ijwbv ijwcl ijwex
 ijwfq ijwhf ijwia ijwwd ijwyp ip-1 ip-2 it-1 it-2 jd je jl
 jr jt jv jy kl km kp kr la lc ld lf lfb lff lffi lfs ll lmd
 lmn lr lv lvs mb mrt mwb my nwt nwtstg nwtsty od ol om op
 pc pe ph pr re rj rk rq rr rs rsg scl sg sh si sp syr th ti
 tp vi w we wfg wi wj wp ws wt yb yc yp yp1 yp2 ypq`
 .split(/\s+/).filter(Boolean)
);
/**
 * Source is a list of mnemonics, including very short French words such as
 * « la » and « si ». Never recognize a bare code as a reference.
 */
export const STRUCTURED_PUBLICATION_CODES = Object.freeze(
 OFFICIAL_PUBLICATION_CODES.filter(code=>!['w','wp','g','mwb','dx','km'].includes(code))
);
