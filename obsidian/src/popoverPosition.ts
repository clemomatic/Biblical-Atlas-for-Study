/** Keep the floating reference reader fully visible while dragging, centering
 * or resizing the Obsidian window. Pure function for desktop/mobile tests. */
export interface PopoverCoordinates {left:number;top:number}
export function clampPopoverPosition(
 left:number,top:number,width:number,height:number,
 viewportWidth:number,viewportHeight:number,margin=12
):PopoverCoordinates {
 const maximumLeft=Math.max(margin,viewportWidth-width-margin);
 const maximumTop=Math.max(margin,viewportHeight-height-margin);
 return {
  left:Math.max(margin,Math.min(Math.round(left),maximumLeft)),
  top:Math.max(margin,Math.min(Math.round(top),maximumTop))
 };
}
