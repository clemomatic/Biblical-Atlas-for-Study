/** One-character-for-one-character Markdown masking keeps source offsets stable.
 * Only formatting syntax is masked; links/code spans are handled by callers.
 */
export function markdownCitationScanText(line:string):string{
 return line.replace(/[*_~]/g,' ')
  .replace(/^(\s*)#{1,6}(?=\s)/,match=>' '.repeat(match.length));
}
