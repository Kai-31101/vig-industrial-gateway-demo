import type {NearbyCategory} from './types';

/** Line icons (viewBox 24, stroke) per amenity category, shared by the nearby list, the filter chips and the Goong map pins. */
type Shape={paths:string[];circles?:[number,number,number][]};
const SHAPES:Record<NearbyCategory,Shape>={
 // Plane
 airport:{paths:['M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z']},
 // Anchor
 seaport:{paths:['M12 22V8','M5 12H2a10 10 0 0 0 20 0h-3'],circles:[[12,5,3]]},
 // Road in perspective: two edges converging to the horizon and a dashed centre line (reads as "road / highway" even at 16px)
 highway:{paths:['M4.5 21 9.5 3','M19.5 21 14.5 3','M12 4.5v2','M12 10v2.5','M12 16.5v3']},
 // Train seen from the side: long body with a sloped nose, two windows, three wheels on a rail
 rail:{paths:['M2 15V7.5A1.5 1.5 0 0 1 3.5 6H16l5 6.5V15z','M16 6v6.5h5','M4.5 8.5h3V11h-3z','M10 8.5h3V11h-3z','M1 21h22'],circles:[[5.5,17.6,1.4],[11,17.6,1.4],[17,17.6,1.4]]},
 // Medical cross in a rounded square
 hospital:{paths:['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z','M12 7.5v9M7.5 12h9']},
 // Graduation cap
 college:{paths:['M22 9.5 12 4.5 2 9.5l10 5 10-5z','M6 11.5v5c3.3 2.7 8.7 2.7 12 0v-5','M22 9.5v5']},
 // Factory
 industrial_park:{paths:['M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z','M17 18h1','M12 18h1','M7 18h1']},
 // City buildings
 town:{paths:['M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z','M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2','M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2','M10 6h4','M10 10h4','M10 14h4','M10 18h4']},
};

/** SVG markup for DOM map pins (static shapes from this file; never built from user input). */
export function amenityIconSvg(category:NearbyCategory,size=16):string{
 const s=SHAPES[category];
 const body=s.paths.map(d=>`<path d="${d}"/>`).join('')+(s.circles||[]).map(([cx,cy,r])=>`<circle cx="${cx}" cy="${cy}" r="${r}"/>`).join('');
 return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="display:block">${body}</svg>`;
}

export function AmenityIcon({category,size=16}:{category:NearbyCategory;size?:number}){
 const s=SHAPES[category];
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
  {s.paths.map(d=><path key={d} d={d}/>)}
  {(s.circles||[]).map(([cx,cy,r])=><circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r}/>)}
 </svg>;
}
